/* Publish step: data/projects.json -> index.html + one real page per project.
   Node only, no dependencies, no bundler. The CMS app calls this before it pushes.

   Look: deliberate 1998 GeoCities pastiche. Tables-in-spirit, bevels, blink,
   marquees, WordArt. All the "GIFs" are CSS, so nothing extra is downloaded.

   Usage: node tools/build.mjs
*/

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://gzowo.fun";
const OWNER = "Jerzy Sukiennik";
const TAGLINE = "I build things that fly. And a few that don't crash.";

const CONTACT = [
  ["kalakasanyt@gmail.com", "mailto:kalakasanyt@gmail.com"],
  ["GitHub", "https://github.com/JerzySukiennik"],
  ["Instagram", "https://instagram.com/jurek_sukiennik"],
  ["X", "https://x.com/kalakasanyt"],
];

const STATUS_LABEL = { live: "Live", building: "Building", archive: "Archive" };

const esc = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const data = JSON.parse(readFileSync(join(root, "data/projects.json"), "utf8"));
const projects = data.projects.filter((p) => !p.hidden);

/* ---- shared chrome ---- */

function head({ title, description, url, image }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#ff00ff">
<meta name="color-scheme" content="light">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Gzowo Labs">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=90">
</head>`;
}

/* The strip of bevelled buttons under the banner. On a project page the first
   button walks home instead of jumping to an anchor that is not there. */
function navstrip(home = true) {
  const shelf = home
    ? `<a class="btn90" href="#feed">MY GAMES</a>`
    : `<a class="btn90" href="/#feed">MY GAMES</a>`;
  return `    <nav class="navstrip" aria-label="Main">
      <a class="btn90" href="/">HOME</a>
      ${shelf}
      <a class="btn90" href="https://github.com/JerzySukiennik" target="_blank" rel="noopener">MY CODE</a>
      <a class="btn90" href="https://gspaerospace.pl" target="_blank" rel="noopener">ROCKETS</a>
      <a class="btn90" href="mailto:kalakasanyt@gmail.com">SIGN MY GUESTBOOK</a>
      <a class="btn90" href="mailto:kalakasanyt@gmail.com">E-MAIL ME!!</a>
    </nav>`;
}

function banner() {
  return `    <div class="topbar marquee"><span>*~*~* WELCOME TO GZOWO LABS *~*~* ${projects.length} BROWSER GAMES AND EXPERIMENTS, ALL FREE, NO DOWNLOAD !!! *~*~* BEST VIEWED IN NETSCAPE NAVIGATOR AT 800x600 *~*~* SIGN MY GUESTBOOK !!! *~*~*</span></div>

    <header class="banner">
      <p class="eyebrow">${OWNER}'s Official Home Page ~ Gzowo 34, Poland ~ Est. 2026</p>
      <h1 class="wordart is-fire"><span class="spinner" aria-hidden="true"></span><img class="fire-gif" src="/assets/gzowo-labs-fire.gif" alt="Gzowo Labs" width="515" height="93"><span class="spinner" aria-hidden="true"></span></h1>
      <p class="tagline"><span class="blink">&gt;&gt;&gt;</span> ${TAGLINE} <span class="blink">&lt;&lt;&lt;</span></p>
    </header>`;
}

function sidebarLeft() {
  return `      <div class="col-left">
        <div class="widget">
          <h4>Navigate!!</h4>
          <ul class="menu">
            <li><a href="/">Home Page</a></li>
            <li><a href="/#feed">All My Games</a></li>
            <li><a href="/#feed">AI Stuff</a></li>
            <li><a href="https://gspaerospace.pl" target="_blank" rel="noopener">Rockets</a></li>
            <li><a href="https://github.com/JerzySukiennik" target="_blank" rel="noopener">My Code</a></li>
            <li><a href="mailto:kalakasanyt@gmail.com">Guestbook</a></li>
            <li><a href="mailto:kalakasanyt@gmail.com">E-Mail Me</a></li>
          </ul>
        </div>

        <div class="widget">
          <h4>Visitors</h4>
          <div class="counter" data-counter aria-label="visitor counter"></div>
          <p style="margin:6px 0 0">You are visitor number<br><b>that many</b>!</p>
          <p style="margin:6px 0 0;font-size:11px;color:#666" title="up up down down left right left right B A">
            <i>psst &mdash; this page has a secret.<br>Old gamers know the code.</i>
          </p>
        </div>

        <div class="widget">
          <h4>Now Playing</h4>
          <p style="margin:0">gzowo_theme.mid</p>
          <button class="btn90 midi" type="button" data-midi>&#9834; PLAY MIDI &#9834;</button>
        </div>

        <div class="widget award">
          &#9733;&#9733;&#9733;<br>COOL SITE<br>OF THE DAY<br>&#9733;&#9733;&#9733;<br><small>awarded by me</small>
        </div>
      </div>`;
}

function sidebarRight() {
  return `      <div class="col-right">
        <div class="widget">
          <h4>Today Is</h4>
          <p style="margin:0" data-today>a very fine day</p>
        </div>

        <div class="widget">
          <h4>New!!!</h4>
          <p style="margin:0"><span class="blink" style="color:#ff0000;font-weight:bold">NEW!</span> ${esc(projects[0]?.name || "")} is up!<br>
          <a href="/p/${esc(projects[0]?.slug || "")}/">click here !!~*</a></p>
        </div>

        <div class="construction">
          <span>&#9888; Site under construction since 2025 &#9888;</span>
        </div>

        <div class="widget webring" style="margin-top:10px">
          <h4>Web Ring</h4>
          <p style="margin:0">The Gzowo Web Ring</p>
          <p style="margin:4px 0 0">
            <a href="https://gspaerospace.pl" target="_blank" rel="noopener">&laquo; prev</a> |
            <a href="/">random</a> |
            <a href="https://github.com/JerzySukiennik" target="_blank" rel="noopener">next &raquo;</a>
          </p>
        </div>

        <div class="widget stamp">
          BEST VIEWED IN<br><b>NETSCAPE 4.0</b><br>800 &times; 600<br>256 COLORS<br>SOUND ON !!
        </div>

        <div class="widget">
          <h4>Vote!!</h4>
          <p style="margin:0">Do you like my<br>web site ?</p>
          <p style="margin:4px 0 0"><a href="mailto:kalakasanyt@gmail.com?subject=YES">YES</a> &middot;
          <a href="mailto:kalakasanyt@gmail.com?subject=ALSO%20YES">also YES</a></p>
        </div>
      </div>`;
}

function footer() {
  const links = CONTACT.map(
    ([label, href]) =>
      `<a href="${esc(href)}"${href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(label)}</a>`
  ).join("\n      ");
  return `    <footer class="footer">
      <p class="footer-mark">&#9733; Gzowo Labs &#9733; ${OWNER} &#9733;</p>
      <nav aria-label="Contact">
      ${links}
      </nav>
      <p style="margin:6px 0 0">&copy; 2025&ndash;2026 Gzowo Labs. This page is best experienced with the sound turned ON.<br>
      <span class="blink">Thank you for visiting !!!</span> ~*~*~ Please come back soon ~*~*~</p>
    </footer>`;
}

function scripts() {
  // The agentation module no-ops off localhost, so shipping it costs the live
  // site one 304 and nothing else.
  return `  <script src="/assets/site.js?v=90" defer></script>
  <script src="/assets/wall.js?v=90" defer></script>
  <script type="module" src="/assets/agentation.js"></script>`;
}

/* ---- home ---- */

function card(project, index) {
  const status = STATUS_LABEL[project.status] || project.status;
  // A project with no screenshot yet gets a grey placeholder plate rather than
  // an empty box — it reads as "not photographed", not as "broken image".
  const shot = project.image
    ? `<img src="/${esc(project.image)}" alt="${esc(project.name)}" width="150" height="113" loading="${index < 6 ? "eager" : "lazy"}" decoding="async">`
    : `<span class="no-shot"><span>${esc(project.name)}</span><span>no shot yet</span></span>`;
  // The badge is for the exception. Most builds are live, so a "Live" sticker on
  // every card would be pure noise; status still shows in the meta line.
  const flag =
    project.status === "live"
      ? ""
      : `<span class="status" data-status="${esc(project.status)}">${esc(status)}</span>`;

  return `        <a class="card" href="/p/${esc(project.slug)}/" data-status="${esc(status)}">
          <span class="card-shot">
            ${shot}
            ${flag}
          </span>
          <span class="card-copy">
            <h3>${esc(project.name)}</h3>
            <p>${esc(project.blurb)}</p>
            <span class="card-meta"><span>${esc(project.category)}</span><span>${esc(status)}</span><span>${esc(project.year)}</span></span>
            <span class="click-here blink">&gt; CLICK HERE !!! &lt;</span>
          </span>
        </a>`;
}

function home() {
  return `${head({
    title: "Gzowo Labs — Jerzy Sukiennik's Home Page!!!",
    description: TAGLINE,
    url: SITE + "/",
    image: `${SITE}/${projects[0]?.image || "assets/og.png"}`,
  })}
<body>
  <a class="skip-link" href="#feed">Skip to the games</a>

  <div class="frame">
${banner()}
${navstrip(true)}

    <div class="layout">
${sidebarLeft()}

      <div class="middle">
        <div class="welcome">
          <b>Welcome to my web site !!!</b> My name is ${OWNER}, I am from Warsaw and I make
          games, web apps and AI models. Everything on this page runs in your browser, so there is
          <b>nothing to install</b> and it is all <b>100&#37; FREE</b>.
          <span class="new blink">NEW!</span> ${projects.length} projects listed below &mdash;
          scroll down and click any of them to play. Have fun !!! ~*~*~
        </div>

        <hr class="hr90">

        <h2 class="sect-title rainbow-text" id="feed">My Games &amp; Projects</h2>
        <p class="feed-note">${projects.length} builds, sorted the way I like them. Click a title to open its page.</p>

        <div class="grid">
${projects.map(card).join("\n")}
        </div>

        <hr class="hr90">
        <p style="font-family:'Comic Sans MS',cursive;text-align:center;font-size:14px">
          That is everything for now. <span class="blink" style="color:#ff0000">Come back soon !!!</span>
        </p>
      </div>

${sidebarRight()}
    </div>

${footer()}
  </div>

${scripts()}
</body>
</html>
`;
}

/* ---- project page ---- */

function projectPage(project) {
  const status = STATUS_LABEL[project.status] || project.status;
  const body = (project.body || []).map((p) => `            <p>${esc(p)}</p>`).join("\n");
  const play = project.url
    ? `<a class="btn-play" href="${esc(project.url)}" target="_blank" rel="noopener">&#9658; PLAY ${esc(project.name)} NOW !!</a>`
    : `<span class="btn-play" aria-disabled="true">NOT PUBLIC YET</span>`;
  const repo = project.repo
    ? `<a class="btn" href="${esc(project.repo)}" target="_blank" rel="noopener">Source code &#8599;</a>`
    : "";

  const facts = [
    ["Status", status],
    ["Kind", project.category],
    ["Year", project.year],
    ["Built with", (project.stack || []).join(", ")],
  ].filter(([, value]) => value);

  return `${head({
    title: `${project.name} — Gzowo Labs`,
    description: project.blurb,
    url: `${SITE}/p/${project.slug}/`,
    image: `${SITE}/${project.image}`,
  })}
<body>
  <div class="frame">
    <div class="topbar marquee"><span>*~*~* YOU ARE NOW LOOKING AT: ${esc(project.name.toUpperCase())} *~*~* IT IS FREE AND IT RUNS IN YOUR BROWSER *~*~* TELL YOUR FRIENDS !!! *~*~*</span></div>

    <header class="banner">
      <p class="eyebrow">Gzowo Labs presents</p>
      <h1 class="wordart"><span class="rainbow-text">${esc(project.name)}</span></h1>
      <p class="tagline"><span class="blink">&gt;&gt;&gt;</span> ${esc(project.category)} &middot; ${esc(status)} &middot; ${esc(project.year)} <span class="blink">&lt;&lt;&lt;</span></p>
    </header>
${navstrip(false)}

    <div class="layout">
${sidebarLeft()}

      <div class="middle project">
        <p><a class="back" href="/">&#9664; back to Gzowo Labs</a></p>

        <p class="project-lead">${esc(project.blurb)}</p>

        <div class="actions">
          ${play}
          ${repo}
        </div>

        ${project.image
          ? `<figure class="project-shot"><img src="/${esc(project.image)}" alt="${esc(project.name)}" width="1200" height="900"></figure>`
          : `<figure class="project-shot is-empty"><span>${esc(project.name)}</span><span>no shot yet</span></figure>`}

        <hr class="hr90">

        <div class="project-body">
          <div>
${body}
          </div>
          <aside class="facts">
            <dl>
${facts.map(([k, v]) => `              <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("\n")}
            </dl>
          </aside>
        </div>
      </div>

${sidebarRight()}
    </div>

${footer()}
  </div>

${scripts()}
</body>
</html>
`;
}

/* ---- write ---- */

// Project pages live under /p/ and nowhere else. A page at /<slug>/ would be
// hijacked by GitHub: a repo of the same name with its own Pages site makes the
// user site 301 away to that repo's domain, which silently ate eleven pages once.
const pagesDir = join(root, "p");
rmSync(pagesDir, { recursive: true, force: true });

writeFileSync(join(root, "index.html"), home());
for (const project of projects) {
  mkdirSync(join(pagesDir, project.slug), { recursive: true });
  writeFileSync(join(pagesDir, project.slug, "index.html"), projectPage(project));
}

console.log(`Built index.html and ${projects.length} project pages.`);
