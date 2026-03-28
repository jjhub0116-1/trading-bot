const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
    user_id: { type: Number, required: true },
    user_name: { type: String, required: true },
    stock_id: { type: Number, required: true },
    net_quantity: { type: Number, default: 0 },
    average_price: { type: Number, default: 0 },
    profit_loss: { type: Number, default: 0 }
}, { timestamps: true });

// Prevent duplicate portfolio entries identically matching user to single stock instance physically!
portfolioSchema.index({ user_id: 1, stock_id: 1 }, { unique: true });

module.exports = mongoose.model('Portfolio', portfolioSchema);
