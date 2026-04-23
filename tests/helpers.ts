import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function getBaseURL(): string {
  const envPath = path.join(__dirname, '..', '.env.test');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('APP_URL=')) return trimmed.slice('APP_URL='.length).trim();
    }
  }
  return 'https://ventspace.orangeriver-be1693d8.centralindia.azurecontainerapps.io';
}

export const BASE_URL = getBaseURL();

/**
 * Logs a user into VentSpace by filling the phone + password form.
 * Waits until the Home screen is visible (Talk 1-on-1 button).
 */
export async function loginUser(page: Page, phone: string, password: string): Promise<void> {
  await page.goto(BASE_URL);

  // Wait for the phone input (placeholder: "+1 555 000 0000")
  await page.waitForSelector('input[placeholder="+1 555 000 0000"]', { timeout: 15000 });

  // Fill phone number
  await page.fill('input[placeholder="+1 555 000 0000"]', phone);

  // Fill password
  await page.fill('input[placeholder="At least 6 characters"]', password);

  // Submit — Log In button text
  await page.click('text=🔐  Log In');

  // Wait for Home screen to appear (Talk 1-on-1 button)
  await page.waitForSelector('text=Talk 1-on-1', { timeout: 20000 });
}

/**
 * Navigates from Home → RoomsList → clicks a topic to join a room.
 * Returns once the room chat input is visible.
 */
export async function joinRoom(page: Page, topicLabel: string): Promise<void> {
  // If we're not on the Home screen, navigate there first
  const onHome = await page.locator('text=Join a Room').isVisible().catch(() => false);
  if (!onHome) {
    await page.goto(BASE_URL);
    await page.waitForSelector('text=Talk 1-on-1', { timeout: 20000 });
  }
  await page.click('text=Join a Room');
  await page.waitForSelector(`text=${topicLabel}`, { timeout: 10000 });
  await page.click(`text=${topicLabel}`);
  // Wait for the room chat input
  await page.waitForSelector('textarea[placeholder="Type something…"]', { timeout: 15000 });
}

/**
 * Sends a message from the current chat input.
 */
export async function sendMessage(page: Page, text: string): Promise<void> {
  const input = page.locator('textarea[placeholder="Type something…"]').first();
  await input.fill(text);
  await input.press('Enter');
}

/**
 * Waits until a message with the given text is visible in the chat.
 */
export async function waitForMessage(page: Page, text: string, timeoutMs = 10000): Promise<void> {
  await page.waitForSelector(`text=${text}`, { timeout: timeoutMs });
}
