/**
 * Screenshot harness.
 *
 * Drives the app through the states that matter and writes PNGs to shots/ so
 * critic agents can look at the actual pixels instead of guessing from source.
 * Run with:  node tools/shots.mjs [baseUrl]
 *
 * ── every capture asserts its own state first ───────────────────────────────
 * Round 12 filed this twice, from two reviewers: 07-orbit.png showed the web
 * layout, 23-path-trace.png was byte-identical to it with no path on screen,
 * 16-zoomed-in and 17-zoomed-out were the same camera with a search filter
 * applied, and 14-filtered.png did not exist at all. In every case the driving
 * step failed silently and `page.screenshot` dutifully photographed whatever
 * was on screen. A capture set nobody can trust is worse than no capture set,
 * because it is the only artefact a reviewer has for a feature.
 *
 * So `shot()` now takes a `want` predicate that runs IN THE PAGE and must
 * return true before the shutter opens. A capture whose state cannot be
 * reached is reported by name and the run exits non-zero — it never ships a
 * picture of the wrong thing under the right filename.
 *
 * For measured invariants rather than pictures, see tools/assert-visual.mjs.
 */
import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const BASE = process.argv[2] || 'http://localhost:5173';
const OUT = path.resolve('shots');
/** Captures whose state could not be reached. Fatal at the end of the run. */
const unreached = [];

const DESKTOP = { width: 1600, height: 1000 };
const LAPTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

/** Let the force layout and any entrance animations settle. */
async function settle(page, ms = 1400) {
  await page.waitForTimeout(ms);
}

/** Park the cursor off the graph so a stale hover card never lands in a shot. */
async function unhover(page) {
  await page.mouse.move(4, 4);
  await page.waitForTimeout(320);
}

/**
 * Back to nobody selected, and settled.
 *
 * Escape peels one layer at a time — a traced path first, then the person —
 * so a single press leaves `#p=` set, and the next `clickCentralNode` then
 * lands on the node that is ALREADY open and deselects it. Two captures were
 * lost to that. Closing the dossier also re-fits the camera, so the wait is
 * on the hash and then on the motion.
 */
