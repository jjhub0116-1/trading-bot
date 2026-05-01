const BASE_URL = 'https://trading-bot-e6e6.onrender.com/api';

async function testFetchUser() {
    console.log("==========================================");
    console.log("🔍 TESTING ADMIN FETCHING SINGLE USER");
    console.log("==========================================\n");

    try {
        // --- 1: Admin Login ---
        console.log("1. Logging in as Admin (admin1@propfirm.com)...");
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin1@propfirm.com', password: 'password123' })
        });
        
        if (loginRes.status !== 200) {
            throw new Error(`Login failed: ${await loginRes.text()}`);
        }
        const adminToken = (await loginRes.json()).token;
        console.log("✅ Admin logged in successfully");

        // --- 2: Get all users to find a target userId ---
        console.log("\n2. Fetching all users created by Admin to pick a target...");
        const allUsersRes = await fetch(`${BASE_URL}/admin/users`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        if (allUsersRes.status !== 200) {
            throw new Error(`Failed to fetch all users: ${await allUsersRes.text()}`);
        }
        
        const allUsers = await allUsersRes.json();
        if (allUsers.length === 0) {
            console.log("⚠️ Admin has not created any users yet. Cannot test fetching a specific user.");
            return;
        }

        const targetUser = allUsers[0];
        console.log(`✅ Found target user: ${targetUser.user_name} (ID: ${targetUser.user_id})`);

        // --- 3: Test the new GET /api/admin/users/:userId endpoint ---
        console.log(`\n3. Hitting new endpoint GET /api/admin/users/${targetUser.user_id}...`);
        const singleUserRes = await fetch(`${BASE_URL}/admin/users/${targetUser.user_id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        if (singleUserRes.status === 200) {
            const fetchedUser = await singleUserRes.json();
            console.log("✅ Successfully fetched single user details!");
            console.log("Result:");
            console.log(JSON.stringify(fetchedUser, null, 2));
        } else {
            console.error(`❌ Failed to fetch single user: ${await singleUserRes.text()}`);
        }

    } catch (err) {
        console.error("\n❌ TESTS FAILED:", err.message);
    }
}

testFetchUser();
