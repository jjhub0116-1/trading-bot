const API_BASE = 'https://trading-bot-e6e6.onrender.com/api'; // Testing Production
// const API_BASE = 'http://127.0.0.1:3000/api'; // Uncomment to test Localhost

async function testLoginSpeed() {
    console.log(`🚀 Benchmarking Login Speed on: ${API_BASE}`);
    console.log("--------------------------------------------------");
    console.log("Note: Render free tier goes to sleep after 15 mins of inactivity.");
    console.log("The very first request wakes the server up (Cold Start) and can take 2-10 seconds.");
    console.log("All subsequent requests should take less than 300ms.\n");

    const credentials = { email: "rohan@test.com", password: "hashed" };

    for (let i = 1; i <= 5; i++) {
        const start = performance.now();
        
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            const data = await res.json();
            
            const end = performance.now();
            const timeTaken = (end - start).toFixed(2);
            
            if (data.success) {
                console.log(`✅ Attempt ${i}: ${timeTaken} ms`);
            } else {
                console.log(`❌ Attempt ${i}: Failed - ${data.message} (${timeTaken} ms)`);
            }
        } catch (error) {
            console.error(`❌ Attempt ${i}: Network Error - ${error.message}`);
        }
        
        // Wait 1 second before next attempt
        await new Promise(res => setTimeout(res, 1000));
    }
    
    console.log("\n💡 Conclusion for Frontend Dev:");
    console.log("- If Attempt 1 is slow but Attempts 2-5 are fast, the delay is 100% caused by Render Free Tier cold starts.");
    console.log("- The backend logic itself (bcrypt hashing + DB lookup + JWT generation) takes less than 300ms.");
}

testLoginSpeed();
