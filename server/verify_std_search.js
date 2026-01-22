const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
require('dotenv').config();
const Tender = require('./models/Tender');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const browser = await puppeteer.launch({
        headless: false, // Visual verify
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    const url = 'https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t';

    console.log(`\n=== Verification: Navigating to ${url} ===`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    let currentPage = 1;
    let hasNextPage = true;
    let maxPages = 3; // Limit to 3 pages for verification

    while (hasNextPage && currentPage <= maxPages) {
        console.log(`[Verification] Scraping page ${currentPage}...`);

        try {
            await page.waitForSelector('table#resultTable', { timeout: 10000 });
        } catch (e) { console.log("Table wait failed"); }

        const count = await page.evaluate(() => document.querySelectorAll('table#resultTable tbody tr').length);
        console.log(`Found ${count} rows on page ${currentPage}`);

        const nextButton = await page.$('#btnNext');
        if (nextButton) {
            console.log("Clicking Next...");
            const firstRowBefore = await page.evaluate(() => document.querySelector('table#resultTable tbody tr')?.innerText);

            // The FIX: Use evaluate click
            await page.evaluate(el => el.click(), nextButton);

            try {
                await page.waitForFunction(
                    (oldText) => document.querySelector('table#resultTable tbody tr')?.innerText !== oldText,
                    { timeout: 30000 },
                    firstRowBefore
                );
                console.log("Page transition success!");
                currentPage++;
            } catch (error) {
                console.log("Timeout waiting for change.");
                hasNextPage = false;
            }
        } else {
            console.log("No Next button.");
            hasNextPage = false;
        }
    }

    await browser.close();
    process.exit(0);
})();
