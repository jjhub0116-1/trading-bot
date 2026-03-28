const express = require('express');
const connectDB = require("./config/db");
const { processAllOpenOrders } = require("./modules/tradeEngine");

const TICK_INTERVAL_MS = 3000; // Ultra fast 3-second heartbeat

const app = express();
const PORT = process.env.PORT || 3000;

// Render Sleep-Prevention Endpoint! UptimeRobot hits this continuously.
app.get('/', (req, res) => {
    res.send('Trading Bot Engine is Alive and Ticking! 🚀');
});

async function startBot() {
    try {
        await connectDB();
        console.log("\n🟢 MongoDB Atlas Trading Bot Server Live Started!");
        console.log(`⏱️ Framework continuously scanning internal MongoDB tables every ${TICK_INTERVAL_MS / 1000} seconds loop natively...`);

        // The actual background trading engine loop
        setInterval(async () => {
            try {
                process.stdout.write(".");
                await processAllOpenOrders();
            } catch (err) {
                console.error("\nTick Error:", err);
            }
        }, TICK_INTERVAL_MS);

        // Binds the Express Web Server to Render's dynamically assigned port entirely keeping it alive
        app.listen(PORT, () => {
            console.log(`🌐 Keep-Alive Web Server securely listening on port ${PORT} to prevent application idle sleeping!`);
        });

    } catch (error) {
        console.error("\nFailed to jumpstart continuously deployed active loop:", error);
    }
}

startBot();
