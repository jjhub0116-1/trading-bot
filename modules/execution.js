const Order = require('../models/Order');
const Trade = require('../models/Trade');
const { updatePortfolio } = require("./portfolio");
const { logTransaction } = require("./wallet");

async function executeTrade(order, executionPrice) {
  try {
    const totalCost = executionPrice * order.quantity;

    // 1. Mark Order EXECUTED explicitly tracking custom ID mapping
    const updatedOrder = await Order.findOneAndUpdate(
      { order_id: order.order_id, status: 'OPEN' },
      { status: 'EXECUTED' }
    );
    if (!updatedOrder) {
      console.log("Order not found or already executed natively:", order.order_id);
      return;
    }

    // 2. Inject Native Trade Record
    const tradeId = "TRD_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    await Trade.create({
      trade_id: tradeId,
      order_id: order.order_id,
      user_id: order.user_id,
      user_name: order.user_name,
      stock_id: order.stock_id,
      side: order.side,
      quantity: order.quantity,
      execution_price: executionPrice,
      total_cost: totalCost
    });

    // 3. Update Portfolio 
    await updatePortfolio(
      order.user_id,
      order.user_name,
      order.stock_id,
      order.quantity,
      executionPrice,
      order.side
    );

    // 4. Update Risk Ledger seamlessly natively
    await logTransaction(
      order.user_id,
      order.user_name,
      totalCost,
      order.stock_id,
      order.side
    );

    console.log(`✅ Order ${order.order_id} explicitly structurally logged cleanly natively in Mongo.`);

    // 5. BRACKET EXIT GENERATION natively
    if (order.side === "BUY" && (order.stop_loss || order.target)) {
      const sellOrderId = "ORD_" + Date.now() + "_EXIT";
      await Order.create({
        order_id: sellOrderId,
        user_id: order.user_id,
        user_name: order.user_name,
        stock_id: order.stock_id,
        side: "SELL",
        order_type: "MARKET",
        quantity: order.quantity,
        price: null,
        stop_loss: order.stop_loss || null,
        target: order.target || null,
        status: "OPEN"
      });
      console.log(`✅ Dynamically injected pure Mongo Bracket Child object natively: ${sellOrderId}`);
    }

  } catch (error) {
    console.error("Execute Trade Error:", error);
  }
}

module.exports = { executeTrade };