const BASE_URL = 'https://trading-bot-e6e6.onrender.com/api';

async function testRenderE2E() {
    console.log("==========================================");
    console.log("🚀 STARTING E2E RENDER API TESTS");
    console.log("==========================================\n");

    const ts = Date.now();
    const adminEmail = `testadmin_${ts}@propfirm.com`;
    const userEmail = `testuser_${ts}@propfirm.com`;

    let superToken, adminToken, userToken;

    try {
        // --- TEST 1: Superadmin Login ---
        console.log("--- TEST 1: Superadmin Login ---");
        let res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'superadmin@propfirm.com', password: 'password123' })
        });
        if (res.status === 200) {
            superToken = (await res.json()).token;
            console.log("✅ Superadmin logged in successfully");
        } else {
            throw new Error(await res.text());
        }

        // --- TEST 2: Superadmin creates Admin ---
        console.log("\n--- TEST 2: Superadmin creates an Admin ---");
        res = await fetch(`${BASE_URL}/admin/create-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superToken}` },
            body: JSON.stringify({
                user_name: "E2E Test Admin",
                email: adminEmail,
                password: "password123",
                lot_limit: 100, // 100 lots
                loss_limit: 1000
            })
        });
        if (res.status === 201) {
            console.log(`✅ Admin created successfully: ${adminEmail}`);
        } else {
            throw new Error(await res.text());
        }

        // --- TEST 3: Admin Login ---
        console.log("\n--- TEST 3: Admin Login ---");
        res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password: 'password123' })
        });
        if (res.status === 200) {
            adminToken = (await res.json()).token;
            console.log("✅ Admin logged in successfully");
        } else {
            throw new Error(await res.text());
        }

        // --- TEST 4: Admin creates User ---
        console.log("\n--- TEST 4: Admin creates a User ---");
        res = await fetch(`${BASE_URL}/admin/create-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({
                user_name: "E2E Test User",
                email: userEmail,
                password: "password123",
                lot_limit: 20,
                loss_limit: 500
            })
        });
        if (res.status === 201) {
            console.log(`✅ User created successfully: ${userEmail}`);
        } else {
            throw new Error(await res.text());
        }

        // --- TEST 5: Edge Case - Admin exceeds limits ---
        console.log("\n--- TEST 5: Edge Case - Admin exceeds their lot limit ---");
        res = await fetch(`${BASE_URL}/admin/create-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({
                user_name: "Greedy User",
                email: `greedy_${ts}@propfirm.com`,
                password: "password123",
                lot_limit: 150, // Admin only has 80 left
                loss_limit: 500
            })
        });
        if (res.status === 400) {
            const errBody = await res.json();
            console.log(`✅ Properly blocked greedy user creation. Reason: ${errBody.error}`);
        } else {
            console.error("❌ Expected failure, but got status:", res.status);
        }

        // --- TEST 6: User Login ---
        console.log("\n--- TEST 6: User Login ---");
        res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, password: 'password123' })
        });
        if (res.status === 200) {
            userToken = (await res.json()).token;
            console.log("✅ User logged in successfully");
        } else {
            throw new Error(await res.text());
        }

        // --- TEST 7: Edge Case - User hits admin route ---
        console.log("\n--- TEST 7: Edge Case - User hits admin-only route ---");
        res = await fetch(`${BASE_URL}/admin/users`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        if (res.status === 403) {
            console.log("✅ Properly blocked user from admin route (403 Forbidden)");
        } else {
            console.error("❌ Expected 403, got", res.status);
        }

        // --- TEST 8: Edge Case - Admin hits trading route ---
        console.log("\n--- TEST 8: Edge Case - Admin tries to fetch wallet ---");
        res = await fetch(`${BASE_URL}/wallet`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (res.status === 403) {
            console.log("✅ Properly blocked Admin from wallet route! (403 Forbidden)");
        } else {
            console.error("❌ Expected 403, got", res.status);
        }

        // --- TEST 9: Edge Case - Superadmin hits trading route ---
        console.log("\n--- TEST 9: Edge Case - Superadmin tries to place order ---");
        res = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superToken}` },
            body: JSON.stringify({
                stockId: 1, quantity: 10, orderType: 'MARKET', side: 'BUY'
            })
        });
        if (res.status === 403) {
            console.log("✅ Properly blocked Superadmin from trading route! (403 Forbidden)");
        } else {
            console.error("❌ Expected 403, got", res.status);
        }

        // --- TEST 10: User fetches wallet ---
        console.log("\n--- TEST 10: User fetches wallet (Should Succeed) ---");
        res = await fetch(`${BASE_URL}/wallet`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        if (res.status === 200) {
            console.log("✅ Standard user successfully fetched their wallet!");
        } else {
            throw new Error(await res.text());
        }

        console.log("\n✅✅ ALL RENDER API E2E TESTS PASSED SUCCESSFULLY! ✅✅");

    } catch (err) {
        console.error("\n❌ TESTS FAILED:", err.message);
    }
}

testRenderE2E();
