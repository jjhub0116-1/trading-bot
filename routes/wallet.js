const express = require('express');
const router = express.Router();
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');

// GET /api/wallet/:userId
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ user_id: req.params.userId });
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            user_id: user.user_id,
            user_name: user.user_name,
            total_balance: user.total_balance
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/wallet/transactions/:userId
router.get('/transactions/:userId', async (req, res) => {
    try {
        const txns = await WalletTransaction.find({ user_id: req.params.userId }).sort({ timestamp: -1 });
        res.json(txns);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
