require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.\n');

        // Find the most recently created user
        const user = await User.findOne().sort({ createdAt: -1 });

        if (!user) {
            console.log('No users found in the database.');
        } else {
            console.log('--- LATEST REGISTERED USER ---');
            console.log(`Name:     ${user.user_name}`);
            console.log(`Email:    ${user.email}`);
            console.log(`User ID:  ${user.user_id}`);
            console.log(`Equity:   ${user.equity} shares`);
            console.log(`Loss Lmt: $${user.loss_limit}`);
            console.log(`Password: ${user.password.substring(0, 10)}... (SECURELY HASHED)`);
            console.log('------------------------------\n');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUser();
