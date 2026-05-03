require('dotenv').config();
const WebSocket = require('ws');

const API_KEY = process.env.TWELVE_DATA_API_KEY;
const WS_URL = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${API_KEY}`;

async function testWebSocket() {
    console.log("==========================================");
    console.log("🔍 TESTING TWELVE DATA WEBSOCKET");
    console.log("==========================================\n");

    if (!API_KEY) {
        console.error("❌ Missing TWELVE_DATA_API_KEY in .env");
        return;
    }

    console.log(`Connecting to: ${WS_URL}`);
    const ws = new WebSocket(WS_URL);

    ws.on('open', () => {
        console.log("✅ WebSocket Connected!");
        
        // Subscribe to AAPL for testing
        const subscribeMsg = JSON.stringify({
            action: 'subscribe',
            params: { symbols: 'AAPL' }
        });
        
        console.log("📡 Sending subscription for AAPL...");
        ws.send(subscribeMsg);
    });

    ws.on('message', (data) => {
        const message = JSON.parse(data);
        console.log("📥 Received Message:", JSON.stringify(message, null, 2));

        if (message.event === 'price') {
            console.log(`🚀 SUCCESS! Real-time price for ${message.symbol}: $${message.price}`);
            console.log("\nClosing connection and exiting test...");
            ws.close();
            process.exit(0);
        }

        if (message.status === 'error') {
            console.error("❌ API Error:", message.message);
            ws.close();
            process.exit(1);
        }
    });

    ws.on('error', (err) => {
        console.error("❌ WebSocket Error:", err.message);
        process.exit(1);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
        console.log("⏰ Test timed out after 30 seconds.");
        ws.close();
        process.exit(1);
    }, 30000);
}

testWebSocket();
