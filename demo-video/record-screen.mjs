/**
 * record-screen.mjs  — v3
 * ───────────────────────
 * Records the live Project Pulse application at 1920×1080 / 15 fps.
 *
 * Uses puppeteer-core v25's native page.record() API which calls
 * Chrome's Page.startScreenRecording CDP method and writes a properly
 * finalized MP4 (no "moov atom not found" issue, no stdin pipe to FFmpeg).
 *
 * Usage:
 *   node demo-video/record-screen.mjs
 *
 * Env vars:
 *   DEMO_URL   - override base URL (default: http://localhost:3001)
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

// ── Configuration ─────────────────────────────────────────────────────────────
const FPS        = 15;          // CDP recording frame rate
const DURATION_S = 180;         // target video length
const OUT_VIDEO  = path.resolve('demo-video/screen-raw.mp4');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const CHROME_PATH = CHROME_CANDIDATES.find(fs.existsSync);
if (!CHROME_PATH) {
  console.error('ERROR: No Chrome or Edge installation found.');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function findBaseUrl() {
  const candidates = process.env.DEMO_URL
    ? [process.env.DEMO_URL]
    : ['http://localhost:3001', 'http://localhost:3000'];
  for (const url of candidates) {
    try {
      const res = await fetch(`${url}/login`);
      if (res.ok) return url;
    } catch { /* try next */ }
  }
  throw new Error(
    'Project Pulse is not running.\n' +
    'Start it first in another terminal:  $env:PORT="3001"; npm run dev'
  );
}

async function clickButton(page, text) {
  const clicked = await page.evaluate(t => {
    const btn = [...document.querySelectorAll('button')]
      .find(b => b.textContent?.trim().includes(t) && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  }, text);
  if (!clicked) console.warn(`WARN: button "${text}" not found (skipping)`);
}

async function smoothType(page, selector, value, delay = 40) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout: 8000 });
    await page.click(selector, { clickCount: 3 });
    await page.type(selector, value, { delay });
  } catch {
    console.warn(`WARN: selector not found for typing: ${selector}`);
  }
}

