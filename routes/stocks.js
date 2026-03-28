const express = require('express');
const router = express.Router();
const { getAllStocks } = require('../modules/stocks');

// GET /api/stocks
router.get('/', async (req, res) => {
    try {
        const stocks = await getAllStocks();
        res.json(stocks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
