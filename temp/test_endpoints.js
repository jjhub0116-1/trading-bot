const mongoose = require('mongoose');
const { connect } = require('../config/db');
require('dotenv').config();

const API_BASE = 'http://localhost:3000/api';

async function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function runTests() {
    console.log("🚀 Starting End-to-End API Test Suite\n");

    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Stock = require('../models/Stock');
        const User = require('../models/User');
        const Order = require('../models/Order');
        const Portfolio = require('../models/Portfolio');

        await Stock.updateOne({ stock_id: 4 }, { current_price: 400 });
        await Order.deleteMany({ user_id: 4 });
        await Portfolio.deleteMany({ user_id: 4 });
        await User.updateOne({ user_id: 4 }, { is_flagged: false });

        console.log("✅ 1. Reset Test Environment. MSFT price is $400.");

        let authRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'john@test.com', password: 'hashed' })
        });
        const authData = await authRes.json();
        const token = authData.token;
        const config = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        console.log("✅ 2. Successfully authenticated as John.");

        let orderRes = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: config,
            body: JSON.stringify({
                stockId: 4,
                quantity: 7,
                orderType: 'LIMIT',
                price: 310,
                side: 'BUY'
            })
        });
        
        console.log("✅ 3. Placed LIMIT BUY Order at limit $310.");

        await Stock.updateOne({ stock_id: 4 }, { current_price: 290 });
        console.log("✅ 4. Market dropped! MSFT price changed manually to $290.");

        console.log("⏳ Waiting 4 seconds for backend engine to tick...");
        await delay(4000);

        let historyRes = await fetch(`${API_BASE}/orders`, { headers: config });
        const historyData = await historyRes.json();
        const executedOrder = historyData.find(o => o.order_type === 'LIMIT' && o.status === 'EXECUTED');
        
        if (executedOrder) {
            console.log(`\n✅ 5. Order successfully EXECUTED!`);
            console.log(`====== ASSERTION CHECK ======`);
            console.log(`Original Requested Limit Price: $${executedOrder.price}`);
            console.log(`Actual Better Execution Price:  $${executedOrder.execution_price}`);
            if (executedOrder.execution_price === 290) {
                console.log(`🎯 PASS: Execution price is exactly 290!`);
            } else {
                console.error(`💥 FAIL: Execution price was ${executedOrder.execution_price}`);
            }
        } else {
            console.error("\n💥 FAIL: Order was not found or not executed.");
        }

        await Stock.updateOne({ stock_id: 4 }, { current_price: 300 });
        console.log("\n📈 MSFT price climbs from 290 to 300. Checking Portfolio...");
        
        let portRes = await fetch(`${API_BASE}/portfolio`, { headers: config });
        const portData = await portRes.json();
        const positions = portData.positions;
        if (positions.length > 0) {
            const msftPos = positions[0];
            console.log(`====== PORTFOLIO ASSERTION ======`);
            console.log(`Net Quantity: ${msftPos.net_quantity}`);
            console.log(`Average Held Price: $${msftPos.average_price}`);
            console.log(`Realized P&L: $${msftPos.realized_pnl}`);
            console.log(`Unrealized P&L: $${msftPos.unrealized_pnl} (Should be $70)`);
            console.log(`Overall P&L: $${msftPos.overall_pnl} (Should be $70)`);

            if (msftPos.average_price === 290 && msftPos.unrealized_pnl === 70 && msftPos.overall_pnl === 70) {
                console.log(`\n🎯 PASS: Database effectively captured exact state and dynamic PnL is mathematically flawless!`);
            } else {
                console.error(`\n💥 FAIL: Math or DB mapping mismatch.`);
            }
        }

    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

runTests();
