const express = require('express');
const router = express.Router();
const { placeOrder } = require('../modules/order');
const Order = require('../models/Order');

// POST /api/orders
// Send raw JSON: { "userId": 2, "stockId": 2, "quantity": 5, "orderType": "MARKET", "price": 0, "stopLoss": 90, "target": 170, "side": "BUY" }
router.post('/', async (req, res) => {
    try {
        const { userId, stockId, quantity, orderType, price, stopLoss, target, side } = req.body;

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

// GET /api/orders/:userId - Fetch historical pipeline execution
router.get('/:userId', async (req, res) => {
    try {
        const orders = await Order.find({ user_id: req.params.userId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
