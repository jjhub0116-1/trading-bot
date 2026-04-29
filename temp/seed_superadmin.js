require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../config/db');

async function seedSuperAdmin() {
    await connectDB();
    console.log('Connected to DB for seeding superadmin...');

    const email = 'superadmin1@test.com';
    const existing = await User.findOne({ email });
    if (existing) {
        console.log('Superadmin already exists. Deleting it...');
        await User.deleteOne({ email });
    }

    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const count = await User.countDocuments();
    const superAdmin = new User({
        user_id: count + 1000,
        user_name: 'Big Boss SuperAdmin',
        email,
        password: hashedPassword,
        role: 'superadmin',
        equity_lot_limit: 1000000,
        loss_limit: 100000,
        created_by: null
    });

    await superAdmin.save();
    console.log('Superadmin created successfully:', superAdmin.email, 'password123');
    process.exit(0);
}

seedSuperAdmin().catch(console.error);
