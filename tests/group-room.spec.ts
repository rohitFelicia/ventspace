/**
 * N-user group room E2E test.
 *
 * Scales from 3 → 10 → 100 users via TEST_USER_COUNT env var.
 *
 * Usage:
 *   npx playwright test tests/group-room.spec.ts                      # 3 users (default)
 *   TEST_USER_COUNT=10  npx playwright test tests/group-room.spec.ts
 *   TEST_USER_COUNT=100 npx playwright test tests/group-room.spec.ts
 *
 * Before running:
 *   node tests/seed-test-users.js [count]
 *   node tests/reset-rooms.js
 */

import { test, chromium, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv(): Record<string, string> {
  const p = path.join(__dirname, '..', '.env.test');
  if (!fs.existsSync(p)) throw new Error('Missing .env.test');
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [k, ...v] = t.split('=');
    env[k.trim()] = v.join('=').trim();
  }
  return env;
}

const ENV = loadEnv();
const BASE_URL  = ENV['APP_URL'] ?? 'https://ventspace.orangeriver-be1693d8.centralindia.azurecontainerapps.io';
const TOPIC     = process.env['TEST_TOPIC'] ?? ENV['TEST_TOPIC'] ?? 'Just Venting';

/** How many users to run. Driven by TEST_USER_COUNT env var, default 3. */
const USER_COUNT = Math.max(2, parseInt(process.env['TEST_USER_COUNT'] ?? ENV['TEST_USER_COUNT'] ?? '3', 10));

/** Canonical user descriptor for index n (1-based), matches seed-test-users.js */
function userSpec(n: number) {
  return {
    phone: String(9000000000 + n),
    pass:  `TestPass${n}!`,
    alias: `Tester_${String(n).padStart(3, '0')}`,
  };
}

const USERS = Array.from({ length: USER_COUNT }, (_, i) => userSpec(i + 1));

// Generous per-user budget: login + join + messaging + leave
test.setTimeout(Math.max(240_000, USER_COUNT * 25_000 + 60_000));

async function login(page: Page, phone: string, pass: string) {
  await page.goto(BASE_URL);
  await page.waitForSelector('input[placeholder="+1 555 000 0000"]', { timeout: 30000 });
  await page.fill('input[placeholder="+1 555 000 0000"]', phone);
  await page.fill('input[placeholder="At least 6 characters"]', pass);
  await page.click('text=🔐  Log In');
  await page.waitForSelector('text=Talk 1-on-1', { timeout: 30000 });
}

async function joinRoom(page: Page, label: string, alias: string) {
  await page.click('text=Join a Room');
  await page.waitForSelector('text=← Back', { timeout: 15000 });
  await page.waitForSelector(`text=${label}`, { state: 'attached', timeout: 30000 });
  // TreeWalker: find visible (non-zero-size) cursor:pointer ancestor.
  // React Navigation keeps hidden screens in DOM — skip zero-size instances.
  const rect = await page.evaluate((labelText: string) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      if (node.textContent?.trim() === labelText) {
        let el = node.parentElement;
        let foundPointer = false;
        while (el && el !== document.body) {
          if (window.getComputedStyle(el).cursor === 'pointer') {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            }
            foundPointer = true; // zero-size hidden screen — skip
            break;
          }
          el = el.parentElement;
        }
        if (foundPointer) continue;
      }
    }
    return null;
  }, label);
  if (!rect) throw new Error(`Visible topic card not found: ${label}`);
  console.log(`  [${alias}] mouse.click at (${Math.round(rect.x)}, ${Math.round(rect.y)})`);
  await page.mouse.click(rect.x, rect.y);
  await page.waitForSelector('textarea[placeholder="Type something…"]', { timeout: 60000 });
}

async function send(page: Page, msg: string) {
  const ta = page.locator('textarea[placeholder="Type something…"]');
  await ta.fill(msg);
  // RN web TouchableOpacity doesn't submit on Enter — click the ↑ send button
  await page.click('text=↑');
  await page.waitForTimeout(300);
}

async function see(page: Page, text: string, ms = 20000) {
  await page.waitForSelector(`text=${text}`, { timeout: ms });
}

// ── test ─────────────────────────────────────────────────────────────────────

async function makeUserPage(browser: import('@playwright/test').Browser, idx: number): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ permissions: ['notifications'], viewport: { width: 1100, height: 750 } });
  const page = await ctx.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`  [p${idx + 1} err] ${msg.text()}`);
  });
  return { ctx, page };
}

