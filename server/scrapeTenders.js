const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
require('dotenv').config();
const Tender = require('./models/Tender');

(async () => {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Launch the browser
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    // Sources to scrape
    const SOURCES = [
        'https://www.eprocure.gov.bd/resources/common/AllTenders.jsp?h=t',
        'https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t'
    ];

    for (const url of SOURCES) {
        console.log(`\n=== Navigating to Source: ${url} ===`);
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            let currentPage = 1;
            let hasNextPage = true;

            while (hasNextPage) {
                console.log(`[${url}] Scraping page ${currentPage}...`);

                try {
                    await page.waitForSelector('table#resultTable', { timeout: 10000 });
                } catch (e) {
                    console.log("Table not found, retrying...");
                    await new Promise(r => setTimeout(r, 2000));
                }

                // Extract Data
                const tenders = await page.evaluate(() => {
                    const rows = Array.from(document.querySelectorAll('table#resultTable tbody tr'));
                    return rows.map(row => {
                        const cleanText = (text) => text ? text.replace(/\s+/g, ' ').trim() : '';
                        const cols = row.querySelectorAll('td');
                        if (cols.length < 5) return null;

                        const reference = cleanText(cols[1]?.innerText);
                        // Extract ID from reference (e.g. "1217137, ...")
                        const idMatch = reference.match(/^(\d+),/);
                        const tenderId = idMatch ? idMatch[1] : null;

                        if (!tenderId) return null;

                        // NEW: Extract Status, Nature, Dates (matching scraperService logic)
                        // Col 1: ID, Ref, Status
                        const refParts = reference.split(',');
                        const status = refParts.length > 2 ? refParts[refParts.length - 1].trim() : 'Live';

                        // Col 2: Nature, Title
                        const titleRaw = cleanText(cols[2]?.innerText);
                        const nature = titleRaw.split(',')[0]?.trim();
                        const realTitle = titleRaw.substring(titleRaw.indexOf(',') + 1).trim() || titleRaw;


                        return {
                            tenderId,
                            sNo: cleanText(cols[0]?.innerText),
                            reference,
                            status,
                            detailed_procurementNature: nature,
                            title: realTitle,
                            ministry: cleanText(cols[3]?.innerText),
                            typeMethod: cleanText(cols[4]?.innerText),
                            dates: cleanText(cols[5]?.innerText),
                            publicationDate: cleanText(cols[5]?.innerText).split(',')[0]?.trim(),
                            closingDate: cleanText(cols[5]?.innerText).split(',')[1]?.trim()
                        };
                    }).filter(item => item !== null);
                });

                console.log(`Found ${tenders.length} tenders on page ${currentPage}`);

                // Save to DB
                if (tenders.length > 0) {
                    const ops = tenders.map(t => ({
                        updateOne: {
                            filter: { tenderId: t.tenderId },
                            update: { $set: t },
                            upsert: true
                        }
                    }));
                    await Tender.bulkWrite(ops);
                }

                // Pagination Logic
                if (url.includes('StdTenderSearch')) {
                    // Direct JS Call for StdTenderSearch (Robust)
                    const totalPages = await page.evaluate(() => {
                        const el = document.getElementById('totalPages');
                        return el ? parseInt(el.value) : 1;
                    });

                    if (currentPage < totalPages) {
                        const firstRowBefore = await page.evaluate(() => document.querySelector('table#resultTable tbody tr')?.innerText);
                        const nextPage = currentPage + 1;
                        console.log(`[JS] Going to page ${nextPage}`);

                        await page.evaluate((n) => {
                            $('#pageNo').val(n);
                            try { loadTable(); } catch (e) { console.error(e); }
                        }, nextPage);

                        try {
                            await page.waitForFunction(
                                (oldText) => document.querySelector('table#resultTable tbody tr')?.innerText !== oldText,
                                { timeout: 45000 },
                                firstRowBefore
                            );
                            currentPage++;
                        } catch (e) {
                            console.log("Timeout waiting for page load (JS).");
                            hasNextPage = false;
                        }
                    } else {
                        console.log("Reached last page (JS).");
                        hasNextPage = false;
                    }

                } else {
                    // Standard Click for AllTenders (Already working)
                    const nextButton = await page.$('#btnNext');
                    if (nextButton) {
                        const firstRowBefore = await page.evaluate(() => document.querySelector('table#resultTable tbody tr')?.innerText);
                        await page.evaluate(el => el.click(), nextButton);

                        try {
                            await page.waitForFunction(
                                (oldText) => document.querySelector('table#resultTable tbody tr')?.innerText !== oldText,
                                { timeout: 30000 },
                                firstRowBefore
                            );
                            currentPage++;
                        } catch (error) {
                            console.log("No data change detected or timeout. Assuming end of pagination.");
                            hasNextPage = false;
                        }
                    } else {
                        console.log("No Next button found. End of source.");
                        hasNextPage = false;
                    }
                }
            } // end while
        } catch (e) {
            console.error(`Error processing source ${url}:`, e);
        }
    } // end for loop

    console.log(`Scraping complete.`);
    await browser.close();
    process.exit(0);
})();
