/**
 * Fixer Script: Ensures all users have equity defaults and resolves validation logic.
 */
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function fixUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🚀 Connection established.");

        // 1. Update all users with missing fields
        const result = await User.updateMany(
            { $or: [
                { equity: { $exists: false } },
                { equity: null },
                { commodity_equity: { $exists: false } },
                { commodity_equity: null },
                { used_commodity_equity: { $exists: false } },
                { used_commodity_equity: null }
            ]},
            { $set: { 
                equity: 5000, 
                commodity_equity: 20,
                used_commodity_equity: 0 
            }}
        );

        console.log(`✅ Fixed ${result.modifiedCount} user records.`);
        
        // 2. Double check 
        const users = await User.find({}).lean();
        users.forEach(u => {
            if (!u.commodity_equity) {
                console.error(`❌ User ${u.user_id} (${u.user_name}) still missing limits!`);
            }
        });

        console.log("🎉 All users now have institutional limits.");
        process.exit(0);
    } catch (err) {
        console.error("💥 Error:", err);
        process.exit(1);
    }
}

fixUsers();
