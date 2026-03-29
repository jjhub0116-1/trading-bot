const express = require('express');
const router = express.Router();
const { placeOrder } = require('../modules/order');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/orders
// Send raw JSON cleanly (userId strictly abstracted natively securely): { "stockId": 2, "quantity": 5, "orderType": "MARKET", "price": 0, "stopLoss": 90, "target": 170, "side": "BUY" }
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { stockId, quantity, orderType, price, stopLoss, target, side } = req.body;
        const userId = req.user.id; // Firmly mathematically extracted from verified explicit JWT Header!

        // Call the engine's exact central function identically!
        const result = await placeOrder(userId, stockId, quantity, orderType, price, stopLoss, target, side);

        if (result === "Insufficient Balance" || result === "Stock Not Found" || result === "Order Failed") {
            return res.status(400).json({ success: false, message: result });
        }

        res.json({ success: true, message: `Order successfully placed!`, orderId: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/orders - Fetch historical pipeline execution exclusively for cryptographically authenticated user organically
router.get('/', authMiddleware, async (req, res) => {
    try {
        const orders = await Order.find({ user_id: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
