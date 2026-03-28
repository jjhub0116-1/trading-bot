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
    status: { type: String, enum: ['OPEN', 'EXECUTED', 'CANCELLED'], default: 'OPEN' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
