const mongoose = require('mongoose');
const Order = require('../models/Order');
const Trade = require('../models/Trade');
const { updatePortfolio } = require('./portfolio');
const { logTransaction } = require('./wallet');
const { ORDER_STATUS, ORDER_SIDE } = require('../config/constants');

async function executeTrade(order, executionPrice) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const totalCost = executionPrice * order.quantity;

    // 1. Mark Order EXECUTED — idempotent check prevents double execution
    const updatedOrder = await Order.findOneAndUpdate(
      { order_id: order.order_id, status: ORDER_STATUS.OPEN },
      { status: ORDER_STATUS.EXECUTED, executedAt: new Date() },
      { session }
    );
    if (!updatedOrder) {
      await session.abortTransaction();
      session.endSession();
      console.log(`Order ${order.order_id} already executed or not found — skipping.`);
      return;
    }

    // 2. Create Trade record
    const tradeId = 'TRD_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    await Trade.create([{
      trade_id: tradeId,
      order_id: order.order_id,
      user_id: order.user_id,
      user_name: order.user_name,
      stock_id: order.stock_id,
      side: order.side,
      quantity: order.quantity,
      execution_price: executionPrice,
      total_cost: totalCost
    }], { session });

    // 3. Commit before portfolio/wallet updates (these need the session too but portfolio uses save())
    await session.commitTransaction();
    session.endSession();

    // 4. Update Portfolio (outside transaction — uses Mongoose save() which doesn't support sessions easily)
    await updatePortfolio(order.user_id, order.user_name, order.stock_id, order.quantity, executionPrice, order.side);

    // 5. Log wallet transaction
    await logTransaction(order.user_id, order.user_name, totalCost, order.stock_id, order.side);

    console.log(`✅ Trade executed: ${order.order_id} | ${order.side} ${order.quantity} shares @ $${executionPrice}`);

    // 6. Create bracket child SELL order if BUY had stop_loss or target
    if (order.side === ORDER_SIDE.BUY && (order.stop_loss || order.target)) {
      const sellOrderId = 'ORD_' + Date.now() + '_EXIT';
      await Order.create({
        order_id: sellOrderId,
        user_id: order.user_id,
        user_name: order.user_name,
        stock_id: order.stock_id,
        side: ORDER_SIDE.SELL,
        order_type: 'MARKET',
        quantity: order.quantity,
        price: null,
        stop_loss: order.stop_loss || null,
        target: order.target || null,
        status: ORDER_STATUS.OPEN
      });
    }

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Execute Trade Error (transaction rolled back):', error);
  }
}

module.exports = { executeTrade };