const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

    const hashedPassword = await bcrypt.hash("hashed", 12);
    await User.insertMany([
        { user_id: 1, user_name: "Rahul", email: "rahul@test.com", password: hashedPassword, equity: 100000, loss_limit: 5000 },
        { user_id: 2, user_name: "smriti", email: "smriti@test.com", password: hashedPassword, equity: 100000, loss_limit: 10000 },
        { user_id: 3, user_name: "Mohit", email: "mohit@test.com", password: hashedPassword, equity: 5000, loss_limit: 500 },
        { user_id: 4, user_name: "John", email: "john@test.com", password: hashedPassword, equity: 15000, loss_limit: 1500 }
    ]);

    await Stock.insertMany([
        { stock_id: 1, symbol: "AAPL", stock_name: "Apple Inc", current_price: 200 },
        { stock_id: 2, symbol: "NOK", stock_name: "Nokia Corp", current_price: 150 },
        { stock_id: 3, symbol: "TSLA", stock_name: "Tesla Inc", current_price: 270 },
        { stock_id: 4, symbol: "MSFT", stock_name: "Microsoft Corp", current_price: 400 }
    ]);

    console.log("✅ Database securely structured and logically populated sequentially with Rahul, Smriti, Mohit, John, AAPL, NOK, TSLA, and MSFT!");
    process.exit();
}

seedDatabase();
