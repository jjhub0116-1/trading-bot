const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/portfolio — Returns portfolio with dynamically calculated unrealized P&L
router.get('/', authMiddleware, async (req, res) => {
    try {
        const portfolio = await Portfolio.findOne({ user_id: req.user.id });
        if (!portfolio) return res.json({ positions: [], realized_pnl: 0, unrealized_pnl: 0, overall_pnl: 0 });

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

        res.json({
            _id: portfolio._id,
            user_id: portfolio.user_id,
            user_name: portfolio.user_name,
            positions,
            realized_pnl: portfolio.realized_pnl,
            unrealized_pnl: totalUnrealizedPnl,
            overall_pnl: overallPnl
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
