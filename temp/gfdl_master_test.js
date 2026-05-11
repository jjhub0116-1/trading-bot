const WebSocket = require('ws');

/**
 * GLOBAL DATAFEEDS (GFDL) MASTER TEST SCRIPT
 * 
 * This script combines account diagnostic tools and real-time subscription tests.
 * Use this to verify your API Key entitlements and data flow.
 */

const API_KEY = 'ad5d011b-ff52-456f-8296-9af2e036d48c';
const WS_URL = 'wss://test.lisuns.com:4576/';

const ws = new WebSocket(WS_URL, { rejectUnauthorized: false });

// Symbols to test for real-time data
const testSymbols = ["NIFTY 50", "NSE:RELIANCE", "NSE_IDX:NIFTY 50", "MCX:CRUDEOIL24JUNFUT"];

ws.on('open', () => {
    console.log("🔌 [GFDL] Connecting to WebSocket...");
    ws.send(JSON.stringify({ "MessageType": "Authenticate", "Password": API_KEY }));
});

ws.on('message', (data) => {
    let parsed;
    try {
        parsed = JSON.parse(data);
    } catch (e) {
        console.log("📩 [GFDL] Received Plain Text:", data.toString());
        return;
    }

    switch (parsed.MessageType) {
        case "AuthenticateResult":
            if (parsed.Complete) {
                console.log("✅ Authenticated Successfully!");
                
                // 1. Check Account Limitations
                console.log("📡 Fetching Account Limitations...");
                ws.send(JSON.stringify({ "MessageType": "GetLimitation" }));

                // 2. Try Subscriptions
                console.log("📡 Attempting Subscriptions...");
                testSymbols.forEach(sym => {
                    ws.send(JSON.stringify({
                        "MessageType": "SubscribeRealtime",
                        "InstrumentIdentifier": sym
                    }));
                });
            } else {
                console.error("❌ Authentication Failed.");
            }
            break;

        case "LimitationResult":
            console.log("\n💎 --- ACCOUNT ENTITLEMENTS ---");
            console.log(`- Realtime Enabled: ${parsed.RealtimeEnabled}`);
            console.log(`- Allowed Exchanges: ${parsed.AllowedExchanges.join(", ")}`);
            console.log(`- Max Symbols: ${parsed.MaxInstrumentsPerCall}`);
            console.log("-------------------------------\n");
            break;

        case "RealtimeSnapshotResult":
            console.log(`⚡ [DATA] ${parsed.InstrumentIdentifier}: Price=${parsed.LastTradePrice} | High=${parsed.High} | Low=${parsed.Low}`);
            break;

        case "RequestError":
            console.error(`⚠️ [API ERROR] ${parsed.Message}`);
            break;

        default:
            // Log other messages like ServerInfo, Echo, etc.
            if (parsed.MessageType !== "Echo") {
                console.log(`📩 [MESSAGE] ${parsed.MessageType}`);
            }
    }
});

ws.on('close', () => console.log("🔌 Connection closed."));
ws.on('error', (err) => console.error("❌ WebSocket Error:", err.message));

// Close after 15 seconds
setTimeout(() => {
    console.log("\n⏹️ Test complete. Closing connection.");
    ws.close();
}, 15000);
