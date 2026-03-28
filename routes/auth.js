const express = require('express');
const router = express.Router();
const { authenticate } = require('../modules/auth');

// POST /api/auth/login
// Send JSON: { "email": "smriti@test.com", "password": "hashed" }
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await authenticate(email, password);

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        res.json({
            success: true,
            message: "Login Successful",
            user: {
                id: user.user_id,
                name: user.user_name,
                email: user.email,
                balance: user.total_balance
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
