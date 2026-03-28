const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true },
    user_name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    total_balance: { type: Number, default: 0 },
    lot_limit: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
