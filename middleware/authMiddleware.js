const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required — never use a hardcoded fallback');

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing or malformed Bearer token.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, email, name, role }
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Forbidden: Token expired or invalid.' });
    }
}

authMiddleware.isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'superadmin') {
        next();
    } else {
        return res.status(403).json({ success: false, error: 'Access denied. Superadmin only.' });
    }
};

authMiddleware.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ success: false, error: 'Access denied. Admin only.' });
    }
};

authMiddleware.isUser = (req, res, next) => {
    // If there is no role, or the role is 'user', allow access
    if (req.user && (!req.user.role || req.user.role === 'user')) {
        next();
    } else {
        return res.status(403).json({ success: false, error: 'Access denied. Only standard users can perform this action.' });
    }
};

module.exports = authMiddleware;
