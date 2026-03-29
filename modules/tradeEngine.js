const Order = require('../models/Order');
const Stock = require('../models/Stock');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const { executeTrade } = require('./execution');

// ─── Tick Mutex ───────────────────────────────────────────────────────────────
// Prevents two overlapping ticks from running simultaneously at scale.
let isTickRunning = false;

async function processOrder(orderId) {
  try {
    const order = await Order.findOne({ order_id: orderId, status: 'OPEN' });
    if (!order) return;

    const stock = await Stock.findOne({ stock_id: order.stock_id });
    if (!stock) return;

    if (order.order_type === "MARKET") {
      await executeTrade(order, stock.current_price);
    } else if (order.order_type === "LIMIT" && order.side === "BUY" && stock.current_price <= order.price) {
      await executeTrade(order, order.price);
    } else if (order.order_type === "LIMIT" && order.side === "SELL" && stock.current_price >= order.price) {
      await executeTrade(order, order.price);
    }
  } catch (err) {
    console.error("Process Single Order Error:", err);
  }
}

async function processAllOpenOrders() {
  if (isTickRunning) {
    // Skip this tick if the previous one is still processing — prevents race conditions
    return;
  }
  isTickRunning = true;

  try {
    const orders = await Order.find({ status: 'OPEN' });
    if (orders.length === 0) return;

    const stocksData = await Stock.find({});
    const stocks = {};
    stocksData.forEach(s => stocks[s.stock_id] = s);

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const stock = stocks[order.stock_id];
      if (!stock) continue;

      // 1. LIMIT Orders
      if (order.order_type === "LIMIT") {
        if (order.side === "BUY" && stock.current_price <= order.price) {
          await executeTrade(order, order.price);
        } else if (order.side === "SELL" && stock.current_price >= order.price) {
          await executeTrade(order, order.price);
        }
      }

      // 2. Pure MARKET Orders (no bracket legs)
      else if (order.order_type === "MARKET" && !order.stop_loss && !order.target) {
        await executeTrade(order, stock.current_price);
      }

      // 3. Bracket SELL legs (child orders created after a bracket BUY)
      else if (order.side === "SELL" && order.order_type === "MARKET" && (order.stop_loss || order.target)) {
        if (order.target && stock.current_price >= order.target) {
          console.log(`🎯 TARGET HIT for ${order.order_id}! Selling at $${stock.current_price}...`);
          await executeTrade(order, stock.current_price);
        } else if (order.stop_loss && stock.current_price <= order.stop_loss) {
          console.log(`📉 STOP LOSS HIT for ${order.order_id}! Selling at $${stock.current_price}...`);
          await executeTrade(order, stock.current_price);
        }
      }
    }
  } catch (error) {
    console.error("Trade Engine Loop Error:", error);
  } finally {
    isTickRunning = false;
  }
}

async function processRiskManagement() {
  try {
    const users = await User.find({});
    if (users.length === 0) return;

    // Cache all live prices
    const stocksData = await Stock.find({});
    const stocks = {};
    stocksData.forEach(s => stocks[s.stock_id] = s);

    // Process users in batches of 50 to avoid overwhelming MongoDB at scale
    const BATCH_SIZE = 50;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(user => checkUserRisk(user, stocks)));
    }
  } catch (err) {
    console.error("Global Risk Engine fault:", err);
  }
}

async function checkUserRisk(user, stocks) {
  try {
    // The new schema: one portfolio document per user with embedded positions[]
    const portfolio = await Portfolio.findOne({ user_id: user.user_id });
    if (!portfolio || portfolio.positions.length === 0) return;

    let totalUnrealizedLoss = 0;
    let hasExposure = false;

    for (const pos of portfolio.positions) {
      if (pos.net_quantity <= 0) continue;
      hasExposure = true;

      const stock = stocks[pos.stock_id];
      if (stock && stock.current_price) {
        const originalCost = pos.average_price * pos.net_quantity;
        const currentValue = stock.current_price * pos.net_quantity;
        totalUnrealizedLoss += (originalCost - currentValue);
      }
    }

    if (hasExposure && totalUnrealizedLoss >= user.loss_limit) {
      console.log(`\n🚨 MARGIN CALL [USER ${user.user_id}]: Loss $${totalUnrealizedLoss.toFixed(2)} >= Limit $${user.loss_limit}. Liquidating all positions!`);

      // Cancel all open orders first to release locked shares
      const OrderModel = require('../models/Order');
      await OrderModel.updateMany({ user_id: user.user_id, status: 'OPEN' }, { status: 'CANCELLED_BY_MARGIN_CALL' });

      const { placeOrder } = require('./order');

      // Sell every position with net quantity > 0
      for (const pos of portfolio.positions) {
        if (pos.net_quantity > 0) {
          console.log(`🗡️ Liquidating ${pos.net_quantity} units of Stock ID: ${pos.stock_id}...`);
          await placeOrder(user.user_id, pos.stock_id, pos.net_quantity, "MARKET", 0, null, null, "SELL");
        }
      }
    }
  } catch (err) {
    console.error(`Risk check failed for user ${user.user_id}:`, err);
  }
}

module.exports = { processOrder, processAllOpenOrders, processRiskManagement };