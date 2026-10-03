/* Build step: data/projects.json + data/site.json -> index.html and one page per project.
   Node only, no dependencies, no bundler. Run through tools/publish.sh, never by hand
   before a push, because the build ends with the em-dash lint and refuses to finish
   when a dash is anywhere on the site.

   Look: deliberate 1998 GeoCities pastiche. Bevels, blink, marquees, WordArt. Every
   "GIF" except the fire title is CSS, so the page downloads almost nothing.

   Usage: node tools/build.mjs
*/

import { writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { root, site as loadSite, loadProjects, checkProject, lintRepo, SECTIONS, sectionOf, rocketsFile, readJson } from "./lib.mjs";

const S = loadSite();
const SITE = S.url;
const STATUS_LABEL = { live: "Live", building: "Building", archive: "Archive" };

const all = loadProjects().projects;
const projects = all.filter((p) => !p.hidden);
const R = readJson(rocketsFile);
const inSection = (key) => projects.filter((p) => sectionOf(p) === key);
const SEC = S.sections;

/* Broken entries stop the build. Gaps in copy only warn, so an old entry never blocks a
   publish, but `tools/site.mjs add` will not create a new entry with gaps. */
let broken = 0;
for (const p of projects) {
  const r = checkProject(p);
  if (r.errors.length) { broken++; console.error(`BAD ENTRY ${p.slug}: ${r.errors.join("; ")}`); }
  if (r.need.length) console.warn(`gap in ${p.slug}: missing ${r.need.join("; ")}`);
}
if (broken) process.exit(1);

/* A link typed as "bureau.gzowo.fun" is a RELATIVE path to a browser, so it would
   resolve against the project page. Anything not already absolute gets https://. */
const extern = (value = "") => {
  const v = String(value).trim();
  if (!v) return "";
  if (/^(https?:|mailto:|\/\/|\/|#)/i.test(v)) return v;
  return "https://" + v;
};

const esc = (value = "") =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Copy from site.json: {token} placeholders, markup allowed where the field says so. */
const fill = (text, vars = {}) =>
  String(text).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
const base = { owner: S.owner, count: projects.length };

/* Cache-buster derived from the file itself, so nobody edits a version by hand. */
const ver = (file) => createHash("md5").update(readFileSync(join(root, file))).digest("hex").slice(0, 8);

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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=${ver("assets/site.css")}">
</head>`;
}

function navstrip(current = "") {
  const on = (key) => (key === current ? ' aria-current="page" data-current' : "");
  return `    <nav class="navstrip" aria-label="Main">
      <a class="btn90" href="/"${on("home")}>HOME</a>
${SECTIONS.map((k) => `      <a class="btn90" href="/${k}/"${on(k)}>${esc(SEC[k].nav)}</a>`).join("\n")}
      <a class="btn90" href="#reviews" data-rev-open>REVIEWS &#9733;</a>
      <a class="btn90" href="mailto:${esc(S.email)}">E-MAIL ME!!</a>
    </nav>`;
}

function banner() {
  return `    <div class="topbar marquee"><span>${esc(fill(S.marqueeHome, base))}</span></div>

    <header class="banner">
      <p class="eyebrow">${esc(fill(S.eyebrow, base))}</p>
      <h1 class="wordart is-fire"><span class="spinner" aria-hidden="true"></span><img class="fire-gif" src="/assets/gzowo-labs-fire.gif" alt="Gzowo Labs" width="515" height="93"><span class="spinner" aria-hidden="true"></span></h1>
      <p class="tagline"><span class="blink">&gt;&gt;&gt;</span> ${esc(S.tagline)} <span class="blink">&lt;&lt;&lt;</span></p>
    </header>`;
}

function sidebarLeft() {
  return `      <div class="col-left">
        <div class="widget">
          <h4>Navigate!!</h4>
          <ul class="menu">
            <li><a href="/">Home Page</a></li>
${SECTIONS.map((k) => `            <li><a href="/${k}/">${esc(SEC[k].label)}</a></li>`).join("\n")}
            <li><a href="${esc(S.github)}" target="_blank" rel="noopener">My Code</a></li>
            <li><a href="mailto:${esc(S.email)}">Guestbook</a></li>
            <li><a href="mailto:${esc(S.email)}">E-Mail Me</a></li>
          </ul>
        </div>

        <div class="widget">
          <h4>Visitors</h4>
          <div class="counter" data-counter aria-label="visitor counter"></div>
          <p style="margin:6px 0 0">You are visitor number<br><b>that many</b>!</p>
          <a class="wall-hint" href="#" data-wall-hint title="up up down down left right left right B A">
            <i>${S.wallHint}</i>
          </a>
        </div>

        <div class="widget">
          <h4>Now Playing</h4>
          <p style="margin:0">${esc(S.nowPlaying)}</p>
          <button class="btn90 midi" type="button" data-midi>&#9834; PLAY MIDI &#9834;</button>
        </div>

        <div class="widget award">
          &#9733;&#9733;&#9733;<br>${S.award}<br>&#9733;&#9733;&#9733;<br><small>${esc(S.awardSmall)}</small>
        </div>
      </div>`;
}

function sidebarRight() {
  const newest = projects[0];
  return `      <div class="col-right">
        <div class="widget">
          <h4>Today Is</h4>
          <p style="margin:0" data-today>a very fine day</p>
        </div>

        <div class="widget">
          <h4>New!!!</h4>
          <p style="margin:0"><span class="blink" style="color:#ff0000;font-weight:bold">NEW!</span> ${esc(newest?.name || "")} is up!<br>
          <a href="/p/${esc(newest?.slug || "")}/">click here !!~*</a></p>
        </div>

        <div class="construction">
          <span>&#9888; ${esc(S.construction)} &#9888;</span>
        </div>

        <div class="widget webring" style="margin-top:10px">
          <h4>Web Ring</h4>
          <p style="margin:0">${esc(S.webring)}</p>
          <p style="margin:4px 0 0">
            <a href="/rockets/">&laquo; prev</a> |
            <a href="/">random</a> |
            <a href="${esc(S.github)}" target="_blank" rel="noopener">next &raquo;</a>
          </p>
        </div>

        <div class="widget stamp">
          ${S.stamp}
        </div>

        <div class="widget">
          <h4>Vote!!</h4>
          <p style="margin:0">${S.vote}</p>
          <p style="margin:4px 0 0"><a href="mailto:${esc(S.email)}?subject=YES">YES</a> &middot;
          <a href="mailto:${esc(S.email)}?subject=ALSO%20YES">also YES</a></p>
        </div>

        <div class="widget reviews" data-rev id="reviews">
          <h4>Reviews!!</h4>
          <button class="rev-close btn90" type="button" data-rev-close>&times; CLOSE</button>
          <p class="rev-score" data-rev-score>loading...</p>

          <form class="rev-form" data-rev-form>
            <div class="rev-stars" data-rev-stars role="group" aria-label="Your rating">
              <button type="button" aria-pressed="false" aria-label="1 star">&#9733;</button>
              <button type="button" aria-pressed="false" aria-label="2 stars">&#9733;</button>
              <button type="button" aria-pressed="false" aria-label="3 stars">&#9733;</button>
              <button type="button" aria-pressed="false" aria-label="4 stars">&#9733;</button>
              <button type="button" aria-pressed="false" aria-label="5 stars">&#9733;</button>
            </div>
            <input type="text" name="n" maxlength="30" placeholder="your name (or stay mysterious)">
            <textarea name="m" maxlength="400" rows="3" placeholder="Tell the world what you think !!! (my mum reads this)"></textarea>
            <button class="btn90 rev-post" type="submit">POST IT !!!</button>
            <p class="rev-note" data-rev-note></p>
          </form>

          <div class="rev-list" data-rev-list></div>
        </div>
      </div>`;
}

function footer() {
  const links = S.contact
    .map(([label, href]) => `<a href="${esc(href)}"${href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(label)}</a>`)
    .join("\n      ");
  return `    <footer class="footer">
      <p class="footer-mark">&#9733; Gzowo Labs &#9733; ${esc(S.owner)} &#9733;</p>
      <nav aria-label="Contact">
      ${links}
      </nav>
      <p style="margin:6px 0 0">&copy; ${S.copyrightYears} Gzowo Labs. ${esc(S.footerLine)}<br>
      <span class="blink">${esc(S.footerBlink)}</span> ${esc(S.footerTail)}</p>
    </footer>`;
}

function scripts() {
  // The agentation module no-ops off localhost, so shipping it costs the live site one 304.
  return `  <script src="/assets/site.js?v=${ver("assets/site.js")}" defer></script>
  <script src="/assets/wall.js?v=${ver("assets/wall.js")}" defer></script>
  <script src="/assets/reviews.js?v=${ver("assets/reviews.js")}" defer></script>
  <script type="module" src="/assets/agentation.js"></script>`;
}

/* ---- home ---- */

function card(project, index) {
  const status = STATUS_LABEL[project.status] || project.status;
  // No screenshot yet: a plate that reads as "not photographed", not as a broken image.
  const shot = project.image
    ? `<img src="/${esc(project.image)}" alt="${esc(project.name)}" width="150" height="113" loading="${index < 6 ? "eager" : "lazy"}" decoding="async">`
    : `<span class="no-shot"><span>${esc(project.name)}</span><span>no shot yet</span></span>`;
  // The badge is for the exception. A "Live" sticker on every card would be noise.
  const flag =
    project.status === "live" ? "" : `<span class="status" data-status="${esc(project.status)}">${esc(status)}</span>`;

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

const ICON = {
  rockets: `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><path d="M32 4c9 8 13 20 11 34H21C19 24 23 12 32 4z" fill="#fff" stroke="#000" stroke-width="3"/><circle cx="32" cy="22" r="5" fill="#00ccff" stroke="#000" stroke-width="3"/><path d="M21 30L9 46l12-3zM43 30l12 16-12-3z" fill="#ff0000" stroke="#000" stroke-width="3" stroke-linejoin="round"/><path d="M26 42h12l-6 16z" fill="#ffcc00" stroke="#000" stroke-width="3" stroke-linejoin="round"/></svg>`,
  printing: `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><path d="M32 8l22 12v24L32 56 10 44V20z" fill="#00ffff" stroke="#000" stroke-width="3" stroke-linejoin="round"/><path d="M10 20l22 12 22-12M32 32v24" fill="none" stroke="#000" stroke-width="3" stroke-linejoin="round"/><path d="M32 32L10 20l22-12 22 12z" fill="#fff" fill-opacity=".55"/></svg>`,
  games: `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><path d="M14 22h36c6 0 10 8 10 18 0 6-3 8-7 6l-8-6H19l-8 6c-4 2-7 0-7-6 0-10 4-18 10-18z" fill="#00ff00" stroke="#000" stroke-width="3" stroke-linejoin="round"/><path d="M20 28v10M15 33h10" stroke="#000" stroke-width="4"/><circle cx="42" cy="30" r="3" fill="#f00" stroke="#000" stroke-width="2"/><circle cx="49" cy="36" r="3" fill="#ff0" stroke="#000" stroke-width="2"/></svg>`,
  software: `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><rect x="16" y="16" width="32" height="32" fill="#ff00ff" stroke="#000" stroke-width="3"/><rect x="24" y="24" width="16" height="16" fill="#fff" stroke="#000" stroke-width="3"/><path d="M24 8v8M32 8v8M40 8v8M24 48v8M32 48v8M40 48v8M8 24h8M8 32h8M8 40h8M48 24h8M48 32h8M48 40h8" stroke="#000" stroke-width="3"/></svg>`,
};

function doorCount(key) {
  if (key === "rockets") return `${R.fleet.length} rockets`;
  const n = inSection(key).length;
  return `${n} ${n === 1 ? "thing" : "things"}`;
}

function door(key, index) {
  const c = SEC[key];
  return `        <a class="door door-${esc(c.color)}" href="/${key}/">
          <span class="door-icon">${ICON[key]}</span>
          <span class="door-copy">
            <span class="door-name">${esc(c.door)}</span>
            <span class="door-tag">${esc(c.tag)}</span>
            <span class="door-count">${esc(doorCount(key))}</span>
          </span>
        </a>`;
}

function home() {
  const recent = projects.slice(0, 5);
  return `${head({
    title: S.homeTitle,
    description: S.tagline,
    url: SITE + "/",
    image: `${SITE}/${projects[0]?.image || "assets/og.png"}`,
  })}
<body>
  <a class="skip-link" href="#doors">Skip to the doors</a>

  <div class="frame">
${banner()}
${navstrip("home")}

    <div class="layout">
${sidebarLeft()}

      <div class="middle">
        <div class="welcome">
          ${fill(S.welcome, base)}
        </div>

        <hr class="hr90">

        <h2 class="sect-title rainbow-text" id="doors">${esc(S.doorsTitle)}</h2>
        <p class="feed-note">${esc(S.doorsNote)}</p>

        <div class="doors">
${SECTIONS.map(door).join("\n")}
        </div>

        <hr class="hr90">

        <h2 class="sect-title rainbow-text" id="feed">${esc(S.recentTitle)}</h2>
        <p class="feed-note">${esc(S.recentNote)}</p>

        <div class="grid">
${recent.map(card).join("\n")}
        </div>

        <p class="more-row"><a class="btn90" href="/games/">ALL GAMES</a> <a class="btn90" href="/software/">ALL SOFTWARE &amp; AI</a> <a class="btn90" href="/printing/">ALL 3D PRINTING</a></p>

        <hr class="hr90">
        <p style="font-family:'Comic Sans MS',cursive;text-align:center;font-size:14px">
          ${esc(S.feedEnd)} <span class="blink" style="color:#ff0000">${esc(S.feedEndBlink)}</span>
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

/* ---- section pages ---- */

function sectionShell({ key, title, description, image, content }) {
  const c = SEC[key];
  return `${head({ title: `${title} | ${S.titleSuffix}`, description, url: `${SITE}/${key}/`, image })}
<body>
  <div class="frame">
    <div class="topbar marquee"><span>${esc(fill(S.marqueeProject, { name: c.label.toUpperCase(), how: c.tag.toUpperCase() }))}</span></div>

    <header class="banner">
      <p class="eyebrow">Gzowo Labs presents</p>
      <h1 class="wordart"><span class="rainbow-text">${esc(title)}</span></h1>
      <p class="tagline"><span class="blink">&gt;&gt;&gt;</span> ${esc(c.tag)} <span class="blink">&lt;&lt;&lt;</span></p>
    </header>
${navstrip(key)}

    <div class="layout">
${sidebarLeft()}

      <div class="middle">
        <p><a class="back" href="/">&#9664; back to Gzowo Labs</a></p>
${content}
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

function sectionPage(key) {
  const c = SEC[key];
  const list = inSection(key);
  const extra = key === "printing" ? `\n        <div class="welcome">${esc(S.industriesNote)}</div>\n` : "";
  const content = `${extra}
        <p class="feed-note">${esc(c.note)} ${list.length} listed.</p>

        <div class="grid">
${list.map(card).join("\n")}
        </div>

        <hr class="hr90">
        <p class="more-row"><a class="btn90" href="/">&#9664; ALL THE DOORS</a></p>`;
  return sectionShell({ key, title: c.title, description: c.note, image: `${SITE}/${list[0]?.image || "assets/og.png"}`, content });
}

/* ---- rockets ---- */

const cdnImg = (url, w) => url.replace("/image/upload/", `/image/upload/w_${w},q_auto,f_auto/`);
const cdnVideo = (url) => url.replace("/video/upload/", "/video/upload/f_mp4,q_auto,w_720/").replace(/\.(mov|mp4)$/i, "") + ".mp4";
const cdnPoster = (url) => url.replace("/video/upload/", "/video/upload/so_1,w_720,f_jpg/").replace(/\.(mov|mp4)$/i, "") + ".jpg";

function rocketBlock(r) {
  const state = r.state === "planned" ? "PLANNED" : "FLOWN";
  const photos = r.photos
    .map(([u, cap]) => `            <figure><img src="${esc(cdnImg(u, 640))}" alt="${esc(cap)}" loading="lazy" decoding="async"><figcaption>${esc(cap)}</figcaption></figure>`)
    .join("\n");
  const videos = r.videos
    .map(([u, cap]) => `            <figure><video controls preload="none" playsinline poster="${esc(cdnPoster(u))}" src="${esc(cdnVideo(u))}"></video><figcaption>${esc(cap)}</figcaption></figure>`)
    .join("\n");
  const media = photos || videos ? `\n          <div class="rocket-media">\n${photos}${photos && videos ? "\n" : ""}${videos}\n          </div>` : "";
  return `        <article class="rocket" id="${esc(r.id)}">
          <img class="rocket-pic" src="${esc(cdnImg(r.image, 420))}" alt="${esc(r.name)}" width="210" height="210" loading="lazy" decoding="async">
          <div class="rocket-info">
            <h3>${esc(r.name)} <span class="rocket-state" data-state="${esc(r.state)}">${state}</span></h3>
            <p class="rocket-line">${esc(r.line)}</p>
            <p>${esc(r.blurb)}</p>
            <dl class="rocket-spec">
${r.spec.map(([k, v]) => `              <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("\n")}
            </dl>
          </div>${media}
        </article>`;
}

function fmtDate(iso) {
  if (!iso) return "date lost to time";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function rocketsPage() {
  const kit = inSection("rockets");
  const content = `
        <div class="welcome">${esc(R.lead)}</div>

        <aside class="stats">
${R.facts.map(([k, v]) => `          <div><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join("\n")}
        </aside>

        <h2 class="sect-title rainbow-text" id="fleet">The Fleet</h2>
        <p class="feed-note">${R.fleet.length} rockets, newest series last. Videos load when you press play.</p>
${R.fleet.map(rocketBlock).join("\n")}

        <hr class="hr90">
        <h2 class="sect-title rainbow-text" id="missions">Mission Log</h2>
        <table class="log">
          <thead><tr><th>Date</th><th>Mission</th><th>Result</th></tr></thead>
          <tbody>
${R.missions.map((m) => `            <tr><td>${esc(fmtDate(m.date))}</td><td>${esc(m.name)}<br><small>${esc(m.note)}</small></td><td>${m.result === "success" ? "SUCCESS" : esc(m.result.toUpperCase())}</td></tr>`).join("\n")}
          </tbody>
        </table>

        <h2 class="sect-title rainbow-text" id="crew">Crew</h2>
        <ul class="crew">
${R.team.map(([n, role]) => `          <li><b>${esc(n)}</b> <span>${esc(role)}</span></li>`).join("\n")}
        </ul>
${kit.length ? `\n        <h2 class="sect-title rainbow-text">Brand Stuff</h2>\n        <div class="grid">\n${kit.map(card).join("\n")}\n        </div>\n` : ""}
        <hr class="hr90">
        <p class="contact-note">Questions, launch invitations, rocket motors you do not need any more: <a href="mailto:kontakt@gspaerospace.pl">kontakt@gspaerospace.pl</a>. The old gspaerospace.pl lives here now.</p>
        <p class="more-row"><a class="btn90" href="/">&#9664; ALL THE DOORS</a></p>`;
  return sectionShell({ key: "rockets", title: SEC.rockets.title, description: R.lead, image: `${R.fleet[0].image}`, content });
}

/* ---- project page ---- */

function projectPage(project) {
  const status = STATUS_LABEL[project.status] || project.status;
  const body = (project.body || []).map((p) => `            <p>${esc(p)}</p>`).join("\n");
  // A downloadable game swaps the browser PLAY link for a direct file download.
  const dl = project.download;
  const play = dl
    ? `<a class="btn-play" href="${esc(dl.url)}" download>&#11015; DOWNLOAD ${esc(project.name)} FOR ${esc((dl.platform || "Windows").toUpperCase())} !!</a>
          <span class="dl-note">${esc([dl.version, dl.size, dl.note].filter(Boolean).join(" · "))}</span>`
    : project.url
    ? `<a class="btn-play" href="${esc(extern(project.url))}" target="_blank" rel="noopener">&#9658; PLAY ${esc(project.name)} NOW !!</a>`
    : `<span class="btn-play" aria-disabled="true">NOT PUBLIC YET</span>`;
  const repo = project.repo
    ? `<a class="btn" href="${esc(extern(project.repo))}" target="_blank" rel="noopener">Source code &#8599;</a>`
    : "";

  const facts = [
    ["Status", status],
    ["Kind", project.category],
    ["Year", project.year],
    ["Built with", (project.stack || []).join(", ")],
  ].filter(([, value]) => value);

  const how = project.download ? S.marqueeHowDownload : S.marqueeHowBrowser;

  return `${head({
    title: `${project.name} | ${S.titleSuffix}`,
    description: project.blurb,
    url: `${SITE}/p/${project.slug}/`,
    image: `${SITE}/${project.image || "assets/og.png"}`,
  })}
<body>
  <div class="frame">
    <div class="topbar marquee"><span>${esc(fill(S.marqueeProject, { name: project.name.toUpperCase(), how }))}</span></div>

    <header class="banner">
      <p class="eyebrow">Gzowo Labs presents</p>
      <h1 class="wordart"><span class="rainbow-text">${esc(project.name)}</span></h1>
      <p class="tagline"><span class="blink">&gt;&gt;&gt;</span> ${esc(project.category)} &middot; ${esc(status)} &middot; ${esc(project.year)} <span class="blink">&lt;&lt;&lt;</span></p>
    </header>
${navstrip(sectionOf(project))}

    <div class="layout">
${sidebarLeft()}

      <div class="middle project">
        <p><a class="back" href="/${sectionOf(project)}/">&#9664; back to ${esc(SEC[sectionOf(project)].label)}</a></p>

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

// Project pages live under /p/ and nowhere else. A page at /<slug>/ would be hijacked
// by GitHub: a repo of the same name with its own Pages site makes the user site 301
// away to that repo's domain, which silently ate eleven pages once.
const pagesDir = join(root, "p");
rmSync(pagesDir, { recursive: true, force: true });
for (const key of SECTIONS) rmSync(join(root, key), { recursive: true, force: true });

writeFileSync(join(root, "index.html"), home());
for (const key of SECTIONS) {
  mkdirSync(join(root, key), { recursive: true });
  writeFileSync(join(root, key, "index.html"), key === "rockets" ? rocketsPage() : sectionPage(key));
}
for (const project of projects) {
  mkdirSync(join(pagesDir, project.slug), { recursive: true });
  writeFileSync(join(pagesDir, project.slug, "index.html"), projectPage(project));
}

console.log(`Built index.html, ${SECTIONS.length} section pages and ${projects.length} project pages.`);

const dashes = lintRepo();
if (dashes.length) {
  console.error(`\nLINT FAILED: ${dashes.length} em dash(es) on the site. Fix the text, then build again:`);
  console.error(dashes.slice(0, 40).join("\n"));
  process.exit(1);
}
console.log("Lint ok: no em dashes.");
