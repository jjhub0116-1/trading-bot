const connectDB = require("./config/db");
const { placeOrder } = require("./modules/order");

async function runLiveTest() {
    try {
        console.log("\n🚀 Injecting Smriti's Live Market Bracket Order via Mongoose...");
        await connectDB();

        const userId = 2; // Smriti
        const stockId = 2; // NOKIA

        console.log(`\n📦 Placing MARKET Order (BUY) for Smriti on NOK, Qty: 5, SL: 90, Target: 170...`);

        // params: userId, stockId, quantity, orderType, price, stopLoss, target, side
        const orderId = await placeOrder(
            userId, stockId, 5, "MARKET", 0, 90, 170, "BUY"
        );

        console.log(`✅ MongoDB Bracket Market Order placed! MongoDB Document __id: ${orderId}`);
        console.log("\n---------------------------------------------------------");
        console.log("🔍 CHECK MONGODB ATLAS NOW:");
        console.log(" - Orders Collection: The Buy Market is EXECUTED. A 5-qty SELL bracket is natively waiting at OPEN!");
        console.log(" - Portfolio Collection: Smriti dynamically added 5 shares to her Nokia holdings cleanly!");
        console.log(" - Wallet Collection: She was mathematically cleanly deducted explicitly natively.");
        console.log("\n⚠️ THE FASTEST PART YET: Fire up `node bot.js` in your terminal.");
        console.log("Go to MongoDB Atlas website, change NOKIA `current_price` securely to 170, and literally instantly watch the bot execute it.");
        console.log("---------------------------------------------------------");
        process.exit();

    } catch (error) {
        console.error("❌ Test Flow Error:", error);
        process.exit(1);
    }
}

runLiveTest();
