const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const connectDB = require('../config/db');
const User = require('../models/User');
const Stock = require('../models/Stock');
const Order = require('../models/Order');
const Portfolio = require('../models/Portfolio');
const Trade = require('../models/Trade');
const WalletTransaction = require('../models/WalletTransaction');
const bcrypt = require('bcryptjs');

async function seedForAPI() {
    try {
        await connectDB();
        console.log('🧹 Wiping DB...');
        await Promise.all([
            User.deleteMany({}),
            Stock.deleteMany({}),
            Order.deleteMany({}),
            Portfolio.deleteMany({}),
            Trade.deleteMany({}),
            WalletTransaction.deleteMany({})
        ]);

        console.log('🌱 Seeding User and Stocks...');
        const hashedPassword = await bcrypt.hash('pass123', 10);
        await User.create({
            user_id: 1,
            user_name: 'TestUser',
            email: 'api@test.com',
            password: hashedPassword,
            equity: 1000,
            loss_limit: 100
        });

        await Stock.create([
            { stock_id: 1, symbol: 'AAPL', stock_name: 'Apple', current_price: 180 },
            { stock_id: 2, symbol: 'NOK', stock_name: 'Nokia', current_price: 150 }
        ]);

        console.log('✅ DB Reset & Ready for API Test!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedForAPI();
