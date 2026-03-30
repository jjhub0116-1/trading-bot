require('dotenv').config();
const connectDB = require('../config/db');
const { processRiskManagement, processAllOpenOrders } = require('../modules/tradeEngine');
const Portfolio = require('../models/Portfolio');
const Order = require('../models/Order');
const Trade = require('../models/Trade');
const Stock = require('../models/Stock');

// ─────────────────────────────────────────────
// PHASE 3: Margin Call Verification
// Tests: Loss Limit enforcement → full portfolio liquidation
// Also: Verifies other users are NOT affected
// ─────────────────────────────────────────────

async function runPhase3() {
    await connectDB();
    console.log("\n══════════════════════════════════════════════");
    console.log("  PHASE 3: MARGIN CALL VERIFICATION");
    console.log("══════════════════════════════════════════════\n");

    const apple = await Stock.findOne({ stock_id: 101 });
    console.log(`📡 Apple current price: $${apple.current_price}`);
    console.log(`   Rajan holds 500 AAPL. Loss at this price: $${((150 - apple.current_price) * 500).toFixed(2)}`);
    console.log(`   Rajan's loss_limit: $500`);

    // Pre-snapshot
    const rajanBefore = await Portfolio.findOne({ user_id: 14 });
    const snehaBeforeShares = (await Portfolio.findOne({ user_id: 13 }))?.positions?.reduce((s, p) => s + p.net_quantity, 0) ?? 0;
    const priyaBeforeShares = (await Portfolio.findOne({ user_id: 11 }))?.positions?.reduce((s, p) => s + p.net_quantity, 0) ?? 0;

    const rajanSharesBefore = rajanBefore?.positions?.reduce((s, p) => s + (p.net_quantity > 0 ? p.net_quantity : 0), 0) ?? 0;
    console.log(`\n  Before Risk Scan:`);
    console.log(`    Rajan total shares:     ${rajanSharesBefore}`);
    console.log(`    Sneha total shares:     ${snehaBeforeShares}`);
    console.log(`    Priya total shares:     ${priyaBeforeShares}`);

    console.log(`\n⏳ Running risk management engine tick...`);
    await processRiskManagement();
    await processAllOpenOrders();

    // Post-snapshot
    const rajanAfter = await Portfolio.findOne({ user_id: 14 });
    const snehaAfterShares = (await Portfolio.findOne({ user_id: 13 }))?.positions?.reduce((s, p) => s + p.net_quantity, 0) ?? 0;
    const priyaAfterShares = (await Portfolio.findOne({ user_id: 11 }))?.positions?.reduce((s, p) => s + p.net_quantity, 0) ?? 0;
    const rajanSharesAfter = rajanAfter?.positions?.reduce((s, p) => s + (p.net_quantity > 0 ? p.net_quantity : 0), 0) ?? 0;

    console.log(`\n  After Risk Scan:`);
    console.log(`    Rajan total shares:     ${rajanSharesAfter}  ${rajanSharesAfter === 0 ? '✅ MARGIN CALL EXECUTED' : '❌ STILL HAS SHARES'}`);
    console.log(`    Sneha total shares:     ${snehaAfterShares}  ${snehaAfterShares === snehaBeforeShares ? '✅ NOT AFFECTED' : '❌ WRONGLY LIQUIDATED'}`);
    console.log(`    Priya total shares:     ${priyaAfterShares}  ${priyaAfterShares === priyaBeforeShares ? '✅ NOT AFFECTED' : '❌ WRONGLY LIQUIDATED'}`);

    // Check that Rajan's cancelled orders show CANCELLED_BY_MARGIN_CALL
    const cancelledOrders = await Order.find({ user_id: 14, status: 'CANCELLED_BY_MARGIN_CALL' });
    console.log(`\n  Rajan's orders cancelled by margin call: ${cancelledOrders.length} ${cancelledOrders.length > 0 ? '✅' : '⚠️'}`);

    // Final summary of all trades generated
    console.log(`\n📊 FINAL TRADE LEDGER (all executed trades for all users):`);
    const allTrades = await Trade.find({ user_id: { $in: [10, 11, 12, 13, 14] } }).sort({ createdAt: 1 });
    const names = { 10: "Arjun", 11: "Priya", 12: "Vikram", 13: "Sneha", 14: "Rajan" };
    allTrades.forEach(t => {
        console.log(`  [Stock ${t.stock_id}] ${names[t.user_id].padEnd(6)} | ${t.side.padEnd(4)} | qty: ${String(t.quantity).padEnd(5)} | @ $${t.execution_price} | Total: $${t.total_cost.toFixed(2)}`);
    });

    console.log("\n══════════════════════════════════════════════");
    console.log("  PHASE 3 COMPLETE — ALL TESTS DONE");
    console.log("══════════════════════════════════════════════");
    console.log("\n🎉 Full system test cycle complete. Check the walkthrough document for complete results.\n");
    process.exit(0);
}

runPhase3();
