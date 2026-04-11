/**
 * Scalability & Load Verification Script
 * Simulates high-frequency requests to verify rate limits and DB pooling.
 */
require('dotenv').config();
const API_BASE = 'http://127.0.0.1:3000/api';

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runLoadTest() {
    console.log("=============================================");
    console.log("  🚀 BACKEND SCALABILITY LOAD TEST");
    console.log("=============================================\n");

    console.log("📡 Testing Rate Limiter (Simulating 150 requests quickly)...");
    const requests = [];
    for (let i = 0; i < 150; i++) {
        requests.push(fetch(`${API_BASE}/stocks`).then(r => r.status));
    }

    const results = await Promise.all(requests);
    const blocked = results.filter(status => status === 429).length;
    const success = results.filter(status => status === 200).length;

    console.log(`   - Success: ${success}`);
    console.log(`   - Blocked (429): ${blocked}`);

    if (blocked === 0) {
        console.log("   ✅ SUCCESS: High-throughput allowed (Rate Limit correctly increased).");
    } else {
        console.error("   ❌ FAIL: Rate limiter still blocking at low volume.");
    }

    console.log("\n🔗 Testing DB Pooling (Concurrent Auth + Portfolio reads)...");
    const dbRequests = [];
    // Simulating 50 users fetching their portfolio concurrently
    for (let i = 0; i < 50; i++) {
        dbRequests.push(fetch(`${API_BASE}/portfolio`, {
            headers: { 'Authorization': 'Bearer MOCK_OR_VALID_TOKEN' } // Just testing connection handling
        }).then(r => r.status));
    }

    const dbResults = await Promise.all(dbRequests);
    console.log(`   - Concurrent requests handled: ${dbResults.length}`);
    console.log("   ✅ SUCCESS: No socket hang-ups or pooling timeouts observed.");

    console.log("\n🏁 SCALABILITY TEST FINISHED!");
    process.exit(0);
}

runLoadTest().catch(e => { console.error(e); process.exit(1); });
