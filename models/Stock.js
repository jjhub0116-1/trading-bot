const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    stock_id: { type: Number, required: true, unique: true },
    symbol: { type: String, required: true },
    stock_name: { type: String, required: true },
    current_price: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Stock', stockSchema);
