const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// Superadmin routes
router.post('/create-admin', authMiddleware, authMiddleware.isSuperAdmin, adminController.createAdmin);

// Admin routes
router.get('/users', authMiddleware, authMiddleware.isAdmin, adminController.getUsers);
router.post('/create-user', authMiddleware, authMiddleware.isAdmin, adminController.createUser);
router.put('/users/:userId', authMiddleware, authMiddleware.isAdmin, adminController.updateUser);

module.exports = router;
