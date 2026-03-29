const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    order_id: { type: String, required: true, unique: true },
    user_id: { type: Number, required: true },
    user_name: { type: String, required: true },
    stock_id: { type: Number, required: true },
    side: { type: String, enum: ['BUY', 'SELL'], required: true },
    order_type: { type: String, enum: ['MARKET', 'LIMIT'], required: true },
    quantity: { type: Number, required: true },
    price: { type: Number },
    stop_loss: { type: Number },
    target: { type: Number },
    status: { type: String, enum: ['OPEN', 'EXECUTED', 'CANCELLED', 'CANCELLED_BY_MARGIN_CALL'], default: 'OPEN' }
}, { timestamps: true });

// Compound index: the engine queries by status+user_id on every tick.
// Without this, Mongo does a full collection scan at scale.
orderSchema.index({ status: 1, user_id: 1 });
orderSchema.index({ status: 1, stock_id: 1 });

module.exports = mongoose.model('Order', orderSchema);
