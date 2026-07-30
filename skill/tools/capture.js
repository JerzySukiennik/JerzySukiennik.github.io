#!/usr/bin/env node
'use strict';

/**
 * Screenshot tool for the /projects skill.
 *
 * Loads a URL, optionally lets a drive script play the project into position,
 * and writes a 1200x900 WebP straight into the site repo's project-images/.
 *
 * Usage:
 *   node capture.js --slug gzowo-bowling --url https://... [options]
 *
 * Options:
 *   --slug <slug>        Required. Names the file: <slug>.webp, <slug>-2.webp, ...
 *   --url <url>          Required. What to load.
 *   --index <n>          1 = the card image (default). 2+ = gallery shots.
 *   --out <file>         Override the output path entirely.
 *   --wait <ms>          Settle time after load, before driving. Default 3500.
 *   --settle <ms>        Settle time after driving, before the shot. Default 700.
 *   --drive <file.js>    Module exporting async (page) => {} that plays into position.
 *   --eval <js>          Snippet run in the page after load (level jumps, cheats).
 *   --click <selector>   Click this before the shot (menus, start buttons).
 *   --width/--height     Output size. Default 1200x900.
 *   --quality <n>        WebP quality. Default 82.
 *   --repo <path>        Site repo. Default: from the skill config.
 *   --no-headless        Watch it happen, for debugging a drive script.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const sharp = require('sharp');

function parseArgs(argv) {
  const a = {
    index: 1, wait: 3500, settle: 700, width: 1200, height: 900,
    quality: 82, headless: true
  };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const next = () => argv[++i];
    switch (flag) {
      case '--slug': a.slug = next(); break;
      case '--url': a.url = next(); break;
      case '--index': a.index = Number(next()); break;
      case '--out': a.out = next(); break;
      case '--wait': a.wait = Number(next()); break;
      case '--settle': a.settle = Number(next()); break;
      case '--drive': a.drive = next(); break;
      case '--eval': a.eval = next(); break;
      case '--click': a.click = next(); break;
      case '--width': a.width = Number(next()); break;
      case '--height': a.height = Number(next()); break;
      case '--quality': a.quality = Number(next()); break;
      case '--repo': a.repo = next(); break;
      case '--no-headless': a.headless = false; break;
      default:
        if (flag.startsWith('--')) throw new Error('Unknown option ' + flag);
    }
  }
  return a;
}

function config() {
  try {
    return require(path.join(__dirname, '..', 'config.json'));
  } catch {
    return {};
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.url) throw new Error('--url is required');
  if (!args.slug && !args.out) throw new Error('--slug or --out is required');

  const repo = args.repo || config().repo;
  const out = args.out || path.join(
    repo, 'project-images',
    args.index > 1 ? `${args.slug}-${args.index}.webp` : `${args.slug}.webp`
  );
  if (!args.out && !repo) throw new Error('No site repo configured; pass --repo or --out');

  const browser = await chromium.launch({ headless: args.headless });
  const context = await browser.newContext({
    viewport: { width: args.width, height: args.height },
    deviceScaleFactor: 2,                    // render at 2x, downsample for crisp edges
    permissions: [],
    reducedMotion: 'no-preference'
  });
  const page = await context.newPage();

  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(String(e.message)));

  await page.goto(args.url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(args.wait);

  if (args.eval) await page.evaluate(args.eval);
  if (args.click) {
    const el = await page.$(args.click);
    if (el) { await el.click(); await page.waitForTimeout(600); }
  }
  if (args.drive) {
    const drive = require(path.resolve(args.drive));
    await drive(page);
  }
  await page.waitForTimeout(args.settle);

  const raw = await page.screenshot({ type: 'png' });
  await browser.close();

  await fs.mkdir(path.dirname(out), { recursive: true });
  await sharp(raw)
    .resize(args.width, args.height, { fit: 'cover', position: 'centre' })
    .webp({ quality: args.quality })
    .toFile(out);

  const stat = await fs.stat(out);
  console.log(JSON.stringify({
    ok: true,
    out,
    bytes: stat.size,
    consoleErrors: problems.slice(0, 5)
  }, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
