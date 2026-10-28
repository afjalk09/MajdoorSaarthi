import { chromium } from '@playwright/test';

const OUT = process.env.OUT_DIR || 'C:\\Users\\afjal\\AppData\\Local\\Temp\\opencode';
const BASE = 'http://localhost:5173';

const browser = await chromium.launch();

async function shot(path, name, { width = 1440, height = 900, full = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  // scroll through to trigger IntersectionObserver reveals + counters
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 400) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 400));
  });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}\\${name}.png`, fullPage: full });
  await ctx.close();
  console.log('saved', name);
}

await shot('/', 'landing-desktop', { full: true });
await shot('/', 'landing-mobile', { width: 390, height: 844, full: true });
await shot('/login', 'login-desktop', { full: false });
await shot('/register', 'register-desktop', { full: false });

await browser.close();

