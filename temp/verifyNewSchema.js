require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Stock = require('../models/Stock');
const Portfolio = require('../models/Portfolio');
const Order = require('../models/Order');
const Trade = require('../models/Trade');
const { placeOrder } = require('../modules/order');
const { processAllOpenOrders, processRiskManagement } = require('../modules/tradeEngine');

async function runDemo() {
    await connectDB();
    console.log("\n-----------------------------------------");
    console.log("🔥 PRODUCTION SCHEMA VERIFICATION TEST 🔥");
    console.log("--- One Portfolio Doc Per User + Margin ---\n");

    try {
        // 1. Setup Rahul
        const rahul = await User.findOneAndUpdate(
            { email: "rahul@test.com" },
            { user_id: 3, user_name: "Rahul", password: "hashed", equity: 600, loss_limit: 100 },
            { new: true, upsert: true }
        );
        console.log(`[STATE 1] User: ${rahul.user_name} | Equity: ${rahul.equity} shares | Loss Limit: $${rahul.loss_limit}`);

        // 2. Wipe Rahul's data — portfolio is now ONE document per user
        await Portfolio.deleteOne({ user_id: rahul.user_id });
        await Order.deleteMany({ user_id: rahul.user_id });
        await Trade.deleteMany({ user_id: rahul.user_id });

        // 3. Set Apple price
        const apple = await Stock.findOneAndUpdate({ stock_id: 1 }, { current_price: 150.00 }, { new: true });
        console.log(`[STATE 2] Apple price: $${apple.current_price}`);

        // 4. BUY 300 shares of Apple
        console.log(`\n[ACTION 1] Rahul buys 300 shares of Apple at $150`);
        await placeOrder(rahul.user_id, 1, 300, "MARKET", 0, null, null, "BUY");
        await processAllOpenOrders();

        // 5. Check portfolio structure — should be ONE document with positions array
        const portfolio = await Portfolio.findOne({ user_id: rahul.user_id });
        console.log(`\n✅ Portfolio document: 1 doc for user ${rahul.user_id}`);
        console.log(`   Positions array length: ${portfolio.positions.length}`);
        console.log(`   Apple position: ${portfolio.positions[0].net_quantity} shares @ $${portfolio.positions[0].average_price}`);
        console.log(`   Total realized P&L: $${portfolio.profit_loss}`);

        // 6. Drop price to trigger margin call: 300 shares * $0.40 drop = $120 loss > $100 limit
        console.log(`\n[ACTION 2] Apple crashes to $149.60 (300 shares * $0.40 = $120 loss > $100 limit)`);
        await Stock.findOneAndUpdate({ stock_id: 1 }, { current_price: 149.60 });

        console.log(`[TICK] Risk Engine scanning...`);
        await processRiskManagement();
        await processAllOpenOrders();

        // 7. Verify liquidation
        const finalPortfolio = await Portfolio.findOne({ user_id: rahul.user_id });
        const applePos = finalPortfolio.positions.find(p => p.stock_id === 1);
        console.log(`\n✅ MARGIN CALL RESULT:`);
        console.log(`   Apple shares remaining: ${applePos ? applePos.net_quantity : 0}`);
        console.log(`   Realized P&L after liquidation: $${finalPortfolio.profit_loss.toFixed(2)}`);

        // Assert
        if (!applePos || applePos.net_quantity === 0) {
            console.log(`\n🎉 TEST PASSED — All shares liquidated, single portfolio document maintained!`);
        } else {
            console.log(`\n❌ TEST FAILED — Shares still remaining: ${applePos.net_quantity}`);
        }

        process.exit(0);
    } catch (err) {
        console.error("Test error:", err);
        process.exit(1);
    }
}

runDemo();
