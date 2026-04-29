require('dotenv').config();

// Increase Jest timeout for database operations
jest.setTimeout(30000);

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const adminRoutes = require('../routes/adminRoutes');
const authMiddleware = require('../middleware/authMiddleware');

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);

let superAdminToken, adminToken, superAdminId, adminId, userId;
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_testing_only';

// Helper function to create JWT token
const createToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, { expiresIn: '1h' });
};

describe('Role Management Module - Admin Routes', () => {

    // Setup: Connect to test database
    beforeAll(async() => {
        // Use trading_bot MongoDB URI
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/trading_bot_test';
        try {
            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                connectTimeoutMS: 20000,
                serverSelectionTimeoutMS: 20000
            });
            console.log('✅ Connected to MongoDB Atlas');
        } catch (error) {
            console.error('❌ MongoDB Connection Failed:', error.message);
            throw new Error('Cannot run tests without database connection');
        }
    });

    // Cleanup: Clear database and disconnect
    afterAll(async() => {
        try {
            await User.deleteMany({});
            await mongoose.disconnect();
            console.log('Database cleaned and disconnected');
        } catch (error) {
            console.log('Cleanup error:', error);
        }
    });

    // Test Suite 1: Create Admin (Superadmin Only)
    describe('POST /admin/create-admin', () => {

        test('Should fail - No token provided', async() => {
            const res = await request(app)
                .post('/admin/create-admin')
                .send({
                    user_name: 'Test Admin',
                    email: 'testadmin@example.com',
                    password: 'password123',
                    equityLotLimit: 1000000,
                    lossLimit: 100000
                });

            expect(res.status).toBe(401);
            expect(res.body.message).toContain('Unauthorized');
        });

        test('Should fail - Invalid token', async() => {
            const res = await request(app)
                .post('/admin/create-admin')
                .set('Authorization', 'Bearer invalidToken123')
                .send({
                    user_name: 'Test Admin',
                    email: 'testadmin@example.com',
                    password: 'password123',
                    equityLotLimit: 1000000,
                    lossLimit: 100000
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Forbidden');
        });

        test('Should create superadmin first (manual DB insert for testing)', async() => {
            // Create superadmin directly in database for testing
            const superAdmin = new User({
                user_id: 1000,
                user_name: 'Super Admin',
                email: 'superadmin@test.com',
                password: 'hashed_password',
                role: 'superadmin',
                equityLotLimit: 10000000,
                lossLimit: 1000000
            });
            await superAdmin.save();
            superAdminId = superAdmin._id;
            superAdminToken = createToken(superAdminId);
            expect(superAdmin.role).toBe('superadmin');
        });

        test('Should fail - Non-superadmin trying to create admin', async() => {
            // Create a regular admin first
            const regularAdmin = new User({
                user_id: 2000,
                user_name: 'Regular Admin',
                email: 'admin@test.com',
                password: 'hashed_password',
                role: 'admin',
                equityLotLimit: 500000,
                lossLimit: 50000
            });
            await regularAdmin.save();
            const adminToken = createToken(regularAdmin._id);

            const res = await request(app)
                .post('/admin/create-admin')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    user_name: 'Unauthorized Admin',
                    email: 'unauth@example.com',
                    password: 'password123',
                    equityLotLimit: 500000,
                    lossLimit: 50000
                });

            expect(res.status).toBe(403);
            expect(res.body.error).toContain('Superadmin only');
        });

        test('Should successfully create admin with valid superadmin token', async() => {
            const res = await request(app)
                .post('/admin/create-admin')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    user_name: 'Admin John',
                    email: 'admin.john@test.com',
                    password: 'securePassword123',
                    equityLotLimit: 500000,
                    lossLimit: 50000
                });

            expect(res.status).toBe(201);
            expect(res.body.role).toBe('admin');
            expect(res.body.user_name).toBe('Admin John');
            expect(res.body.equityLotLimit).toBe(500000);
            expect(res.body.lossLimit).toBe(50000);
            expect(res.body.createdBy).toEqual(superAdminId.toString());

            adminId = res.body._id;
            adminToken = createToken(adminId);
        });
    });

    // Test Suite 2: Create User (Admin Only)
    describe('POST /admin/create-user', () => {

        test('Should fail - No token provided', async() => {
            const res = await request(app)
                .post('/admin/create-user')
                .send({
                    user_name: 'Test User',
                    email: 'testuser@example.com',
                    password: 'password123',
                    equity: 50000,
                    lossLimit: 5000
                });

            expect(res.status).toBe(401);
        });

        test('Should fail - Non-admin trying to create user', async() => {
            // Create a regular user
            const regularUser = new User({
                user_id: 3000,
                user_name: 'Regular User',
                email: 'user@test.com',
                password: 'hashed_password',
                role: 'user',
                equity: 50000,
                lossLimit: 5000
            });
            await regularUser.save();
            const userToken = createToken(regularUser._id);

            const res = await request(app)
                .post('/admin/create-user')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    user_name: 'New User',
                    email: 'newuser@example.com',
                    password: 'password123',
                    equity: 50000,
                    lossLimit: 5000
                });

            expect(res.status).toBe(403);
            expect(res.body.error).toContain('Admin only');
        });

        test('Should fail - Equity exceeds admin lot limit', async() => {
            const res = await request(app)
                .post('/admin/create-user')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    user_name: 'Excessive User',
                    email: 'excessive@example.com',
                    password: 'password123',
                    equity: 1000000, // Exceeds admin's 500000 limit
                    lossLimit: 5000
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Equity exceeds admin lot limit');
        });

        test('Should fail - Loss limit exceeds admin loss limit', async() => {
            const res = await request(app)
                .post('/admin/create-user')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    user_name: 'High Loss User',
                    email: 'highloss@example.com',
                    password: 'password123',
                    equity: 50000,
                    lossLimit: 100000 // Exceeds admin's 50000 limit
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Loss limit exceeds admin limit');
        });

        test('Should successfully create user and deduct from admin limit', async() => {
            // Get current admin state
            const adminBefore = await User.findById(adminId);
            const equityBefore = adminBefore.equityLotLimit;

            const res = await request(app)
                .post('/admin/create-user')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    user_name: 'Trader Alice',
                    email: 'alice@example.com',
                    password: 'traderPass456',
                    equity: 50000,
                    lossLimit: 5000
                });

            expect(res.status).toBe(201);
            expect(res.body.role).toBe('user');
            expect(res.body.user_name).toBe('Trader Alice');
            expect(res.body.equity).toBe(50000);
            expect(res.body.lossLimit).toBe(5000);
            expect(res.body.createdBy).toEqual(adminId.toString());

            // Verify admin's lot limit was reduced
            const adminAfter = await User.findById(adminId);
            expect(adminAfter.equityLotLimit).toBe(equityBefore - 50000);

            userId = res.body._id;
        });

        test('Should successfully create another user', async() => {
            const res = await request(app)
                .post('/admin/create-user')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    user_name: 'Trader Bob',
                    email: 'bob@example.com',
                    password: 'bobPass789',
                    equity: 75000,
                    lossLimit: 7500
                });

            expect(res.status).toBe(201);
            expect(res.body.user_name).toBe('Trader Bob');
            expect(res.body.equity).toBe(75000);
        });

        test('Should fail - Insufficient equity to create another user', async() => {
            // Admin has 500k, already gave 50k + 75k = 125k, has 375k left
            const res = await request(app)
                .post('/admin/create-user')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    user_name: 'Trader Charlie',
                    email: 'charlie@example.com',
                    password: 'charliePass',
                    equity: 400000, // Exceeds remaining 375k
                    lossLimit: 5000
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Equity exceeds admin lot limit');
        });
    });

    // Test Suite 3: Update User (Admin Only)
    describe('PUT /admin/users/:userId', () => {

        test('Should fail - No token provided', async() => {
            const res = await request(app)
                .put(`/admin/users/${userId}`)
                .send({
                    equity: 75000,
                    lossLimit: 7500
                });

            expect(res.status).toBe(401);
        });

        test('Should fail - Non-admin trying to update user', async() => {
            const userToken = createToken('507f1f77bcf86cd799439013');

            const res = await request(app)
                .put(`/admin/users/${userId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    equity: 75000
                });

            expect(res.status).toBe(403);
        });

        test('Should fail - Updating user not created by admin', async() => {
            // Create another admin
            const otherAdmin = new User({
                user_id: 4000,
                user_name: 'Other Admin',
                email: 'otheradmin@test.com',
                password: 'hashed_password',
                role: 'admin',
                equityLotLimit: 300000,
                lossLimit: 30000,
                createdBy: superAdminId
            });
            await otherAdmin.save();
            const otherAdminToken = createToken(otherAdmin._id);

            const res = await request(app)
                .put(`/admin/users/${userId}`)
                .set('Authorization', `Bearer ${otherAdminToken}`)
                .send({
                    equity: 75000
                });

            expect(res.status).toBe(404);
        });

        test('Should successfully update user lossLimit', async() => {
            const res = await request(app)
                .put(`/admin/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    lossLimit: 10000
                });

            expect(res.status).toBe(200);
            expect(res.body.lossLimit).toBe(10000);
        });

        test('Should successfully update user equity within limits', async() => {
            const adminBefore = await User.findById(adminId);
            const equityBefore = adminBefore.equityLotLimit;

            const res = await request(app)
                .put(`/admin/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    equity: 100000 // Increase from 50000 to 100000 (difference = 50000)
                });

            expect(res.status).toBe(200);
            expect(res.body.equity).toBe(100000);

            // Verify admin's lot limit was reduced by difference
            const adminAfter = await User.findById(adminId);
            expect(adminAfter.equityLotLimit).toBe(equityBefore - 50000);
        });

        test('Should fail - Insufficient equity to increase user equity', async() => {
            const res = await request(app)
                .put(`/admin/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    equity: 500000 // Try to increase by 400000, but admin doesn't have that much left
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Equity exceeds admin lot limit');
        });

        test('Should successfully decrease user equity (frees up admin resources)', async() => {
            const adminBefore = await User.findById(adminId);
            const equityBefore = adminBefore.equityLotLimit;

            const res = await request(app)
                .put(`/admin/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    equity: 50000 // Decrease from 100000 to 50000 (difference = -50000)
                });

            expect(res.status).toBe(200);
            expect(res.body.equity).toBe(50000);

            // Verify admin's lot limit increased (freed resources)
            const adminAfter = await User.findById(adminId);
            expect(adminAfter.equityLotLimit).toBe(equityBefore + 50000);
        });

        test('Should successfully update multiple user properties', async() => {
            const res = await request(app)
                .put(`/admin/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    user_name: 'Trader Alice Updated',
                    is_flagged: true,
                    lossLimit: 15000
                });

            expect(res.status).toBe(200);
            expect(res.body.user_name).toBe('Trader Alice Updated');
            expect(res.body.is_flagged).toBe(true);
            expect(res.body.lossLimit).toBe(15000);
        });
    });

    // Test Suite 4: Integration Tests
    describe('Integration Tests - Complete Workflow', () => {

        test('Complete workflow: Superadmin creates Admin, Admin creates Users', async() => {
            // 1. Create new superadmin
            const supervisor = new User({
                user_id: 5000,
                user_name: 'Supervisor',
                email: 'supervisor@test.com',
                password: 'hashed',
                role: 'superadmin',
                equityLotLimit: 2000000,
                lossLimit: 200000
            });
            await supervisor.save();
            const supervisorToken = createToken(supervisor._id);

            // 2. Supervisor creates multiple admins
            const admin1Res = await request(app)
                .post('/admin/create-admin')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    user_name: 'Admin Region 1',
                    email: 'admin.region1@test.com',
                    password: 'adminPass1',
                    equityLotLimit: 800000,
                    lossLimit: 80000
                });
            expect(admin1Res.status).toBe(201);
            const admin1Id = admin1Res.body._id;
            const admin1Token = createToken(admin1Id);

            // 3. Admin1 creates multiple users
            const user1Res = await request(app)
                .post('/admin/create-user')
                .set('Authorization', `Bearer ${admin1Token}`)
                .send({
                    user_name: 'Trader 1',
                    email: 'trader1@test.com',
                    password: 'pass1',
                    equity: 100000,
                    lossLimit: 10000
                });
            expect(user1Res.status).toBe(201);

            const user2Res = await request(app)
                .post('/admin/create-user')
                .set('Authorization', `Bearer ${admin1Token}`)
                .send({
                    user_name: 'Trader 2',
                    email: 'trader2@test.com',
                    password: 'pass2',
                    equity: 150000,
                    lossLimit: 15000
                });
            expect(user2Res.status).toBe(201);

            // 4. Verify admin1's equity was properly deducted
            const admin1Updated = await User.findById(admin1Id);
            expect(admin1Updated.equityLotLimit).toBe(800000 - 100000 - 150000); // 550000

            // 5. Admin1 updates a user
            const updateRes = await request(app)
                .put(`/admin/users/${user1Res.body._id}`)
                .set('Authorization', `Bearer ${admin1Token}`)
                .send({
                    equity: 120000,
                    is_flagged: false
                });
            expect(updateRes.status).toBe(200);
            expect(updateRes.body.equity).toBe(120000);

            // 6. Verify final admin equity state
            const admin1Final = await User.findById(admin1Id);
            expect(admin1Final.equityLotLimit).toBe(800000 - 120000 - 150000); // 530000
        });
    });
});

console.log('Test suite created successfully!');