async function deselect(page) {
  for (let i = 0; i < 3; i++) {
    if (!(await page.evaluate(() => /[#&]p=|[#&]path=/.test(location.hash)))) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  await settle(page, 2000);
}

async function dismissIntro(page) {
  // The intro auto-advances, but click through it so timing never flakes.
  await page.waitForTimeout(600);
  const enter = page.locator('button', { hasText: /들어가기|ENTER/i }).first();
  if (await enter.count()) {
    await enter.click({ timeout: 3000 }).catch(() => {});
  } else {
    await page.keyboard.press('Enter').catch(() => {});
  }
  await page.waitForTimeout(900);
}

/**
 * Click the graph node nearest the centre of the canvas, and WAIT UNTIL THE APP
 * AGREES SOMEBODY IS OPEN.
 *
 * Returning true off a mouse event is what let round 12's orbit capture run
 * against no selection: `4` is a silent no-op with nobody open, so the shot was
 * the web layout filed under 07-orbit.png. The hash is the app's own answer to
 * "who is open", so wait on that.
 */
async function clickCentralNode(page) {
  const pos = await page.evaluate(() => window.__atlasDebug?.centralNodeScreenPos?.() ?? null);
  if (!pos) return false;
  await page.mouse.click(pos.x, pos.y);
  return await page
    .waitForFunction(() => /[#&]p=/.test(location.hash), null, { timeout: 5000, polling: 100 })
    .then(() => true)
    .catch(() => false);
}

const shots = [];
const hashes = new Map();

/**
 * @param {string} name        filename, without .png
 * @param {object} opts        passed through to page.screenshot
 * @param {() => boolean} [opts.want]  runs in the page; must be true to shoot
 * @param {string} [opts.is]   what `want` is checking, for the failure line
 */
async function shot(page, name, opts = {}) {
  const { want, is, ...shotOpts } = opts;
  if (want) {
    const ok = await page
      .waitForFunction(want, null, { timeout: 6000, polling: 120 })
      .then(() => true)
      .catch(() => false);
    if (!ok) {
      // Do NOT photograph whatever happens to be on screen under this name.
      console.log(`  ✗ ${name} — never reached: ${is ?? 'expected state'}`);
      unreached.push(`${name} (${is ?? 'expected state'})`);
      return;
    }
  }
  const file = path.join(OUT, `${name}.png`);
  const buf = await page.screenshot({ path: file, ...shotOpts });
  // Two "different" states that render byte-identical means the driving step
  // silently failed. Round 11 shipped three duplicate about-tabs that way and
  // round 12 shipped 07-orbit and 23-path-trace as the same 7,102,189 bytes.
  const hash = createHash('sha1').update(buf).digest('hex');
  const twin = hashes.get(hash);
  if (twin) {
    console.log(`  ✗ ${name} — byte-identical to ${twin}`);
    unreached.push(`${name} (identical to ${twin})`);
  } else console.log('  ✓', name);
  hashes.set(hash, twin ?? name);
  shots.push(name);
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const errors = [];

  // ── desktop journey ──────────────────────────────────────────────────────
  const ctx = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 2, colorScheme: 'dark', locale: 'ko-KR' });
  /* Arm the in-page probes. They are gated in src/probe.ts so a live
     visitor never receives the link list; addInitScript runs in every
     frame before any page script, so the app sees this at module init. */
  await ctx.addInitScript(() => { window.__atlasProbe = true; });
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem('bgx.lang', l);
    } catch {
      /* ignore */
    }
  }, 'ko');
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  console.log('→', BASE);
  await page.goto(BASE, { waitUntil: 'networkidle' });

  await page.waitForTimeout(1100);
  await shot(page, '01-intro', { want: () => !!document.querySelector('.intro'), is: 'the cold open is on screen' });

  await dismissIntro(page);
  await settle(page, 2200);
  await shot(page, '02-graph-default', {
    want: () => (window.__atlasPaint?.frame.discs.length ?? 0) === 20 && !location.hash.includes('m='),
    is: 'web layout, all twenty painted',
  });

  // hover a node
  const hovered = await page.evaluate(() => {
    const p = window.__atlasDebug?.centralNodeScreenPos?.();
    return p ?? null;
  });
  if (hovered) {
    await page.mouse.move(hovered.x, hovered.y);
    await page.waitForTimeout(500);
    // `.hovercard` is always in the DOM — HoverCard keeps a warmed copy at
    // 0.008 opacity — so presence is not the test. Visibility is.
    await shot(page, '03-hover', {
      want: () => [...document.querySelectorAll('.hovercard')].some((el) => +getComputedStyle(el).opacity > 0.5),
      is: 'a hover card is visible, not just warmed',
    });
  }

  // open a dossier
  if (await clickCentralNode(page)) {
    await page.waitForTimeout(1200);
    await shot(page, '04-dossier', { want: () => /[#&]p=/.test(location.hash), is: 'a person is open' });
    // scrolled further down the dossier
    const dossier = page.locator('.dsr-scroll').first();
    if (await dossier.count()) {
      await dossier.evaluate((el) => el.scrollTo({ top: 900 }));
      await page.waitForTimeout(500);
      await shot(page, '05-dossier-scrolled', {
        want: () => (document.querySelector('.dsr-scroll')?.scrollTop ?? 0) > 400,
        is: 'the dossier is scrolled',
      });
      await dossier.evaluate((el) => el.scrollTo({ top: 2200 }));
      await page.waitForTimeout(500);
      await shot(page, '06-dossier-connections', {
        want: () => (document.querySelector('.dsr-scroll')?.scrollTop ?? 0) > 1500,
        is: 'the dossier is scrolled to the connections',
      });
    }
  }

  /* Shift-click a second node: trace the chain between two people.
     Close the dossier first. The capture above left it open ON hong-jin-ho, and
     clicking a node that is already selected DESELECTS it — so the sequence was
     clearing the anchor it was about to trace from, and then shift-clicking
     into a graph with nobody chosen. Verified live: with the panel closed and
     the camera settled, the same two clicks produce
     #path=hong-jin-ho,jung-keun-woo every time. */
  await deselect(page);
  const pair = await page.evaluate(() => {
    const d = window.__atlasDebug;
    if (!d) return null;
    return { a: d.nodeScreenPos('hong-jin-ho'), b: d.nodeScreenPos('jung-keun-woo') };
  });
  if (pair?.a && pair?.b) {
    await page.mouse.click(pair.a.x, pair.a.y);
    /* Let the camera finish, THEN re-read. Selecting somebody opens a 530px
       panel, which re-frames the graph; a coordinate taken before that lands
       somewhere else afterwards, and a shift-click that misses a disc traces
       nothing. Measured: the re-frame is still moving 900ms after the click,
       and settles by ~2.4s. That is how round 12 shipped 23-path-trace
       byte-identical to 07-orbit. */
    await page.waitForFunction(() => /[#&]p=/.test(location.hash), null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const b2 = await page.evaluate(() => {
      const d = window.__atlasDebug;
      const app = document.querySelector('.app');
      const cs = getComputedStyle(app);
      const px = (n) => parseFloat(cs.getPropertyValue(n)) || 0;
      // Somebody who is still uncovered after the dossier opened.
      for (const id of ['jung-keun-woo', 'lee-tae-gyun', 'park-ji-min', 'hyun-seong-joo', 'kim-yoo-hyun']) {
        const p = d?.nodeScreenPos(id);
        if (!p) continue;
        if (p.x > px('--inset-left') + 24 && p.x < innerWidth - px('--inset-right') - 24 && p.y > px('--inset-top') + 24 && p.y < innerHeight - px('--inset-bottom') - 24) {
          return { ...p, id };
        }
      }
      return null;
    });
    if (b2) {
      await page.keyboard.down('Shift');
      await page.mouse.click(b2.x, b2.y);
      await page.keyboard.up('Shift');
      await page.waitForTimeout(1400);
      // The chain has to be ON SCREEN, not merely requested.
      await shot(page, '23-path-trace', {
        want: () => !!document.querySelector('.pathcard') && /[#&]path=/.test(location.hash),
        is: 'the PathCard is mounted and #path= is set',
      });
    } else {
      console.log('  ✗ 23-path-trace — no second node left uncovered by the dossier');
      unreached.push('23-path-trace (no reachable second node)');
    }
  }
  await deselect(page);

  /* Orbit. The tab is aria-disabled until somebody is selected and '4' is a
     silent no-op without one, so the capture selects first — otherwise this
     photographs the web layout and files it under 07-orbit.png, which is
     exactly what round 12 shipped. */
  if (!(await clickCentralNode(page))) {
    console.log('  ✗ 07-orbit — could not select anybody to orbit around');
    unreached.push('07-orbit (no selection)');
  }
  await page.waitForTimeout(2200);
  await page.keyboard.press('4');
  await settle(page, 2000);
  await unhover(page);
  await shot(page, '07-orbit', { want: () => /[#&]m=orbit/.test(location.hash), is: 'the orbit layout is active' });

  await page.keyboard.press('1');
  await page.waitForTimeout(600);
  await deselect(page);

  // season layout
  await page.keyboard.press('2');
  await settle(page, 2400);
  await unhover(page);
  await shot(page, '08-seasons', { want: () => /[#&]m=seasons/.test(location.hash), is: 'the by-season layout is active' });

  // archetype layout
  await page.keyboard.press('3');
  await settle(page, 2400);
  await unhover(page);
  await shot(page, '09-archetype', { want: () => /[#&]m=archetype/.test(location.hash), is: 'the by-archetype layout is active' });

  await page.keyboard.press('1');
  await settle(page, 1800);

  // command palette, empty then typed
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(600);
  await shot(page, '10-palette-empty', {
    want: () => !!document.querySelector('.cp__dialog') && !document.querySelector('.cp__dialog input')?.value,
    is: 'the palette is open with an empty query',
  });
  await page.keyboard.type('시즌', { delay: 45 });
  await page.waitForTimeout(700);
  await shot(page, '11-palette-typed', {
    want: () => (document.querySelector('.cp__dialog input')?.value ?? '').length > 0,
    is: 'the palette carries a typed query',
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // help sheet — walk its tabs, the legend is the one that matters most
  await page.keyboard.press('?');
  await page.waitForTimeout(800);
  await shot(page, '12-about', { want: () => !!document.querySelector('[role="dialog"]'), is: 'the about sheet is open' });

  // Clicking a tab and hoping is how three identical "different" screenshots
  // shipped last round. Assert the panel actually changed before capturing.
  const tabs = [
    ['13-about-legend', /읽는 법|How to read/i],
    ['13b-about-seasons', /^시즌|Seasons/i],
    ['13c-about-shortcuts', /단축키|Shortcuts/i],
  ];
  for (const [name, re] of tabs) {
    const tab = page.locator('[role="dialog"] [role="tab"], [role="dialog"] button').filter({ hasText: re }).first();
    if (!(await tab.count())) {
      console.log(`  ✗ ${name} — tab not found`);
      unreached.push(`${name} (tab not found)`);
      continue;
    }
    await tab.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(450);
    await shot(page, name, {
      want: new Function(
        'return (() => { const on = document.querySelector(\'[role="dialog"] [aria-selected="true"], [role="dialog"] .is-on, [role="dialog"] .about__tab--on\');' +
          `return on ? new RegExp(${JSON.stringify(re.source)}, 'i').test(on.textContent ?? '') : false; })()`,
      ),
      is: `the ${re.source} tab is selected`,
    });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  /* Filtered state — fewer than twenty on the canvas, which is the whole point.
     Aimed at the first lineage chip rather than at a chip matched by its label:
     round 12's selector looked for 코미디언 in `.rail button`, found nothing,
     and 14-filtered.png was simply never written. A structural locator cannot
     go stale against a copy edit. */
  const chip = page.locator('.frail__chips button').first();
  if (await chip.count()) {
    await chip.click().catch(() => {});
    await page.waitForTimeout(900);
    await shot(page, '14-filtered', {
      want: () => {
        const n = window.__atlasPaint?.frame.discs.length ?? 20;
        return n > 0 && n < 20;
      },
      is: 'the filter removed somebody from the canvas',
    });
    await chip.click().catch(() => {});
    await page.waitForTimeout(700);
  } else {
    console.log('  ✗ 14-filtered — no lineage chip found');
    unreached.push('14-filtered (no lineage chip found)');
  }

  /* Rail closed = the pure graph, no chrome. The <aside> stays in the DOM
     (it is `inert`, not unmounted), so the test is the space the canvas got
     back, which is what the picture is of. */
  const left0 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.app')).getPropertyValue('--inset-left')) || 0);
  await page.keyboard.press('[');
  await settle(page, 900);
  await unhover(page);
  await shot(page, '15-rail-closed', {
    want: new Function(
      `return (parseFloat(getComputedStyle(document.querySelector('.app')).getPropertyValue('--inset-left')) || 0) < ${Math.max(40, left0 * 0.5)};`,
    ),
    is: `the canvas reclaimed the rail's ${left0}px`,
  });
  await page.keyboard.press('[');

  /* Deep zoom. Driven off the camera's own scale rather than a keystroke count:
     round 12 shipped 16-zoomed-in and 17-zoomed-out as the same camera because
     the '=' presses were being swallowed by a focused input and nothing
     checked. `k0` is captured first so the assertion is relative to wherever
     the fit happened to land. */
  const k0 = await page.evaluate(() => window.__atlasDebug.view().k);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('=');
    await page.waitForTimeout(120);
  }
  await settle(page, 900);
  await shot(page, '16-zoomed-in', {
    want: new Function(`return window.__atlasDebug.view().k > ${k0} * 1.8;`),
    is: `the camera is past ${(k0 * 1.8).toFixed(2)} (fit was ${k0.toFixed(2)})`,
  });
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('-');
    await page.waitForTimeout(120);
  }
  await settle(page, 900);
  await shot(page, '17-zoomed-out', {
    want: new Function(`return window.__atlasDebug.view().k < ${k0} * 0.85;`),
    is: `the camera is under ${(k0 * 0.85).toFixed(2)} (fit was ${k0.toFixed(2)})`,
  });

  // the cast wall
  await page.keyboard.press('g');
  await page.waitForTimeout(1000);
  await shot(page, '24-gallery', { want: () => !!document.querySelector('.gallery__scroll'), is: 'the cast wall is open' });
  const galScroll = page.locator('.gallery__scroll').first();
  if (await galScroll.count()) {
    await galScroll.evaluate((el) => el.scrollTo({ top: 900 }));
    await page.waitForTimeout(500);
    await shot(page, '25-gallery-scrolled', {
      want: () => (document.querySelector('.gallery__scroll')?.scrollTop ?? 0) > 400,
      is: 'the cast wall is scrolled',
    });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await ctx.close();

  // ── English ──────────────────────────────────────────────────────────────
  const ctxEn = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    locale: 'en-US',
  });
  /* Arm the in-page probes. They are gated in src/probe.ts so a live
     visitor never receives the link list; addInitScript runs in every
     frame before any page script, so the app sees this at module init. */
  await ctxEn.addInitScript(() => { window.__atlasProbe = true; });
  await ctxEn.addInitScript(() => {
    try {
      localStorage.setItem('bgx.lang', 'en');
    } catch {
      /* ignore */
    }
  });
  const pEn = await ctxEn.newPage();
  pEn.on('pageerror', (e) => errors.push(`en pageerror: ${e.message}`));
  await pEn.goto(BASE, { waitUntil: 'networkidle' });
  await dismissIntro(pEn);
  await settle(pEn, 2200);
  await shot(pEn, '26-en-graph', {
    want: () => (window.__atlasPaint?.frame.discs.length ?? 0) === 20,
    is: 'all twenty painted in EN',
  });
  if (await clickCentralNode(pEn)) {
    await pEn.waitForTimeout(1200);
    await shot(pEn, '27-en-dossier', { want: () => /[#&]p=/.test(location.hash), is: 'a person is open' });
    const d = pEn.locator('.dsr-scroll').first();
    if (await d.count()) {
      await d.evaluate((el) => el.scrollTo({ top: 1400 }));
      await pEn.waitForTimeout(500);
      await shot(pEn, '28-en-dossier-scrolled', {
        want: () => (document.querySelector('.dsr-scroll')?.scrollTop ?? 0) > 900,
        is: 'the dossier is scrolled',
      });
    }
  }
  await pEn.keyboard.press('Escape');
  await pEn.waitForTimeout(300);
  await pEn.keyboard.press('g');
  await pEn.waitForTimeout(900);
  await shot(pEn, '29-en-gallery', { want: () => !!document.querySelector('.gallery__scroll'), is: 'the cast wall is open' });
  await pEn.keyboard.press('Escape');
  await pEn.waitForTimeout(300);
  await pEn.keyboard.press('?');
  await pEn.waitForTimeout(800);
  await shot(pEn, '30-en-about', { want: () => !!document.querySelector('[role="dialog"]'), is: 'the about sheet is open' });
  await ctxEn.close();

  // ── laptop ───────────────────────────────────────────────────────────────
  const ctx2 = await browser.newContext({ viewport: LAPTOP, deviceScaleFactor: 2, colorScheme: 'dark', locale: 'ko-KR' });
  /* Arm the in-page probes. They are gated in src/probe.ts so a live
     visitor never receives the link list; addInitScript runs in every
     frame before any page script, so the app sees this at module init. */
  await ctx2.addInitScript(() => { window.__atlasProbe = true; });
  await ctx2.addInitScript((l) => {
    try {
      localStorage.setItem('bgx.lang', l);
    } catch {
      /* ignore */
    }
  }, 'ko');
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errors.push(`laptop pageerror: ${e.message}`));
  await p2.goto(BASE, { waitUntil: 'networkidle' });
  await dismissIntro(p2);
  await settle(p2, 2200);
  await shot(p2, '18-laptop', { want: () => (window.__atlasPaint?.frame.discs.length ?? 0) === 20, is: 'all twenty painted' });
  if (await clickCentralNode(p2)) {
    await p2.waitForTimeout(1200);
    await shot(p2, '19-laptop-dossier', { want: () => /[#&]p=/.test(location.hash), is: 'a person is open' });
  }
  await ctx2.close();

  // ── mobile ───────────────────────────────────────────────────────────────
  const ctx3 = await browser.newContext({
    viewport: MOBILE,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
    locale: 'ko-KR',
  });
  /* Arm the in-page probes. They are gated in src/probe.ts so a live
     visitor never receives the link list; addInitScript runs in every
     frame before any page script, so the app sees this at module init. */
  await ctx3.addInitScript(() => { window.__atlasProbe = true; });
  await ctx3.addInitScript((l) => {
    try {
      localStorage.setItem('bgx.lang', l);
    } catch {
      /* ignore */
    }
  }, 'ko');
  const p3 = await ctx3.newPage();
  p3.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`));
  await p3.goto(BASE, { waitUntil: 'networkidle' });
  await p3.waitForTimeout(1000);
  await shot(p3, '20-mobile-intro', { want: () => !!document.querySelector('.intro'), is: 'the cold open is on screen' });
  await dismissIntro(p3);
  await settle(p3, 2200);
  await shot(p3, '21-mobile-graph', { want: () => (window.__atlasPaint?.frame.discs.length ?? 0) === 20, is: 'all twenty painted' });
  if (await clickCentralNode(p3)) {
    await p3.waitForTimeout(1200);
    await shot(p3, '22-mobile-dossier', { want: () => /[#&]p=/.test(location.hash), is: 'a person is open' });
  }
  await ctx3.close();

  await browser.close();

  console.log(`\n${shots.length} screenshots → ${OUT}`);
  if (unreached.length) {
    console.log('\nCAPTURES NOT TAKEN — the state was never reached, so no file was written:');
    for (const u of unreached) console.log('  ✗', u);
    process.exitCode = 3;
  }
  if (errors.length) {
    console.log('\nRUNTIME ERRORS:');
    for (const e of [...new Set(errors)]) console.log('  ✗', e);
    process.exitCode = 2;
  } else {
    console.log('No console or page errors.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
