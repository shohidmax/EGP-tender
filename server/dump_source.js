const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t';

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const content = await page.content();
    fs.writeFileSync('source_dump.txt', content);
    console.log('Source saved to source_dump.txt');

    await browser.close();
})();
