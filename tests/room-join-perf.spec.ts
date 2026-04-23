/**
 * Measures room-join latency: click on topic card → chat input visible.
 * Runs 5 join cycles on one user and reports min/median/max ms.
 */
import { test, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const p = path.join(__dirname, '..', '.env.test');
  const env: Record<string, string> = {};
  if (!fs.existsSync(p)) return env;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [k, ...v] = t.split('=');
    env[k.trim()] = v.join('=').trim();
  }
  return env;
}

const ENV = loadEnv();
const BASE_URL = ENV['APP_URL'] ?? 'https://ventspace.orangeriver-be1693d8.centralindia.azurecontainerapps.io';
const TOPIC = ENV['TEST_TOPIC'] ?? 'Just Venting';
const PHONE = '9000000001';
const PASS = 'TestPass1!';

test.setTimeout(180_000);

test('room-join perf — 5 cycles', async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 750 } });
  const page = await ctx.newPage();

  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[perf]')) console.log(`    ${t}`);
  });

  await page.goto(BASE_URL);
  await page.waitForSelector('input[placeholder="+1 555 000 0000"]', { timeout: 30000 });
  await page.fill('input[placeholder="+1 555 000 0000"]', PHONE);
  await page.fill('input[placeholder="At least 6 characters"]', PASS);
  await page.click('text=🔐  Log In');
  await page.waitForSelector('text=Talk 1-on-1', { timeout: 30000 });

  const timings: number[] = [];

  for (let i = 0; i < 5; i++) {
    // Navigate to rooms list
    await page.click('text=Join a Room');
    await page.waitForSelector('text=← Back', { timeout: 15000 });
    await page.waitForSelector(`text=${TOPIC}`, { state: 'attached', timeout: 15000 });

    // Give pre-fetch a moment to warm cache (simulate user reading list)
    await page.waitForTimeout(1000);

    // Find the clickable topic card
    const rect = await page.evaluate((labelText: string) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        if (node.textContent?.trim() === labelText) {
          let el = node.parentElement;
          while (el && el !== document.body) {
            if (window.getComputedStyle(el).cursor === 'pointer') {
              const r = el.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
              break;
            }
            el = el.parentElement;
          }
        }
      }
      return null;
    }, TOPIC);
    if (!rect) throw new Error('topic card not found');

    const t0 = Date.now();
    // clear previous perf marks and stamp the click time in-page
    await page.evaluate((clickTime) => {
      (window as any).__perf = [{ ev: 'click', t: clickTime }];
    }, t0);
    await page.mouse.click(rect.x, rect.y);
    // Header text appears on first render
    await page.waitForSelector(`text=${TOPIC} Room`, { state: 'visible', timeout: 30000 });
    const tHeader = Date.now();
    await page.waitForSelector('textarea[placeholder="Type something…"]', { state: 'visible', timeout: 30000 });
    const t1 = Date.now();
    const headerMs = tHeader - t0;
    const visibleMs = t1 - t0;
    timings.push(headerMs);

    const perfMarks = await page.evaluate(() => (window as any).__perf || []);
    const deltas = perfMarks.map((m: any) => `${m.ev}+${m.t - t0}`).join(' ');
    console.log(`  cycle ${i + 1}: header=${headerMs}ms input=${visibleMs}ms | marks: ${deltas}`);

    // Leave back to rooms list (NOT home)
    await page.click('text=← Leave');
    await page.waitForSelector('text=Open Rooms', { timeout: 15000 });
    // Back to home for next cycle
    await page.click('text=← Back');
    await page.waitForSelector('text=Talk 1-on-1', { timeout: 15000 });
  }

  timings.sort((a, b) => a - b);
  const min = timings[0];
  const max = timings[timings.length - 1];
  const median = timings[Math.floor(timings.length / 2)];
  console.log(`\n── Room-join latency (5 cycles) ──`);
  console.log(`   min: ${min} ms`);
  console.log(`   median: ${median} ms`);
  console.log(`   max: ${max} ms`);

  await ctx.close();
  await browser.close();
});
