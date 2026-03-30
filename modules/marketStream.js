const WebSocket = require('ws');
const Stock = require('../models/Stock');

// Deterministic stock_id from symbol — avoids random collision on upsert
function symbolToId(symbol) {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
        hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % 100000;
}

// Exponential backoff state
let reconnectDelay = 5000;
const MAX_RECONNECT_DELAY = 300000; // 5 minutes cap

function startLiveStream() {
    const ws = new WebSocket('wss://stream.data.alpaca.markets/v2/iex');

    ws.on('open', () => {
        console.log('📡 Connected to Alpaca Market Stream!');
        reconnectDelay = 5000; // Reset backoff on successful connect
        ws.send(JSON.stringify({
            action: 'auth',
            key: process.env.ALPACA_API_KEY,
            secret: process.env.ALPACA_SECRET_KEY
        }));
    });

    ws.on('message', async (data) => {
        const parsed = JSON.parse(data);
        const event = parsed[0];

        if (event && event.T === 'success') {
            console.log('✅ Alpaca authenticated. Subscribing to live feeds...');
            ws.send(JSON.stringify({
                action: 'subscribe',
                trades: ['AAPL', 'NOK', 'TSLA', 'MSFT']
            }));
        } else if (event && event.T === 'error') {
            console.error('❌ Alpaca auth error:', event.msg);
        }

        if (event && event.T === 't') {
            const symbol = event.S;
            const currentPrice = event.p;

            if (Math.random() > 0.95) {
                console.log(`⚡ ${symbol} @ $${currentPrice}`);
            }

            try {
                await Stock.updateOne(
                    { symbol },
                    {
                        $set: { current_price: currentPrice },
                        $setOnInsert: {
                            // stock_name only set on INSERT — never overwritten on price ticks
                            stock_name: symbol,
                            stock_id: symbolToId(symbol)
                        }
                    },
                    { upsert: true }
                );
            } catch (err) {
                // Log errors — never swallow them silently
                console.error('Failed to update stock price:', { symbol, currentPrice, error: err.message });
            }
        }
    });

    ws.on('close', () => {
        console.log(`⚠️ Alpaca stream closed. Reconnecting in ${reconnectDelay / 1000}s...`);
        setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
            startLiveStream();
        }, reconnectDelay);
    });

    ws.on('error', (err) => {
        console.error('❌ Alpaca WebSocket error:', err.message);
    });
}

module.exports = { startLiveStream };
