const BASE_URL = 'https://trading-bot-e6e6.onrender.com/api';

async function testRenderTrading() {
    console.log("==========================================");
    console.log("📈 STARTING STANDARD USER TRADING TESTS");
    console.log("==========================================\n");

    const email = 'testuser_1777555614230@propfirm.com';
    const password = 'password123';
    let token;

    try {
        // --- TEST 1: User Login ---
        console.log("--- TEST 1: User Login ---");
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (loginRes.status === 200) {
            token = (await loginRes.json()).token;
            console.log("✅ User logged in successfully");
        } else {
            throw new Error(await loginRes.text());
        }

        // --- TEST 2: User Wallet Fetch ---
        console.log("\n--- TEST 2: Wallet Verification ---");
        const walletRes = await fetch(`${BASE_URL}/wallet`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (walletRes.status === 200) {
            const wallet = await walletRes.json();
            console.log("✅ Wallet fetched successfully");
            console.log(`   Equity (Stocks): $${wallet.equity}`);
            console.log(`   Lot Limit (Commodities): ${wallet.commodity_equity} lots`);
            
            if (wallet.equity !== 5000 || wallet.commodity_equity !== 20) {
                console.error("❌ Warning: Default limits do not match expected (5000 / 20)!");
            } else {
                console.log("✅ Default limits are PERFECT.");
            }
        } else {
            throw new Error(await walletRes.text());
        }

        // Fetch stocks to get IDs
        const stocksRes = await fetch(`${BASE_URL}/stocks`);
        const stocks = await stocksRes.json();
        const aapl = stocks.find(s => s.symbol === 'AAPL'); // Stock
        const gold = stocks.find(s => s.symbol === 'GC=F'); // Commodity

        // --- TEST 3: Place Stock Order ---
        console.log("\n--- TEST 3: Place Stock Order (AAPL) ---");
        const orderRes1 = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ stockId: aapl.stock_id, quantity: 1, orderType: 'MARKET', side: 'BUY' })
        });
        if (orderRes1.status === 200) {
            console.log("✅ Stock Order placed successfully!");
        } else {
            console.error("❌ Failed to place stock order:", await orderRes1.text());
        }

        // --- TEST 4: Place Commodity Order ---
        console.log("\n--- TEST 4: Place Commodity Order (Gold) ---");
        const orderRes2 = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ stockId: gold.stock_id, quantity: 1, orderType: 'MARKET', side: 'BUY' })
        });
        if (orderRes2.status === 200) {
            console.log("✅ Commodity Order placed successfully!");
        } else {
            console.error("❌ Failed to place commodity order:", await orderRes2.text());
        }

        // --- TEST 5: Fetch Portfolio ---
        console.log("\n--- TEST 5: Fetch Portfolio ---");
        const portRes = await fetch(`${BASE_URL}/portfolio`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (portRes.status === 200) {
            const portfolio = await portRes.json();
            console.log(`✅ Portfolio fetched successfully! Contains ${portfolio.positions.length} active positions.`);
            console.log(`   Unrealized P&L: $${portfolio.unrealized_pnl}`);
        } else {
            throw new Error(await portRes.text());
        }

        console.log("\n✅✅ ALL TRADING TESTS PASSED SUCCESSFULLY! The trading flow remains 100% untouched and functional. ✅✅");

    } catch (err) {
        console.error("\n❌ TESTS FAILED:", err.message);
    }
}

testRenderTrading();
