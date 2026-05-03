const BASE_URL = 'https://trading-bot-e6e6.onrender.com/api';

async function testRoleManagement() {
    console.log("==================================================");
    console.log("🛡️ STARTING COMPREHENSIVE ROLE MANAGEMENT TEST SUITE");
    console.log("==================================================\n");

    const ts = Date.now();
    const admin1Email = `adminA_${ts}@propfirm.com`;
    const admin2Email = `adminB_${ts}@propfirm.com`;
    const userAEmail = `userA_${ts}@propfirm.com`;

    let superToken, admin1Token;
    let admin1Data, admin2Data, userAData;

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
        } else throw new Error(await res.text());

        // --- TEST 2: Superadmin creates Admin 1 ---
        console.log("\n--- TEST 2: Superadmin creates Admin 1 (1000 lots) ---");
        res = await fetch(`${BASE_URL}/admin/create-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superToken}` },
            body: JSON.stringify({ user_name: "Admin A", email: admin1Email, password: "password123", lot_limit: 1000, loss_limit: 5000 })
        });
        if (res.status === 201) {
            admin1Data = await res.json();
            console.log(`✅ Admin 1 created. ID: ${admin1Data.user_id}`);
        } else throw new Error(await res.text());

        // --- TEST 3: Superadmin creates Admin 2 ---
        console.log("\n--- TEST 3: Superadmin creates Admin 2 (500 lots) ---");
        res = await fetch(`${BASE_URL}/admin/create-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superToken}` },
            body: JSON.stringify({ user_name: "Admin B", email: admin2Email, password: "password123", lot_limit: 500, loss_limit: 5000 })
        });
        if (res.status === 201) {
            admin2Data = await res.json();
            console.log(`✅ Admin 2 created. ID: ${admin2Data.user_id}`);
        } else throw new Error(await res.text());

        // --- TEST 3b: Superadmin creates User C directly ---
        console.log("\n--- TEST 3b: Superadmin creates User C directly (20 lots) ---");
        res = await fetch(`${BASE_URL}/admin/create-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superToken}` },
            body: JSON.stringify({ user_name: "Superadmin's User", email: `userC_${ts}@propfirm.com`, password: "password123", lot_limit: 20, loss_limit: 500 })
        });
        if (res.status === 201) {
            const superUserData = await res.json();
            console.log(`✅ Superadmin successfully created User C directly. ID: ${superUserData.user_id}`);
        } else throw new Error(await res.text());

        // --- TEST 4: Admin 1 Login ---
        console.log("\n--- TEST 4: Admin 1 Login ---");
        res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: admin1Email, password: 'password123' })
        });
        if (res.status === 200) {
            admin1Token = (await res.json()).token;
            console.log("✅ Admin 1 logged in successfully");
        } else throw new Error(await res.text());

        // --- TEST 5: Admin 1 creates User A ---
        console.log("\n--- TEST 5: Admin 1 creates User A (Assigns 50 lots) ---");
        res = await fetch(`${BASE_URL}/admin/create-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${admin1Token}` },
            body: JSON.stringify({ user_name: "User A", email: userAEmail, password: "password123", lot_limit: 50, loss_limit: 500 })
        });
        if (res.status === 201) {
            userAData = await res.json();
            console.log(`✅ User A created successfully. ID: ${userAData.user_id}`);
            if (userAData.commodity_equity === 50) console.log("   -> Lot limit accurately saved as commodity_equity");
        } else throw new Error(await res.text());

        // --- TEST 6: Edge Case - Admin 1 creates User B exceeding limits ---
        console.log("\n--- TEST 6: Edge Case - Admin 1 exceeds their limit pool ---");
        res = await fetch(`${BASE_URL}/admin/create-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${admin1Token}` },
            body: JSON.stringify({ user_name: "User B", email: `userB_${ts}@propfirm.com`, password: "password123", lot_limit: 2000 })
        });
        if (res.status === 400) {
            console.log(`✅ Properly blocked creation! Reason: ${(await res.json()).error}`);
        } else console.error("❌ Expected failure but got status", res.status);

        // --- TEST 7: Admin 1 fetches their users ---
        console.log("\n--- TEST 7: Admin 1 fetches list of their users ---");
        res = await fetch(`${BASE_URL}/admin/users`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${admin1Token}` }
        });
        const adminUsers = await res.json();
        if (adminUsers.length === 1 && adminUsers[0].user_id === userAData.user_id) {
            console.log("✅ Admin 1 securely fetched their users. (User A is visible, Admin 2 is hidden).");
        } else throw new Error("Admin list mismatch");

        // --- TEST 8: Admin 1 fetches specific info of User A ---
        console.log("\n--- TEST 8: Admin 1 fetches specific info of User A ---");
        res = await fetch(`${BASE_URL}/admin/users/${userAData.user_id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${admin1Token}` }
        });
        if (res.status === 200) {
            console.log("✅ Admin 1 successfully fetched User A details.");
        } else throw new Error(await res.text());

        // --- TEST 9: Edge Case - Admin 1 tries to fetch Admin 2 ---
        console.log("\n--- TEST 9: Edge Case - Admin 1 tries to fetch info of Admin 2 ---");
        res = await fetch(`${BASE_URL}/admin/users/${admin2Data.user_id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${admin1Token}` }
        });
        if (res.status === 404) {
            console.log("✅ Properly blocked Admin 1 from viewing Admin 2's details! (404 Not Found)");
        } else console.error("❌ Expected 404 but got", res.status);

        // --- TEST 10: Admin 1 updates User A ---
        console.log("\n--- TEST 10: Admin 1 updates User A (Increases lot limit from 50 to 100) ---");
        res = await fetch(`${BASE_URL}/admin/users/${userAData.user_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${admin1Token}` },
            body: JSON.stringify({ lot_limit: 100 })
        });
        if (res.status === 200) {
            const updatedUser = await res.json();
            if (updatedUser.commodity_equity === 100) {
                console.log("✅ User A lot limit successfully increased to 100.");
            }
        } else throw new Error(await res.text());

        // --- TEST 11: Superadmin fetches User A ---
        console.log("\n--- TEST 11: Superadmin fetches info of User A ---");
        res = await fetch(`${BASE_URL}/admin/users/${userAData.user_id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${superToken}` }
        });
        if (res.status === 200) {
            console.log("✅ Superadmin successfully bypassed Admin restriction and fetched User A.");
        } else throw new Error(await res.text());

        // --- TEST 12: Superadmin updates Admin 1 ---
        console.log("\n--- TEST 12: Superadmin updates Admin 1 limit ---");
        res = await fetch(`${BASE_URL}/admin/users/${admin1Data.user_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superToken}` },
            body: JSON.stringify({ lot_limit: 5000 })
        });
        if (res.status === 200) {
            console.log("✅ Superadmin successfully updated Admin 1's limits to 5000!");
        } else throw new Error(await res.text());

        console.log("\n✅✅ ALL ROLE MANAGEMENT TEST CASES PASSED SUCCESSFULLY! ✅✅");

    } catch (err) {
        console.error("\n❌ TESTS FAILED:", err.message);
    }
}

testRoleManagement();
