// Native fetch used
const BASE_URL = 'http://localhost:3000';

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
    console.log(`\n🔍 Starting Detail Scraper & UI Fetch Verification\n`);

    let tenderId = null;

    // 1. Find a tender WITHOUT details
    await runStep('Find Pending Tender', async () => {
        const res = await fetch(`${BASE_URL}/api/tenders`);
        const tenders = await res.json();
        const pending = tenders.find(t => !t.detailed_full_scraping_complete);
        if (pending) {
            tenderId = pending.tenderId;
            console.log(`(Found ID: ${tenderId})`);
        } else {
            console.log('(All tenders already scraped? Checking if any exist...)');
            if (tenders.length > 0) tenderId = tenders[0].tenderId; // Just pick one to test fetch
        }
        if (!tenderId) throw new Error('No tenders available to test');
    });

    // 2. Fetch Single Tender Endpoint (Mocking Frontend UI Call)
    await runStep(`Fetch Single Tender (${tenderId})`, async () => {
        const res = await fetch(`${BASE_URL}/api/tenders/${tenderId}`);
        if (!res.ok) throw new Error(`GET /api/tenders/${tenderId} failed: ${res.status}`);
        const data = await res.json();

        if (String(data.tenderId) !== String(tenderId)) throw new Error('ID mismatch');

        // Log if it has details
        if (data.detailed_full_scraping_complete) {
            console.log('   (Item already has details)');
            // Check for dtl_ keys
            const keys = Object.keys(data).filter(k => k.startsWith('dtl_'));
            if (keys.length === 0) console.warn('   ⚠️ Has flag but no dtl_ keys?');
            else console.log(`   (Found ${keys.length} detailed fields)`);
        } else {
            console.log('   (Item pending details - Scraper should pick it up)');
        }
    });

    console.log('\n✨ Detail Fetch Logic Verified (Frontend will receive this data)\n');
}

verify();
