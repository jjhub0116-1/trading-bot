require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const authRoutes = require('../routes/auth');
const adminRoutes = require('../routes/admin');
const User = require('../models/User');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

async function runTests() {
    console.log("=== Setting up test environment ===");
    await connectDB();
    
    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

    // Clear previous test users
    await User.deleteMany({ email: { $in: ['super@test.com', 'admin@test.com', 'user@test.com', 'fake@test.com', 'greedy@test.com'] } });

    console.log("\n--- TEST 1: Create Superadmin manually ---");
    const superadmin = new User({
        user_id: 99990,
        user_name: 'Test Superadmin',
        email: 'super@test.com',
        password: 'hash',
        role: 'superadmin',
        equity_lot_limit: 100000,
        loss_limit: 10000
    });
    await superadmin.save();
    console.log("✅ Superadmin created in DB");

    const jwt = require('jsonwebtoken');
    const superToken = jwt.sign({ id: superadmin.user_id, email: superadmin.email, name: superadmin.user_name, role: superadmin.role }, process.env.JWT_SECRET);

    console.log("\n--- TEST 2: Superadmin creates an Admin ---");
    let adminToken;
    let adminId;
    
    const res1 = await fetch(`${baseUrl}/api/admin/create-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superToken}` },
        body: JSON.stringify({
            user_name: "Test Admin",
            email: "admin@test.com",
            password: "password123",
            lot_limit: 50000,
            loss_limit: 5000
        })
    });
    
    if (res1.status === 201) {
        console.log("✅ Admin created successfully");
        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "admin@test.com", password: "password123" })
        });
        const loginData = await loginRes.json();
        adminToken = loginData.token;
        adminId = loginData.user.id;
    } else {
        console.error("❌ Failed to create admin", await res1.json());
    }

    console.log("\n--- TEST 3: Admin creates a User ---");
    let userId;
    const res2 = await fetch(`${baseUrl}/api/admin/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({
            user_name: "Test User",
            email: "user@test.com",
            password: "password123",
            lot_limit: 100,
            loss_limit: 1000
        })
    });

    if (res2.status === 201) {
        console.log("✅ User created successfully");
        const data = await res2.json();
        userId = data.user_id;
    } else {
        console.error("❌ Failed to create user", await res2.json());
    }

    console.log("\n--- TEST 4: Check if Admin limits decreased ---");
    const updatedAdmin = await User.findOne({ email: "admin@test.com" });
    if (updatedAdmin.commodity_equity === 49900) {
        console.log("✅ Admin lot limit decreased successfully (Now 49900)");
    } else {
        console.error("❌ Admin limit not updated correctly. Current:", updatedAdmin.commodity_equity);
    }

    console.log("\n--- TEST 5: Admin attempts to create User exceeding limits ---");
    const res3 = await fetch(`${baseUrl}/api/admin/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({
            user_name: "Greedy User",
            email: "greedy@test.com",
            password: "password123",
            lot_limit: 50000,
            loss_limit: 1000
        })
    });

    if (res3.status === 400) {
        const body = await res3.json();
        if (body.error === 'Equity exceeds admin lot limit') {
            console.log("✅ Properly blocked user creation exceeding admin limits");
        }
    } else {
        console.error("❌ Failed to block excessive equity", await res3.json());
    }

    console.log("\n--- TEST 6: User attempts to create another User ---");
    const userLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "user@test.com", password: "password123" })
    });
    const userLoginData = await userLoginRes.json();
    const userToken = userLoginData.token;

    const res4 = await fetch(`${baseUrl}/api/admin/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
        body: JSON.stringify({
            user_name: "Fake User",
            email: "fake@test.com",
            password: "password123",
            lot_limit: 10,
            loss_limit: 100
        })
    });

    if (res4.status === 403) {
        console.log("✅ Properly blocked normal user from using admin routes");
    } else {
        console.error("❌ User was not blocked!", await res4.json());
    }

    console.log("\n--- TEST 7: Admin updates a User ---");
    const res5 = await fetch(`${baseUrl}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({
            lot_limit: 150
        })
    });

    if (res5.status === 200) {
        console.log("✅ Admin successfully updated user equity");
        const adminAfterUpdate = await User.findOne({ email: "admin@test.com" });
        if (adminAfterUpdate.commodity_equity === 49850) {
            console.log("✅ Admin limit properly deducted after user update (Now 49850)");
        } else {
            console.error("❌ Admin limit mismatch after update. Current:", adminAfterUpdate.commodity_equity);
        }
    } else {
        console.error("❌ Failed to update user", await res5.json());
    }

    console.log("\n--- TEST 8: Admin fetches their users ---");
    const res6 = await fetch(`${baseUrl}/api/admin/users`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res6.status === 200) {
        const users = await res6.json();
        console.log(`✅ Admin successfully fetched their users. Count: ${users.length}`);
        const testUser = users.find(u => u.email === "user@test.com");
        if (testUser && testUser.can_trade_stocks === true && testUser.can_trade_commodities === true) {
            console.log("✅ User flags are present and default to true.");
        } else {
            console.error("❌ User flags missing or incorrect.", testUser);
        }
    } else {
        console.error("❌ Failed to fetch users", await res6.text());
    }

    // Cleanup
    console.log("\n=== Cleaning up ===");
    await User.deleteMany({ email: { $in: ['super@test.com', 'admin@test.com', 'user@test.com', 'greedy@test.com', 'fake@test.com'] } });
    await mongoose.connection.close();
    server.close();
    console.log("Tests Complete.");
}

runTests().catch(err => { console.error(err); process.exit(1); });
