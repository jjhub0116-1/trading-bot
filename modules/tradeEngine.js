const Order = require('../models/Order');
const Stock = require('../models/Stock');
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

module.exports = { processOrder, processAllOpenOrders };