/* Gzowo Labs Win98 views: pure functions that turn site data into window HTML, shared by tools/build.mjs and the browser. */

export const STATUS = { live: "Live", building: "Building", archive: "Archive", flown: "Flown", planned: "Planned" };
const BY_CATEGORY = { Game: "games", "Web app": "software", Experiment: "software", "AI model": "software", Hardware: "printing" };
export const sectionOf = (p) => p.section || BY_CATEGORY[p.category] || "software";
export const SICON = { rockets: "rocket", printing: "printer", games: "pad", software: "chip" };

export const esc = (v = "") =>
  String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const extern = (v = "") => {
  const s = String(v).trim();
  if (!s) return "";
  if (/^(https?:|mailto:|\/\/|\/|#)/i.test(s)) return s;
  return "https://" + s;
};

export const inSec = (ctx, key) => ctx.projects.filter((p) => sectionOf(p) === key);
export const countLabel = (ctx, key) => {
  if (key === "rockets") return `${ctx.rockets.fleet.length} rockets`;
  const n = inSec(ctx, key).length;
  return `${n} ${n === 1 ? "thing" : "things"}`;
};

const cdnImg = (url, w) => url.replace("/image/upload/", `/image/upload/w_${w},q_auto,f_auto/`);
const cdnVideo = (url) => url.replace("/video/upload/", "/video/upload/f_mp4,q_auto,w_720/").replace(/\.(mov|mp4)$/i, "") + ".mp4";
const cdnPoster = (url) => url.replace("/video/upload/", "/video/upload/so_1,w_720,f_jpg/").replace(/\.(mov|mp4)$/i, "") + ".jpg";
const PLAY = "&#9654;&#xFE0E;";

const ICONS = {
  rocket: [".......kk.......", "......kaak......", ".....kaaaak.....", ".....kwwwwk.....", ".....kwbbwk.....", ".....kwbbwk.....", ".....kwwwwk.....", ".....kwwwwk.....",
    "....kkwwwwkk....", "...kakwwwwkak...", "..kaakwwwwkaak..", "..kaakkkkkkaak..", "..kkk.kcck.kkk..", "......kcck......", ".......cc.......", "................"],
  printer: ["kkkkkkkkkkkkkkkk", "kggggggggggggggk", "kgkkkkkkkkkkkkgk", "kgk..........kgk", "kgk.kkkkkk...kgk", "kgk....kk....kgk", "kgk....kk....kgk", "kgk.....c....kgk",
    "kgk....aaa...kgk", "kgk...aaaaa..kgk", "kgk..aaaaaaa.kgk", "kgkkkkkkkkkkkkgk", "kggggggggggggggk", "kgggggggggbbgggk", "kkkkkkkkkkkkkkkk", "................"],
  pad: ["................", "................", "................", "...kkkkkkkkkk...", "..kggggggggggk..", ".kggkggggggaggk.", "kggkkkggggbgbggk", "kgggkggggggagggk",
    "kggggggggggggggk", "kgggggkkkkgggggk", "kggggk....kggggk", ".kggk......kggk.", "..kk........kk..", "................", "................", "................"],
  chip: ["................", "....k.k..k.k....", "....k.k..k.k....", "...kkkkkkkkkk...", ".kkkwwwwwwwwkkk.", "...kwaaaaaawk...", ".kkkwakkkkawkkk.", "...kwakwwkawk...",
    ".kkkwakwwkawkkk.", "...kwakkkkawk...", ".kkkwaaaaaawkkk.", "...kwwwwwwwwk...", "...kkkkkkkkkk...", "....k.k..k.k....", "....k.k..k.k....", "................"],
  book: ["................", "...kkkkkkkkkk...", "..kaaaaaaaaaak..", "..kaawwwwwwaak..", "..kaakkkkkkaak..", "..kaawwwwwwaak..", "..kaaaaaaaaaak..", "..kaaaaaaaaaak..",
    "..kaaaaaaaaaak..", "..kaaaaaaaaaak..", "..kaaaaaaaaaak..", "..kaaaaaaaaaak..", "..kkkkkkkkkkkk..", "..kwwwwwwwwwwk..", "..kkkkkkkkkkkk..", "................"],
  bricks: ["................", "................", "gggggggggggggggg", "rrrgrrrrrrrgrrrr", "rrrgrrrrrrrgrrrr", "gggggggggggggggg", "rrrrrrrgrrrrrrrg", "rrrrrrrgrrrrrrrg",
    "gggggggggggggggg", "rrrgrrrrrrrgrrrr", "rrrgrrrrrrrgrrrr", "gggggggggggggggg", "rrrrrrrgrrrrrrrg", "rrrrrrrgrrrrrrrg", "gggggggggggggggg", "................"],
  bubble: ["................", "...kkkkkkkkkk...", "..kwwwwwwwwwwk..", ".kwwwwkkkkwwwwk.", ".kwwwkwwwwkwwwk.", ".kwwwwwwwkwwwwk.", ".kwwwwwwkwwwwwk.", ".kwwwwwkwwwwwwk.",
    ".kwwwwwkwwwwwwk.", ".kwwwwwwwwwwwwk.", "..kwwwwkwwwwwk..", "...kkwwkkkkkk...", "....kwk.........", "....kk..........", "................", "................"],
  computer: ["................", ".kkkkkkkkkkkkkk.", ".kggggggggggggk.", ".kgkkkkkkkkkkgk.", ".kgkbbbbbbbbkgk.", ".kgkbcbbbbbbkgk.", ".kgkbbbbbbbbkgk.", ".kgkbbbbbbbbkgk.",
    ".kgkkkkkkkkkkgk.", ".kggggggggggggk.", ".kgggggggggaggk.", ".kkkkkkkkkkkkkk.", ".....kggggk.....", "...kkkkkkkkkk...", "...kggggggggk...", "...kkkkkkkkkk..."],
  mail: ["................", "................", "................", ".kkkkkkkkkkkkkk.", ".kkwwwwwwwwwwkk.", ".kwkwwwwwwwwkwk.", ".kwwkwwwwwwkwwk.", ".kwwwkwwwwkwwwk.",
    ".kwwwwkkkkwwwwk.", ".kwwwwwwwwwwwwk.", ".kwwwwwwwwwwwwk.", ".kwwwwwwwwwwwwk.", ".kkkkkkkkkkkkkk.", "................", "................", "................"],
  globe: ["................", ".....kkkkkk.....", "...kkbbeebbkk...", "..kbbbeeeebbbk..", ".kbbbeeeeebbbbk.", ".kbbbbeeebbeebk.", "kbbbbbeebbeeeebk", "kbbbbbbbbbeeeebk",
    "kbbeebbbbbbeebbk", "kbeeeebbbbbbbbbk", ".kbeeeebbbbbbbk.", ".kbbeeebbbbbbbk.", "..kbbeebbbbbbk..", "...kkbbbbbbkk...", ".....kkkkkk.....", "................"],
  folder: ["................", "................", ".kkkkkk.........", "kccccccckkkkkkk.", "kcccccccccccccck", "kckkkkkkkkkkkkck", "kcccccccccccccck", "kcccccccccccccck",
    "kcccccccccccccck", "kcccccccccccccck", "kcccccccccccccck", "kcccccccccccccck", "kcccccccccccccck", "kkkkkkkkkkkkkkkk", "................", "................"],
  floppy: ["kkkkkkkkkkkkkkk.", "kaakggggggkaaak.", "kaakggkkggkaaak.", "kaakggkkggkaaaak", "kaakggggggkaaaak", "kaaakkkkkkaaaaak", "kaaaaaaaaaaaaaak", "kaakkkkkkkkkkaak",
    "kaakwwwwwwwwkaak", "kaakwkkkkkkwkaak", "kaakwwwwwwwwkaak", "kaakwkkkkkwwkaak", "kaakwwwwwwwwkaak", "kkkkkkkkkkkkkkkk", "................", "................"],
  star: ["................", ".......kk.......", "......kcck......", "......kcck......", ".....kcccck.....", "kkkkkkcccckkkkkk", ".kcccccccccccck.", "..kcccccccccck..",
    "...kcccccccck...", "....kcccccck....", "...kccckkccck...", "...kcck..kcck...", "..kcck....kcck..", "..kck......kck..", "..kk........kk..", "................"],
  doc: ["..kkkkkkkkk.....", "..kwwwwwwwkk....", "..kwwwwwwwkgk...", "..kwkkkkkwkkkk..", "..kwwwwwwwwwwk..", "..kwkkkkkkkkwk..", "..kwwwwwwwwwwk..", "..kwkkkkkkkkwk..",
    "..kwwwwwwwwwwk..", "..kwkkkkkkkkwk..", "..kwwwwwwwwwwk..", "..kwkkkkkkwwwk..", "..kwwwwwwwwwwk..", "..kkkkkkkkkkkk..", "................", "................"],
  note: ["................", ".....kkkkkkkkk..", ".....kkkkkkkkk..", ".....k.......k..", ".....k.......k..", ".....k.......k..", ".....k.......k..", ".....k.......k..",
    ".....k.......k..", "..kkkk....kkkk..", ".kkkkk...kkkkk..", ".kkkkk...kkkkk..", "..kkk.....kkk...", "................", "................", "................"],
};
const PAL = { k: "#000000", w: "#ffffff", g: "#c0c0c0", d: "#808080", a: "#000080", b: "#008080", c: "#ffff00", e: "#008000", r: "#aa5500" };
function rects(name) {
  let out = "";
  ICONS[name].forEach((row, y) => {
    let x = 0;
    while (x < 16) {
      const ch = row[x];
      if (ch === ".") { x++; continue; }
      let run = 1;
      while (x + run < 16 && row[x + run] === ch) run++;
      out += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${PAL[ch]}"/>`;
      x += run;
    }
  });
  return out;
}

export const iconSprite = () =>
  `<svg xmlns="http://www.w3.org/2000/svg">${Object.keys(ICONS).map((n) => `<symbol id="i-${n}" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects(n)}</symbol>`).join("")}</svg>\n`;

export const icon = (name, size = 16) =>
  `<svg class="px" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true"><use href="/assets/icons.svg#i-${ICONS[name] ? name : "folder"}"/></svg>`;

export function win(o) {
  return `<section class="win${o.cls ? " " + o.cls : ""}" data-win="${esc(o.id)}"${o.route ? ` data-route="${esc(o.route)}"` : ""} role="dialog" aria-label="${esc(o.title)}"${o.hidden ? " hidden" : ""}>
<header class="tb"><span class="tb-i">${icon(o.icon || "folder")}</span><h2 class="tb-t">${esc(o.title)}</h2><span class="tb-btns"><button class="tb-min" type="button" data-min aria-label="Minimize"></button><button class="tb-max" type="button" data-max aria-label="Maximize"></button><button class="tb-x" type="button" data-close aria-label="Close"></button></span></header>
${o.menu ? `<nav class="mb" aria-hidden="true"><span><u>F</u>ile</span><span><u>E</u>dit</span><span><u>V</u>iew</span><span><u>G</u>o</span><span><u>H</u>elp</span></nav>\n` : ""}<div class="wb">${o.body}</div>
${o.status ? `<footer class="stb">${o.status}</footer>\n` : ""}</section>`;
}

const btn = (href, label, cls = "") =>
  `<a class="btn${cls ? " " + cls : ""}" href="${esc(href)}"${/^https?:|^mailto:/.test(href) ? ' target="_blank" rel="noopener"' : href.startsWith("/") ? " data-nav" : ""}>${label}</a>`;
const PLAY_IC = `<svg class="ic" viewBox="0 0 12 12" width="14" height="14" aria-hidden="true"><path d="M2 1l9 5-9 5z" fill="#1fb51f" stroke="#064d06" stroke-width="1"/></svg>`;

function address(path) {
  return `<div class="xbar"><a class="tbtn" href="/" data-nav>&#9664; Back</a><a class="tbtn" href="/" data-nav>&#9650; Up</a><span class="addr"><span class="addr-l">Address</span><span class="addr-f">${icon("globe")}<span>gzowo.fun${esc(path)}</span></span></span></div>`;
}

function shotTag(p, w, h, lazy = true) {
  return p.image
    ? `<img src="/${esc(p.image)}" alt="" width="${w}" height="${h}"${lazy ? ' loading="lazy"' : ""} decoding="async">`
    : `<span class="noshot">${icon(SICON[sectionOf(p)] || "folder", 32)}<em>no shot yet</em></span>`;
}

export function projectIcon(p) {
  const flag = p.status === "live" ? "" : `<span class="flag">${esc(STATUS[p.status] || p.status)}</span>`;
  return `<a class="ico" href="/p/${esc(p.slug)}/" data-nav><span class="ico-i">${shotTag(p, 120, 90)}${flag}</span><span class="ico-n">${esc(p.name)}</span></a>`;
}

export function explorer(ctx, key) {
  const s = ctx.sections[key];
  const list = inSec(ctx, key);
  const extra = key === "printing" ? `<p class="xnote">${esc(ctx.site.industries)}</p>` : "";
  return `${address(`/${key}/`)}<div class="xbody"><p class="xnote"><b>${esc(s.tag)}</b> ${esc(s.note)}</p>${extra}<div class="icons">${list.map(projectIcon).join("")}</div></div>`;
}

export function rocketsBody(ctx) {
  const R = ctx.rockets;
  const kit = inSec(ctx, "rockets");
  const fleet = R.fleet.map((r) =>
    `<button class="ico" type="button" data-rocket="${esc(r.id)}"><span class="ico-i"><img src="${esc(cdnImg(r.image, 240))}" alt="" width="120" height="90" loading="lazy" decoding="async"><span class="flag">${esc(STATUS[r.state] || r.state)}</span></span><span class="ico-n">${esc(r.name)}</span></button>`).join("");
  const missions = R.missions.map((m) => {
    const d = m.date ? m.date.split("-").reverse().join(".") : "date lost to time";
    return `<tr><td>${esc(d)}</td><td>${esc(m.name)}<br><small>${esc(m.note)}</small></td><td>${m.result === "success" ? "Success" : esc(m.result)}</td></tr>`;
  }).join("");
  return `${address("/rockets/")}<div class="xbody"><p class="xnote">${esc(R.lead)}</p>
<dl class="facts">${R.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
<h3 class="xh">The fleet</h3><div class="icons">${fleet}</div>
<h3 class="xh">Mission log</h3><table class="grid"><thead><tr><th>Date</th><th>Mission</th><th>Result</th></tr></thead><tbody>${missions}</tbody></table>
<h3 class="xh">Crew</h3><ul class="crew">${R.team.map(([n, role]) => `<li><b>${esc(n)}</b> ${esc(role)}</li>`).join("")}</ul>
${kit.length ? `<h3 class="xh">Brand stuff</h3><div class="icons">${kit.map(projectIcon).join("")}</div>` : ""}
<p class="xnote">Questions, launch invitations, rocket motors you do not need any more: <a href="mailto:kontakt@gspaerospace.pl">kontakt@gspaerospace.pl</a>. The old gspaerospace.pl lives here now.</p></div>`;
}

export function rocketBody(ctx, id) {
  const r = ctx.rockets.fleet.find((x) => x.id === id);
  if (!r) return "";
  const photos = (r.photos || []).map(([u, cap]) => `<figure><img src="${esc(cdnImg(u, 640))}" alt="${esc(cap)}" loading="lazy" decoding="async"><figcaption>${esc(cap)}</figcaption></figure>`).join("");
  const videos = (r.videos || []).map(([u, cap]) => `<figure><video controls preload="none" playsinline poster="${esc(cdnPoster(u))}" src="${esc(cdnVideo(u))}"></video><figcaption>${esc(cap)}</figcaption></figure>`).join("");
  return `<div class="pj"><div class="pj-top"><figure class="pj-shot"><img src="${esc(cdnImg(r.image, 640))}" alt="${esc(r.name)}" decoding="async"></figure>
<div class="pj-side"><p class="pj-tags"><span>${esc(STATUS[r.state] || r.state)}</span><span>${esc(r.line)}</span></p><p class="pj-lead">${esc(r.blurb)}</p>
<table class="pj-facts">${r.spec.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table></div></div>
${photos || videos ? `<div class="media">${photos}${videos}</div>` : ""}</div>`;
}

export function projectBody(p) {
  const dl = p.download;
  const play = dl
    ? `<a class="btn go" href="${esc(dl.url)}" download>&#11015; Download for ${esc(dl.platform || "Windows")}</a>`
    : p.url
    ? btn(extern(p.url), `${PLAY} ${p.category === "Game" ? "Play" : "Open"} ${esc(p.name)}`, "go")
    : `<span class="btn" aria-disabled="true">Not public yet</span>`;
  const facts = [["Status", STATUS[p.status] || p.status], ["Kind", p.category], ["Year", p.year], ["Built with", (p.stack || []).join(", ")]]
    .concat(dl ? [["Download", [dl.version, dl.size, dl.note].filter(Boolean).join(", ")]] : [])
    .filter(([, v]) => v);
  return `<div class="pj"><div class="pj-top"><figure class="pj-shot">${shotTag(p, 1200, 900, false)}</figure>
<div class="pj-side"><p class="pj-lead">${esc(p.blurb)}</p><p class="pj-acts">${play}${p.repo ? btn(extern(p.repo), "Source code") : ""}</p>
<table class="pj-facts">${facts.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table></div></div>
<div class="pj-text">${(p.body || []).map((t) => `<p>${esc(t)}</p>`).join("")}</div></div>`;
}

export function welcomeBody(ctx) {
  return `<div class="hello"><h1 class="fire"><img src="/assets/gzowo-labs-fire.webp" alt="Gzowo Labs" width="515" height="93"></h1>
<p class="eyebrow">${esc(ctx.site.eyebrow)}</p><p class="tagline">${esc(ctx.site.tagline)}</p>
<p class="hint"><span class="on-land">This is our plot in Gzowo. Click a building to walk in, or the wall to spray on it.</span><span class="on-tall">This is our plot in Gzowo. Walk down the path and tap a building.</span></p>
<p class="acts">${btn("/games/", `${PLAY_IC} Play a game!`, "go")}<button class="btn" type="button" data-open="newest">${icon("doc")} What is new</button></p></div>`;
}

export function newestBody(ctx) {
  return `<div class="rows">${ctx.projects.slice(0, 8).map((p) =>
    `<a class="row" href="/p/${esc(p.slug)}/" data-nav><span class="row-i">${shotTag(p, 96, 72)}</span><span class="row-t"><b>${esc(p.name)}</b><span>${esc(p.blurb)}</span><em>${esc([p.category, STATUS[p.status], p.year].filter(Boolean).join(" · "))}</em></span></a>`).join("")}</div>`;
}

export function newsWin(ctx) {
  const items = ctx.projects.slice(0, 4).map((p, i) =>
    `<li><a href="/p/${esc(p.slug)}/" data-nav>${icon(i === 0 ? "star" : SICON[sectionOf(p)])}<span>${i === 0 ? "New: " : ""}${esc(p.name)}</span></a></li>`).join("");
  return win({ id: "news", title: "News", icon: "globe", cls: "w-news", body: `<ul class="news">${items}</ul><p class="news-more"><a href="#" data-open="newest">&#8594; More updates...</a></p>` });
}

export function reviewsWin() {
  return win({ id: "reviews", title: "Reviews", icon: "star", hidden: true, cls: "w-reviews", body:
`<div class="rev" data-rev><p class="rev-score" data-rev-score>loading...</p>
<form class="rev-form" data-rev-form><fieldset><legend>Rate this web site</legend><div class="rev-stars" data-rev-stars role="group" aria-label="Your rating">${[1, 2, 3, 4, 5].map((n) => `<button type="button" aria-pressed="false" aria-label="${n} star${n > 1 ? "s" : ""}">&#9733;</button>`).join("")}</div>
<input type="text" name="n" maxlength="30" placeholder="Your name (or stay mysterious)"><textarea name="m" maxlength="400" rows="3" placeholder="Tell the world what you think"></textarea>
<button class="btn" type="submit">Post review</button><p class="rev-note" data-rev-note></p></fieldset></form>
<div class="rev-list" data-rev-list></div></div>` });
}

export function guestbookWin() {
  return win({ id: "guestbook", title: "Guestbook.txt - Notepad", icon: "book", hidden: true, cls: "w-gb", body:
`<div class="gb" data-gb><form class="gb-form" novalidate><label>Your name <input name="n" maxlength="30" autocomplete="nickname" required></label>
<label>Message <textarea name="m" rows="3" maxlength="300" required></textarea></label>
<div class="gb-row"><span class="gb-count" aria-hidden="true">300</span><button type="submit" class="btn gb-sign">Sign the book</button></div><p class="gb-status" role="status"></p></form>
<p class="gb-total"></p><ol class="gb-list"></ol></div>` });
}

export function guideWin() {
  return win({ id: "guide", title: "Gzowo Guide.exe", icon: "bubble", hidden: true, cls: "w-guide", body:
`<div class="chat" data-chat-box><div class="chat-log" aria-live="polite"></div><form class="chat-form"><input type="text" maxlength="300" placeholder="Ask about the site..." aria-label="Your question" autocomplete="off"><button type="submit" class="btn chat-send">Send</button></form><p class="chat-note">AI guide. It can make mistakes.</p></div>` });
}

export function routeWindow(ctx, path) {
  const m = path.match(/^\/p\/([a-z0-9-]+)\/$/);
  if (m) {
    const p = ctx.projects.find((x) => x.slug === m[1]);
    if (!p) return null;
    return { id: "p-" + p.slug, route: path, title: p.name, icon: SICON[sectionOf(p)], cls: "w-project", body: projectBody(p),
      status: `<span>${esc(p.category)}</span><span>${esc(STATUS[p.status] || p.status)}</span><span>${esc(p.year)}</span>` };
  }
  const s = path.match(/^\/(rockets|printing|games|software)\/$/);
  if (s) {
    const key = s[1], sec = ctx.sections[key];
    return { id: "sec-" + key, route: path, title: sec.title, icon: SICON[key], menu: true, cls: "w-explorer",
      body: key === "rockets" ? rocketsBody(ctx) : explorer(ctx, key),
      status: `<span>${key === "rockets" ? ctx.rockets.fleet.length : inSec(ctx, key).length} object(s)</span><span>${esc(countLabel(ctx, key))}</span>` };
  }
  return { id: "welcome", route: "/", title: "Welcome to Gzowo Labs", icon: "computer", cls: "w-welcome", body: welcomeBody(ctx) };
}

export function startMenu(ctx) {
  const item = (attrs, ic, label, tail = "") => `<li><a ${attrs}>${icon(ic)}<span>${label}</span>${tail}</a></li>`;
  const ring = ctx.projects.map((p) => p.slug);
  return `<div class="start-m" id="start-menu" role="menu" hidden><div class="sm-side"><b>Gzowo</b>Labs</div><ul>
${ctx.order.map((k) => item(`href="/${k}/" data-nav role="menuitem"`, SICON[k], esc(ctx.sections[k].label), `<em>${k === "rockets" ? ctx.rockets.fleet.length : inSec(ctx, k).length}</em>`)).join("")}
<li class="sep"></li>
${item('href="#" data-open="newest" role="menuitem"', "folder", "What is new")}
${item('href="#" data-open="reviews" role="menuitem"', "star", "Reviews")}
${item('href="#guestbook" data-open="guestbook" role="menuitem"', "book", "Guestbook")}
${item('href="#" data-wall role="menuitem"', "bricks", "The Wall")}
${item('href="#" data-open="guide" role="menuitem"', "bubble", "Ask the Guide")}
<li class="sep"></li>
${item(`href="/p/${esc(ring[0] || "")}/" data-nav data-ring='${esc(JSON.stringify(ring))}' role="menuitem"`, "globe", esc(ctx.site.webring), "<em>random</em>")}
${item(`href="mailto:${esc(ctx.site.email)}" role="menuitem"`, "mail", "E-mail me")}
${item(`href="${esc(ctx.site.github)}" target="_blank" rel="noopener" role="menuitem"`, "floppy", "Source code")}
<li class="sep"></li>
${item('href="/" data-nav role="menuitem"', "computer", "About Gzowo Labs")}
${item('href="#" data-mascot role="menuitem"', "pad", "Walking Jurek: on")}
${item('href="#" data-open="shutdown" role="menuitem"', "computer", "Shut Down...")}
</ul></div>`;
}

export function taskbar(ctx) {
  return `<footer class="taskbar"><button class="start" type="button" data-start aria-expanded="false" aria-controls="start-menu">${icon("rocket")}<b>Start</b></button>
<span class="ql"><a href="/" data-nav title="Show the map">${icon("computer")}</a><a href="#" data-open="guide" title="Ask the Guide">${icon("bubble")}</a></span>
<div class="tasks" data-tasks></div>
<div class="tray"><button class="tray-b" type="button" data-midi title="Play ${esc(ctx.site.nowPlaying)}" aria-pressed="false">${icon("note")}</button><span class="tray-n" data-counter title="Visitors">00000000</span><time class="tray-c" data-clock></time></div></footer>`;
}

export const PLACES = [
  { key: "rockets", href: "/rockets/", name: "Launch pad", icon: "rocket" },
  { key: "printing", href: "/printing/", name: "Workshop", icon: "printer" },
  { key: "games", href: "/games/", name: "Arcade", icon: "pad" },
  { key: "software", href: "/software/", name: "Lab", icon: "chip" },
  { key: "reviews", href: "#", name: "Reviews", sub: "rate this site", open: "reviews" },
  { key: "guestbook", href: "#guestbook", name: "Mailbox", sub: "guestbook", open: "guestbook" },
  { key: "about", href: "/", name: "Gzowo 34", sub: "about us" },
];

export function spots(ctx) {
  const sub = (p) => p.sub || (p.key === "rockets" ? `${ctx.rockets.fleet.length} rockets`
    : p.key === "games" ? `${inSec(ctx, "games").length} games`
    : p.key === "software" ? `${inSec(ctx, "software").length} apps and AI models`
    : `${inSec(ctx, p.key).length} printed things`);
  const art = { rockets: "launchpad", printing: "workshop", games: "arcade", software: "lab", reviews: "billboard", guestbook: "mailbox", about: "signpost" };
  return PLACES.map((p) => `<a class="spot" href="${p.href}" data-place="${p.key}"${p.open ? ` data-open="${p.open}"` : " data-nav"} aria-label="${esc(p.name + ", " + sub(p))}">` +
    `<img class="spr" src="/assets/map/${art[p.key]}.webp" alt="" draggable="false">` +
    (p.key === "reviews" ? '<span class="bb"><b>Reviews</b><q data-bb></q></span>' : "") +
    (p.key === "reviews" || p.key === "about" ? "" : `<span class="spot-l"><b>${esc(p.name)}</b><em>${esc(sub(p))}</em></span>`) + "</a>").join("") +
    `<button class="spot spot-wall" type="button" data-place="mural" data-wall aria-label="The Wall, click to spray"><canvas class="spr" data-wall-art width="404" height="147"></canvas><span class="spot-l"><b>The Wall</b><em>click to spray</em></span></button>`;
}
