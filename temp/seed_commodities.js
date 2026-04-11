/**
 * Seed script for Commodities and Futures symbols (Yahoo Finance)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Stock = require('../models/Stock');

const commodities = [
    { stock_id: 201, symbol: "GC=F", stock_name: "Gold Futures", asset_type: "COMMODITY", current_price: 2300 },
    { stock_id: 202, symbol: "SI=F", stock_name: "Silver Futures", asset_type: "COMMODITY", current_price: 28 },
    { stock_id: 203, symbol: "PL=F", stock_name: "Platinum Jul 26", asset_type: "COMMODITY", current_price: 1000 },
    { stock_id: 204, symbol: "HG=F", stock_name: "Copper May 26", asset_type: "COMMODITY", current_price: 4 },
    { stock_id: 205, symbol: "ZS=F", stock_name: "Soybean Futures", asset_type: "COMMODITY", current_price: 11 }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for seeding...");

        const ops = commodities.map(c => ({
            updateOne: {
                filter: { symbol: c.symbol },
                update: { $set: c },
                upsert: true
            }
        }));

        const result = await Stock.bulkWrite(ops);
        console.log(`✅ Seeded ${result.upsertedCount + result.modifiedCount} Commodities successfully!`);
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("Seeding error:", error);
        process.exit(1);
    }
}

seed();
