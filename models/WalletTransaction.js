const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
    transaction_id: { type: String, required: true, unique: true },
    user_id: { type: Number, required: true },
    user_name: { type: String, required: true },
    amount: { type: Number, required: true },
    stock_id: { type: Number, required: true },
    quantity: { type: Number, required: true },
    side: { type: String, enum: ['BUY', 'SELL'], required: true },
    timestamp: { type: Date, default: Date.now }
});

// Compound index for /api/wallet/transactions endpoint
walletTransactionSchema.index({ user_id: 1, timestamp: -1 });

// TTL index: auto-purge transactions older than 1 year
walletTransactionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
