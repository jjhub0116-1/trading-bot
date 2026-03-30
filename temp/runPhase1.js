require('dotenv').config();
const connectDB = require('../config/db');
const { placeOrder } = require('../modules/order');
const { processAllOpenOrders } = require('../modules/tradeEngine');
const Portfolio = require('../models/Portfolio');
const Order = require('../models/Order');

// ─────────────────────────────────────────────
// PHASE 1: Basic BUY orders for all 5 users
// Tests: MARKET BUY, Equity limit enforcement, 
//        Multi-user portfolio isolation
// ─────────────────────────────────────────────

async function runPhase1() {
    await connectDB();
    console.log("\n══════════════════════════════════════════════");
    console.log("  PHASE 1: MARKET BUY ORDERS (5 Users)");
    console.log("══════════════════════════════════════════════\n");

    const orders = [
        // [userId, stockId, qty, stopLoss, target, label]
        // Arjun (equity=1000) buys 3 different stocks
        { userId: 10, stockId: 101, qty: 200, sl: null, tp: null, label: "Arjun buys 200 AAPL  — pure market, no bracket" },
        { userId: 10, stockId: 103, qty: 300, sl: 300, tp: 400, label: "Arjun buys 300 MSFT  — with bracket [SL:300, TP:400]" },
        { userId: 10, stockId: 109, qty: 400, sl: null, tp: null, label: "Arjun buys 400 AMD   — pure market (hits equity limit at 900, try 400 more)" },

        // Priya (equity=500) buys carefully
        { userId: 11, stockId: 104, qty: 100, sl: 220, tp: 300, label: "Priya  buys 100 TSLA  — with bracket [SL:220, TP:300]" },
        { userId: 11, stockId: 110, qty: 200, sl: null, tp: null, label: "Priya  buys 200 INTC  — pure market" },
        { userId: 11, stockId: 117, qty: 150, sl: null, tp: null, label: "Priya  buys 150 KO    — pure market (total=450, under 500 limit)" },
        { userId: 11, stockId: 112, qty: 100, sl: null, tp: null, label: "Priya  buys 100 DIS   — SHOULD FAIL: 550 > 500 equity" },

        // Vikram (equity=800) buys 2 stocks
        { userId: 12, stockId: 106, qty: 400, sl: null, tp: null, label: "Vikram buys 400 NVDA  — pure market" },
        { userId: 12, stockId: 107, qty: 300, sl: 300, tp: 400, label: "Vikram buys 300 META  — with bracket [SL:300, TP:400]" },

        // Sneha (equity=300) buys conservatively
        { userId: 13, stockId: 118, qty: 150, sl: null, tp: null, label: "Sneha  buys 150 NKE   — pure market" },
        { userId: 13, stockId: 120, qty: 100, sl: 55, tp: 80, label: "Sneha  buys 100 PYPL  — with bracket [SL:55, TP:80]" },
        { userId: 13, stockId: 119, qty: 100, sl: null, tp: null, label: "Sneha  buys 100 XOM   — SHOULD FAIL: 350 > 300 equity" },

        // Rajan (equity=2000) buys aggressively across many stocks
        { userId: 14, stockId: 101, qty: 500, sl: null, tp: null, label: "Rajan  buys 500 AAPL  — pure market" },
        { userId: 14, stockId: 104, qty: 300, sl: 200, tp: 350, label: "Rajan  buys 300 TSLA  — with bracket [SL:200, TP:350]" },
        { userId: 14, stockId: 111, qty: 200, sl: null, tp: null, label: "Rajan  buys 200 BA    — pure market" },
        { userId: 14, stockId: 116, qty: 400, sl: null, tp: null, label: "Rajan  buys 400 WMT   — pure market" },
        { userId: 14, stockId: 113, qty: 400, sl: null, tp: null, label: "Rajan  buys 400 V     — SHOULD FAIL: total 1800+400=2200 > 2000 equity" },
    ];

    console.log("Placing orders...\n");
    const results = [];
    for (const o of orders) {
        const result = await placeOrder(o.userId, o.stockId, o.qty, "MARKET", 0, o.sl, o.tp, "BUY");
        const passed = typeof result === 'string' && result.startsWith('ORD_');
        const failed = result === "Insufficient Equity Limits (Share Count Exceeded)";
        const expectedToFail = o.label.includes("SHOULD FAIL");

        let status;
        if (expectedToFail && failed) status = "✅ CORRECTLY REJECTED";
        else if (!expectedToFail && passed) status = "✅ ORDER PLACED";
        else if (!expectedToFail && failed) status = "❌ WRONGLY REJECTED";
        else status = "❌ SHOULD HAVE FAILED";

        console.log(`${status.padEnd(24)} | ${o.label}`);
        results.push({ label: o.label, result, status });
    }

    console.log("\n⏳ Processing all open orders through execution engine...");
    await processAllOpenOrders();

    console.log("\n📊 PORTFOLIO SNAPSHOT AFTER PHASE 1:\n");
    const userIds = [10, 11, 12, 13, 14];
    for (const uid of userIds) {
        const p = await Portfolio.findOne({ user_id: uid });
        if (!p) { console.log(`  User ${uid}: No portfolio\n`); continue; }
        const names = { 10: "Arjun", 11: "Priya", 12: "Vikram", 13: "Sneha", 14: "Rajan" };
        console.log(`  ${names[uid]} (User ${uid}):`);
        p.positions.forEach(pos => {
            if (pos.net_quantity > 0)
                console.log(`    Stock ${pos.stock_id}: ${pos.net_quantity} shares @ avg $${pos.average_price.toFixed(2)}`);
        });
        const totalShares = p.positions.reduce((s, pos) => s + (pos.net_quantity > 0 ? pos.net_quantity : 0), 0);
        console.log(`    Total shares held: ${totalShares} | Realized P&L: $${p.profit_loss.toFixed(2)}\n`);
    }

    console.log("\n📋 BRACKET ORDERS WAITING (Open SELL legs):");
    const openSells = await Order.find({ status: 'OPEN', side: 'SELL' });
    openSells.forEach(o => {
        console.log(`  Order ${o.order_id} | User ${o.user_id} | Stock ${o.stock_id} | Qty: ${o.quantity} | TP: $${o.target || '-'} | SL: $${o.stop_loss || '-'}`);
    });

    console.log("\n══════════════════════════════════════════════");
    console.log("  PHASE 1 COMPLETE");
    console.log("══════════════════════════════════════════════");
    console.log("\n🎯 NEXT STEPS — You must manually change stock prices in MongoDB:");
    console.log("   1. Change stock_id 103 (MSFT) current_price to 410  →  Arjun's TP=400 should trigger SELL");
    console.log("   2. Change stock_id 107 (META) current_price to 295  →  Vikram's SL=300 should trigger SELL");
    console.log("   3. Change stock_id 120 (PYPL) current_price to 82   →  Sneha's TP=80 should trigger SELL");
    console.log("   4. Change stock_id 104 (TSLA) current_price to 180  →  Priya's SL=220 AND Rajan's SL=200 both trigger");
    console.log("\nAfter changing prices, run: node temp/runPhase2.js\n");
    process.exit(0);
}

runPhase1();
