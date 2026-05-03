const WebSocket = require('ws');
const Stock = require('../models/Stock');

const API_KEY = process.env.TWELVE_DATA_API_KEY;
const WS_URL = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${API_KEY}`;

let ws;
let isConnected = false;

/**
 * Starts the Twelve Data WebSocket stream.
 * Automatically subscribes to all symbols of type 'STOCK' in the DB.
 */
function startTwelveDataStream() {
    if (!API_KEY) {
        console.error('❌ [TwelveDataStream] Missing TWELVE_DATA_API_KEY in .env');
        return;
    }

    ws = new WebSocket(WS_URL);

    ws.on('open', async () => {
        console.log('🔌 [TwelveDataStream] WebSocket connected.');
        isConnected = true;

        // Fetch symbols to subscribe to
        const stocks = await Stock.find({ asset_type: 'STOCK' }, { symbol: 1 }).lean();
        const symbols = stocks.map(s => s.symbol).join(',');

        if (symbols) {
            const subscribeMsg = JSON.stringify({
                action: 'subscribe',
                params: { symbols }
            });
            ws.send(subscribeMsg);
            console.log(`📡 [TwelveDataStream] Subscribed to: ${symbols}`);
        } else {
            console.log('⚠️ [TwelveDataStream] No symbols found to subscribe.');
        }
    });

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            
            // Twelve Data price update format
            if (message.event === 'price' && message.price) {
                const { symbol, price } = message;
                
                // Update MongoDB
                await Stock.updateOne(
                    { symbol },
                    { $set: { current_price: parseFloat(price) } }
                );
                
                // Low-frequency log to avoid spamming
                if (Math.random() < 0.05) { 
                    console.log(`⚡ [TwelveDataStream] Real-time update: ${symbol} -> $${price}`);
                }
            } else if (message.status === 'error') {
                console.error('❌ [TwelveDataStream] WebSocket Error Message:', message.message);
            }
        } catch (err) {
            console.error('⚠️ [TwelveDataStream] Message parsing error:', err.message);
        }
    });

    ws.on('close', () => {
        console.log('🔌 [TwelveDataStream] WebSocket disconnected. Retrying in 5 seconds...');
        isConnected = false;
        setTimeout(startTwelveDataStream, 5000);
    });

    ws.on('error', (err) => {
        console.error('❌ [TwelveDataStream] WebSocket Error:', err.message);
    });
}

/**
 * Gracefully closes the WebSocket connection.
 */
function stopTwelveDataStream() {
    if (ws && isConnected) {
        ws.close();
        console.log('🔌 [TwelveDataStream] WebSocket closed gracefully.');
    }
}

module.exports = { startTwelveDataStream, stopTwelveDataStream };
