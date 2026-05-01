const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// Superadmin routes
router.post('/create-admin', authMiddleware, authMiddleware.isSuperAdmin, adminController.createAdmin);

// Admin and Superadmin routes
router.get('/users', authMiddleware, authMiddleware.isAdminOrSuperAdmin, adminController.getUsers);
router.post('/create-user', authMiddleware, authMiddleware.isAdmin, adminController.createUser);
router.get('/users/:userId', authMiddleware, authMiddleware.isAdminOrSuperAdmin, adminController.getUser);
router.put('/users/:userId', authMiddleware, authMiddleware.isAdminOrSuperAdmin, adminController.updateUser);

module.exports = router;
