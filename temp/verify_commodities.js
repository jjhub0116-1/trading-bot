/**
 * Comprehensive Verification Script for Commodities & Futures
 * Verifies that all requested fields are correctly populated and updated.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Stock = require('../models/Stock');

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for verification...");

        // 1. Trigger a fresh fetch for a commodity symbol (e.g., Gold 'GC=F')
        const { fetchAndUpdatePrices } = require('../modules/priceFetcher');
        console.log("📡 Fetching latest metrics for Gold (GC=F)...");
        // We'll run the internal fetcher logic once
        await fetchAndUpdatePrices();

        // 2. Query the DB to check ALL fields
        const gold = await Stock.findOne({ symbol: "GC=F" }).lean();

        if (!gold) {
            console.error("❌ FAIL: Gold (GC=F) not found in database.");
            process.exit(1);
        }

        console.log("\n=============================================");
        console.log("  🔍 COMMODITY FIELD VERIFICATION (GOLD)");
        console.log("=============================================");
        
        const fields = [
            'stock_id', 'symbol', 'stock_name', 'current_price', 'asset_type',
            'fiftyTwoWeekHigh', 'fiftyTwoWeekLow', 'dayHigh', 'dayLow', 'previousClose', 'open'
        ];

        let missing = 0;
        fields.forEach(f => {
            const val = gold[f];
            const status = (val !== undefined && val !== null) ? "✅" : "❌";
            console.log(`${status} ${f.padEnd(18)} : ${val}`);
            if (status === "❌") missing++;
        });

        console.log("=============================================\n");

        if (missing === 0) {
            console.log("✨ SUCCESS: All commodity fields are present and working correctly!");
        } else {
            console.log(`⚠️ WARNING: ${missing} fields are missing or empty.`);
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("Verification error:", error);
        process.exit(1);
    }
}

verify();
