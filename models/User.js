const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true },
    user_name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    equity: { type: Number, default: 5000 },
    loss_limit: { type: Number, default: 500 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
