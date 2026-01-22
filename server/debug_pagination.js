const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t';

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Check Next Button
    const nextBtn = await page.$('#btnNext');
    if (nextBtn) {
        const html = await page.evaluate(el => el.outerHTML, nextBtn);
        console.log('Next Button HTML:', html);

        // Check if disabled
        const isDisabled = await page.evaluate(el => el.disabled || el.classList.contains('disabled'), nextBtn);
        console.log('Is Button Disabled?:', isDisabled);

        // Click and watch
        const initialText = await page.evaluate(() => document.querySelector('table#resultTable tbody tr')?.innerText);
        console.log('First row text before click:', initialText.substring(0, 50));

        await nextBtn.click();
        console.log('Clicked Next. Waiting for change...');

        try {
            await page.waitForFunction(
                (oldText) => document.querySelector('table#resultTable tbody tr')?.innerText !== oldText,
                { timeout: 10000 },
                initialText
            );
            console.log('Page changed successfully.');
            const newText = await page.evaluate(() => document.querySelector('table#resultTable tbody tr')?.innerText);
            console.log('First row text after click:', newText.substring(0, 50));
        } catch (e) {
            console.log('Timeout waiting for page change.');
        }

    } else {
        console.log('#btnNext NOT found.');
        // Dump pagination div
        const pagingDiv = await page.evaluate(() => document.querySelector('.paging')?.outerHTML || document.body.innerHTML.substring(0, 500));
        console.log('Pagination Area:', pagingDiv);
    }

    await browser.close();
})();
