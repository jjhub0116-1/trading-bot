require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

async function seedMohit() {
    await connectDB();
    
    const hashedPassword = await bcrypt.hash("hashed", 12);
    const mohit = {
        user_id: 3,
        user_name: "Mohit",
        email: "mohit@test.com",
        password: hashedPassword,
        equity: 5000,
        loss_limit: 500
    };

    try {
        const existing = await User.findOne({ email: "mohit@test.com" });
        if (existing) {
            console.log("User Mohit already exists. Updating password...");
            existing.password = hashedPassword;
            await existing.save();
        } else {
            await User.create(mohit);
            console.log("User Mohit seeded successfully!");
        }
    } catch (error) {
        console.error("Error seeding Mohit:", error);
    } finally {
        mongoose.connection.close();
    }
}

seedMohit();
