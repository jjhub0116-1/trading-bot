const Order = require('../models/Order');
const User = require('../models/User');
const { getStock } = require('./stocks');
const { checkEquityAvailable, getUserName } = require('./wallet');
const { ORDER_STATUS, ORDER_SIDE, ORDER_TYPE } = require('../config/constants');

async function placeOrder(userId, stockId, quantity, orderType, price, stopLoss, target, side) {
  try {
    if (!quantity || quantity <= 0) throw new Error('Invalid Quantity');

    const stock = await getStock(stockId);
    if (!stock) return 'Stock Not Found';

    const user = await User.findOne({ user_id: userId });
    if (!user) return 'User Not Found';
    if (user.is_flagged) return 'Account Blocked: Loss limit reached';

    const executionPrice = orderType === ORDER_TYPE.MARKET ? parseFloat(stock.current_price) : parseFloat(price);

    // Equity check applies equally for both BUY and SELL (absolute exposure check)
    // Now passes stockId to determine if checking Share Equity or Commodity Lot Equity
    const hasEquity = await checkEquityAvailable(userId, stockId, quantity);
    if (!hasEquity) {
      return stock.asset_type === 'COMMODITY' 
        ? 'Insufficient Commodity Lot Limits (20 Lot Cap Exceeded)' 
        : 'Insufficient Equity Limits (Share Count Exceeded)';
    }

    const orderId = 'ORD_' + Date.now();
    const username = await getUserName(userId);

    await Order.create({
      order_id: orderId,
      user_id: userId,
      user_name: username,
      stock_id: stockId,
      side,
      order_type: orderType,
      quantity,
      price: executionPrice || null,
      stop_loss: stopLoss || null,
      target: target || null,
      status: ORDER_STATUS.OPEN
    });

    // NOTE: No immediate processOrder() call here.
    // The tick loop (processAllOpenOrders) is the single execution path.
    // This prevents the double-execution race condition.

    return orderId;
  } catch (error) {
    console.error('Place Order Error:', error);
    return 'Order Failed';
  }
}

module.exports = { placeOrder };