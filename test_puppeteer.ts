import puppeteer from 'puppeteer';

(async () => {
  try {
    console.log('Launching Puppeteer...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--bypass-csp']
    });
    console.log('Browser launched successfully');
    const page = await browser.newPage();
    console.log('New page opened');
    await page.goto('about:blank');
    console.log('Navigated to about:blank');
    await browser.close();
    console.log('Puppeteer Test Successful');
    process.exit(0);
  } catch (error) {
    console.error('Puppeteer Test Failed:', error);
    process.exit(1);
  }
})();
