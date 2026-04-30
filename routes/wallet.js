const express = require('express');
const router = express.Router();
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const Portfolio = require('../models/Portfolio');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/wallet
router.get('/', [authMiddleware, authMiddleware.isUser], async (req, res) => {
    try {
        const user = await User.findOne({ user_id: req.user.id });
        if (!user) return res.status(404).json({ error: "User not found" });

        const Stock = require('../models/Stock');
        const Order = require('../models/Order');
        const portfolio = await Portfolio.findOne({ user_id: req.user.id });
        const openOrders = await Order.find({ user_id: req.user.id, status: 'OPEN' });
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
