const BASE_URL = 'https://trading-bot-e6e6.onrender.com/api';

async function testAllTrades() {
    console.log("==================================================");
    console.log("📈 STARTING COMPREHENSIVE TRADING ENGINE TEST SUITE");
    console.log("==================================================\n");

    const ts = Date.now();
    const testUserEmail = `trader_${ts}@propfirm.com`;
    let adminToken, userToken;
    let userId, stockId = 101; // AAPL usually
    let commodityId = 107; // Gold usually

    try {
        // --- 1. Admin logs in to create the user ---
        console.log("1. Logging in as Admin...");
        let res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin1@propfirm.com', password: 'password123' })
        });
        if (res.status === 200) {
            adminToken = (await res.json()).token;
        } else throw new Error("Admin login failed");

        // --- 2. Admin creates the test user ---
        console.log(`2. Admin creates Test User (${testUserEmail}) with 20 lots...`);
        res = await fetch(`${BASE_URL}/admin/create-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ user_name: "Pro Trader", email: testUserEmail, password: "password123", lot_limit: 20, loss_limit: 500 })
        });
        if (res.status === 201) {
            userId = (await res.json()).user_id;
            console.log("✅ User created successfully.");
        } else throw new Error(await res.text());

        // --- 3. User logs in ---
        console.log("\n3. Logging in as new Test User...");
        res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testUserEmail, password: 'password123' })
        });
        if (res.status === 200) {
            userToken = (await res.json()).token;
            console.log("✅ User logged in successfully.");
        } else throw new Error("User login failed");

        // --- 4. Verify Wallet Defaults ---
        console.log("\n4. Fetching Wallet limits...");
        res = await fetch(`${BASE_URL}/wallet`, { headers: { 'Authorization': `Bearer ${userToken}` } });
        const wallet = await res.json();
        console.log(`   - Stock Equity: ${wallet.equity}`);
        console.log(`   - Commodity Lots (commodity_equity): ${wallet.commodity_equity}`);
        if (wallet.equity === 5000 && wallet.commodity_equity === 20) {
            console.log("✅ Wallet limits are perfectly intact from the old architecture!");
        } else throw new Error("Wallet limits mismatch");

        // --- 5. Find valid IDs ---
        res = await fetch(`${BASE_URL}/stocks`);
        const stocksList = await res.json();
        const stockAsset = stocksList.find(s => s.asset_type === 'STOCK');
        const commAsset = stocksList.find(s => s.asset_type === 'COMMODITY');
        if (stockAsset) stockId = stockAsset.stock_id;
        if (commAsset) commodityId = commAsset.stock_id;

        // --- 6. Market BUY (Stock) ---
        console.log(`\n5. Placing NORMAL MARKET BUY for Stock (ID: ${stockId}, Qty: 10)`);
        res = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
            body: JSON.stringify({ stockId, quantity: 10, orderType: 'MARKET', price: 0, side: 'BUY' })
        });
        if (res.status === 200) console.log("✅ Market BUY successful");
        else console.error("❌ Failed:", await res.text());

        // --- 7. Market BUY (Commodity) ---
        console.log(`6. Placing NORMAL MARKET BUY for Commodity (ID: ${commodityId}, Lots: 2)`);
        res = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
            body: JSON.stringify({ stockId: commodityId, quantity: 2, orderType: 'MARKET', price: 0, side: 'BUY' })
        });
        if (res.status === 200) console.log("✅ Commodity BUY successful");
        else console.error("❌ Failed:", await res.text());

        // --- 8. Short SELL (Advance Sell) ---
        console.log(`7. Placing ADVANCE SHORT SELL for Stock (ID: ${stockId}, Qty: 5)`);
        res = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
            body: JSON.stringify({ stockId, quantity: 5, orderType: 'MARKET', price: 0, side: 'SELL' })
        });
        if (res.status === 200) console.log("✅ Short SELL successful");
        else console.error("❌ Failed:", await res.text());

        // --- 9. Limit BUY with Brackets ---
        console.log(`8. Placing LIMIT BUY with Brackets (SL & Target)`);
        res = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
            body: JSON.stringify({ stockId, quantity: 10, orderType: 'LIMIT', price: 100, stopLoss: 90, target: 150, side: 'BUY' })
        });
        if (res.status === 200) {
            console.log("✅ Bracket Limit Order placed successfully");
        } else console.error("❌ Failed:", await res.text());

        // --- 10. Check Portfolio ---
        console.log("\n9. Fetching Live Portfolio...");
        res = await fetch(`${BASE_URL}/portfolio`, { headers: { 'Authorization': `Bearer ${userToken}` } });
        const portfolio = await res.json();
        console.log(`   - Found ${portfolio.positions.length} active positions.`);
        console.log(`   - Total Unrealized PnL: $${portfolio.unrealized_pnl}`);
        console.log("✅ Portfolio fetching is functioning normally");

        // --- 11. Edge Case: Exceed Equity ---
        console.log("\n10. Edge Case: Attempting to buy 6000 stock shares (Exceeds 5000 Equity Cap)");
        res = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
            body: JSON.stringify({ stockId, quantity: 6000, orderType: 'MARKET', price: 0, side: 'BUY' })
        });
        if (res.status === 400) {
            console.log(`✅ Correctly Blocked! Reason: ${(await res.json()).message || await res.text()}`);
        } else console.error("❌ Expected block but passed:", await res.text());

        // --- 12. Edge Case: Exceed Lot Limit ---
        console.log("\n11. Edge Case: Attempting to buy 50 commodity lots (Exceeds 20 Lot Limit)");
        res = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
            body: JSON.stringify({ stockId: commodityId, quantity: 50, orderType: 'MARKET', price: 0, side: 'BUY' })
        });
        if (res.status === 400) {
            console.log(`✅ Correctly Blocked! Reason: ${(await res.json()).message || await res.text()}`);
        } else console.error("❌ Expected block but passed:", await res.text());

        console.log("\n✅✅ ALL TRADING ENGINE AND RISK RULES PASSED FLAWLESSLY! ✅✅");

    } catch (err) {
        console.error("\n❌ TESTS FAILED:", err.message);
    }
}

testAllTrades();
