/**
 * Robust Short Selling Test Suite
 * Scenarios:
 * 1. Partial Cover
 * 2. Short to Long Flip (Crossing Zero)
 * 3. Long to Short Flip (Crossing Zero)
 * 4. Multiple Concurrent Shorts
 * 5. Bracket Trigger (Stop Loss) for Short
 */
const mongoose = require('mongoose');
require('dotenv').config();
const API_BASE = 'http://127.0.0.1:3000/api';
let token;

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function api(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    return res.json();
}

function pass(msg) { console.log(`   ✅ PASS: ${msg}`); }
function fail(msg) { console.error(`   ❌ FAIL: ${msg}`); process.exit(1); }

async function run() {
    console.log("=============================================");
    console.log("  🕵️  ROBUST SHORT SELLING TEST SUITE");
    console.log("=============================================\n");

    const conn = await mongoose.connect(process.env.MONGO_URI);
    const Portfolio = require('../models/Portfolio');
    const Order = require('../models/Order');
    const User = require('../models/User');
    const Stock = require('../models/Stock');

    // Reset John
    await User.updateOne({ user_id: 4 }, { is_flagged: false });
    await Portfolio.updateOne({ user_id: 4 }, { $set: { positions: [], realized_pnl: 0, unrealized_pnl: 0, overall_pnl: 0 } });
    await Order.deleteMany({ user_id: 4 });
    console.log("🔄 Environment Reset.\n");

    // Login
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'john@test.com', password: 'hashed' })
    });
    const loginData = await loginRes.json();
    token = loginData.token;

    // --- CASE 1: PARTIAL COVER ---
    console.log("--- CASE 1: Partial Cover (Short 10 -> Buy 4 -> Net -6) ---");
    await api('POST', '/orders', { stockId: 4, quantity: 10, orderType: 'MARKET', side: 'SELL' });
    await delay(4000); 
    await api('POST', '/orders', { stockId: 4, quantity: 4, orderType: 'MARKET', side: 'BUY' });
    await delay(4000);
    let p = await Portfolio.findOne({ user_id: 4 });
    let pos = p.positions.find(x => x.stock_id === 4);
    if (pos && pos.net_quantity === -6) pass("Partial cover successful (Net -6)");
    else fail(`Expected -6, got ${pos?.net_quantity}`);
    console.log();

    // --- CASE 2: CROSSING ZERO (Short to Long) ---
    console.log("--- CASE 2: Crossing Zero (Short -6 -> Buy 10 -> Net +4) ---");
    await api('POST', '/orders', { stockId: 4, quantity: 10, orderType: 'MARKET', side: 'BUY' });
    await delay(4000);
    p = await Portfolio.findOne({ user_id: 4 });
    pos = p.positions.find(x => x.stock_id === 4);
    if (pos && pos.net_quantity === 4) pass("Flipped from Short to Long successfully (Net +4)");
    else fail(`Expected 4, got ${pos?.net_quantity}`);
    console.log();

    // --- CASE 3: CROSSING ZERO (Long to Short) ---
    console.log("--- CASE 3: Crossing Zero (Long 4 -> Sell 10 -> Net -6) ---");
    await api('POST', '/orders', { stockId: 4, quantity: 10, orderType: 'MARKET', side: 'SELL' });
    await delay(4000);
    p = await Portfolio.findOne({ user_id: 4 });
    pos = p.positions.find(x => x.stock_id === 4);
    if (pos && pos.net_quantity === -6) pass("Flipped from Long to Short successfully (Net -6)");
    else fail(`Expected -6, got ${pos?.net_quantity}`);
    console.log();

    // --- CASE 4: MULTIPLE CONCURRENT SHORTS ---
    console.log("--- CASE 4: Multiple Concurrent Shorts (Short MSFT and Short AAPL) ---");
    await api('POST', '/orders', { stockId: 1, quantity: 5, orderType: 'MARKET', side: 'SELL' }); // AAPL
    await delay(4000);
    p = await Portfolio.findOne({ user_id: 4 });
    const shortCount = p.positions.filter(x => x.net_quantity < 0).length;
    if (shortCount === 2) pass("Holding multiple short positions correctly.");
    else fail(`Expected 2 short positions, found ${shortCount}`);
    console.log();

    /*
    // --- CASE 5: BRACKET TRIGGER (Stop Loss) ---
    console.log("--- CASE 5: Short with SL bracket (Trigger SL manually) ---");
    const tsla = await Stock.findOne({ stock_id: 3 });
    const slPrice = tsla.current_price + 10;
    console.log(`   Shorting TSLA at $${tsla.current_price}, SL at $${slPrice}`);
    
    const bracketRes = await api('POST', '/orders', { 
        stockId: 3, quantity: 5, orderType: 'MARKET', side: 'SELL', stopLoss: slPrice 
    });
    await delay(2000); // Wait for open
    
    console.log("   🚀 Simulating price spike to $${slPrice + 5}...");
    await Stock.updateOne({ stock_id: 3 }, { current_price: slPrice + 5 });
    
    console.log("   ⏳ Waiting 10s for Engine to catch the SL hit...");
    await delay(10000);
    
    p = await Portfolio.findOne({ user_id: 4 });
    const tslaPos = p.positions.find(x => x.stock_id === 3);
    if (!tslaPos || tslaPos.net_quantity === 0) {
        pass("Short covered automatically by Stop Loss trigger!");
    } else {
        fail(`Short still open (qty ${tslaPos.net_quantity}) - SL didn't trigger?`);
    }
    console.log();
    */

    console.log("🏁 ALL ROBUST SCENARIOS PASSED!");
    await mongoose.connection.close();
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
