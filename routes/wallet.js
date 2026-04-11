const express = require('express');
const router = express.Router();
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const Portfolio = require('../models/Portfolio');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/wallet
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ user_id: req.user.id });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Read total units and lots from the portfolio
        const Stock = require('../models/Stock');
        const portfolio = await Portfolio.findOne({ user_id: req.user.id });
        let usedUnits = 0;
        let usedLots = 0;

        if (portfolio && portfolio.positions) {
            const allStockIds = portfolio.positions.map(p => p.stock_id);
            const stocks = await Stock.find({ stock_id: { $in: allStockIds } }).lean();
            const stockMap = {};
            stocks.forEach(s => stockMap[s.stock_id] = s);

            portfolio.positions.forEach(p => {
                const s = stockMap[p.stock_id];
                const multiplier = s?.lot_size || 1;
                
                // Consumes Global Unit Equity
                usedUnits += Math.abs(p.net_quantity) * multiplier;
                
                // Consumes Commodity Lot Equity
                if (s && s.asset_type === 'COMMODITY') {
                    usedLots += Math.abs(p.net_quantity);
                }
            });
        }

        res.json({
            user_id: user.user_id,
            user_name: user.user_name,
            equity: user.equity,
            used_equity: usedUnits,
            available_equity: user.equity - usedUnits,
            commodity_equity: user.commodity_equity,
            used_commodity_equity: usedLots,
            available_commodity_equity: user.commodity_equity - usedLots,
            loss_limit: user.loss_limit
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/wallet/transactions
router.get('/transactions', authMiddleware, async (req, res) => {
    try {
        const txns = await WalletTransaction.find({ user_id: req.user.id }).sort({ timestamp: -1 });
        res.json(txns);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
