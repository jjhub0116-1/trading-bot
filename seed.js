const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Stock = require('./models/Stock');
const Order = require('./models/Order');
const Portfolio = require('./models/Portfolio');
const WalletTransaction = require('./models/WalletTransaction');
const Trade = require('./models/Trade');

async function seedDatabase() {
    await connectDB();
    console.log("🧹 Wiping previous Mongo database records cleanly...");

    await Promise.all([
        User.deleteMany({}),
        Stock.deleteMany({}),
        Order.deleteMany({}),
        Portfolio.deleteMany({}),
        WalletTransaction.deleteMany({}),
        Trade.deleteMany({})
    ]);

    console.log("🌱 Injecting Base Stocks and Users Native Data Mappings...");

    await User.insertMany([
        { user_id: 1, user_name: "Rahul", email: "rahul@test.com", password: "hashed", total_balance: 100000, lot_limit: 0 },
        { user_id: 2, user_name: "smriti", email: "smriti@test.com", password: "hashed", total_balance: 100000, lot_limit: 10 }
    ]);

    await Stock.insertMany([
        { stock_id: 1, symbol: "AAPL", stock_name: "Apple Inc", current_price: 200 },
        { stock_id: 2, symbol: "NOK", stock_name: "Nokia Corp", current_price: 150 }
    ]);

    console.log("✅ Database securely structured and logically populated sequentially with Rahul, Smriti, AAPL, and NOK!");
    process.exit();
}

seedDatabase();
