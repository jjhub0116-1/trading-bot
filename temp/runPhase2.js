require('dotenv').config();
const connectDB = require('../config/db');
const { placeOrder } = require('../modules/order');
const { processAllOpenOrders } = require('../modules/tradeEngine');
const Portfolio = require('../models/Portfolio');
const Order = require('../models/Order');
const Stock = require('../models/Stock');

// ─────────────────────────────────────────────
// PHASE 2: Check if bracket orders triggered after
//          user manually changed prices in MongoDB.
//          Also tests: explicit MARKET SELL by a user
// ─────────────────────────────────────────────

async function runPhase2() {
    await connectDB();
    console.log("\n══════════════════════════════════════════════");
    console.log("  PHASE 2: BRACKET TRIGGER VERIFICATION");
    console.log("══════════════════════════════════════════════\n");

    // Print current prices so user can verify their changes took effect
    const stockIds = [103, 104, 107, 120];
    console.log("📡 Current DB prices:");
    for (const sid of stockIds) {
        const s = await Stock.findOne({ stock_id: sid });
        console.log(`  Stock ${sid} (${s.symbol}): $${s.current_price}  — Expected: ${sid === 103 ? '≥400 to hit Arjun TP' :
                sid === 107 ? '≤300 to hit Vikram SL' :
                    sid === 120 ? '≥80 to hit Sneha TP' :
                        '≤220 to hit Priya SL, ≤200 for Rajan SL'
            }`);
    }

    console.log("\n⏳ Running tick — checking all open bracket orders...");
    await processAllOpenOrders();

    console.log("\n📊 BRACKET ORDER RESULTS:\n");
    const executedOrders = await Order.find({
        user_id: { $in: [10, 11, 12, 13, 14] },
        status: 'EXECUTED',
        side: 'SELL'
    });

    const names = { 10: "Arjun", 11: "Priya", 12: "Vikram", 13: "Sneha", 14: "Rajan" };
    const stockSymbols = { 103: "MSFT", 104: "TSLA", 107: "META", 120: "PYPL" };

    if (executedOrders.length === 0) {
        console.log("  ⚠️  No SELL orders executed yet.");
        console.log("  Make sure you changed the prices in MongoDB correctly!");
    } else {
        executedOrders.forEach(o => {
            console.log(`  ✅ EXECUTED: ${names[o.user_id]} sold ${o.quantity} shares of Stock ${o.stock_id} at $${o.price}`);
        });
    }

    // Test: Arjun manually sells remaining 200 AAPL shares (no bracket - pure MARKET SELL)
    console.log("\n─────────────────────────────────────────");
    console.log("  EXPLICIT SELL TEST: Arjun manually sells 200 AAPL");
    console.log("─────────────────────────────────────────");
    const sellResult = await placeOrder(10, 101, 200, "MARKET", 0, null, null, "SELL");
    const sellOk = typeof sellResult === 'string' && sellResult.startsWith('ORD_');
    console.log(`  ${sellOk ? '✅ SELL ORDER PLACED' : '❌ SELL FAILED: ' + sellResult}`);
    await processAllOpenOrders();

    // Test: Arjun tries to OVERSELL (he should have nothing left after this)
    console.log("\n─────────────────────────────────────────");
    console.log("  OVERSELL TEST: Arjun tries to sell 1 more AAPL (should fail - 0 shares left)");
    console.log("─────────────────────────────────────────");
    const oversellResult = await placeOrder(10, 101, 1, "MARKET", 0, null, null, "SELL");
    const oversellFailed = oversellResult === "Insufficient Shares (Or locked in open orders)";
    console.log(`  ${oversellFailed ? '✅ CORRECTLY REJECTED — cannot sell without owning shares' : '❌ SHOULD HAVE FAILED: ' + oversellResult}`);

    // Updated portfolio snapshot
    console.log("\n📊 PORTFOLIO SNAPSHOT AFTER PHASE 2:\n");
    for (const uid of [10, 11, 12, 13, 14]) {
        const p = await Portfolio.findOne({ user_id: uid });
        if (!p) { console.log(`  User ${uid}: No portfolio\n`); continue; }
        console.log(`  ${names[uid]} (User ${uid}):`);
        p.positions.filter(pos => pos.net_quantity > 0).forEach(pos => {
            console.log(`    Stock ${pos.stock_id}: ${pos.net_quantity} shares @ avg $${pos.average_price.toFixed(2)}`);
        });
        console.log(`    Realized P&L so far: $${p.profit_loss.toFixed(2)}\n`);
    }

    console.log("══════════════════════════════════════════════");
    console.log("  PHASE 2 COMPLETE");
    console.log("══════════════════════════════════════════════");
    console.log("\n🎯 NEXT STEP — To test MARGIN CALL:");
    console.log("   Rajan owns 500 AAPL, 300 TSLA, 200 BA, 400 WMT — loss_limit = $500");
    console.log("   Change stock_id 101 (AAPL) current_price to 149.00");
    console.log("   → 500 shares * $1 drop = $500 loss — EXACTLY hits Rajan's limit → MARGIN CALL!");
    console.log("\nThen run: node temp/runPhase3.js\n");
    process.exit(0);
}

runPhase2();
