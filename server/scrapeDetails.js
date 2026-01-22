const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
require('dotenv').config();
const Tender = require('./models/Tender');

(async () => {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--start-maximized'],
        defaultViewport: null
    });

    const page = await browser.newPage();

    // Create a cursor to iterate through tenders that need details
    // We process them one by one or in small batches
    const cursor = Tender.find({ detailed_full_scraping_complete: { $ne: true } }).cursor();

    let count = 0;

    for (let tender = await cursor.next(); tender != null; tender = await cursor.next()) {
        const tenderId = tender.tenderId;
        const detailUrl = `https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id=${tenderId}&h=t`;

        console.log(`[Total: ${count}] Scraping details for ID ${tenderId}...`);

        try {
            await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Scrape EVERYTHING
            const details = await page.evaluate(() => {
                const data = {};

                const cleanKey = (text) => {
                    return text.toLowerCase()
                        .replace(/[^a-z0-9]+/g, '_')
                        .replace(/^_+|_+$/g, '');
                };

                const rows = document.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = Array.from(row.querySelectorAll('td, th'));

                    if (cells.length === 2) {
                        const key = cleanKey(cells[0].innerText);
                        const val = cells[1].innerText.trim();
                        if (key && val) data['dtl_' + key] = val;
                    }
                    else if (cells.length === 4) {
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

            // Update DB
            details.detailed_full_scraping_complete = true;
            await Tender.updateOne({ _id: tender._id }, { $set: details });

            count++;

        } catch (err) {
            console.error(`Failed to scrape ${tenderId}: ${err.message}`);
        }
    }

    console.log('Done! All pending details scraped.');
    await browser.close();
    process.exit(0);
})();
