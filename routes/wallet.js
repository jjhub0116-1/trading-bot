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

        // Read total shares from the new embedded positions[] array
        const portfolio = await Portfolio.findOne({ user_id: req.user.id });
        let currentTotalShares = 0;
        if (portfolio) {
            portfolio.positions.forEach(p => { if (p.net_quantity > 0) currentTotalShares += p.net_quantity; });
        }

        res.json({
            user_id: user.user_id,
            user_name: user.user_name,
            equity: user.equity,
            used_equity: currentTotalShares,
            available_equity: user.equity - currentTotalShares,
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
