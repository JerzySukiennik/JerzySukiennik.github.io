#!/usr/bin/env node
/* Screenshot tool. Two steps, so a human-eyed pick sits between them:

   node tools/shot.mjs frames --slug <slug> --url <url> [--recipe <file>] [--frames 5]
        [--interval 2500] [--width 1200] [--height 900] [--camera] [--headed]
     Loads the URL, plays the recipe (tools/recipes/<slug>.json is picked up on its own),
     then writes N candidate frames to .shots/<slug>/frame-N.png. Claude LOOKS at them
     and chooses; a cold page load is almost never the frame worth publishing.

   node tools/shot.mjs set --slug <slug> --frame <png|jpg|webp>
     Centre-crops to 4:3, resizes to 1200x900, writes project-images/<slug>.webp and
     points the project at it. Works on any image, so a screenshot the user sends
     goes through the same door.

   Recipe file:
     { "wait": 3500,                       settle time after load
       "camera": false,                    synthetic webcam for camera-driven projects
       "steps": [ ... ],                   played once after load
       "between": [ ... ] }                played before every frame after the first
   Steps: {"wait":ms} {"click":"css"} {"text":"Play"} (click by visible-text prefix)
          {"mouse":[x,y]} {"key":"KeyW","hold":600} {"eval":"js"} {"hide":"css"}
          {"peer":"https://..."} (second page in the same context, for multiplayer)
   Clicks go through page.evaluate(el.click()): a transparent overlay makes a real
   click time out on exactly the projects worth photographing.
*/

import { readFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { root, loadProjects, saveProjects } from "./lib.mjs";

const [cmd, ...rest] = process.argv.slice(2);
const flag = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : d; };
const has = (n) => rest.includes(n);
const fail = (m) => { console.error(JSON.stringify({ ok: false, error: m })); process.exit(1); };

function loadPlaywright() {
  const here = join(root, "tools/node_modules/playwright-core");
  const candidates = [here, ...(process.env.GZOWO_PLAYWRIGHT ? [process.env.GZOWO_PLAYWRIGHT] : []),
    join(process.env.HOME, "Downloads/Claude/Projects/Gzowo-Reel/node_modules/playwright-core")];
  for (const c of candidates) {
    if (existsSync(c)) return createRequire(join(c, "..", "x.js"))("playwright-core");
  }
  fail("playwright-core not found. Run: cd tools && npm install playwright-core, or set GZOWO_PLAYWRIGHT.");
}

async function runStep(page, ctx, step) {
  if ("wait" in step) return page.waitForTimeout(step.wait);
  if ("click" in step) {
    await page.evaluate((sel) => document.querySelector(sel)?.click(), step.click);
    return page.waitForTimeout(500);
  }
  if ("text" in step) {
    await page.evaluate((t) => {
      const want = t.toLowerCase();
      const els = [...document.querySelectorAll("button, a, [role=button], [onclick], div, span, li")];
      const hit = els.find((e) => (e.textContent || "").trim().toLowerCase().startsWith(want) && e.children.length < 4);
      hit?.click();
    }, step.text);
    return page.waitForTimeout(500);
  }
  if ("mouse" in step) return page.mouse.click(step.mouse[0], step.mouse[1]);
  if ("key" in step) {
    await page.keyboard.down(step.key);
    await page.waitForTimeout(step.hold ?? 100);
    return page.keyboard.up(step.key);
  }
  if ("eval" in step) return page.evaluate(step.eval);
  if ("hide" in step) {
    return page.evaluate((sel) => document.querySelectorAll(sel).forEach((e) => (e.style.display = "none")), step.hide);
  }
  if ("peer" in step) {
    const peer = await ctx.newPage();
    await peer.goto(step.peer, { waitUntil: "load", timeout: 60000 });
    return page.waitForTimeout(1500);
  }
  fail("Unknown step: " + JSON.stringify(step));
}

async function frames() {
  const slug = flag("--slug"), url = flag("--url");
  if (!slug || !url) fail("--slug and --url are required");
  const recipeFile = flag("--recipe") ?? join(root, "tools/recipes", slug + ".json");
  const recipe = existsSync(recipeFile) ? JSON.parse(readFileSync(recipeFile, "utf8")) : {};
  const n = Number(flag("--frames", 5)), interval = Number(flag("--interval", 2500));
  const width = Number(flag("--width", 1200)), height = Number(flag("--height", 900));
  const camera = has("--camera") || recipe.camera;

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({
    headless: !has("--headed"),
    args: camera ? ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] : [],
  });
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 2,
    permissions: camera ? ["camera", "microphone"] : [],
  });
  const page = await ctx.newPage();
  const problems = [];
  page.on("console", (m) => m.type() === "error" && problems.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => problems.push(String(e.message).slice(0, 200)));

  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(recipe.wait ?? 3500);
  for (const s of recipe.steps ?? []) await runStep(page, ctx, s);

  const dir = join(root, ".shots", slug);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const files = [];
  for (let i = 1; i <= n; i++) {
    if (i > 1) {
      for (const s of recipe.between ?? []) await runStep(page, ctx, s);
      await page.waitForTimeout(interval);
    }
    const file = join(dir, `frame-${i}.png`);
    // a busy game keeps repainting; without a long budget Playwright gives up waiting for a stable frame
    await page.screenshot({ path: file, type: "png", timeout: 90000, animations: "allow" });
    files.push(file);
  }
  const title = await page.title();
  await browser.close();
  console.log(JSON.stringify({ ok: true, title, frames: files, consoleErrors: problems.slice(0, 6) }, null, 2));
}

function imageSize(file) {
  const out = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]).toString();
  return [Number(/pixelWidth: (\d+)/.exec(out)[1]), Number(/pixelHeight: (\d+)/.exec(out)[1])];
}

function set() {
  const slug = flag("--slug"), frame = flag("--frame");
  if (!slug || !frame) fail("--slug and --frame are required");
  if (!existsSync(frame)) fail("No such file: " + frame);
  const data = loadProjects();
  const entry = data.projects.find((p) => p.slug === slug);
  if (!entry) fail(`No project "${slug}"`);

  const [w, h] = imageSize(frame);
  const tmp = join(root, ".shots", `${slug}-crop.png`);
  mkdirSync(join(root, ".shots"), { recursive: true });
  const cw = Math.min(w, Math.floor((h * 4) / 3)), ch = Math.min(h, Math.floor((w * 3) / 4));
  execFileSync("sips", ["-s", "format", "png", "-c", String(ch), String(cw), frame, "--out", tmp]);
  const out = join(root, "project-images", `${slug}.webp`);
  mkdirSync(join(root, "project-images"), { recursive: true });
  execFileSync("cwebp", ["-quiet", "-q", "82", "-resize", "1200", "900", tmp, "-o", out]);

  entry.image = `project-images/${slug}.webp`;
  saveProjects(data);
  console.log(JSON.stringify({ ok: true, out, from: frame }));
}

if (cmd === "frames") await frames();
else if (cmd === "set") set();
else fail("Commands: frames | set");
