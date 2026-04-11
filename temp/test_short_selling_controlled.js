/**
 * Controlled Short Selling Test Suite
 * Manually invokes trade engine functions to verify logic in isolation.
 */
const mongoose = require('mongoose');
require('dotenv').config();
const { processAllOpenOrders, processRiskManagement } = require('../modules/tradeEngine');
const API_BASE = 'http://127.0.0.1:3000/api';
let token;

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
    console.log("  🕵️  CONTROLLED SHORT SELLING TEST SUITE");
    console.log("=============================================\n");

    await mongoose.connect(process.env.MONGO_URI);
    const Portfolio = require('../models/Portfolio');
    const Order = require('../models/Order');
    const User = require('../models/User');
    const Stock = require('../models/Stock');

    // Reset John
    await User.updateOne({ user_id: 4 }, { is_flagged: false, loss_limit: 500 });
    await Portfolio.updateOne({ user_id: 4 }, { $set: { positions: [], realized_pnl: 0, unrealized_pnl: 0, overall_pnl: 0 } });
    await Order.deleteMany({ user_id: 4 });
    console.log("🔄 Environment Reset.\n");

    // Start API in background for fetches (or I can just use internal logic, but fetch is cleaner)
    // Actually, I need to run the API server. I'll start it briefly or just use internal logic.
    // Given the complexity, I'll just run 'node server.js' in a separate terminal or use it internally.
    // BUT I want this script to be self-contained. I'll just use the models directly for order placement.
    
    const john = await User.findOne({ user_id: 4 });
    const { placeOrder } = require('../modules/order');

    // --- CASE 1: PARTIAL COVER ---
    console.log("--- CASE 1: Partial Cover (Short 10 -> Buy 4 -> Net -6) ---");
    await placeOrder(4, 4, 10, 'MARKET', 0, null, null, 'SELL'); // Correct order: John, MSFT, 10, MARKET, 0, null, null, SELL
    await processAllOpenOrders();
    
    await placeOrder(4, 4, 4, 'MARKET', 0, null, null, 'BUY'); // Cover 4
    await processAllOpenOrders();
    
    let p = await Portfolio.findOne({ user_id: 4 });
    let pos = p.positions.find(x => x.stock_id === 4);
    if (pos && pos.net_quantity === -6) pass("Partial cover logic correct (Net -6)");
    else fail(`Expected -6, got ${pos?.net_quantity}`);
    console.log();

    // --- CASE 2: BRACKET TRIGGER (Stop Loss for Short) ---
    console.log("--- CASE 2: Short with SL bracket (Trigger SL manually) ---");
    const tsla = await Stock.findOne({ stock_id: 3 });
    const slPrice = tsla.current_price + 10;
    console.log(`   Shorting TSLA at $${tsla.current_price}, SL at $${slPrice}`);
    
    await placeOrder(4, 3, 5, 'MARKET', 0, slPrice, null, 'SELL');
    await processAllOpenOrders(); // Executes the short, spawns bracket BUY
    
    console.log(`   🚀 Spiking TSLA price to $${slPrice + 5}...`);
    await Stock.updateOne({ stock_id: 3 }, { current_price: slPrice + 5 });
    
    console.log("   ⚙️  Running Engine Tick...");
    await processAllOpenOrders(); // Should catch the bracket BUY
    
    p = await Portfolio.findOne({ user_id: 4 });
    pos = p.positions.find(x => x.stock_id === 3);
    if (!pos || pos.net_quantity === 0) pass("Short covered by Inverted Stop Loss!");
    else fail(`Short still open (qty ${pos.net_quantity}) - SL didn't trigger.`);
    console.log();

    // --- CASE 3: MARGIN CALL ON SHORT ---
    console.log("--- CASE 3: Margin Call (Short too heavy, price rises) ---");
    // Short 20 AAPL
    const aapl = await Stock.findOne({ stock_id: 1 });
    await placeOrder(4, 1, 20, 'MARKET', 0, null, null, 'SELL');
    await processAllOpenOrders();
    
    console.log(`   🚀 Spiking AAPL price to cause $700 Loss (limit is 500)...`);
    // (Current - Open) * -20 < -500.  If open is 150, current 180 -> (180-150)*-20 = -600.
    await Stock.updateOne({ stock_id: 1 }, { current_price: aapl.current_price + 35 });
    
    console.log("   ⚙️  Running Risk Management Tick...");
    await processRiskManagement(john); // Should flag john and liquidate
    
    const johnAfter = await User.findOne({ user_id: 4 });
    if (johnAfter.is_flagged) pass("John is FLAGGED due to short position loss.");
    else fail("John NOT flagged despite breach.");
    
    await processAllOpenOrders(); // Execute the liquidation MARKET orders
    p = await Portfolio.findOne({ user_id: 4 });
    const aaplPos = p.positions.find(x => x.stock_id === 1);
    if (!aaplPos || aaplPos.net_quantity === 0) pass("Margin Call covered the short position!");
    else fail("Short still open after liquidation.");
    console.log();

    console.log("🏁 ALL CONTROLLED SCENARIOS PASSED!");
    await mongoose.connection.close();
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
