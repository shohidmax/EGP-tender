const puppeteer = require('puppeteer');
const Tender = require('../models/Tender');

async function scrapePendingDetails(limit = 5) {
    console.log('[Detail Scraper] Checking for pending details...');

    // Find count
    const pendingCount = await Tender.countDocuments({ detailed_full_scraping_complete: { $ne: true } });
    if (pendingCount === 0) {
        console.log('[Detail Scraper] No pending items.');
        return;
    }

    console.log(`[Detail Scraper] Found ${pendingCount} pending items. Processing batch of ${limit}...`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Optimize resources
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        const cursor = Tender.find({ detailed_full_scraping_complete: { $ne: true } }).limit(limit).cursor();

        for (let tender = await cursor.next(); tender != null; tender = await cursor.next()) {
            const tenderId = tender.tenderId;
            const detailUrl = `https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id=${tenderId}&h=t`;

            console.log(`[Detail Scraper] Scraping ${tenderId}...`);

            try {
                await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

                const details = await page.evaluate(() => {
                    const data = {};
                    const cleanKey = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

                    const rows = document.querySelectorAll('tr');
                    rows.forEach(row => {
                        const cells = Array.from(row.querySelectorAll('td, th'));

                        // Handle standard key-value cells
                        if (cells.length === 2) {
                            const key = cleanKey(cells[0].innerText);
                            const val = cells[1].innerText.trim();
                            if (key && val) data['dtl_' + key] = val;
                        }
                        else if (cells.length === 4) { // Multi-column rows
                            const k1 = cleanKey(cells[0].innerText);
                            const v1 = cells[1].innerText.trim();
                            if (k1 && v1) data['dtl_' + k1] = v1;

                            const k2 = cleanKey(cells[2].innerText);
                            const v2 = cells[3].innerText.trim();
                            if (k2 && v2) data['dtl_' + k2] = v2;
                        }
                    });
                    return data;
                });

                // Update
                details.detailed_full_scraping_complete = true;
                await Tender.updateOne({ _id: tender._id }, { $set: details });
                console.log(`[Detail Scraper] Saved ${tenderId}`);

            } catch (err) {
                console.error(`[Detail Scraper] Failed ${tenderId}: ${err.message}`);
            }
        }

    } catch (e) {
        console.error('[Detail Scraper] Error:', e);
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { scrapePendingDetails };
