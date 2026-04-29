const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticate, registerAccount } = require('../modules/auth');
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
            { id: user.user_id, email: user.email, name: user.user_name, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login Successful',
            token,
            user: { id: user.user_id, name: user.user_name, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/auth/register (For Admins/Customers via Postman)
router.post('/register', loginLimiter, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
        }

        const userOrError = await registerAccount(name, email, password);

        if (typeof userOrError === 'string') {
            return res.status(400).json({ success: false, message: userOrError });
        }

        // Auto-login after registration
        const token = jwt.sign(
            { id: userOrError.user_id, email: userOrError.email, name: userOrError.user_name, role: userOrError.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Registration Successful',
            token,
            user: { id: userOrError.user_id, name: userOrError.user_name, email: userOrError.email, role: userOrError.role }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
