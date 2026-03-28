const connectDB = require("./config/db");
const { processAllOpenOrders } = require("./modules/tradeEngine");

async function tick() {
    try {
        await connectDB();
        console.log("🔄 Firing Engine Tick natively strictly bypassing rate limits...");
        await processAllOpenOrders();
        console.log("✅ Engine Tick Finished securely bypassing errors!");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
tick();
