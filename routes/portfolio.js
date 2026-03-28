const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');

// GET /api/portfolio/:userId 
router.get('/:userId', async (req, res) => {
    try {
        const holdings = await Portfolio.find({ user_id: req.params.userId }).sort({ stock_id: 1 });
        res.json(holdings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
