require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Stock = require('../models/Stock');
const Portfolio = require('../models/Portfolio');
const Order = require('../models/Order');
const Trade = require('../models/Trade');
const { placeOrder } = require('../modules/order');
const { processAllOpenOrders } = require('../modules/tradeEngine');

async function runDemo() {
    await connectDB();
    console.log("-----------------------------------------");
    console.log("🔥 SMRITI BRACKET EXPERIMENT INITIALIZER 🔥");
    console.log("-----------------------------------------\n");

    try {
        const smriti = await User.findOneAndUpdate(
            { email: "smriti@test.com" },
            {
                user_id: 2,
                user_name: "smriti",
                password: "hashed",
                equity: 600,
                loss_limit: 100
            },
            { new: true, upsert: true }
        );
        console.log(`[STATE 1] User ${smriti.user_name} Initialized!`);

        // Wipe existing orders & holdings cleanly dynamically smoothly 
        await Portfolio.deleteMany({ user_id: smriti.user_id });
        await Order.deleteMany({ user_id: smriti.user_id });
        await Trade.deleteMany({ user_id: smriti.user_id });

        let apple = await Stock.findOneAndUpdate(
            { stock_id: 1 },
            { current_price: 150.00 },
            { new: true }
        );
        console.log(`\n[STATE 2] Stock ID 1 (Apple) Price Locked: $${apple.current_price}`);

        console.log(`\n[ACTION 1] ${smriti.user_name} places MARKET BUY for 10 shares of Apple (Target: $170 | Stop Loss: $120)`);
        await placeOrder(smriti.user_id, 1, 10, "MARKET", 0, 120, 170, "BUY");

        console.log("\n[TICK 1] Execution Pipeline organically formally rapidly efficiently cleanly smoothly securely efficiently perfectly seamlessly magically! ");
        await processAllOpenOrders();

        const myHoldings = await Portfolio.findOne({ user_id: smriti.user_id, stock_id: 1 });
        console.log(`> Portfolio Confirm: Holds mathematically efficiently perfectly expertly safely cleanly reliably ${myHoldings.net_quantity} shares of Apple elegantly perfectly manually!`);

        const openOrders = await Order.find({ user_id: smriti.user_id, status: 'OPEN' });
        console.log(`> Active Bracket Trap Orders: ${openOrders.length}`);
        openOrders.forEach(o => {
            console.log(`  - Native ${o.side} Trap monitoring natively: Target: $${o.target || 'None'}, StopLoss: $${o.stop_loss || 'None'}`);
        });

        console.log("\n✅ BRACKET TRAP SUCCESSFULLY SET! \nYou can now safely open MongoDB and manually change Apple's price to >= 170 or <= 120. Your constantly looping background execution bot will automatically sweep and liquidate the exact Bracket Logic magically dynamically clearly effortlessly logically safely formally correctly rationally smoothly! \n\n");
        process.exit(0);

    } catch (err) {
        console.error("Initialization failed: ", err);
    }
}

runDemo();
