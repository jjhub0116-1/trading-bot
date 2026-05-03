const express = require('express');
const router = express.Router();
const { calculatePortfolio } = require('../modules/tradeCalculations');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/portfolio — Returns portfolio with dynamically calculated unrealized P&L
router.get('/', [authMiddleware, authMiddleware.isUser], async (req, res) => {
    try {
        const result = await calculatePortfolio(req.user.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
