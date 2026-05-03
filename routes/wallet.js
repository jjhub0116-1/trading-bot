const express = require('express');
const router = express.Router();
const { calculateWallet } = require('../modules/tradeCalculations');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/wallet
router.get('/', [authMiddleware, authMiddleware.isUser], async (req, res) => {
    try {
        const user = await User.findOne({ user_id: req.user.id });
        if (!user) return res.status(404).json({ error: "User not found" });

        const result = await calculateWallet(user);
        res.json(result);
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
