const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_TRADING_KEY_999";

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized Security Fault: Missing or explicitly improperly formatted Bearer token."
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Mounts { id, email, name } natively globally onto the request pipeline
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            message: "Critical Identity Fault: Invalid or expired Bearer token payload organically rejected."
        });
    }
}

module.exports = authMiddleware;
