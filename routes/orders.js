const express = require('express');
const router = express.Router();
const { placeOrder } = require('../modules/order');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/authMiddleware');
const { ORDER_TYPE, ORDER_SIDE } = require('../config/constants');

// POST /api/orders — Place a BUY or SELL order
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { stockId, quantity, orderType, price, stopLoss, target, side } = req.body;

        // Input validation
        if (!Number.isInteger(stockId) || stockId <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid stockId — must be a positive integer' });
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid quantity — must be a positive integer' });
        }
        if (!Object.values(ORDER_TYPE).includes(orderType)) {
            return res.status(400).json({ success: false, error: 'Invalid orderType — must be MARKET or LIMIT' });
        }
        if (!Object.values(ORDER_SIDE).includes(side)) {
            return res.status(400).json({ success: false, error: 'Invalid side — must be BUY or SELL' });
        }
        if (orderType === ORDER_TYPE.LIMIT && (!price || price <= 0)) {
            return res.status(400).json({ success: false, error: 'LIMIT orders require a valid price > 0' });
        }

        const userId = req.user.id;
        const result = await placeOrder(userId, stockId, quantity, orderType, price || 0, stopLoss || null, target || null, side);

        if (typeof result === 'string' && !result.startsWith('ORD_')) {
            return res.status(400).json({ success: false, message: result });
        }

        res.json({ success: true, message: 'Order placed successfully!', orderId: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/orders — Order history for authenticated user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const orders = await Order.find({ user_id: req.user.id }).sort({ createdAt: -1 }).lean();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
