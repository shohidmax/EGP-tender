const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t';

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // 1. Get entire HTML
    const html = await page.content();

    // 2. Search for btnNext in the HTML
    console.log("Searching for 'btnNext' usage...");

    const lines = html.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('btnNext') || line.includes('paging')) {
            console.log(`Line ${i}: ${line.trim().substring(0, 200)}`);
        }
    });

    // 3. Look for click listeners (harder in puppeteer, but we can guess)

    await browser.close();
})();
