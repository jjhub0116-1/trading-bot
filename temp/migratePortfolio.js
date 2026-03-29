require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function migrate() {
    await connectDB();
    console.log("Starting portfolio schema migration...");

    try {
        // Drop the old per-stock portfolio collection entirely.
        // The new schema (one-doc-per-user) will be recreated automatically on first trade.
        await mongoose.connection.collection('portfolios').drop();
        console.log("✅ Old per-stock portfolio collection dropped successfully.");
        console.log("   New portfolios will be created automatically on first trade.");
    } catch (err) {
        if (err.message === 'ns not found') {
            console.log("✅ Portfolio collection was already empty — nothing to drop.");
        } else {
            console.error("Migration error:", err.message);
        }
    }

    process.exit(0);
}

migrate();
