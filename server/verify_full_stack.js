const mongoose = require('mongoose');
const { scrapeAndNotify } = require('./services/scraperService'); // We won't run it, just check imports? No, keep it clean.
require('dotenv').config();

// Native fetch
const BASE_URL = 'http://localhost:3000';
let TOKEN = null;
let SAMPLE_TENDER_ID = null;

async function runStep(name, fn) {
    process.stdout.write(`[CHECK] ${name}... `);
    try {
        await fn();
        console.log('✅ OK');
    } catch (e) {
        console.log('❌ FAIL');
        console.error('   -> ' + e.message);
        process.exit(1);
    }
}

async function verifyFullStack() {
    console.log(`\n🚀 STARTING FULL SYSTEM HEALTH CHECK\n`);

    // STEP 1: DATABASE CONNECTION & INTEGRITY
    await runStep('Database Connection', async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
        }
    });

    await runStep('Database Integrity (Counts)', async () => {
        const Tender = require('./models/Tender');
        const User = require('./models/User');
        const Notification = require('./models/Notification');

        const tenderCount = await Tender.countDocuments();
        const userCount = await User.countDocuments();
        const notifCount = await Notification.countDocuments();

        console.log(`\n      - Tenders: ${tenderCount}`);
        console.log(`      - Users: ${userCount}`);
        console.log(`      - Notifications: ${notifCount}`);

        if (tenderCount === 0) throw new Error('Database is empty! Scraper might be broken.');

        // Find a random tender for visual check of target site data
        const t = await Tender.findOne();
        if (!t.reference) throw new Error('Tender data malformed (no reference)');
        console.log(`      - Sample: ${t.reference.substring(0, 40)}...`);
    });

    // STEP 2: BACKEND API & AUTH
    await runStep('API Health & Auth', async () => {
        // Register/Login temp user
        const email = `audit_${Date.now()}@check.com`;
        const res = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Auditor', email, password: 'password123' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Auth failed');
        TOKEN = data.token;
    });

    // STEP 3: DATA FLOW (TARGET SITE -> DB -> API)
    await runStep('Data Delivery (List API)', async () => {
        const res = await fetch(`${BASE_URL}/api/tenders`);
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error('API returned empty list');
        SAMPLE_TENDER_ID = data[0].tenderId;
    });

    // STEP 4: UI FEATURES (PINNING)
    await runStep('User Interaction (Pinning)', async () => {
        const res = await fetch(`${BASE_URL}/api/user/pin/${SAMPLE_TENDER_ID}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error('Pinning failed');
    });

    // STEP 5: DETAIL SCRAPER CHECK
    await runStep('Detail Scraper Integration', async () => {
        const res = await fetch(`${BASE_URL}/api/tenders/${SAMPLE_TENDER_ID}`);
        if (res.status === 404) throw new Error('Single Tender API not found');
        const data = await res.json();

        if (data.detailed_full_scraping_complete) {
            console.log('      - Item has FULL details scraped.');
        } else {
            console.log('      - Item pending details (Background job will catch it).');
        }
    });

    console.log('\n🌟 SYSTEM STATUS: 100% OPERATIONAL\n');
    process.exit(0);
}

verifyFullStack();
