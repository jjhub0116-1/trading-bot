const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

async function checkRohan() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'rohan@test.com' });
        
        if (user) {
            console.log("👤 User 'Rohan' Profile In Database:");
            console.log("------------------------------------");
            console.log(`ID:         ${user.user_id}`);
            console.log(`Name:       ${user.user_name}`);
            console.log(`Email:      ${user.email}`);
            console.log(`Equity:     ${user.equity} shares`);
            console.log(`Loss Limit: $${user.loss_limit}`);
            console.log(`Is Flagged: ${user.is_flagged}`);
            console.log("------------------------------------");
        } else {
            console.log("❌ User 'rohan@test.com' not found.");
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkRohan();
