const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const Tender = require('../models/Tender');
const User = require('../models/User');
const Notification = require('../models/Notification');

async function scrapeAndNotify() {
    console.log('[Scraper] Starting job: Checking for new tenders...');
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Sources to scrape
        const SOURCES = [
            'https://www.eprocure.gov.bd/resources/common/AllTenders.jsp?h=t',
            'https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t'
        ];

        let allScrapedTenders = [];

        for (const listUrl of SOURCES) {
            console.log(`[Scraper] Navigating to ${listUrl}...`);
            try {
                await page.goto(listUrl, { waitUntil: 'networkidle2', timeout: 90000 });
                await page.waitForSelector('table#resultTable tbody tr', { timeout: 30000 });

                const pageTenders = await page.evaluate(() => {
                    const rows = Array.from(document.querySelectorAll('table#resultTable tbody tr'));
                    console.log(`[Browser] Found ${rows.length} rows.`);
                    return rows.map(row => {
                        const cols = row.querySelectorAll('td');
                        if (cols.length < 5) return null;
                        const clean = t => t ? t.innerText.trim() : '';
                        const reference = clean(cols[1]);
                        const idMatch = reference.match(/^(\d+),/);
                        const tenderId = idMatch ? idMatch[1] : null;

                        if (!tenderId) return null;

                        // Col 1: ID, Ref, Status
                        const refParts = clean(cols[1]).split(',');
                        const status = refParts.length > 2 ? refParts[refParts.length - 1].trim() : 'Live';

                        // Col 2: Nature, Title
                        const titleRaw = clean(cols[2]);
                        const nature = titleRaw.split(',')[0]?.trim();
                        const realTitle = titleRaw.substring(titleRaw.indexOf(',') + 1).trim() || titleRaw;

                        return {
                            tenderId,
                            sNo: clean(cols[0]),
                            reference,
                            status,
                            detailed_procurementNature: nature,
                            title: realTitle,
                            ministry: clean(cols[3]),
                            typeMethod: clean(cols[4]),
                            dates: clean(cols[5]),
                            publicationDate: clean(cols[5]).split(',')[0]?.trim(),
                            closingDate: clean(cols[5]).split(',')[1]?.trim()
                        };
                    }).filter(i => i);
                });

                console.log(`[Scraper] SOURCE SUCCESS: ${listUrl}`);
                console.log(`[Scraper] Collected ${pageTenders.length} items from this source.`);
                console.log('--------------------------------------------------');
                allScrapedTenders = [...allScrapedTenders, ...pageTenders];

            } catch (err) {
                console.error(`[Scraper] Failed to scrape source ${listUrl}:`, err.message);
                // Continue to next source
            }
        }

        console.log(`[Scraper] Total unique tenders found: ${allScrapedTenders.length}`);

        // Remove duplicates based on tenderId
        const uniqueTenders = Array.from(new Map(allScrapedTenders.map(item => [item.tenderId, item])).values());

        // 2. Process Each Tender (Detail Scraping)
        let newCount = 0;
        let updateCount = 0;

        for (const t of uniqueTenders) {
            // Check if exists
            let existing = await Tender.findOne({ tenderId: t.tenderId });
            let isNew = !existing;

            if (isNew) {
                console.log(`[Scraper] New Tender Found: ${t.tenderId}`);
                existing = new Tender(t);
            } else {
                // Update existing with fresh list data (Status, Dates, etc)
                // We use set() or simple assign. Mongoose document vs object.
                // Safest to just copy key properties we care about or use Object.assign if structure matches schema
                existing.status = t.status;
                if (t.publicationDate) existing.publicationDate = t.publicationDate;
                if (t.closingDate) existing.closingDate = t.closingDate;
                if (t.detailed_procurementNature) existing.detailed_procurementNature = t.detailed_procurementNature; // fallback
                if (t.title) existing.title = t.title; // update title breakdown
            }

            // Always scrape details for data freshness (as requested: "check if updated")
            // Visit Detail Page
            const detailUrl = `https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id=${t.tenderId}`;

            try {
                await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Detailed Scraping Logic
                const details = await page.evaluate(() => {
                    const data = {};
                    // Strategy: Find all table cells. If text ends with ':', it's a label. Next element is value.
                    const cells = Array.from(document.querySelectorAll('td'));

                    for (let i = 0; i < cells.length - 1; i++) {
                        const txt = cells[i].innerText.trim();
                        if (txt.includes(':') && txt.length < 50) { // arbitrary length to avoid long sentences
                            const label = txt.replace(/:$/, '').trim();
                            const val = cells[i + 1].innerText.trim();

                            // Normalize key
                            const key = 'detailed_' + label.replace(/[^a-zA-Z0-9]/g, '_');
                            if (val) data[key] = val;
                        }
                    }
                    // Specific known fields extraction if table query fails
                    // (Optional fallback logic can go here)
                    return data;
                });

                // Merge details into tender object
                Object.assign(existing, details);
                existing.detailed_full_scraping_complete = true;
                existing.originalLink = detailUrl;

                await existing.save();

                if (isNew) {
                    newCount++;
                    // Create Notification
                    const users = await User.find().select('_id');
                    const notifs = users.map(u => ({
                        userId: u._id,
                        type: 'NEW_TENDER',
                        title: 'New Tender Published',
                        message: `New: ${t.title.substring(0, 60)}...`,
                        relatedId: t.tenderId,
                        isRead: false
                    }));
                    if (notifs.length > 0) await Notification.insertMany(notifs);
                } else {
                    updateCount++;
                }

            } catch (err) {
                console.error(`[Scraper] Failed to scrape details for ${t.tenderId}:`, err.message);
                // Save basic info at least
                if (isNew) await existing.save();
            }
        }

        console.log(`[Scraper] Job Done. New: ${newCount}, Updated: ${updateCount}`);

    } catch (e) {
        console.error('[Scraper] Critical Error:', e);
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { scrapeAndNotify };
