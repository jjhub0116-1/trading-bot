require('dotenv').config();
const express = require('express');
const connectDB = require("./config/db");
const { processAllOpenOrders } = require("./modules/tradeEngine");

// Import newly created modular routes
const authRoutes = require('./routes/auth');
const ordersRoutes = require('./routes/orders');
const portfolioRoutes = require('./routes/portfolio');
const walletRoutes = require('./routes/wallet');
const stockRoutes = require('./routes/stocks');
const { startLiveStream } = require('./modules/marketStream');

const TICK_INTERVAL_MS = 3000; // Ultra fast 3-second heartbeat

const app = express();
const PORT = process.env.PORT || 3000;

// Essential Middleware strictly allowing Postman to send JSON formatted payloads dynamically
app.use(express.json());

// Serve the stunning local frontend web UI natively bypassing CORS explicitly
app.use(express.static('public'));

// Bind the new REST API Routes explicitly securely natively
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/stocks', stockRoutes);

// Render Sleep-Prevention Endpoint
app.get('/', (req, res) => {
    res.send('Trading Bot Engine & REST API is Alive and Ticking! 🚀');
});

async function startBot() {
    try {
        await connectDB();
        console.log("\n🟢 MongoDB Atlas Trading Bot Server Live Started!");
        console.log(`⏱️ Engine continuously scanning internal MongoDB tables every ${TICK_INTERVAL_MS / 1000} seconds...`);

        // Start Real-Time Websocket securely bypassing unauthenticated crashes explicitly natively
        if (process.env.ALPACA_API_KEY) {
            startLiveStream();
        } else {
            console.log("⚠️ No Alpaca API Keys explicitly found securely natively. Live Data is currently offline.");
        }

        setInterval(async () => {
            try {
                process.stdout.write(".");
                await processAllOpenOrders();
            } catch (err) {
                console.error("\nTick Error:", err);
            }
        }, TICK_INTERVAL_MS);

        app.listen(PORT, () => {
            console.log(`🌐 REST API Server securely listening on port ${PORT} to intercept web traffic!`);
        });

    } catch (error) {
        console.error("\nFailed to jumpstart server active loop:", error);
    }
}

startBot();
