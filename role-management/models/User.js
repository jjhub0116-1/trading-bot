const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true },
    user_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['user', 'admin', 'superadmin'],
        default: 'user'
    },
    equity: { type: Number, default: 0 },
    used_equity: { type: Number, default: 0 },
    commodity_equity: { type: Number, default: 0 },
    used_commodity_equity: { type: Number, default: 0 },
    lossLimit: { type: Number, default: 500 },
    equityLotLimit: { type: Number, default: 0 },
    is_flagged: { type: Boolean, default: false },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);