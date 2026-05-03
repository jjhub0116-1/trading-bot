const Stock = require('../models/Stock');
const Portfolio = require('../models/Portfolio');
const Order = require('../models/Order');

/**
 * Calculates detailed portfolio stats for a given user.
 * @param {number} userId - Custom user_id
 */
async function calculatePortfolio(userId) {
    const portfolio = await Portfolio.findOne({ user_id: userId });
    if (!portfolio) return { positions: [], realized_pnl: 0, unrealized_pnl: 0, overall_pnl: 0 };

    const stocksData = await Stock.find({}).lean();
    const stockMap = {};
    stocksData.forEach(s => stockMap[s.stock_id] = s);

    let totalUnrealizedPnl = 0;
    const positions = portfolio.positions.map(p => {
        const stockInfo = stockMap[p.stock_id];
        const currentPrice = stockInfo?.current_price || p.average_price;
        const lotSize = stockInfo?.lot_size || 1;
        const posUnrealizedPnl = (currentPrice - p.average_price) * p.net_quantity * lotSize;
        const posOverallPnl = p.realized_pnl + posUnrealizedPnl;
        totalUnrealizedPnl += posUnrealizedPnl;
        
        return {
            ...p.toObject(),
            current_price: currentPrice,
            position_type: p.net_quantity >= 0 ? 'LONG' : 'SHORT',
            unrealized_pnl: posUnrealizedPnl,
            overall_pnl: posOverallPnl
        };
    });

    const overallPnl = (portfolio.realized_pnl || 0) + totalUnrealizedPnl;

    return {
        _id: portfolio._id,
        user_id: portfolio.user_id,
        user_name: portfolio.user_name,
        positions,
        realized_pnl: portfolio.realized_pnl,
        unrealized_pnl: totalUnrealizedPnl,
        overall_pnl: overallPnl
    };
}

/**
 * Calculates wallet stats (equity, used, available) for a given user.
 * @param {object} userDoc - User mongoose document
 */
async function calculateWallet(userDoc) {
    const portfolio = await Portfolio.findOne({ user_id: userDoc.user_id });
    const openOrders = await Order.find({ user_id: userDoc.user_id, status: 'OPEN' });
    let usedUnits = 0;
    let usedLots = 0;

    // Collect all stock IDs from positions + open orders
    const posStockIds = portfolio?.positions?.map(p => p.stock_id) || [];
    const orderStockIds = openOrders.map(o => o.stock_id);
    const allStockIds = [...new Set([...posStockIds, ...orderStockIds])];
    
    const stocks = await Stock.find({ stock_id: { $in: allStockIds } }).lean();
    const stockMap = {};
    stocks.forEach(s => stockMap[s.stock_id] = s);

    // Count executed positions
    if (portfolio && portfolio.positions) {
        portfolio.positions.forEach(p => {
            const s = stockMap[p.stock_id];
            const multiplier = s?.lot_size || 1;
            usedUnits += Math.abs(p.net_quantity) * multiplier;
            if (s && s.asset_type === 'COMMODITY') usedLots += Math.abs(p.net_quantity);
        });
    }

    // Count pending OPEN orders
    openOrders.forEach(o => {
        const s = stockMap[o.stock_id];
        const multiplier = s?.lot_size || 1;
        usedUnits += o.quantity * multiplier;
        if (s && s.asset_type === 'COMMODITY') usedLots += o.quantity;
    });

    return {
        user_id: userDoc.user_id,
        user_name: userDoc.user_name,
        equity: userDoc.equity,
        used_equity: usedUnits,
        available_equity: userDoc.equity - usedUnits,
        commodity_equity: userDoc.commodity_equity,
        used_commodity_equity: usedLots,
        available_commodity_equity: userDoc.commodity_equity - usedLots,
        loss_limit: userDoc.loss_limit
    };
}

module.exports = { calculatePortfolio, calculateWallet };
