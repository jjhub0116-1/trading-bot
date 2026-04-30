const express = require('express');
const router = express.Router();
const { placeOrder } = require('../modules/order');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/authMiddleware');
const { ORDER_TYPE, ORDER_SIDE, ORDER_STATUS } = require('../config/constants');

// POST /api/orders — Place a BUY or SELL order
router.post('/', [authMiddleware, authMiddleware.isUser], async (req, res) => {
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
router.get('/', [authMiddleware, authMiddleware.isUser], async (req, res) => {
    try {
        const orders = await Order.find({ user_id: req.user.id }).sort({ createdAt: -1 }).lean();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PUT /api/orders/:id/cancel — Cancel an open order
router.put('/:id/cancel', [authMiddleware, authMiddleware.isUser], async (req, res) => {
    try {
        const mongoId = req.params.id;
        const order = await Order.findOne({ _id: mongoId, user_id: req.user.id });
        
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        if (order.status !== ORDER_STATUS.OPEN) return res.status(400).json({ success: false, message: 'Only OPEN orders can be cancelled' });
        
        order.status = 'CANCELLED';
        await order.save();
        
        res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/orders/:id/modify — Modify limit price, stopLoss, or target
router.put('/:id/modify', [authMiddleware, authMiddleware.isUser], async (req, res) => {
    try {
        const mongoId = req.params.id;
        const { price, stopLoss, target } = req.body;
        
        const order = await Order.findOne({ _id: mongoId, user_id: req.user.id });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        if (order.status !== ORDER_STATUS.OPEN) return res.status(400).json({ success: false, message: 'Only OPEN orders can be modified' });
        
        if (order.order_type === ORDER_TYPE.LIMIT && price > 0) order.price = price;
        if (stopLoss !== undefined) order.stop_loss = stopLoss; 
        if (target !== undefined) order.target = target;
        
        await order.save();
        res.json({ success: true, message: 'Order modified successfully', order });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
