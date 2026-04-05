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
  try {
    // lean() for read-only queries — avoids Mongoose document hydration overhead
    const orders = await Order.find({ status: ORDER_STATUS.OPEN }).lean();
    if (orders.length === 0) return;

    const stocksData = await Stock.find({}).lean();
    const stocks = {};
    stocksData.forEach(s => stocks[s.stock_id] = s);

    for (const order of orders) {
      const stock = stocks[order.stock_id];
      if (!stock) continue;

      // 1. LIMIT Orders
      if (order.order_type === ORDER_TYPE.LIMIT) {
        if (order.side === ORDER_SIDE.BUY && stock.current_price <= order.price) {
          await executeTrade(order, stock.current_price);
        } else if (order.side === ORDER_SIDE.SELL && stock.current_price >= order.price) {
          await executeTrade(order, stock.current_price);
        }
      }
      // 2. Pure MARKET Orders (no bracket legs)
      else if (order.order_type === ORDER_TYPE.MARKET && !order.stop_loss && !order.target) {
        await executeTrade(order, stock.current_price);
      }
      // 3. Bracket SELL legs
      else if (order.side === ORDER_SIDE.SELL && order.order_type === ORDER_TYPE.MARKET && (order.stop_loss || order.target)) {
        if (order.target && stock.current_price >= order.target) {
          console.log(`🎯 TARGET HIT for ${order.order_id}! Selling at $${stock.current_price}`);
          await executeTrade(order, stock.current_price);
        } else if (order.stop_loss && stock.current_price <= order.stop_loss) {
          console.log(`📉 STOP LOSS HIT for ${order.order_id}! Selling at $${stock.current_price}`);
          await executeTrade(order, stock.current_price);
        }
      }
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

    if (portfolio.positions && portfolio.positions.length > 0) {
      for (const pos of portfolio.positions) {
        if (pos.net_quantity <= 0) continue;
        hasExposure = true;

        const stock = stocks[pos.stock_id];
        if (stock && stock.current_price) {
          totalUnrealizedPnl += (stock.current_price - pos.average_price) * pos.net_quantity;
        }
      }
    }

    // Clamp realized P&L so positive profit does not expand the available loss loss_limit.
    // If they have realized losses, it eats into the limit. If they have realized profit, it's ignored for risk.
    const cappedRealizedPnl = Math.min(0, portfolio.profit_loss || 0);
    const effectiveRiskPnl = cappedRealizedPnl + totalUnrealizedPnl;
    
    // Check if effective losses exceed the loss_limit (e.g. effectiveRiskPnl < -500 for a 500 limit)
    // Always margin call if total loss exceeds limit, regardless of exposure, to lock the account.
    if (effectiveRiskPnl < -user.loss_limit) {
      console.log(`\n🚨 MARGIN CALL [USER ${user.user_id}]: Risk PnL $${effectiveRiskPnl.toFixed(2)} is worse than Limit -$${user.loss_limit}. Flagging account and liquidating!`);

      await User.updateOne({ user_id: user.user_id }, { is_flagged: true });

      const OrderModel = require('../models/Order');
      await OrderModel.updateMany(
        { user_id: user.user_id, status: ORDER_STATUS.OPEN },
        { status: ORDER_STATUS.CANCELLED_BY_MARGIN_CALL }
      );

      const { placeOrder } = require('./order');
      if (portfolio.positions) {
        for (const pos of portfolio.positions) {
          if (pos.net_quantity > 0) {
            console.log(`🗡️ Liquidating ${pos.net_quantity} shares of Stock ${pos.stock_id}...`);
            await placeOrder(user.user_id, pos.stock_id, pos.net_quantity, ORDER_TYPE.MARKET, 0, null, null, ORDER_SIDE.SELL);
          }
        }
      }
    }
  } catch (err) {
    console.error(`Risk check failed for user ${user.user_id}:`, err);
  }
}


module.exports = { processOrder, processAllOpenOrders, processRiskManagement };