// ── Storyboard ────────────────────────────────────────────────────────────────
async function runStoryboard(page, projectId, BASE) {
  // 0:00–0:20 · Intro: Login page
  console.log('  [0:00] Intro — Login page');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await sleep(5000);
  await smoothType(page, '#email',    'alice@example.com', 30);
  await smoothType(page, '#password', 'password123',       20);
  await clickButton(page, 'Log in');
  await page.waitForFunction(() => location.pathname === '/projects', { timeout: 15000 });
  await sleep(5000);

  // 0:20–0:50 · Overview: Workspace hub, search, sidebar, open project
  console.log('  [0:20] Overview — Projects hub');
  await smoothType(page, 'input[placeholder="Filter projects…"]', 'Launch', 55);
  await sleep(3000);
  await page.click('input[placeholder="Filter projects…"]', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await sleep(2500);
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')]
      .find(a => a.textContent?.includes('Product Launch'));
    link?.click();
  });
  await page.waitForFunction(
    () => /\/projects\/[^/]+$/.test(location.pathname), { timeout: 15000 }
  );
  await sleep(8000);

  const pid = projectId;

  // 0:50–1:30 · Features: Board filters, task modal, dashboard
  console.log('  [0:50] Features — Board, task modal, dashboard');
  await page.select('select[aria-label="Filter by priority"]', 'HIGH');
  await sleep(3500);
  await clickButton(page, 'Clear');
  await sleep(2000);

  await page.evaluate(() => {
    const card = document.querySelector('[role="button"]');
    card?.click();
  });
  await sleep(5000);
  await clickButton(page, 'Activity');
  await sleep(3500);
  await page.keyboard.press('Escape');
  await sleep(1500);

  await page.goto(`${BASE}/projects/${pid}/dashboard`, { waitUntil: 'networkidle0' });
  await sleep(14000);

  // 1:30–2:10 · Workflow: Create task → move → comment → members
  console.log('  [1:30] Workflow — Create task, comment, members');
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: 'networkidle0' });
  await sleep(2000);
  await clickButton(page, '+ Add task');
  await sleep(1200);
  await smoothType(page, 'input[placeholder="Short task name"]', 'Finalize Launch Checklist', 38);
  await smoothType(page, 'textarea', 'Verify production environment, analytics, and team sign-off.', 22);
  await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return;
    const selects = dlg.querySelectorAll('select');
    if (selects[0]) { selects[0].value = 'HIGH'; selects[0].dispatchEvent(new Event('change', { bubbles: true })); }
    if (selects[1]) {
      const bob = [...selects[1].options].find(o => o.textContent?.includes('Bob'));
      if (bob) { selects[1].value = bob.value; selects[1].dispatchEvent(new Event('change', { bubbles: true })); }
    }
  });
  await sleep(1500);
  await clickButton(page, 'Create task');
  await sleep(4000);

  await page.evaluate(async pid => {
    const r = await fetch(`/api/projects/${pid}/tasks`);
    const json = await r.json();
    const arr = Array.isArray(json) ? json : json.data || [];
    const t = arr.find(x => x.title === 'Finalize Launch Checklist');
    if (t) {
      await fetch(`/api/projects/${pid}/tasks/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS', position: 512 }),
      });
    }
  }, pid);
  await sleep(5000);

  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[role="button"]')];
    const c = cards.find(c => c.textContent?.includes('Finalize Launch Checklist'));
    c?.click();
  });
  await sleep(2000);
  await smoothType(page, 'input[placeholder="Write a comment…"]', 'Ready for final QA review.', 32);
  await clickButton(page, 'Send');
  await sleep(3000);
  await page.keyboard.press('Escape');
  await sleep(1500);

  await page.goto(`${BASE}/projects/${pid}/members`, { waitUntil: 'networkidle0' });
  await sleep(6000);

  // 2:10–2:40 · Tech Stack slide
  console.log('  [2:10] Tech Stack slide');
  await page.setContent(`
    <html>
    <body style="margin:0;background:#08090d;color:#f1f5f9;font-family:Inter,system-ui,sans-serif;
      display:flex;align-items:center;justify-content:center;height:100vh;
      background-image:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(45,212,191,0.12),transparent);">
      <div style="max-width:1280px;width:90%;padding:48px;">
        <div style="color:#2dd4bf;font-size:14px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px;">Architecture &amp; Technology Stack</div>
        <h1 style="font-size:46px;font-weight:800;margin:0 0 36px;letter-spacing:-.02em;">Built for Speed, Type Safety &amp; Real-Time Sync</h1>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">
          <div style="background:#11151f;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:28px;">
            <div style="color:#2dd4bf;font-weight:700;font-size:20px;margin-bottom:14px;">Frontend</div>
            <ul style="margin:0;padding-left:20px;color:#94a3b8;font-size:17px;line-height:1.9;">
              <li>Next.js 15 (App Router)</li><li>React 19 &amp; TypeScript</li>
              <li>Tailwind CSS v4</li><li>dnd-kit &amp; Recharts</li>
            </ul>
          </div>
          <div style="background:#11151f;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:28px;">
            <div style="color:#818cf8;font-weight:700;font-size:20px;margin-bottom:14px;">Backend &amp; Auth</div>
            <ul style="margin:0;padding-left:20px;color:#94a3b8;font-size:17px;line-height:1.9;">
              <li>Next.js Route Handlers</li><li>Zod Input Validation</li>
              <li>jose Signed JWT Cookies</li><li>bcryptjs &amp; Server RBAC</li>
            </ul>
          </div>
          <div style="background:#11151f;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:28px;">
            <div style="color:#34d399;font-weight:700;font-size:20px;margin-bottom:14px;">Database &amp; Real-Time</div>
            <ul style="margin:0;padding-left:20px;color:#94a3b8;font-size:17px;line-height:1.9;">
              <li>Prisma ORM + SQLite</li><li>Custom Node HTTP Server</li>
              <li>Socket.IO Project Rooms</li><li>Member-Verified Joins</li>
            </ul>
          </div>
        </div>
      </div>
    </body>
    </html>`);
  await sleep(26000);

  // 2:40–3:00 · Conclusion card
  console.log('  [2:40] Conclusion card');
  await page.setContent(`
    <html>
    <body style="margin:0;background:#08090d;color:#f1f5f9;font-family:Inter,system-ui,sans-serif;
      display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;
      background-image:radial-gradient(ellipse 70% 50% at 50% 45%,rgba(45,212,191,0.14),transparent);">
      <div>
        <div style="display:inline-flex;align-items:center;justify-content:center;
          width:72px;height:72px;border-radius:20px;
          background:linear-gradient(135deg,#5eead4,#14b8a6);margin-bottom:24px;">
          <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
            <path d="M6.5 14.5h3.2l2.2-5 3.4 9 2.3-4H21.5"
              stroke="#04201b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1 style="font-size:62px;font-weight:800;margin:0;letter-spacing:-.03em;">
          Project <span style="color:#2dd4bf;">Pulse</span>
        </h1>
        <p style="font-size:22px;color:#94a3b8;margin:16px 0 32px;">
          Organize projects, assign tasks, collaborate in real time.
        </p>
        <div style="display:inline-block;padding:12px 28px;border-radius:999px;
          border:1px solid rgba(45,212,191,.3);background:rgba(45,212,191,.1);
          color:#5eead4;font-size:18px;font-weight:600;">
          Thank you for watching
        </div>
      </div>
    </body>
    </html>`);
  // Frame budget handled by the DURATION_S sleep in main()
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main() {
  const BASE = await findBaseUrl();
  console.log(`\nRecording Project Pulse from ${BASE}`);
  console.log(`Browser: ${CHROME_PATH}`);
  console.log(`Output : ${OUT_VIDEO}`);
  console.log(`Duration: ${DURATION_S}s at ${FPS} fps\n`);

  // Remove stale output from a previous failed run
  if (fs.existsSync(OUT_VIDEO)) fs.unlinkSync(OUT_VIDEO);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,          // 'new' was deprecated in v22+; true = headless shell
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-extensions',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

    // ── Pre-flight: API login to get session cookie for in-page fetch calls ──
    console.log('Logging in via API...');
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    const loginStatus = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alice@example.com', password: 'password123' }),
        credentials: 'include',
      });
      return r.status;
    }, BASE);
    if (loginStatus !== 200) throw new Error(`API login failed: HTTP ${loginStatus}`);

    const projectsRaw = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/projects`, { credentials: 'include' });
      return r.json();
    }, BASE);
    const projects = Array.isArray(projectsRaw) ? projectsRaw : (projectsRaw.data || []);
    if (!projects.length) throw new Error('No projects returned from API — seed data may be missing. Run: npm run db:seed');
    const projectId = projects[0].id;
    console.log(`Using project: "${projects[0].name}" (id: ${projectId})\n`);

    // ── Start native MP4 recording ────────────────────────────────────────────
    console.log('Starting screen recording...');
    const recorder = await page.record({
      path: OUT_VIDEO,
      fps: FPS,
      maxWidth: 1920,
      maxHeight: 1080,
    });
    console.log('Recording started.\n');

    // Run storyboard and duration timer concurrently.
    // The timer ensures we always record exactly DURATION_S seconds.
    const durationTimer = sleep(DURATION_S * 1000);

    // Navigate to login to start storyboard cleanly (clears the preflight page)
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });

    await Promise.all([
      durationTimer,
      runStoryboard(page, projectId, BASE).catch(err =>
        console.warn(`\nStoryboard warning: ${err.message}`)
      ),
    ]);

    // ── Stop recording — this finalizes the MP4 ───────────────────────────────
    console.log('\nStopping recording...');
    await recorder.stop();
    console.log('Recording stopped and finalized.');

  } finally {
    await browser.close().catch(() => {});
    console.log('Browser closed.');
  }

  // ── Validate output ───────────────────────────────────────────────────────
  if (!fs.existsSync(OUT_VIDEO)) {
    throw new Error('screen-raw.mp4 was not created.');
  }
  const stat = fs.statSync(OUT_VIDEO);
  if (stat.size < 100_000) {
    throw new Error(`screen-raw.mp4 is too small (${stat.size} bytes) — recording may have failed.`);
  }

  console.log(`\n✓ screen-raw.mp4 saved (${(stat.size / 1_000_000).toFixed(1)} MB): ${OUT_VIDEO}`);
}

main().catch(err => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
