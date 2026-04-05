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

    // BUY: check share-count equity limit
    if (side === ORDER_SIDE.BUY) {
      const hasEquity = await checkEquityAvailable(userId, quantity);
      if (!hasEquity) return 'Insufficient Equity Limits (Share Count Exceeded)';
    }

    // SELL: check user actually holds enough unlocked shares
    if (side === ORDER_SIDE.SELL) {
      const PortfolioModel = require('../models/Portfolio');
      const portfolio = await PortfolioModel.findOne({ user_id: userId });
      const position = portfolio ? portfolio.positions.find(p => p.stock_id === stockId) : null;

      const openSells = await Order.find({ user_id: userId, stock_id: stockId, side: ORDER_SIDE.SELL, status: ORDER_STATUS.OPEN });
      const lockedQty = openSells.reduce((sum, o) => sum + o.quantity, 0);

      const availableQty = position ? position.net_quantity - lockedQty : 0;
      if (quantity > availableQty) return 'Insufficient Shares (Or locked in open orders)';
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