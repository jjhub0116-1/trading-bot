require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function fixIndexes() {
    await connectDB();
    console.log("Fixing stale Portfolio indexes...");

    try {
        // Drop all stale indexes from the old schema
        await mongoose.connection.collection('portfolios').dropIndexes();
        console.log("✅ All old portfolio indexes dropped.");
        console.log("   Mongoose will recreate the correct ones on next startup.");
    } catch (err) {
        if (err.message.includes('ns not found') || err.message.includes('cannot find')) {
            console.log("✅ No stale indexes to drop — collection is clean.");
        } else {
            console.error("Index fix error:", err.message);
        }
    }

    process.exit(0);
}

fixIndexes();
