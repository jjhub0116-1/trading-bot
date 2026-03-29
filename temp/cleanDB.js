require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function clean() {
    try {
        await connectDB();
        const User = require('../models/User');

        const result = await User.updateMany(
            {},
            { $unset: { total_balance: "", lot_limit: "", equity_limit: "" } },
            { strict: false } // Required organically to physically wipe fields completely missing from the schema explicitly.
        );

        console.log(`\n✅ Successfully wiped legacy ghost fields from ${result.modifiedCount} User Documents natively inside MongoDB!\n`);
        process.exit(0);
    } catch (err) {
        console.error("Clean failed", err);
        process.exit(1);
    }
}
clean();
