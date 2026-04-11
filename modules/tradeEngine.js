const Order = require('../models/Order');
const Stock = require('../models/Stock');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const { executeTrade } = require('./execution');
const { Mutex } = require('async-mutex');
const { ORDER_STATUS, ORDER_TYPE, ORDER_SIDE } = require('../config/constants');

// ─── Tick Mutex (atomic — prevents overlapping ticks) ──────────────────────
const tickMutex = new Mutex();

async function processOrder(orderId) {
  try {
    const order = await Order.findOne({ order_id: orderId, status: ORDER_STATUS.OPEN });
    if (!order) return;

    const stock = await Stock.findOne({ stock_id: order.stock_id }).lean();
    if (!stock) return;

    if (order.order_type === ORDER_TYPE.MARKET) {
      await executeTrade(order, stock.current_price);
    } else if (order.order_type === ORDER_TYPE.LIMIT && order.side === ORDER_SIDE.BUY && stock.current_price <= order.price) {
      await executeTrade(order, stock.current_price);
    } else if (order.order_type === ORDER_TYPE.LIMIT && order.side === ORDER_SIDE.SELL && stock.current_price >= order.price) {
      await executeTrade(order, stock.current_price);
    }
  } catch (err) {
    console.error('Process Single Order Error:', err);
  }
}

async function processAllOpenOrders() {
  // Atomic mutex — if previous tick is still running, skip this one
  if (tickMutex.isLocked()) return;

  const release = await tickMutex.acquire();
  const startTime = Date.now();
  try {
    const orders = await Order.find({ status: ORDER_STATUS.OPEN }).lean();
    if (orders.length === 0) return;

    const stocksData = await Stock.find({}).lean();
    const stocks = {};
    stocksData.forEach(s => stocks[s.stock_id] = s);

    // Parallelize trade execution tasks
    const tradeTasks = [];

    for (const order of orders) {
      const stock = stocks[order.stock_id];
      if (!stock) continue;

      // 1. LIMIT Orders
      if (order.order_type === ORDER_TYPE.LIMIT) {
        if (order.side === ORDER_SIDE.BUY && stock.current_price <= order.price) {
          tradeTasks.push(executeTrade(order, stock.current_price));
        } else if (order.side === ORDER_SIDE.SELL && stock.current_price >= order.price) {
          tradeTasks.push(executeTrade(order, stock.current_price));
        }
      }
      // 2. Immediate MARKET Orders
      else if (order.order_type === ORDER_TYPE.MARKET && !order.stop_loss && !order.target) {
        tradeTasks.push(executeTrade(order, stock.current_price));
      }
      // 3. Bracket SELL legs
      else if (order.side === ORDER_SIDE.SELL && order.order_type === ORDER_TYPE.MARKET && (order.stop_loss || order.target)) {
        if (order.target && stock.current_price >= order.target) {
          tradeTasks.push(executeTrade(order, stock.current_price));
        } else if (order.stop_loss && stock.current_price <= order.stop_loss) {
          tradeTasks.push(executeTrade(order, stock.current_price));
        }
      }
      // 4. Bracket BUY legs
      else if (order.side === ORDER_SIDE.BUY && order.order_type === ORDER_TYPE.MARKET && (order.stop_loss || order.target)) {
        if (order.target && stock.current_price <= order.target) {
          tradeTasks.push(executeTrade(order, stock.current_price));
        } else if (order.stop_loss && stock.current_price >= order.stop_loss) {
          tradeTasks.push(executeTrade(order, stock.current_price));
        }
      }
    }

    if (tradeTasks.length > 0) {
      await Promise.allSettled(tradeTasks);
    }
    
    const duration = Date.now() - startTime;
    if (duration > 500) {
        console.log(`\n⚙️  Engine Tick Complete: Processed ${orders.length} orders (${tradeTasks.length} executed) in ${duration}ms`);
    }

  } catch (error) {
    console.error('Trade Engine Loop Error:', error);
  } finally {
    release();
  }
}

