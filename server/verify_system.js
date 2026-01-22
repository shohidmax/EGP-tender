// Native fetch used

const BASE_URL = 'http://localhost:3000';
let TOKEN = null;
let USER_ID = null;
let TENDER_ID = null;

async function runStep(name, fn) {
    process.stdout.write(`[TEST] ${name}... `);
    try {
        await fn();
        console.log('✅ PASS');
    } catch (e) {
        console.log('❌ FAIL');
        console.error('   -> ' + e.message);
        process.exit(1);
    }
}

async function verify() {
    console.log(`\n🔍 Starting System Verification on ${BASE_URL}\n`);

    // 1. Authentication
    await runStep('Login & Get Token', async () => {
        // We'll use the seeded user or try to login. 
        // If we don't know the password, we might need to rely on the seeded token in localStorage? 
        // No, we are in Node. let's assume 'test@example.com' / 'password123' or similar.
        // Actually, let's Register a temp user to be sure.
        const email = `verify_${Date.now()}@test.com`;
        const res = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Verifier', email, password: 'password123' })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Register failed');
        TOKEN = data.token;
        if (!TOKEN) throw new Error('No token received');
    });

    // 2. Profile
    await runStep('Fetch User Profile', async () => {
        const res = await fetch(`${BASE_URL}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        if (data.email.includes('verify_')) USER_ID = data._id;
        else throw new Error('Profile mismatch');
    });

    // 3. Fetch Tenders
    await runStep('Fetch Tenders List', async () => {
        const res = await fetch(`${BASE_URL}/api/tenders`);
        const data = await res.json();
        if (!res.ok) throw new Error('Failed to fetch tenders');
        if (!Array.isArray(data) || data.length === 0) throw new Error('No tenders found (Seeding might be needed)');
        TENDER_ID = data[0].tenderId; // Grab first ID
    });

    // 4. Pinning
    await runStep(`Pin Tender ${TENDER_ID}`, async () => {
        const res = await fetch(`${BASE_URL}/api/user/pin/${TENDER_ID}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        if (!data.pins.includes(TENDER_ID)) throw new Error('Tender ID not found in returned pins');
    });

    // 5. Verify Pin in Profile
    await runStep('Verify Pin Persistence', async () => {
        const res = await fetch(`${BASE_URL}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const data = await res.json();
        if (!data.pins || !data.pins.includes(TENDER_ID)) throw new Error('Pin not found in User Profile');
    });

    // 6. Unpin
    await runStep('Unpin Tender', async () => {
        const res = await fetch(`${BASE_URL}/api/user/pin/${TENDER_ID}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const data = await res.json();
        if (data.pins.includes(TENDER_ID)) throw new Error('Tender ID still in pins after unpin');
    });

    // 7. Notifications
    await runStep('Fetch Notifications', async () => {
        const res = await fetch(`${BASE_URL}/api/notifications`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        if (!Array.isArray(data.notifications)) throw new Error('Invalid notification format');
    });

    console.log('\n✨ All Logic Step-by-Step Verification Passed!\n');
}

verify();
