const Order = require('../models/Order');
const { getStock } = require("./stocks");
const { checkEquityAvailable, getUserName } = require("./wallet");

let tradeEngine;

async function placeOrder(userId, stockId, quantity, orderType, price, stopLoss, target, side) {
  try {
    if (!quantity || quantity <= 0) throw new Error("Invalid Quantity");

    const stock = await getStock(stockId);
    if (!stock) return "Stock Not Found";

    const executionPrice = orderType === "MARKET" ? parseFloat(stock.price) : parseFloat(price);
    const totalCost = executionPrice * quantity;

    if (side === "BUY") {
      const hasEquity = await checkEquityAvailable(userId, quantity);
      if (!hasEquity) {
        return "Insufficient Equity Limits (Share Count Exceeded)";
      }
    } else if (side === "SELL") {
      const PortfolioModel = require('../models/Portfolio');
      const portfolio = await PortfolioModel.findOne({ user_id: userId });
      const position = portfolio ? portfolio.positions.find(p => p.stock_id === stockId) : null;

      const OrderModel = require('../models/Order');
      const openSells = await OrderModel.find({ user_id: userId, stock_id: stockId, side: 'SELL', status: 'OPEN' });
      let lockedQty = 0;
      openSells.forEach(o => lockedQty += o.quantity);

      const availableQty = position ? position.net_quantity - lockedQty : 0;
      if (quantity > availableQty) {
        return "Insufficient Shares (Or locked in open orders)";
      }
    }

    const orderId = "ORD_" + Date.now();
    const username = await getUserName(userId);

    await Order.create({
      order_id: orderId,
      user_id: userId,
      user_name: username,
      stock_id: stockId,
      side: side,
      order_type: orderType,
      quantity: quantity,
      price: executionPrice || null,
      stop_loss: stopLoss || null,
      target: target || null,
      status: 'OPEN'
    });

    if (!tradeEngine) tradeEngine = require("./tradeEngine");
    if (tradeEngine && tradeEngine.processOrder) {
      await tradeEngine.processOrder(orderId);
    }

    return orderId;
  } catch (error) {
    console.error("Place Order Error:", error);
    return "Order Failed";
  }
}

module.exports = { placeOrder };