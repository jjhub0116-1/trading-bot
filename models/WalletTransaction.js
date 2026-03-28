const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
    transaction_id: { type: String, required: true, unique: true },
    user_id: { type: Number, required: true },
    user_name: { type: String, required: true },
    amount: { type: Number, required: true },
    stock_id: { type: Number, required: true },
    side: { type: String, enum: ['BUY', 'SELL'], required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
