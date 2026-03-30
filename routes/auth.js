const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../modules/auth');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');

// Strict rate limiter for login — 5 attempts per minute per IP
const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many login attempts. Please try again in 1 minute.' }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const user = await authenticate(email, password);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: user.user_id, email: user.email, name: user.user_name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login Successful',
            token,
            user: { id: user.user_id, name: user.user_name, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
