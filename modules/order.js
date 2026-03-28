const Order = require('../models/Order');
const { getStock } = require("./stocks");
const { checkWalletBalance, getUserName } = require("./wallet");

let tradeEngine;

async function placeOrder(userId, stockId, quantity, orderType, price, stopLoss, target, side) {
  try {
    if (!quantity || quantity <= 0) throw new Error("Invalid Quantity");

    const stock = await getStock(stockId);
    if (!stock) return "Stock Not Found";

    const executionPrice = orderType === "MARKET" ? parseFloat(stock.price) : parseFloat(price);
    const totalCost = executionPrice * quantity;

    if (side === "BUY") {
      const hasBalance = await checkWalletBalance(userId, totalCost);
      if (!hasBalance) {
        return "Insufficient Balance";
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