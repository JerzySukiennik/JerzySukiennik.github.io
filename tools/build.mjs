/* Build step: data/*.json -> every page of gzowo.fun, plus assets/data.json for the browser, the guide's knowledge,
   sitemap and robots. Look: a Windows 98 desktop over a pixel map of the plot in Gzowo; each URL is that same desktop
   with its own window already open. Ends with the em-dash lint and refuses to finish when a dash is anywhere on the site.

   Usage: node tools/build.mjs
*/

import { writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { root, site as loadSite, loadProjects, checkProject, lintRepo, SECTIONS, sectionOf, rocketsFile, readJson } from "./lib.mjs";
import { esc, win, routeWindow, newsWin, reviewsWin, guestbookWin, guideWin, startMenu, taskbar, spots, iconSprite, STATUS } from "../assets/views.mjs";

const S = loadSite();
const SITE = S.url;

const all = loadProjects().projects;
const projects = all.filter((p) => !p.hidden);
const R = readJson(rocketsFile);
const SEC = S.sections;

let broken = 0;
for (const p of projects) {
  const r = checkProject(p);
  if (r.errors.length) { broken++; console.error(`BAD ENTRY ${p.slug}: ${r.errors.join("; ")}`); }
  if (r.need.length) console.warn(`gap in ${p.slug}: missing ${r.need.join("; ")}`);
}
if (broken) process.exit(1);

const fill = (text, vars = {}) => String(text).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
const ver = (file) => createHash("md5").update(readFileSync(join(root, file))).digest("hex").slice(0, 8);

const ctx = {
  site: {
    url: SITE, owner: S.owner, tagline: S.tagline, eyebrow: fill(S.eyebrow, { owner: S.owner }), email: S.email, github: S.github,
    contact: S.contact, industries: S.industriesNote, nowPlaying: S.nowPlaying, webring: S.webring, chatUrl: S.chatUrl || "",
  },
  order: SECTIONS,
  sections: Object.fromEntries(SECTIONS.map((k) => [k, { label: SEC[k].label, title: SEC[k].title, tag: SEC[k].tag, note: SEC[k].note, door: SEC[k].door }])),
  projects: projects.map((p) => ({
    slug: p.slug, name: p.name, category: p.category, status: p.status, year: p.year, blurb: p.blurb, body: p.body || [],
    stack: p.stack || [], url: p.url || "", repo: p.repo || "", image: p.image || "", download: p.download || null, section: sectionOf(p),
  })),
  rockets: R,
};

writeFileSync(join(root, "assets/data.json"), JSON.stringify(ctx));
writeFileSync(join(root, "assets/icons.svg"), iconSprite());

function head({ title, description, url, image }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#008080">
<meta name="color-scheme" content="light">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(S.titleSuffix)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css?v=${ver("assets/site.css")}">
<script>try{if(!sessionStorage.getItem("gl-boot")&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("booting")}catch(e){}</script>
</head>`;
}

function scripts() {
  const map = {
    three: "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
  };
  for (const f of ["views.mjs", "map.mjs", "mural.mjs", "life.mjs", "boot.mjs", "weather.mjs", "glass.mjs", "rocket.mjs", "garden.mjs", "fishing.mjs"]) map[`/assets/${f}`] = `/assets/${f}?v=${ver("assets/" + f)}`;
  return `<script type="importmap">${JSON.stringify({ imports: map })}</script>
<script type="module" src="/assets/desk.mjs?v=${ver("assets/desk.mjs")}"></script>
<script src="/assets/reviews.js?v=${ver("assets/reviews.js")}" defer></script>
<script src="/assets/guestbook.js?v=${ver("assets/guestbook.js")}" defer></script>${
    S.chatUrl ? `\n<script src="/assets/chat.js?v=${ver("assets/chat.js")}" data-chat="${esc(S.chatUrl)}" defer></script>` : ""
  }
<script type="module" src="/assets/agentation.js"></script>
<script type="module" src="/assets/avatar.mjs?v=${ver("assets/avatar.mjs")}"></script>`;
}

function page(route, meta) {
  const w = routeWindow(ctx, route);
  const links = SECTIONS.map((k) => `<a href="/${k}/">${esc(SEC[k].label)}</a>`).join(" | ");
  return `${head(meta)}
<body>
<div class="boot" id="boot" aria-hidden="true"><div class="boot-box"><svg class="boot-ico" viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges" aria-hidden="true"><rect x="7" y="0" width="2" height="1"/><rect x="6" y="1" width="4" height="1"/><rect x="6" y="2" width="1" height="1"/><rect x="9" y="2" width="1" height="1"/><rect x="5" y="3" width="2" height="1"/><rect x="9" y="3" width="2" height="1"/><rect x="5" y="4" width="1" height="1"/><rect x="10" y="4" width="1" height="1"/><rect x="5" y="5" width="1" height="1"/><rect x="7" y="5" width="2" height="1"/><rect x="10" y="5" width="1" height="1"/><rect x="5" y="6" width="1" height="1"/><rect x="7" y="6" width="2" height="1"/><rect x="10" y="6" width="1" height="1"/><rect x="5" y="7" width="1" height="1"/><rect x="10" y="7" width="1" height="1"/><rect x="5" y="8" width="1" height="1"/><rect x="10" y="8" width="1" height="1"/><rect x="4" y="9" width="2" height="1"/><rect x="10" y="9" width="2" height="1"/><rect x="3" y="10" width="3" height="1"/><rect x="10" y="10" width="3" height="1"/><rect x="2" y="11" width="2" height="1"/><rect x="5" y="11" width="1" height="1"/><rect x="10" y="11" width="1" height="1"/><rect x="12" y="11" width="2" height="1"/><rect x="2" y="12" width="1" height="1"/><rect x="5" y="12" width="6" height="1"/><rect x="13" y="12" width="1" height="1"/><rect x="2" y="13" width="4" height="1"/><rect x="7" y="13" width="2" height="1"/><rect x="10" y="13" width="4" height="1"/><rect x="7" y="14" width="2" height="1"/><rect x="6" y="15" width="1" height="1"/><rect x="9" y="15" width="1" height="1"/></svg><b>Welcome to Gzowo Labs</b></div></div>
<div class="desk" id="desk" data-route="${esc(route)}" data-src="/assets/data.json?v=${ver("assets/data.json")}" data-title="${esc(S.homeTitle)}">
<main class="world" id="world" aria-label="Map of the Gzowo Labs plot">
<canvas class="map" aria-hidden="true"></canvas>
<nav class="spots" aria-label="Places on the map">${spots(ctx)}</nav>
<div class="mural" data-mural aria-hidden="true"><canvas></canvas></div>
</main>
<div class="wins" id="wins">
${win(w)}
${route === "/" ? newsWin(ctx) : ""}
${reviewsWin()}
${guestbookWin()}
${S.chatUrl ? guideWin() : ""}
</div>
${startMenu(ctx)}
${taskbar(ctx)}
</div>
<noscript><p class="nojs">The map needs JavaScript. Everything is still here: ${links} | <a href="mailto:${esc(S.email)}">E-mail</a></p></noscript>
${scripts()}
</body>
</html>
`;
}

const pagesDir = join(root, "p");
rmSync(pagesDir, { recursive: true, force: true });
for (const key of SECTIONS) rmSync(join(root, key), { recursive: true, force: true });

const homeImage = `${SITE}/${projects[0]?.image || "assets/og.png"}`;
writeFileSync(join(root, "index.html"), page("/", { title: S.homeTitle, description: S.tagline, url: SITE + "/", image: homeImage }));

for (const key of SECTIONS) {
  const list = projects.filter((p) => sectionOf(p) === key);
  const image = key === "rockets" ? R.fleet[0].image : `${SITE}/${list[0]?.image || "assets/og.png"}`;
  const description = key === "rockets" ? R.lead : SEC[key].note;
  mkdirSync(join(root, key), { recursive: true });
  writeFileSync(join(root, key, "index.html"), page(`/${key}/`, { title: `${SEC[key].title} | ${S.titleSuffix}`, description, url: `${SITE}/${key}/`, image }));
}

for (const p of projects) {
  mkdirSync(join(pagesDir, p.slug), { recursive: true });
  writeFileSync(join(pagesDir, p.slug, "index.html"), page(`/p/${p.slug}/`, {
    title: `${p.name} | ${S.titleSuffix}`, description: p.blurb, url: `${SITE}/p/${p.slug}/`, image: `${SITE}/${p.image || "assets/og.png"}`,
  }));
}

const clip = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "..." : t);
const knowledge = [
  `SITE: Gzowo Labs (${SITE}), the personal site of ${S.owner} (Gzowo, Poland, since 2025). Tagline: ${S.tagline}`,
  "The site looks like a Windows 98 desktop over a pixel map of the family plot in Gzowo. Buildings on the map: the launch pad (Rockets, /rockets/), the workshop (3D Printing, /printing/), the arcade (Games, /games/) and the lab (Software and AI, /software/). There is also a billboard with a random visitor review, a mailbox that opens the guestbook, a signpost about Gzowo 34, and a brick wall: click it, the view zooms in and anyone can spray paint on it in 60 colors, any color, or shiny chrome and gold, the wall never ends to the right (A and D walk along it, two fingers on a phone) and zooms in forever (the mouse wheel or a pinch), so whole pictures fit inside one brick, hold still and the paint drips, the eraser rubs out any paint and Ctrl+Z takes back your own strokes. Two kayaks float at the dock on the Narew river: click one and the small 3D Jurek runs down to the dock, jumps in, paddles around and comes back after 10 to 20 seconds. That Jurek walks the path, talks in speech bubbles, thinks in cloud bubbles and reacts to what happens. The map is alive: clouds, birds, butterflies, jumping fish, and the rocket on the launch pad does an engine test now and then. Click a cloud and it starts to rain: the sky goes grey, dark clouds roll in, rain splashes on the grass and rings the river, drops stick to the screen like on a window and run down, Jurek opens an umbrella, and when the rain stops a rainbow comes out. Click more clouds for heavier rain. Next to the launch pad there is a launch control desk: press START, it counts down and the GSP rocket takes off for real, then comes back down on a parachute onto the pad; every launch is counted. Between the mailbox and the wall there is a garden where anyone can plant a tulip, sunflower, daisy, lavender, berry bush, little tree, mushroom or pumpkin once a minute, and the plants grow over the next days. Click the dock and Jurek goes fishing on the Narew: click when the float dips to hook a fish (roach, perch, pike, catfish, even a golden fish or an old boot), and the biggest catches go into a records table. The first visit opens with a Mac System 7 style screen: the plot appears in black and white like a drop falling into water, then the colors ripple in. The Start menu in the corner lists everything and the visitor counter sits next to the clock.",
  "",
  "ROCKETS (Gzowo Space Program, GSP):",
  clip(R.lead, 400),
  ...R.fleet.map((r) => `- ${r.name} (${r.state}): ${clip(r.blurb || "", 220)} ${(r.spec || []).map((s) => s.join(": ")).join("; ")}`),
  "",
  "PROJECTS (page = " + SITE + "/p/<slug>/):",
  ...projects.map((p) =>
    [
      `- ${p.name} [${p.category}, ${STATUS[p.status] || p.status}${p.year ? ", " + p.year : ""}] page: ${SITE}/p/${p.slug}/`,
      p.blurb ? clip(p.blurb, 200) : "",
      p.body && p.body.length ? clip(p.body.join(" "), 420) : "",
      p.stack && p.stack.length ? "Built with " + p.stack.join(", ") + "." : "",
      p.url ? "Play/open: https://" + String(p.url).replace(/^https?:\/\//, "") : "",
    ].filter(Boolean).join(" "),
  ),
].join("\n");
mkdirSync(join(root, "tools/chat-worker/src"), { recursive: true });
writeFileSync(join(root, "tools/chat-worker/src/knowledge.mjs"), `export const KNOWLEDGE = ${JSON.stringify(knowledge)};\n`);

const urls = ["/", ...SECTIONS.map((k) => `/${k}/`), "/islands/", ...projects.map((p) => `/p/${p.slug}/`)];
writeFileSync(
  join(root, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n") +
    `\n</urlset>\n`,
);
writeFileSync(join(root, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /tools/\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`Built index.html, ${SECTIONS.length} section pages, ${projects.length} project pages, data.json, sitemap.xml and robots.txt.`);

const dashes = lintRepo();
if (dashes.length) {
  console.error(`\nLINT FAILED: ${dashes.length} em dash(es) on the site. Fix the text, then build again:`);
  console.error(dashes.slice(0, 40).join("\n"));
  process.exit(1);
}
console.log("Lint ok: no em dashes.");
