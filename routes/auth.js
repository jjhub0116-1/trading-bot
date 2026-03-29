const express = require('express');
const router = express.Router();
const { authenticate } = require('../modules/auth');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_TRADING_KEY_999";

// POST /api/auth/login
// Send JSON: { "email": "smriti@test.com", "password": "hashed" }
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await authenticate(email, password);

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.user_id, email: user.email, name: user.user_name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: "Login Successful",
            token: token,
            user: {
                id: user.user_id,
                name: user.user_name,
                email: user.email
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
