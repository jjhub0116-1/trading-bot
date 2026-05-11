const WebSocket = require('ws');
const Stock = require('../models/Stock');

const API_KEY = process.env.GFDL_API_KEY;
const WS_URL = process.env.GFDL_WS_URL || 'wss://test.lisuns.com:4576/';

let ws;
let isConnected = false;

/**
 * Starts the Lisuns (GFDL) WebSocket stream.
 * Maps GFDL fields to our Stock model.
 */
function startLisunsStream() {
    if (!API_KEY) {
        console.error('❌ [LisunsStream] Missing GFDL_API_KEY in .env');
        return;
    }

    console.log(`🔌 [LisunsStream] Connecting to ${WS_URL}...`);
    ws = new WebSocket(WS_URL, { rejectUnauthorized: false });

    ws.on('open', () => {
        console.log('🔌 [LisunsStream] Connected. Authenticating...');
        ws.send(JSON.stringify({ "MessageType": "Authenticate", "Password": API_KEY }));
    });

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);

            if (message.MessageType === "AuthenticateResult" && message.Complete) {
                console.log('✅ [LisunsStream] Authenticated. Subscribing to instruments...');
                subscribeToStocks();
            } else if (message.MessageType === "RealtimeSnapshotResult" || message.MessageType === "SnapshotResult") {
                await handleSnapshot(message);
            } else if (message.MessageType === "RequestError") {
                console.error('❌ [LisunsStream] API Error:', message.Message);
            }
        } catch (err) {
            console.error('⚠️ [LisunsStream] Message error:', err.message);
        }
    });

    ws.on('close', () => {
        console.log('🔌 [LisunsStream] Disconnected. Retrying in 5 seconds...');
        isConnected = false;
        setTimeout(startLisunsStream, 5000);
    });

    ws.on('error', (err) => {
        console.error('❌ [LisunsStream] WebSocket Error:', err.message);
    });
}

/**
 * Subscribes to all stocks in the database.
 * Note: Symbols need to be in GFDL format (e.g., NSE:RELIANCE).
 */
async function subscribeToStocks() {
    try {
        const stocks = await Stock.find({}, { symbol: 1 }).lean();
        const symbols = stocks.map(s => s.symbol);

        if (symbols.length > 0) {
            // Lisuns subscription requires individual symbols or a specific list format
            symbols.forEach(sym => {
                ws.send(JSON.stringify({
                    "MessageType": "SubscribeRealtime",
                    "InstrumentIdentifier": sym
                }));
            });
            console.log(`📡 [LisunsStream] Subscribed to ${symbols.length} symbols.`);
        }
    } catch (err) {
        console.error('❌ [LisunsStream] Subscription error:', err.message);
    }
}

/**
 * Maps GFDL fields to Stock model and updates DB.
 */
async function handleSnapshot(data) {
    const symbol = data.InstrumentIdentifier || data.Symbol;
    const ltp = data.LastTradePrice || data.LastPrice;

    if (symbol && ltp != null) {
        try {
            await Stock.updateOne(
                { symbol },
                { 
                    $set: { 
                        current_price: parseFloat(ltp),
                        dayHigh: data.High || undefined,
                        dayLow: data.Low || undefined,
                        open: data.Open || undefined,
                        previousClose: data.PreviousClose || undefined
                    } 
                }
            );
            
            // Log 5% of updates to avoid noise
            if (Math.random() < 0.05) {
                console.log(`⚡ [Lisuns] ${symbol} -> ${ltp}`);
            }
        } catch (err) {
            console.error(`❌ [Lisuns] DB Update failed for ${symbol}:`, err.message);
        }
    }
}

function stopLisunsStream() {
    if (ws) ws.close();
}

module.exports = { startLisunsStream, stopLisunsStream };
