const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true },
    user_name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
    equity: { type: Number, default: 5000 },
    used_equity: { type: Number, default: 0 },
    commodity_equity: { type: Number, default: 20 },
    used_commodity_equity: { type: Number, default: 0 },
    equity_lot_limit: { type: Number, default: 0 },
    loss_limit: { type: Number, default: 500 },
    is_flagged: { type: Boolean, default: false },
    created_by: { type: Number, default: null } // Stores user_id of the admin who created them
}, { timestamps: true });

// Explicit index for auth query (findOne by email)
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
