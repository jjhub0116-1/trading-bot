const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    trade_id: { type: String, required: true, unique: true },
    order_id: { type: String, required: true },
    user_id: { type: Number, required: true },
    user_name: { type: String, required: true },
    stock_id: { type: Number, required: true },
    side: { type: String, enum: ['BUY', 'SELL'], required: true },
    quantity: { type: Number, required: true },
    execution_price: { type: Number, required: true },
    total_cost: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Trade', tradeSchema);
