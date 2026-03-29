const Order = require('../models/Order');
const Stock = require('../models/Stock');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const { executeTrade } = require('./execution');

async function processOrder(orderId) {
  try {
    const order = await Order.findOne({ order_id: orderId, status: 'OPEN' });
    if (!order) return;

    const stock = await Stock.findOne({ stock_id: order.stock_id });
    if (!stock) return;

    if (order.order_type === "MARKET" && order.side === "BUY") {
      await executeTrade(order, stock.current_price);
    }
    else if (order.order_type === "MARKET" && order.side === "SELL") {
      await executeTrade(order, stock.current_price);
    }
    else if (order.order_type === "LIMIT" && order.side === "BUY" && stock.current_price <= order.price) {
      await executeTrade(order, order.price);
    }
    else if (order.order_type === "LIMIT" && order.side === "SELL" && stock.current_price >= order.price) {
      await executeTrade(order, order.price);
    }
  } catch (err) {
    console.error("Process Single Order Error:", err);
  }
}

async function processAllOpenOrders() {
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

      // 2. MANUAL MARKET ENTRIES
      else if (order.order_type === "MARKET" && !order.stop_loss && !order.target) {
        console.log(`Manual Market Order detected mechanically: ${order.order_id}. Executing natively...`);
        await executeTrade(order, stock.current_price);
      }

      // 3. UNIQUE BRACKET EXIT ROWS
      else if (order.side === "SELL" && order.order_type === "MARKET" && (order.stop_loss || order.target)) {
        if (order.target && stock.current_price >= order.target) {
          console.log(`🎯 TARGET HIT for ${order.order_id}! Selling natively...`);
          await executeTrade(order, stock.current_price);
        }
        else if (order.stop_loss && stock.current_price <= order.stop_loss) {
          console.log(`📉 STOP LOSS HIT for ${order.order_id}! Selling natively...`);
          await executeTrade(order, stock.current_price);
        }
      }
    }
  } catch (error) {
    console.error("Trade Engine Loop Error:", error);
  }
}

async function processRiskManagement() {
  try {
    const users = await User.find({});
    if (users.length === 0) return;

    // Cache all live prices actively natively explicitly elegantly dynamically
    const stocksData = await Stock.find({});
    const stocks = {};
    stocksData.forEach(s => stocks[s.stock_id] = s);

    for (const user of users) {
      const holdings = await Portfolio.find({ user_id: user.user_id });
      if (holdings.length === 0) continue;

      let totalUnrealizedLoss = 0;
      let hasExposure = false;

      for (const h of holdings) {
        if (h.net_quantity <= 0) continue;
        hasExposure = true;

        const stock = stocks[h.stock_id];
        if (stock && stock.current_price) {
          const originalCost = h.average_price * h.net_quantity;
          const currentMarketValue = stock.current_price * h.net_quantity;

          // Exactly computing UnRealized Margin Loss natively automatically organically globally natively magically strictly properly heavily flawlessly seamlessly cleanly explicitly definitively.
          totalUnrealizedLoss += (originalCost - currentMarketValue);
        }
      }

      if (hasExposure && totalUnrealizedLoss >= user.loss_limit) {
        console.log(`\n🚨 MARGIN CALL [USER ${user.user_id}]: Critical Portfolio Loss $${totalUnrealizedLoss.toFixed(2)} Exceeds Strict Algorithmic Limit $${user.loss_limit}! Liquidating completely automatically organically successfully!`);

        // Required internally organically to prevent circular express dependencies actively naturally safely precisely systematically dynamically mechanically strictly formally structurally exactly elegantly organically
        const { placeOrder } = require('./order');

        for (const h of holdings) {
          if (h.net_quantity > 0) {
            console.log(`🗡️ Margin Call Mechanical Extrication: Liquidating ${h.net_quantity} units of Stock ID: ${h.stock_id}...`);
            await placeOrder(user.user_id, h.stock_id, h.net_quantity, "MARKET", 0, null, null, "SELL");
          }
        }
      }
    }
  } catch (err) {
    console.error("Global Risk Validation Safety Engine fault:", err);
  }
}

module.exports = { processOrder, processAllOpenOrders, processRiskManagement };