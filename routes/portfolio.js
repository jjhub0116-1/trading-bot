const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/portfolio — Returns the single portfolio document for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const portfolio = await Portfolio.findOne({ user_id: req.user.id });
        if (!portfolio) return res.json({ positions: [], profit_loss: 0 });
        res.json(portfolio);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
