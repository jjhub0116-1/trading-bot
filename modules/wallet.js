const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const Portfolio = require('../models/Portfolio');

async function checkEquityAvailable(userId, stockId, requiredQuantity) {
  try {
    const User = require('../models/User'); // Ensure local require to avoid cycles if any
    const Stock = require('../models/Stock');
    const Portfolio = require('../models/Portfolio');

    const user = await User.findOne({ user_id: userId });
    const stock = await Stock.findOne({ stock_id: stockId });
    if (!user || !stock) return false;

    const portfolio = await Portfolio.findOne({ user_id: userId });
    const openOrders = await Order.find({ user_id: userId, status: 'OPEN' });

    let usedUnits = 0;
    let usedLots = 0;

    // 1. Gather all unique stock IDs to fetch their lot_sizes in one query
    const allPosStockIds = portfolio?.positions?.map(p => p.stock_id) || [];
    const ordersStockIds = openOrders.map(o => o.stock_id);
    const uniqueStockIds = [...new Set([...allPosStockIds, ...ordersStockIds, stockId])];
    
    const stocksInScope = await Stock.find({ stock_id: { $in: uniqueStockIds } }).lean();
    const stockMap = {};
    stocksInScope.forEach(s => stockMap[s.stock_id] = s);

    // 2. Count Executed Positions
    if (portfolio && portfolio.positions) {
      portfolio.positions.forEach(p => {
        const s = stockMap[p.stock_id];
        const multiplier = s?.lot_size || 1;
        usedUnits += Math.abs(p.net_quantity) * multiplier;
        if (s && s.asset_type === 'COMMODITY') {
          usedLots += Math.abs(p.net_quantity);
        }
      });
    }

    // 3. Count OPEN Orders (Exposure that MIGHT execute)
    openOrders.forEach(o => {
      const s = stockMap[o.stock_id];
      const multiplier = s?.lot_size || 1;
      usedUnits += o.quantity * multiplier;
      if (s && s.asset_type === 'COMMODITY') {
        usedLots += o.quantity;
      }
    });

    // 1. Check Global Unit Limit (Applies to EVERY trade)
    const multiplier = stock.lot_size || 1;
    const newUnitExposure = Number(usedUnits) + (Number(requiredQuantity) * multiplier);
    
    if (newUnitExposure > user.equity) {
      return 'Insufficient Equity Limits (Share Count Exceeded)';
    }

    // 2. Check Commodity Lot Limit (Only for commodities)
    if (stock.asset_type === 'COMMODITY') {
      const newLotExposure = Number(usedLots) + Number(requiredQuantity);
      if (newLotExposure > user.commodity_equity) {
        return 'Insufficient Commodity Lot Limits (20 Lot Cap Exceeded)'; // Also matches exact screenshot error
      }
    }

    return true;
  } catch (error) {
    console.error("Equity check error:", error);
    return false;
  }
}

async function logTransaction(userId, username, amount, stockId, side, quantity, lotMultiplier = 1) {
  try {
    const transactionId = "TXN_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    await WalletTransaction.create({
      transaction_id: transactionId,
      user_id: userId,
      user_name: username,
      amount: amount,
      stock_id: stockId,
      quantity: quantity,
      side: side,
      lot_size: lotMultiplier
    });
  } catch (error) {
    console.error("Transaction log error:", error);
  }
}

async function getUserName(userId) {
  try {
    const user = await User.findOne({ user_id: userId });
    return user ? user.user_name : "Unknown";
  } catch (err) {
    return "Unknown";
  }
}

module.exports = { checkEquityAvailable, logTransaction, getUserName };