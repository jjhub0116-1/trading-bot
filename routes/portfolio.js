const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/portfolio - Fetches solely the encrypted user's authorized portfolio natively
router.get('/', authMiddleware, async (req, res) => {
    try {
        const holdings = await Portfolio.find({ user_id: req.user.id }).sort({ stock_id: 1 });
        res.json(holdings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
