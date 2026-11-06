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

function importmap() {
  const map = {
    three: "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
  };
  for (const f of ["views.mjs", "map.mjs", "mural.mjs", "life.mjs", "boot.mjs", "weather.mjs", "glass.mjs", "rocket.mjs", "garden.mjs", "fishing.mjs", "hangar.mjs", "board.mjs", "claw.mjs", "folks.mjs", "bank.mjs", "exchange.mjs", "museum.mjs", "paint.mjs", "coaster.mjs", "stencil.mjs", "blimps.mjs", "wall3d.mjs"]) map[`/assets/${f}`] = `/assets/${f}?v=${ver("assets/" + f)}`;
  return `<script type="importmap">${JSON.stringify({ imports: map })}</script>`;
}

function scripts() {
  return `${importmap()}
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
<div class="pan" id="pan">
<main class="world" id="world" aria-label="Map of the Gzowo Labs plot">
<canvas class="map" aria-hidden="true"></canvas>
<canvas class="map map-r" aria-hidden="true"></canvas>
<canvas class="map map-r" aria-hidden="true"></canvas>
<nav class="spots" aria-label="Places on the map">${spots(ctx)}</nav>
<div class="mural" data-mural aria-hidden="true"><canvas></canvas></div>
</main>
</div>
<button class="pan-go" type="button" data-pan="1" aria-label="Walk to the other half of the plot" hidden><span></span></button>
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

function wallPage() {
  const title = "The Big Wall | " + S.titleSuffix, description = "The shared spray wall of Gzowo Labs as a 3D pixel world: twelve meters tall, a scissor lift to the top, a photo drone and a boombox. Paint it together with everyone online.";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#000080">
<meta name="color-scheme" content="light">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(SITE)}/wall/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(S.titleSuffix)}">
<meta property="og:url" content="${esc(SITE)}/wall/">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(homeImage)}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css?v=${ver("assets/site.css")}">
</head>
<body class="w3-body">
<main class="w3" id="w3" aria-label="The Big Wall"><canvas class="w3-cv" aria-label="The wall in 3D, click to play"></canvas></main>
<noscript><p class="nojs">The big wall needs JavaScript. <a href="/">Back to the map</a></p></noscript>
${importmap()}
<script type="module" src="/assets/wall3d.mjs?v=${ver("assets/wall3d.mjs")}"></script>
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

mkdirSync(join(root, "wall"), { recursive: true });
writeFileSync(join(root, "wall", "index.html"), wallPage());

for (const p of projects) {
  mkdirSync(join(pagesDir, p.slug), { recursive: true });
  writeFileSync(join(pagesDir, p.slug, "index.html"), page(`/p/${p.slug}/`, {
    title: `${p.name} | ${S.titleSuffix}`, description: p.blurb, url: `${SITE}/p/${p.slug}/`, image: `${SITE}/${p.image || "assets/og.png"}`,
  }));
}

const clip = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "..." : t);
const knowledge = [
  `SITE: Gzowo Labs (${SITE}), the personal site of ${S.owner} (Gzowo, Poland, since 2025). Tagline: ${S.tagline}`,
  "The site looks like a Windows 98 desktop over a pixel map of the family plot in Gzowo. Buildings on the map: the launch pad (Rockets, /rockets/), the workshop (3D Printing, /printing/), the arcade (Games, /games/) and the lab (Software and AI, /software/). There is also a billboard with a random visitor review, a mailbox that opens the guestbook, a signpost about Gzowo 34, and a brick wall: click it, the view zooms in and anyone can paint on it with a spray can in 60 colors, any color, or shiny chrome and gold, with nine spray caps (standard, skinny, fat, flat, splatter, dripper, airbrush, dust and a clean brush with no mist or drips), with dusty chalk, glowing neon, or a rainbow spray that lays seven bands at once. Masking tape keeps paint off a strip, and you peel it off like a sticker by grabbing its end, leaving a crisp edge; let go halfway and it stays half peeled for everyone. Cardboard stencils (star, heart, lightning, rocket, pine cone, crown, arrow, smiley, circle, square, GZOWO and GSP, your own cut with a knife, a hole punch, glue and letters on a cutting board, or one cut automatically from any picture, with gaps between its colors and the rim of every hole drawn in the color it was cut from) give clean sprayed shapes, a stencil cut from a picture is split into color layers (a color square in its corner opens one layer at a time and picks its color, so spraying the layers in turn paints the whole picture), and they peel off like stickers from the folded corner, staying half peeled if you let go. Tape and stencils are shared: everyone on the wall sees them and anyone can rip them off, and you see other painters' cursors with their wallet names and their strokes live as they spray. To sell a drawing, press Sell at the top of the wall and draw a loop around it: only strokes you painted yourself (in this browser, or with the wallet you are logged into) count, and everything that will be sold lights up. Haiku, the AI art buyer, then looks at it, rates it from 1 to 10, says what it thinks and offers up to 100 szyszki, bigger and better pieces earning more; you pick payment in szyszki, GZM or GZF, confirm once more, and the sold paint disappears from the wall, five sales a day per wallet. To change what the wall is made of (red, white, dark or yellow brick, cinder block, concrete, plaster, a white wall, pink stucco, fieldstone, sandstone, marble, a wood fence, plywood, a log wall, corrugated metal, a steel shutter, diamond plate, rusty steel, white or green tiles, glass blocks or a blackboard), press Material at the top, pick one, then drag the box over bare wall, pull its corners to size it and press Use: the wall inside the box changes for everyone. The box cannot cover paint, but paint that was rubbed out completely counts as bare. The timelapse button replays how the part of the wall in view got painted, stroke by stroke, with the date of each. The paint window has a Big wall button: gzowo.fun/wall/ opens the same wall as a 3D pixel world you walk in on a computer (W A S D and the mouse, hold the left button to spray, closer to the wall sprays thinner). The wall is twelve meters tall everywhere: the paint window first shows all of it (zoom in to paint details, W and S climb), and on the map it stands behind everything else. In 3D the top is reached from a yellow scissor lift (E to get on, Space up, Shift down). Every tool works there too, other painters stand at the wall as pixel people with their names, a photo drone (F) flies back and saves a picture of the wall, and a boombox (B) plays free CC0 songs, all with real recorded sounds. The wall never ends to the right (A and D walk along it, two fingers on a phone) and zooms in forever (the mouse wheel or a pinch), so whole pictures fit inside one brick, hold still and the paint drips, the eraser rubs out any paint and Ctrl+Z takes back your own strokes. Two kayaks float at the dock on the Narew river: click one and the small 3D Jurek runs down to the dock, jumps in, paddles around and comes back after 10 to 20 seconds. That Jurek walks the path, talks in speech bubbles, thinks in cloud bubbles and reacts to what happens. The map is alive: clouds, birds, butterflies, jumping fish, and the rocket on the launch pad does an engine test now and then. Click a cloud and it starts to rain: the sky goes grey, dark clouds roll in, rain splashes on the grass and rings the river, drops stick to the screen like on a window and run down, Jurek opens an umbrella, and when the rain stops a rainbow comes out. Click more clouds for heavier rain. Next to the launch pad there is a launch control desk: press START, it counts down and the GSP rocket takes off for real, then comes back down on a parachute onto the pad; every launch is counted. Between the mailbox and the wall there is a garden where anyone can plant a tulip, sunflower, daisy, lavender, berry bush, little tree, mushroom or pumpkin once a minute, and the plants grow over the next days. Click the dock and Jurek goes fishing on the Narew: click when the float dips to hook a fish (roach, perch, pike, catfish, even a golden fish or an old boot), and the biggest catches go into a records table. The plot is three screens wide: scroll sideways or click the arrow tab on the edge (on a phone, swipe sideways between the three parts). The middle part has the GSP hangar: click it, the doors slide open on the whole rocket fleet drawn in pixels, and clicking a rocket opens its page. Next to it stands a cork board where anyone can pin a card with a short note, a tiny drawing or both; cards stay up for a week. Then a claw machine: three free tries a day (more cost 15 szyszki each), steer the claw, drop it, and if it holds on you win a wearable prize (a crown, top hat, space helmet, sunglasses, cape, jetpack, wings and more, 15 in total). The changing booth opens the Folk Maker: build your own little pixel person from parts (head, hair, face, top, bottom, shoes, hat), recolor every part, paint over any pixel, give it a name and something to say, and let it out on the plot. Up to 10 folks walk around at once: they wave, greet each other, shake hands with Jurek and visit the attractions; every folk ever made stays in the Folks index, and anyone can let any of them out again with one click (the one that has been out the longest goes home). Claw prizes can be put on your own folks with Dress up. The third part is Gzowo Street, the plot's own Wall Street. The money there is szyszki, pixel pine cones: you get 50 when you open a wallet (no sign up, just a 12 word code that opens the same wallet on any device, kept on the server), 20 more every day, and you earn them on the plot by planting, fishing, launching rockets, pinning cards, spraying the wall, winning at the claw machine, letting out a new folk, and from three daily quests; every way to earn has a daily cap. The tray next to the clock shows your szyszki and opens the wallet. The Gzowo Street Exchange trades two coins: Gzowium (GZM), whose price follows real data (the level of the Narew river at Pultusk from IMGW, how busy the site is, how much Jurek pushes on GitHub) plus what players buy and sell, and Gzofajfus (GZF), the wilder rocket coin, driven by launches on the site and the real wind in Gzowo; the exchange shows a chart, explains why the price is where it is, and there is a top 25 of the richest wallets. The Gzowo Store sells sky shows everyone on the site sees (fireworks, a hot air balloon with your name, a plane towing your message), extra claw tries, coaster tickets, outfits for folks (six of them only sold there), and Ideas for Jurek: send him a suggestion that lands in his own inbox. The Gzowo Museum opens full screen: a hall of paintings by visitors with a plaque above each (title, painter, description, price) and spotlights, filters for all, for sale, most sold and mine. At the easel you paint in Gzowo Paint, an MS Paint style editor with 22 tools (pencil, brush, airbrush, eraser, fill, color picker, text, line, curve, rectangle, ellipse, rounded rectangle, polygon, select and move, magnifier, rainbow brush, dither brush, sparkle, gradient, stamps, replace color and mirror drawing), undo, flips and a grid. Hanging a painting pays 20 szyszki (three a day); a quick safety check runs on every painting, but there is no score. Every painting can be bought; the owner sets the price, the painter gets 10 percent of every resale, and each painting keeps its ownership history. High above Gzowo Street floats the Gzowo Coaster: a pixel roller coaster in the sky with a chain lift, a steep drop, a vertical loop and camelback hills, and a train of folks and Jurek riding it on real physics. A ticket (12 szyszki) gives a ride seen from the front seat. Two pixel blimps drift over the whole plot, one with the Gzowo Labs welcome and one with the news; click one and it pops until the page is loaded again. The wall's paint window has a ribbon of labeled tools at the top, a size slider and a color picker that starts from your color, with lighter and darker shades, recent colors and a dropper that takes a color from the wall. The first visit opens with a Mac System 7 style screen: the plot appears in black and white like a drop falling into water, then the colors ripple in. The Start menu in the corner lists everything and the visitor counter sits next to the clock.",
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

const urls = ["/", ...SECTIONS.map((k) => `/${k}/`), "/islands/", "/wall/", ...projects.map((p) => `/p/${p.slug}/`)];
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
