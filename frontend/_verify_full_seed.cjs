const { chromium } = require('playwright-core');
const path = require('path');
const CHROMIUM_PATH = path.join(process.env.HOME, 'Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const TOKEN = process.argv[2];
const OUT = '/private/tmp/claude-501/-Users-the-deepponkiya-Downloads-DP-WORLD-PROJECT-Inventory-Manufacturing-Management/77927c9c-6441-445e-beeb-97e24100e9d8/scratchpad';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5173/#/login');
  await page.evaluate((token) => {
    localStorage.setItem('inventory-app:auth', JSON.stringify({
      token,
      user: { userName: 'EvaSoftek', email: 'evasoftek@internal.test', profileImage: null, isHidden: true, roleId: null },
    }));
  }, TOKEN);
  await page.reload();
  await page.waitForTimeout(1200);

  await page.goto('http://localhost:5173/#/inventory');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/final-inventory.png`, fullPage: true });

  await page.goto('http://localhost:5173/#/sales-order');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/final-sales-order.png`, fullPage: true });

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
