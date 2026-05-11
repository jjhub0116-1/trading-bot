const WebSocket = require('ws');

const API_KEY = 'ad5d011b-ff52-456f-8296-9af2e036d48c';
const WS_URL = 'wss://test.lisuns.com:4576/';

const ws = new WebSocket(WS_URL, { rejectUnauthorized: false });

ws.on('open', () => {
    console.log("🔌 Connected. Authenticating...");
    ws.send(JSON.stringify({ "MessageType": "Authenticate", "Password": API_KEY }));
});

ws.on('message', (data) => {
    let parsed;
    try {
        parsed = JSON.parse(data);
    } catch (e) {
        return;
    }

    console.log(`📩 [MESSAGE TYPE]: ${parsed.MessageType}`);

    if (parsed.MessageType === "AuthenticateResult" && parsed.Complete) {
        console.log("✅ Authenticated. Fetching Account Info...");

        // Get account limitations and enabled exchanges
        ws.send(JSON.stringify({ "MessageType": "GetLimitation" }));

        // Get server information
        ws.send(JSON.stringify({ "MessageType": "GetServerInfo" }));

    } else if (parsed.MessageType === "LimitationResult") {
        console.log("💎 ACCOUNT LIMITATIONS:");
        console.log(JSON.stringify(parsed, null, 2));
    } else if (parsed.MessageType === "ServerInfoResult") {
        console.log("💎 SERVER INFO:");
        console.log(JSON.stringify(parsed, null, 2));
    }
});

setTimeout(() => {
    ws.close();
}, 10000);
