/**
 * JSON-based Verification Script for Commodities
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const fs = require('fs');
const path = require('path');

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const { fetchAndUpdatePrices } = require('../modules/priceFetcher');
        await fetchAndUpdatePrices();

        const gold = await Stock.findOne({ symbol: "GC=F" }).lean();
        
        if (!gold) {
            console.error("Gold not found");
            process.exit(1);
        }

        const report = {
            timestamp: new Date().toISOString(),
            gold_data: gold,
            all_fields_present: [
                'stock_id', 'symbol', 'stock_name', 'current_price', 'asset_type',
                'fiftyTwoWeekHigh', 'fiftyTwoWeekLow', 'dayHigh', 'dayLow', 'previousClose', 'open'
            ].every(f => gold[f] !== undefined && gold[f] !== null)
        };

        fs.writeFileSync(path.join(__dirname, 'verify_report.json'), JSON.stringify(report, null, 2));
        console.log("Report generated: verify_report.json");

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verify();
