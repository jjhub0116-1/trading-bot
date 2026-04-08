const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

async function listAllUsers() {
    console.log("🔍 Fetching all users from MongoDB Atlas...");
    
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const users = await User.find({}, { password: 0 }).sort({ user_id: 1 });
        
        if (users.length === 0) {
            console.log("📭 No users found in the database.");
        } else {
            console.log(`✅ Found ${users.length} users:`);
            console.table(users.map(u => ({
                ID: u.user_id,
                Name: u.user_name,
                Email: u.email,
                Equity: u.equity,
                Flagged: u.is_flagged,
                Created: u.createdAt.toLocaleString()
            })));
        }
    } catch (error) {
        console.error("❌ Error fetching users:", error.message);
    } finally {
        await mongoose.connection.close();
    }
}

listAllUsers();
