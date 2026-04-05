require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Stock = require('../models/Stock');

async function seedTesla() {
    await connectDB();
    
    const tesla = {
        stock_id: 3,
        symbol: "TSLA",
        stock_name: "Tesla Inc",
        current_price: 270
    };

    try {
        const existing = await Stock.findOne({ symbol: "TSLA" });
        if (existing) {
            console.log("Tesla already exists. Updating price to 270...");
            existing.current_price = 270;
            await existing.save();
        } else {
            await Stock.create(tesla);
            console.log("Tesla stock seeded successfully!");
        }
    } catch (error) {
        console.error("Error seeding Tesla:", error);
    } finally {
        mongoose.connection.close();
    }
}

seedTesla();