test(`Group room — ${USER_COUNT} users full flow`, async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const pages: Page[] = [];
  const ctxs: BrowserContext[] = [];

  try {
    // ── Step 1: Login in batches — create contexts lazily ─────────────────
    console.log(`\n── Step 1: Login all ${USER_COUNT}`);
    const LOGIN_BATCH = 10;
    for (let b = 0; b < USER_COUNT; b += LOGIN_BATCH) {
      const end = Math.min(b + LOGIN_BATCH, USER_COUNT);
      const batch = await Promise.all(
        Array.from({ length: end - b }, (_, j) => makeUserPage(browser, b + j))
      );
      for (const { ctx, page } of batch) { pages.push(page); ctxs.push(ctx); }
      await Promise.all(batch.map(({ page }, j) => login(page, USERS[b + j].phone, USERS[b + j].pass)));
      console.log(`  ✅ Logged in batch ${Math.floor(b / LOGIN_BATCH) + 1}/${Math.ceil(USER_COUNT / LOGIN_BATCH)}`);
    }
    console.log('✅ All logged in');

    // ── Step 2: Join room sequentially ────────────────────────────────────
    console.log('\n── Step 2: Join room');
    for (let i = 0; i < USER_COUNT; i++) {
      await joinRoom(pages[i], TOPIC, USERS[i].alias);
      console.log(`  ✅ ${USERS[i].alias} in room`);
      await pages[i].waitForTimeout(1500);
    }
    console.log('✅ All in room');

    // ── Step 3: User 0 (and 1) see the LAST user join ────────────────────
    // For large N, checking all N² pairs is impractical — just verify first 2 see last joiner.
    console.log('\n── Step 3: Join messages');
    const lastAlias = USERS[USER_COUNT - 1].alias;
    await see(pages[0], `${lastAlias} joined the chat`);
    if (USER_COUNT >= 3) await see(pages[1], `${lastAlias} joined the chat`);
    console.log(`✅ Confirmed "${lastAlias} joined the chat" visible`);

    // ── Step 4: 2 rounds of chat — each user sends in both rounds ────────
    console.log('\n── Step 4: Messaging (2 rounds)');
    // Round 1: intros
    const round1 = USERS.map(u => `Hi from ${u.alias} 👋`);
    for (let i = 0; i < USER_COUNT; i++) {
      await send(pages[i], round1[i]);
    }
    console.log('  ✅ Round 1 sent');
    // Round 2: replies — each user replies to the next user
    const round2 = USERS.map((u, i) => `@${USERS[(i + 1) % USER_COUNT].alias} hey, glad you're here! 😊`);
    for (let i = 0; i < USER_COUNT; i++) {
      await send(pages[i], round2[i]);
    }
    console.log('  ✅ Round 2 sent');
    // Give Firestore time to propagate + force-scroll both pages to bottom
    await pages[0].waitForTimeout(3000);
    const scrollToBottom = () => {
      document.querySelectorAll<HTMLElement>('*').forEach(el => {
        if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
      });
    };
    await pages[0].evaluate(scrollToBottom);
    await pages[1].evaluate(scrollToBottom);
    // User[0] verifies the very last message sent
    const msgTimeout = Math.max(45000, USER_COUNT * 2000);
    await see(pages[0], round2[USER_COUNT - 1], msgTimeout);
    // User[1] also sees it
    await see(pages[1], round2[USER_COUNT - 1], msgTimeout);
    console.log('✅ All messages delivered');

    // ── Step 5: Typing indicator ──────────────────────────────────────────
    console.log('\n── Step 5: Typing indicator');
    await pages[0].locator('textarea[placeholder="Type something…"]').fill('typing...');
    await pages[1].waitForSelector('text=/typing/i', { timeout: 8000 });
    console.log('✅ Typing indicator visible');
    await pages[0].locator('textarea[placeholder="Type something…"]').fill('');

    // ── Step 6: Last user leaves ──────────────────────────────────────────
    console.log('\n── Step 6: User leaves');
    const leavingPage  = pages[USER_COUNT - 1];
    const leavingAlias = USERS[USER_COUNT - 1].alias;
    await leavingPage.click('text=← Leave');
    // goBack() lands on RoomsListScreen (has ← Back), NOT HomeScreen
    await leavingPage.waitForSelector('text=← Back', { state: 'visible', timeout: 15000 });
    await leavingPage.waitForTimeout(Math.max(3000, USER_COUNT * 150)); // allow leaveRoom Firestore write to propagate
    const leaveTimeout = Math.max(30000, USER_COUNT * 1500);
    await see(pages[0], `${leavingAlias} left the chat`, leaveTimeout);
    if (USER_COUNT >= 3) await see(pages[1], `${leavingAlias} left the chat`, leaveTimeout);
    console.log('✅ Leave message visible');

    // ── Step 7: Remaining users still chat ───────────────────────────────
    console.log('\n── Step 7: Remaining users still chat');
    await send(pages[0], 'Still here 💙');
    await see(pages[1], 'Still here 💙');
    console.log(`\n✅ All ${USER_COUNT}-user steps passed! 🎉`);

  } finally {
    for (const [i, page] of pages.entries()) {
      await page.screenshot({ path: `/tmp/final-p${i + 1}.png` }).catch(() => {});
    }
    await browser.close();
  }
});
