require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Stock = require('../models/Stock');

async function seedMSFTandJohn() {
    await connectDB();
    
    try {
        const hashedPassword = await bcrypt.hash("hashed", 12);

        // Seed John
        const john = { user_id: 4, user_name: "John", email: "john@test.com", password: hashedPassword, equity: 15000, loss_limit: 1500, is_flagged: false };
        if (!(await User.findOne({ email: "john@test.com" }))) {
            await User.create(john);
            console.log("User John seeded!");
        } else {
             console.log("User John already exists!");
        }

        // Seed MSFT
        const msft = { stock_id: 4, symbol: "MSFT", stock_name: "Microsoft Corp", current_price: 400 };
        if (!(await Stock.findOne({ symbol: "MSFT" }))) {
            await Stock.create(msft);
            console.log("Stock MSFT seeded!");
        } else {
            console.log("Stock MSFT already exists!");
        }

    } catch (error) {
        console.error("Error seeding MSFT & John:", error);
    } finally {
        mongoose.connection.close();
    }
}

seedMSFTandJohn();
