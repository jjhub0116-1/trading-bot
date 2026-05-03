const BASE_URL = 'https://trading-bot-e6e6.onrender.com/api';

async function testDetailedAccess() {
    console.log("==================================================");
    console.log("🔍 TESTING ADMIN DETAILED USER DATA ACCESS");
    console.log("==================================================\n");

    const ts = Date.now();
    const adminEmail = `adminDetail_${ts}@propfirm.com`;
    const userEmail = `userDetail_${ts}@propfirm.com`;
    let superToken, adminToken, userToken;
    let userId, adminId;

    try {
        // --- 1. Superadmin Login ---
        console.log("1. Logging in as Superadmin...");
        let res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'superadmin@propfirm.com', password: 'password123' })
        });
        if (res.status !== 200) {
            throw new Error(`Superadmin login failed (${res.status}): ${await res.text()}`);
        }
        superToken = (await res.json()).token;

        // --- 2. Create Admin and User ---
        console.log("2. Creating Admin and User...");
        res = await fetch(`${BASE_URL}/admin/create-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superToken}` },
            body: JSON.stringify({ user_name: "Detail Admin", email: adminEmail, password: "password123", lot_limit: 1000, loss_limit: 5000 })
        });
        adminId = (await res.json()).user_id;

        res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password: "password123" })
        });
        if (res.status !== 200) {
            throw new Error(`Admin login failed (${res.status}): ${await res.text()}`);
        }
        adminToken = (await res.json()).token;

        res = await fetch(`${BASE_URL}/admin/create-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ user_name: "Detail User", email: userEmail, password: "password123", lot_limit: 10, loss_limit: 500 })
        });
        userId = (await res.json()).user_id;

        // --- 3. Test Admin Access (OWNED USER) ---
        console.log("\n3. Testing Admin access to their OWNED user...");
        
        console.log("   Fetching Portfolio...");
        res = await fetch(`${BASE_URL}/admin/users/${userId}/portfolio`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
        if (res.status === 200) {
            const data = await res.json();
            console.log("   ✅ Admin fetched portfolio successfully:");
            console.log(JSON.stringify(data, null, 2));
        } else throw new Error(`Admin portfolio fetch failed: ${await res.text()}`);

        console.log("\n   Fetching Wallet...");
        res = await fetch(`${BASE_URL}/admin/users/${userId}/wallet`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
        if (res.status === 200) {
            const data = await res.json();
            console.log("   ✅ Admin fetched wallet successfully:");
            console.log(JSON.stringify(data, null, 2));
        } else throw new Error(`Admin wallet fetch failed: ${await res.text()}`);

        console.log("\n   Fetching Transactions...");
        res = await fetch(`${BASE_URL}/admin/users/${userId}/transactions`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
        if (res.status === 200) {
            const data = await res.json();
            console.log("   ✅ Admin fetched transactions successfully (Last 2):");
            console.log(JSON.stringify(data.slice(0, 2), null, 2));
        } else throw new Error(`Admin transaction fetch failed: ${await res.text()}`);

        // --- 4. Test Superadmin Access (ANY USER) ---
        console.log("\n4. Testing Superadmin access to ANY user...");
        
        console.log("   Fetching Portfolio...");
        res = await fetch(`${BASE_URL}/admin/users/${userId}/portfolio`, { headers: { 'Authorization': `Bearer ${superToken}` } });
        if (res.status === 200) console.log("   ✅ Superadmin fetched portfolio successfully");
        else throw new Error(`Superadmin portfolio fetch failed: ${await res.text()}`);

        // --- 5. Test Unauthorized Access (CROSS ADMIN) ---
        console.log("\n5. Testing Unauthorized Admin access (Cross-admin check)...");
        // Create another admin
        const admin2Email = `adminDetail2_${ts}@propfirm.com`;
        res = await fetch(`${BASE_URL}/admin/create-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superToken}` },
            body: JSON.stringify({ user_name: "Detail Admin 2", email: admin2Email, password: "password123", lot_limit: 1000, loss_limit: 5000 })
        });
        res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: admin2Email, password: 'password123' })
        });
        const admin2Token = (await res.json()).token;

        console.log("   Admin 2 attempting to fetch User 1's wallet...");
        res = await fetch(`${BASE_URL}/admin/users/${userId}/wallet`, { headers: { 'Authorization': `Bearer ${admin2Token}` } });
        if (res.status === 404) console.log("   ✅ Correctly BLOCKED Admin 2 from viewing Admin 1's user.");
        else throw new Error("Unauthorized access was not blocked!");

        console.log("\n✅✅ ALL DETAILED DATA ACCESS RULES PASSED! ✅✅");

    } catch (err) {
        console.error("\n❌ TESTS FAILED:", err.message);
    }
}

testDetailedAccess();
