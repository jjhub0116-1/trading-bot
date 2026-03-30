require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Stock = require('../models/Stock');
const Portfolio = require('../models/Portfolio');
const Order = require('../models/Order');
const Trade = require('../models/Trade');

const USERS = [
    { user_id: 10, user_name: "Arjun", email: "arjun@test.com", password: "pass123", equity: 1000, loss_limit: 200 },
    { user_id: 11, user_name: "Priya", email: "priya@test.com", password: "pass123", equity: 500, loss_limit: 50 },
    { user_id: 12, user_name: "Vikram", email: "vikram@test.com", password: "pass123", equity: 800, loss_limit: 100 },
    { user_id: 13, user_name: "Sneha", email: "sneha@test.com", password: "pass123", equity: 300, loss_limit: 30 },
    { user_id: 14, user_name: "Rajan", email: "rajan@test.com", password: "pass123", equity: 2000, loss_limit: 500 },
];

const STOCKS = [
    { stock_id: 101, symbol: "AAPL", stock_name: "Apple Inc", current_price: 150.00 },
    { stock_id: 102, symbol: "GOOGL", stock_name: "Alphabet Inc", current_price: 2800.00 },
    { stock_id: 103, symbol: "MSFT", stock_name: "Microsoft Corp", current_price: 320.00 },
    { stock_id: 104, symbol: "TSLA", stock_name: "Tesla Inc", current_price: 250.00 },
    { stock_id: 105, symbol: "AMZN", stock_name: "Amazon.com Inc", current_price: 3500.00 },
    { stock_id: 106, symbol: "NVDA", stock_name: "NVIDIA Corp", current_price: 480.00 },
    { stock_id: 107, symbol: "META", stock_name: "Meta Platforms", current_price: 330.00 },
    { stock_id: 108, symbol: "NFLX", stock_name: "Netflix Inc", current_price: 550.00 },
    { stock_id: 109, symbol: "AMD", stock_name: "Advanced Micro Devices", current_price: 100.00 },
    { stock_id: 110, symbol: "INTC", stock_name: "Intel Corp", current_price: 35.00 },
    { stock_id: 111, symbol: "BA", stock_name: "Boeing Co", current_price: 200.00 },
    { stock_id: 112, symbol: "DIS", stock_name: "Walt Disney Co", current_price: 95.00 },
    { stock_id: 113, symbol: "V", stock_name: "Visa Inc", current_price: 230.00 },
    { stock_id: 114, symbol: "JPM", stock_name: "JPMorgan Chase", current_price: 145.00 },
    { stock_id: 115, symbol: "GS", stock_name: "Goldman Sachs", current_price: 380.00 },
    { stock_id: 116, symbol: "WMT", stock_name: "Walmart Inc", current_price: 155.00 },
    { stock_id: 117, symbol: "KO", stock_name: "Coca-Cola Co", current_price: 60.00 },
    { stock_id: 118, symbol: "NKE", stock_name: "Nike Inc", current_price: 90.00 },
    { stock_id: 119, symbol: "XOM", stock_name: "ExxonMobil Corp", current_price: 110.00 },
    { stock_id: 120, symbol: "PYPL", stock_name: "PayPal Holdings", current_price: 65.00 },
];

async function seed() {
    await connectDB();
    console.log("\n🌱 SEEDING TEST DATA...\n");

    // Wipe all test users' data fresh
    const testUserIds = USERS.map(u => u.user_id);
    await Portfolio.deleteMany({ user_id: { $in: testUserIds } });
    await Order.deleteMany({ user_id: { $in: testUserIds } });
    await Trade.deleteMany({ user_id: { $in: testUserIds } });
    console.log("✅ Cleared old test data");

    // Upsert users
    for (const u of USERS) {
        await User.findOneAndUpdate({ user_id: u.user_id }, u, { upsert: true, new: true });
    }
    console.log(`✅ Seeded ${USERS.length} users:`);
    USERS.forEach(u => console.log(`   User ${u.user_id}: ${u.user_name} | Equity: ${u.equity} shares | Loss Limit: $${u.loss_limit}`));

    // Upsert stocks
    for (const s of STOCKS) {
        await Stock.findOneAndUpdate({ stock_id: s.stock_id }, s, { upsert: true, new: true });
    }
    console.log(`\n✅ Seeded ${STOCKS.length} stocks (IDs 101-120)`);
    STOCKS.forEach(s => console.log(`   [${s.stock_id}] ${s.symbol.padEnd(6)} ${s.stock_name.padEnd(28)} $${s.current_price}`));

    console.log("\n🎯 Seed complete! Now run: node temp/runPhase1.js\n");
    process.exit(0);
}

seed();
