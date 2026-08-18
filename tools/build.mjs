/* Publish step: data/projects.json -> index.html + one real page per project.
   Node only, no dependencies, no bundler. The CMS app calls this before it pushes.

   Usage: node tools/build.mjs
*/

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
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

// Marks the document script-capable before first paint. Pages without a curtain
// start their entrance immediately; the home page waits for the sequence, with a
// timeout so a failed script can never leave the hero blank.
const probe = (curtain) =>
  curtain
    ? `<script>document.documentElement.classList.add("js");setTimeout(function(){document.documentElement.classList.add("is-ready")},2500)</script>`
    : `<script>document.documentElement.classList.add("js","is-ready")</script>`;

const esc = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const data = JSON.parse(readFileSync(join(root, "data/projects.json"), "utf8"));
const projects = data.projects.filter((p) => !p.hidden);

/* ---- shared chrome ---- */

function head({ title, description, url, image, curtain = false }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#d6c39b">
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
<link href="https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@75..125,800;75..125,900&family=Fragment+Mono&family=IBM+Plex+Sans+Condensed:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=3">
${probe(curtain)}
</head>`;
}

function footer() {
  const links = CONTACT.map(
    ([label, href]) =>
      `<a href="${esc(href)}"${href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(label)}</a>`
  ).join("\n      ");
  return `  <footer class="footer">
    <p class="footer-mark">Gzowo Labs — ${OWNER}</p>
    <nav aria-label="Contact">
      ${links}
    </nav>
  </footer>`;
}

function scripts() {
  return `  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js" defer></script>
  <script src="/assets/field.js" defer></script>
  <script src="/assets/site.js" defer></script>`;
}

/* ---- home ---- */

function card(project, index) {
  const status = STATUS_LABEL[project.status] || project.status;
  const shot = project.image
    ? `<img src="/${esc(project.image)}" alt="${esc(project.name)}" width="800" height="600" loading="${index < 6 ? "eager" : "lazy"}" decoding="async">`
    : "";
  // The badge is for the exception. Twelve of thirteen builds being live makes a
  // "Live" chip on every card pure noise, so status lives in the meta line and
  // only an unfinished or retired build gets flagged over the image.
  const flag =
    project.status === "live"
      ? ""
      : `<span class="status" data-status="${esc(project.status)}">${esc(status)}</span>`;

  return `      <a class="card" href="/${esc(project.slug)}/" data-status="${esc(status)}">
        <span class="card-shot">
          ${shot}
          ${flag}
        </span>
        <span class="card-copy">
          <h3>${esc(project.name)}</h3>
          <p>${esc(project.blurb)}</p>
          <span class="card-meta"><span>${esc(project.category)} · ${esc(status)}</span><span>${esc(project.year)}</span></span>
        </span>
      </a>`;
}

function home() {
  const count = String(projects.length).padStart(2, "0");
  return `${head({
    title: "Gzowo Labs",
    description: TAGLINE,
    url: SITE + "/",
    image: `${SITE}/${projects[0]?.image || "assets/og.png"}`,
    curtain: true,
  })}
<body>
  <a class="skip-link" href="#feed">Skip to the shelf</a>
  <canvas id="field" aria-hidden="true"></canvas>

  <div class="loader" role="status">
    <p>Gzowo Labs — assembly</p>
    <div class="loader-bar"><div class="loader-fill"></div></div>
    <p class="loader-count">000</p>
  </div>

  <div class="page">
    <header class="hero">
      <div class="hero-copy">
        <p class="eyebrow hero-enter">${OWNER} — Warsaw</p>
        <h1>
          <span class="word"><i>Gzowo</i></span>
          <span class="word"><i>Labs</i></span>
        </h1>
        <p class="tagline hero-enter">${TAGLINE}</p>
        <a class="scroll-cue hero-enter" href="#feed">Open the shelf <span aria-hidden="true">↓</span></a>
      </div>

      <aside class="rail hero-enter" aria-hidden="true">
        <div class="rail-head"><span>Rail</span><span class="rail-count"><span data-rail-index>01</span>/${count}</span></div>
        <div class="rail-track"><span class="rail-payload">GL</span></div>
        <div class="rail-foot"><span>Status</span><span data-rail-status>Live</span></div>
      </aside>
    </header>

    <main class="feed" id="feed">
      <section class="feed-head">
        <div>
          <p class="eyebrow">The shelf — ${count} builds</p>
          <h2>Open anything</h2>
        </div>
        <p class="feed-note">Games, web apps and experiments. Every one of them runs in a browser, so there is nothing to install.</p>
      </section>

      <div class="grid">
${projects.map(card).join("\n")}
      </div>
    </main>

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
  const body = (project.body || []).map((p) => `        <p>${esc(p)}</p>`).join("\n");
  const play = project.url
    ? `<a class="btn btn-play" href="${esc(project.url)}" target="_blank" rel="noopener">Play ${esc(project.name)} <span aria-hidden="true">↗</span></a>`
    : `<span class="btn btn-play" aria-disabled="true">Not public yet</span>`;
  const repo = project.repo
    ? `<a class="btn" href="${esc(project.repo)}" target="_blank" rel="noopener">Source <span aria-hidden="true">↗</span></a>`
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
    url: `${SITE}/${project.slug}/`,
    image: `${SITE}/${project.image}`,
  })}
<body>
  <canvas id="field" aria-hidden="true"></canvas>

  <div class="page">
    <main class="project">
      <a class="back" href="/"><span aria-hidden="true">←</span> Gzowo Labs</a>

      <div>
        <h1>${esc(project.name)}</h1>
        <p class="project-lead">${esc(project.blurb)}</p>
        <div class="actions">
          ${play}
          ${repo}
        </div>
      </div>

      ${project.image ? `<figure class="project-shot"><img src="/${esc(project.image)}" alt="${esc(project.name)}" width="1200" height="900"></figure>` : ""}

      <div class="project-body">
        <div>
${body}
        </div>
        <aside class="facts">
          <dl>
${facts.map(([k, v]) => `            <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("\n")}
          </dl>
        </aside>
      </div>
    </main>

${footer()}
  </div>

${scripts()}
</body>
</html>
`;
}

/* ---- write ---- */

// Clear the pages from the previous publish so a deleted project leaves no orphan.
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const kept = ["assets", "data", "project-images", "tools", ".git", "node_modules"];
  if (kept.includes(entry.name)) continue;
  if (existsSync(join(root, entry.name, "index.html"))) {
    rmSync(join(root, entry.name), { recursive: true, force: true });
  }
}

writeFileSync(join(root, "index.html"), home());
for (const project of projects) {
  mkdirSync(join(root, project.slug), { recursive: true });
  writeFileSync(join(root, project.slug, "index.html"), projectPage(project));
}

console.log(`Built index.html and ${projects.length} project pages.`);
