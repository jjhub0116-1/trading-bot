const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// Superadmin routes
router.post('/create-admin', authMiddleware, authMiddleware.isSuperAdmin, adminController.createAdmin);

// Admin and Superadmin routes
router.get('/users', authMiddleware, authMiddleware.isAdminOrSuperAdmin, adminController.getUsers);
router.post('/create-user', authMiddleware, authMiddleware.isAdminOrSuperAdmin, adminController.createUser);
router.get('/users/:userId', authMiddleware, authMiddleware.isAdminOrSuperAdmin, adminController.getUser);
router.get('/users/:userId/portfolio', authMiddleware, authMiddleware.isAdminOrSuperAdmin, adminController.getUserPortfolio);
router.get('/users/:userId/wallet', authMiddleware, authMiddleware.isAdminOrSuperAdmin, adminController.getUserWallet);
router.get('/users/:userId/transactions', authMiddleware, authMiddleware.isAdminOrSuperAdmin, adminController.getUserTransactions);
router.put('/users/:userId', authMiddleware, authMiddleware.isAdminOrSuperAdmin, adminController.updateUser);

module.exports = router;
