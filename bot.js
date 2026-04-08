require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require("./config/db");
const { processAllOpenOrders, processRiskManagement } = require("./modules/tradeEngine");

// Import newly created modular routes
const authRoutes = require('./routes/auth');
const ordersRoutes = require('./routes/orders');
const portfolioRoutes = require('./routes/portfolio');
const walletRoutes = require('./routes/wallet');
const stockRoutes = require('./routes/stocks');
const { startPriceFetcher } = require('./modules/priceFetcher');

const TICK_INTERVAL_MS = 3000; // Ultra fast 3-second heartbeat

const app = express();
const PORT = process.env.PORT || 3000;

// Global rate limiter: max 100 requests per minute per IP
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." }
});

app.use(express.json({ limit: '10kb' })); // Prevent multi-GB payload DoS
app.use(cors()); // Allow cross-origin requests from frontend
app.use(limiter);

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

        // Start live Yahoo Finance price polling (replaces Alpaca stream)
        const priceFetcherInterval = startPriceFetcher();

        const tickInterval = setInterval(async () => {
            try {
                process.stdout.write('.');
                await processAllOpenOrders();
                await processRiskManagement();
            } catch (err) {
                console.error('\nTick Error:', err);
            }
        }, TICK_INTERVAL_MS);

        // Graceful shutdown — clears interval and closes DB before exit
        const shutdown = async (signal) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);
            clearInterval(tickInterval);
            clearInterval(priceFetcherInterval);
            const mongoose = require('mongoose');
            await mongoose.connection.close();
            console.log('DB connection closed. Exiting.');
            process.exit(0);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        app.listen(PORT, () => {
            console.log(`🌐 REST API Server securely listening on port ${PORT} to intercept web traffic!`);
        });

    } catch (error) {
        console.error("\nFailed to jumpstart server active loop:", error);
    }
}

startBot();
