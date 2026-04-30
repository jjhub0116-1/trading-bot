require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../config/db');

async function generateUserId() {
    const count = await User.countDocuments();
    return count + 1001; 
}

async function seedUsers() {
    await connectDB();
    console.log('Connected to DB for seeding superadmin and admins...');

    const superEmail = 'superadmin@propfirm.com';
    const admin1Email = 'admin1@propfirm.com';
    const admin2Email = 'admin2@propfirm.com';
    
    // Clear existing for a clean slate
    await User.deleteMany({ email: { $in: [superEmail, admin1Email, admin2Email] } });

    const hashedPassword = await bcrypt.hash('password123', 12);
    
    // Create Super Admin
    const superAdmin = new User({
        user_id: await generateUserId(),
        user_name: 'Main Super Admin',
        email: superEmail,
        password: hashedPassword,
        role: 'superadmin',
        commodity_equity: 1000000,
        loss_limit: 100000,
        created_by: null
    });
    await superAdmin.save();
    console.log(`✅ Super Admin created: ${superEmail} (Pass: password123) | Limit: 1M Equity, 100K Loss`);

    // Create Admin 1
    const admin1 = new User({
        user_id: await generateUserId(),
        user_name: 'Regional Admin 1',
        email: admin1Email,
        password: hashedPassword,
        role: 'admin',
        commodity_equity: 100000, // SuperAdmin gives 100K to Admin1
        loss_limit: 10000,        // SuperAdmin gives 10K to Admin1
        created_by: superAdmin.user_id
    });
    await admin1.save();
    
    // Create Admin 2
    const admin2 = new User({
        user_id: await generateUserId(),
        user_name: 'Regional Admin 2',
        email: admin2Email,
        password: hashedPassword,
        role: 'admin',
        commodity_equity: 150000, // SuperAdmin gives 150K to Admin2
        loss_limit: 15000,        // SuperAdmin gives 15K to Admin2
        created_by: superAdmin.user_id
    });
    await admin2.save();

    // Deduct the given amounts from the Super Admin's pool!
    // Total given: 250,000 equity, 25,000 loss limit
    superAdmin.commodity_equity -= 250000;
    superAdmin.loss_limit -= 25000;
    await superAdmin.save();

    console.log(`✅ Admin 1 created: ${admin1Email} (Pass: password123) | Limit: 100K Equity, 10K Loss`);
    console.log(`✅ Admin 2 created: ${admin2Email} (Pass: password123) | Limit: 150K Equity, 15K Loss`);
    
    console.log(`\nSuper Admin remaining pools: ${superAdmin.commodity_equity} Equity, ${superAdmin.loss_limit} Loss`);
    process.exit(0);
}

seedUsers().catch(console.error);
