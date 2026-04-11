const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    stock_id: { type: Number, required: true, unique: true },
    symbol: { type: String, required: true },
    stock_name: { type: String, required: true },
    current_price: { type: Number, required: true },
    fiftyTwoWeekHigh: { type: Number },
    fiftyTwoWeekLow: { type: Number },
    dayHigh: { type: Number },
    dayLow: { type: Number },
    previousClose: { type: Number },
    open: { type: Number }
}, { timestamps: true });

// Critical: market stream fires updateOne({ symbol }) on every trade tick.
// Without this index, every update is a full collection scan.
stockSchema.index({ symbol: 1 });

module.exports = mongoose.model('Stock', stockSchema);