async function processRiskManagement() {
  try {
    const users = await User.find({}).lean();
    if (users.length === 0) return;

    const userIds = users.map(u => u.user_id);

    // Batch-fetch ALL portfolios in one query (eliminates N+1 — was 1 query per user before)
    const portfolios = await Portfolio.find({ user_id: { $in: userIds } }).lean();
    const portfolioMap = {};
    portfolios.forEach(p => portfolioMap[p.user_id] = p);

    // lean() for stock cache
    const stocksData = await Stock.find({}).lean();
    const stocks = {};
    stocksData.forEach(s => stocks[s.stock_id] = s);

    const BATCH_SIZE = 50;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(user => checkUserRisk(user, stocks, portfolioMap[user.user_id])));
    }
  } catch (err) {
    console.error('Global Risk Engine fault:', err);
  }
}

async function checkUserRisk(user, stocks, portfolio) {
  try {
    if (!portfolio) return;
    if (user.is_flagged) return; // Already flagged, no need to margin call repeatedly

    let totalUnrealizedPnl = 0;
    let hasExposure = false;
    let needsUpdate = false;

    if (portfolio.positions && portfolio.positions.length > 0) {
      for (const pos of portfolio.positions) {
        if (pos.net_quantity === 0) {
          pos.unrealized_pnl = 0;
          pos.overall_pnl = pos.realized_pnl;
          continue;
        }
        hasExposure = true;

        const stock = stocks[pos.stock_id];
        if (stock && stock.current_price) {
          const lotMultiplier = stock.lot_size || 1;
          const currentUnrealized = (stock.current_price - pos.average_price) * pos.net_quantity * lotMultiplier;
          const currentOverall = pos.realized_pnl + currentUnrealized;
          
          if (pos.unrealized_pnl !== currentUnrealized || pos.overall_pnl !== currentOverall) {
              pos.unrealized_pnl = currentUnrealized;
              pos.overall_pnl = currentOverall;
              needsUpdate = true;
          }
          
          totalUnrealizedPnl += currentUnrealized;
        }
      }
    }

    const totalOverall = (portfolio.realized_pnl || 0) + totalUnrealizedPnl;
    
    // Always persist mathematical PnL updates native to the DB Document
    if (needsUpdate || portfolio.unrealized_pnl !== totalUnrealizedPnl || portfolio.overall_pnl !== totalOverall) {
        const PortfolioModel = require('../models/Portfolio');
        await PortfolioModel.updateOne(
            { user_id: user.user_id },
            { 
               $set: { 
                 positions: portfolio.positions, 
                 unrealized_pnl: totalUnrealizedPnl, 
                 overall_pnl: totalOverall 
               } 
            }
        );
    }

    // Clamp realized P&L so positive profit does not expand the available loss limit.
    const cappedRealizedPnl = Math.min(0, portfolio.realized_pnl || 0);
    const effectiveRiskPnl = cappedRealizedPnl + totalUnrealizedPnl;
    
    // Check if effective losses exceed the loss_limit
    if (effectiveRiskPnl < -user.loss_limit) {
      if (!user.is_flagged) {
        console.log(`\n🚨 MARGIN CALL [USER ${user.user_id}]: Risk PnL $${effectiveRiskPnl.toFixed(2)} is worse than Limit -$${user.loss_limit}. Flagging account and liquidating!`);

        await User.updateOne({ user_id: user.user_id }, { is_flagged: true });

        const OrderModel = require('../models/Order');
        await OrderModel.updateMany(
          { user_id: user.user_id, status: ORDER_STATUS.OPEN },
          { status: ORDER_STATUS.CANCELLED_BY_MARGIN_CALL }
        );

        if (portfolio.positions) {
          for (const pos of portfolio.positions) {
          if (pos.net_quantity !== 0) {
              const liquidationSide = pos.net_quantity > 0 ? ORDER_SIDE.SELL : ORDER_SIDE.BUY;
              const liquidationQty = Math.abs(pos.net_quantity);
              console.log(`🗡️ Liquidating ${liquidationSide} ${liquidationQty} shares of Stock ${pos.stock_id}...`);
              await OrderModel.create({
                  order_id: 'ORD_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                  user_id: user.user_id,
                  user_name: user.user_name,
                  stock_id: pos.stock_id,
                  side: liquidationSide,
                  order_type: ORDER_TYPE.MARKET,
                  quantity: liquidationQty,
                  price: 0,
                  status: ORDER_STATUS.OPEN
              });
          }
          }
        }
      }
    }
  } catch (err) {
    console.error(`Risk check failed for user ${user.user_id}:`, err);
  }
}


module.exports = { processOrder, processAllOpenOrders, processRiskManagement };