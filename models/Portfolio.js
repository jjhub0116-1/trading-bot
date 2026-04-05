const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
    stock_id: { type: Number, required: true },
    net_quantity: { type: Number, default: 0 },
    average_price: { type: Number, default: 0 },
    realized_pnl: { type: Number, default: 0 },
    unrealized_pnl: { type: Number, default: 0 },
    overall_pnl: { type: Number, default: 0 }
}, { _id: false });

const portfolioSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true },
    user_name: { type: String, required: true },
    positions: [positionSchema],
    profit_loss: { type: Number, default: 0 },
    unrealized_pnl: { type: Number, default: 0 },
    overall_pnl: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Portfolio', portfolioSchema);
