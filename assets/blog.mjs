/* Gzowo Times: Jurek's posts as a news ticker above the taskbar, a reader that slides up from it, and Jurek's own editor for drafts and posts. */

import { BANK } from "/assets/bank.mjs";
import { esc, store } from "/assets/folks.mjs";

const KINDS = [["rocket", "Rocket"], ["heart", "Heart"], ["fire", "Fire"], ["star", "Star"]];
const PX = {
  news: '<rect x="1" y="2" width="14" height="12" fill="#fff"/><path d="M1 2h14v1H1zM1 13h14v1H1zM1 2h1v12H1zM14 2h1v12h-1z" fill="#000"/><rect x="3" y="4" width="10" height="2" fill="#000"/><rect x="3" y="7" width="4" height="4" fill="#888"/><path d="M8 7h5v1H8zM8 9h5v1H8z" fill="#000"/>',
  rocket: '<rect x="7" y="1" width="2" height="2" fill="#f80"/><rect x="6" y="3" width="4" height="7" fill="#eee"/><rect x="6" y="3" width="1" height="7" fill="#999"/><rect x="7" y="5" width="2" height="2" fill="#38c"/><path d="M4 8h2v3H4zM10 8h2v3h-2z" fill="#f80"/><rect x="7" y="11" width="2" height="2" fill="#f90"/><rect x="7" y="13" width="2" height="1" fill="#fd3"/>',
  heart: '<path d="M2 4h5v4H2zM9 4h5v4H9zM3 3h3v1H3zM10 3h3v1h-3zM3 8h10v2H3zM5 10h6v2H5zM7 12h2v1H7z" fill="#e2559a"/><rect x="3" y="4" width="2" height="1" fill="#f7b3d2"/>',
  fire: '<path d="M7 1h2v2H7zM6 3h4v2H6z" fill="#f90"/><path d="M4 5h8v6H4zM5 11h6v2H5z" fill="#f60"/><rect x="6" y="7" width="4" height="5" fill="#fd3"/><rect x="7" y="9" width="2" height="3" fill="#fff6b0"/>',
  star: '<path d="M7 1h2v4H7zM2 5h12v2H2zM4 7h8v2H4zM5 9h6v2H5zM4 11h3v3H4zM9 11h3v3H9z" fill="#fc0"/><rect x="7" y="2" width="1" height="3" fill="#fff3a0"/>',
};
const px = (k, n = 16) => `<svg class="px" viewBox="0 0 16 16" width="${n}" height="${n}" shape-rendering="crispEdges" aria-hidden="true">${PX[k]}</svg>`;
const KEY = "gl-blog-key", WHO = "gl-who";
const day = (t) => new Date(t).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
const short = (t) => new Date(t).toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
const img = (id) => `${BANK}/blog/img/${id}`;

function who() {
  let w = store.get(WHO, "");
  if (!/^[a-z0-9]{12,32}$/.test(w)) { w = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join(""); store.set(WHO, w); }
  return w;
}

function inline(s) {
  const out = [];
  let rest = s;
  const re = /\[([^\]\n]{1,120})\]\((https?:\/\/[^\s)]{1,400}|\/[^\s)]{0,400})\)|\*\*([^*\n]{1,200})\*\*|(https?:\/\/[^\s<]{3,400})/;
  while (rest) {
    const m = re.exec(rest);
    if (!m) { out.push(esc(rest)); break; }
    out.push(esc(rest.slice(0, m.index)));
    if (m[1]) out.push(link(m[2], esc(m[1])));
    else if (m[3]) out.push(`<b>${esc(m[3])}</b>`);
    else { const u = m[4].replace(/[.,;:!?)]+$/, ""); out.push(link(u, esc(u.replace(/^https?:\/\//, "")))); rest = m[4].slice(u.length) + rest.slice(m.index + m[0].length); continue; }
    rest = rest.slice(m.index + m[0].length);
  }
  return out.join("");
}
function link(u, label) {
  const local = u.startsWith("/") ? u : /^https:\/\/(www\.)?gzowo\.fun\//.test(u) ? u.replace(/^https:\/\/(www\.)?gzowo\.fun/, "") : null;
  return local && !/\.[a-z0-9]{2,4}$/i.test(local) ? `<a href="${esc(local)}" data-nav>${label}</a>` : `<a href="${esc(u)}" target="_blank" rel="noopener">${label}</a>`;
}
const paras = (body) => String(body || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p.split("\n").map(inline).join("<br>")}</p>`).join("");

async function call(path, body, key) {
  const headers = { "content-type": "application/json" };
  if (key) headers["x-blog"] = key;
  const r = await fetch(BANK + path, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || "Gzowo Times is offline, try again in a minute.");
  return j;
}

async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image();
    im.src = url;
    await im.decode();
    const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(im.naturalWidth * k)); cv.height = Math.max(1, Math.round(im.naturalHeight * k));
    cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
    for (const q of [0.86, 0.72, 0.58]) {
      let d = cv.toDataURL("image/webp", q);
      if (!d.startsWith("data:image/webp")) d = cv.toDataURL("image/jpeg", q);
      if (d.length * 0.75 < 1400000) return d;
    }
    throw new Error("That picture is too big even after shrinking.");
  } finally { URL.revokeObjectURL(url); }
}

export function createBlog(desk, { data }) {
  const root = document.documentElement;
  const S = { posts: [], cur: 0, gi: 0, open: false, projects: {}, edit: null, admin: null, key: store.get(KEY, ""), busy: false, note: "" };
  const bar = document.createElement("div");
  bar.className = "gt";
  bar.hidden = true;
  bar.innerHTML = `<button class="gt-tick" type="button" aria-expanded="false" aria-controls="gt-read"><b class="gt-lab">${px("news")}<span>Gzowo Times</span></b><span class="gt-run"><span class="gt-roll" data-gt-roll></span></span><span class="gt-go">Read</span></button>`;
  const read = document.createElement("section");
  read.className = "gt-read";
  read.id = "gt-read";
  read.setAttribute("role", "dialog");
  read.setAttribute("aria-label", "Gzowo Times");
  read.innerHTML = `<header class="tb"><span class="tb-i">${px("news")}</span><h2 class="tb-t">Gzowo Times</h2><span class="gt-sub" data-gt-sub>Jurek's notes</span><button class="gt-edit" type="button" data-gt-edit hidden>Edit</button></header><div class="gt-paper" data-gt-paper></div>`;
  desk.append(bar, read);
  const paper = read.querySelector("[data-gt-paper]"), roll = bar.querySelector("[data-gt-roll]"), tick = bar.querySelector(".gt-tick");

  function postHTML(p) {
    const imgs = p.imgs || [], g = imgs.length ? imgs[S.gi % imgs.length] : null, pr = p.project && S.projects[p.project];
    const mine = new Set(p.mine || []);
    return `<article class="gt-post"><h3>${esc(p.title)}</h3><p class="gt-date">${day(p.pub || p.up || Date.now())}</p>` +
      (g ? `<div class="gt-gal"><img src="${img(g)}" alt="" loading="lazy" decoding="async">${imgs.length > 1 ? `<button class="gt-prev" type="button" data-gt-g="-1" aria-label="Previous picture">‹</button><button class="gt-next" type="button" data-gt-g="1" aria-label="Next picture">›</button>` : ""}</div>` +
        (imgs.length > 1 ? `<p class="gt-dots">${imgs.map((_, i) => `<i class="${i === S.gi % imgs.length ? "on" : ""}"></i>`).join("")}</p>` : "") : "") +
      `<div class="gt-body">${paras(p.body)}</div>` +
      (pr ? `<a class="gt-proj" href="/p/${esc(pr.slug)}/" data-nav><img src="/${esc(pr.image)}" alt="" loading="lazy"><span><b>${esc(pr.name)}</b><span>${esc(pr.blurb || "")}</span></span></a>` : "") +
      (p.re ? `<p class="gt-re">${KINDS.map(([k, n]) => `<button type="button" data-gt-r="${k}" class="${mine.has(k) ? "me" : ""}" aria-pressed="${mine.has(k)}" title="${n}">${px(k)}<span>${p.re[k] || 0}</span></button>`).join("")}</p>` : "") + `</article>`;
  }
  function olderHTML() {
    if (S.posts.length < 2) return "";
    return `<nav class="gt-older"><h4>Earlier</h4>${S.posts.map((p, i) => `<a href="#" data-gt-p="${i}" class="${i === S.cur ? "cur" : ""}">${esc(p.title)}<span>${short(p.pub)}</span></a>`).join("")}</nav>`;
  }
  function paint() {
    const p = S.posts[S.cur];
    read.querySelector("[data-gt-edit]").hidden = !S.key;
    read.querySelector("[data-gt-sub]").textContent = S.edit ? "editor" : "Jurek's notes";
    if (S.edit) { paintEditor(); return; }
    paper.innerHTML = p ? postHTML(p) + olderHTML() : `<p class="gt-empty">No posts yet.</p>`;
  }
  function paintTicker() {
    bar.hidden = !S.posts.length && !S.key;
    root.classList.toggle("has-gt", !bar.hidden);
    const line = S.posts.length ? S.posts.map((p) => `<span>${esc(p.title)}</span><em>${short(p.pub)}</em>`).join("") : `<span>No posts yet</span>`;
    roll.innerHTML = line + `<i aria-hidden="true"></i>` + line;
    roll.style.animationDuration = Math.max(16, roll.textContent.length * 0.16) + "s";
  }
  async function load() {
    try {
      const j = await call("/blog?who=" + who());
      S.posts = j.posts || [];
      if (S.cur >= S.posts.length) S.cur = 0;
    } catch (e) { S.posts = S.posts || []; }
    const had = root.classList.contains("has-gt");
    paintTicker();
    if (had !== root.classList.contains("has-gt")) dispatchEvent(new Event("resize"));
    if (S.open) paint();
  }
  function show(on) {
    S.open = on;
    read.classList.toggle("on", on);
    tick.setAttribute("aria-expanded", String(on));
    if (on) { if (!S.edit) S.gi = 0; paint(); paper.scrollTop = 0; }
  }

  function editPost(p) {
    S.edit = p ? { id: p.id, title: p.title, body: p.body, project: p.project || "", imgs: [...(p.imgs || [])], add: [], status: p.status } : { id: null, title: "", body: "", project: "", imgs: [], add: [], status: "draft" };
    S.note = "";
    paint();
  }
  function paintEditor() {
    const e = S.edit, list = S.admin ? S.admin.posts : [];
    if (e === true) {
      paper.innerHTML = `<div class="gt-ed"><p class="gt-note">${esc(S.note)}</p><p class="gt-row"><button class="btn" type="button" data-gt-new>New post</button><button class="btn" type="button" data-gt-out>Back to reading</button></p>` +
        `<h4>Drafts and posts</h4><ul class="gt-list">${list.map((p) => `<li><button type="button" data-gt-open="${p.id}"><b>${esc(p.title)}</b><span>${p.status === "live" ? "live, " + short(p.pub) : "draft" + (p.by === "concierge" ? " from Concierge" : "") + ", " + short(p.up)}</span></button></li>`).join("") || "<li>Nothing yet.</li>"}</ul></div>`;
      return;
    }
    const opts = Object.values(S.projects).sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<option value="${esc(p.slug)}"${p.slug === e.project ? " selected" : ""}>${esc(p.name)}</option>`).join("");
    paper.innerHTML = `<div class="gt-ed"><p class="gt-row"><button class="btn" type="button" data-gt-list>All posts</button><span class="gt-state">${e.id ? (e.status === "live" ? "Live" : "Draft") : "New post"}</span></p>` +
      `<label>Title<input type="text" maxlength="140" data-gt-f="title" value="${esc(e.title)}"></label>` +
      `<label>Text<textarea rows="9" data-gt-f="body" placeholder="Empty line starts a new paragraph. Links: paste them, or [text](https://...). **bold**">${esc(e.body)}</textarea></label>` +
      `<div class="gt-pics">${e.imgs.map((id) => `<span><img src="${img(id)}" alt=""><button type="button" data-gt-rm="${id}" aria-label="Remove picture">×</button></span>`).join("")}${e.add.map((d, i) => `<span><img src="${d}" alt=""><button type="button" data-gt-rmn="${i}" aria-label="Remove picture">×</button></span>`).join("")}<label class="gt-addpic">+ Pictures<input type="file" accept="image/*" multiple data-gt-files hidden></label></div>` +
      `<label>Project<select data-gt-f="project"><option value="">None</option>${opts}</select></label>` +
      `<p class="gt-note">${esc(S.note)}</p>` +
      `<p class="gt-row"><button class="btn" type="button" data-gt-save="draft">Save draft</button><button class="btn go" type="button" data-gt-save="live">${e.status === "live" ? "Save, stays live" : "Publish"}</button>${e.id && e.status === "live" ? '<button class="btn" type="button" data-gt-save="unlive">Back to draft</button>' : ""}${e.id ? '<button class="btn" type="button" data-gt-del>Delete</button>' : ""}</p>` +
      `<h4>Preview</h4><div class="gt-prevw">${postHTML({ title: e.title || "Title", body: e.body, imgs: e.imgs, project: e.project, pub: Date.now() })}</div></div>`;
  }
  async function openEditor() {
    if (!S.key) return;
    S.edit = true;
    S.note = "Loading...";
    paint();
    try { S.admin = await call("/blog/admin", null, S.key); S.note = ""; }
    catch (err) { S.note = err.message; if (/key/i.test(err.message)) { S.key = ""; store.set(KEY, ""); } }
    if (S.edit === true) paint();
  }
  async function save(mode) {
    const e = S.edit;
    if (S.busy || !e || e === true) return;
    if (!e.title.trim()) { S.note = "The post needs a title."; paint(); return; }
    S.busy = true; S.note = "Saving..."; paint();
    try {
      const j = await call("/blog/save", { id: e.id || undefined, title: e.title, body: e.body, project: e.project || null, imgs: e.imgs, add: e.add, status: mode === "unlive" ? "draft" : mode, by: e.id ? undefined : "jurek" }, S.key);
      editPost(j.post);
      S.note = j.post.status === "live" ? "It is live on gzowo.fun." : "Saved as a draft, only you can see it.";
      load();
    } catch (err) { S.note = err.message; }
    S.busy = false;
    paint();
  }

  document.addEventListener("click", async (ev) => {
    const t = ev.target;
    if (t.closest(".gt-tick")) { show(!S.open); return; }
    if (!S.open) return;
    if (!t.closest(".gt-read")) { if (!t.closest(".win, .start-m, .taskbar")) show(false); return; }
    const p = S.posts[S.cur];
    const r = t.closest("[data-gt-r]");
    if (r && p && !S.edit) {
      try { const j = await call("/blog/react", { post: p.id, kind: r.dataset.gtR, who: who() }); p.re = j.re; p.mine = j.mine; paint(); } catch (e) {}
      return;
    }
    const g = t.closest("[data-gt-g]");
    if (g) { S.gi = (S.gi + +g.dataset.gtG + 1200) % 1200; paint(); return; }
    const o = t.closest("[data-gt-p]");
    if (o) { ev.preventDefault(); S.cur = +o.dataset.gtP; S.gi = 0; paint(); paper.scrollTop = 0; return; }
    if (t.closest("[data-nav]")) { show(false); return; }
    if (t.closest("[data-gt-edit]")) { if (S.edit) { S.edit = null; paint(); } else openEditor(); return; }
    if (t.closest("[data-gt-out]")) { S.edit = null; paint(); return; }
    if (t.closest("[data-gt-list]")) { openEditor(); return; }
    if (t.closest("[data-gt-new]")) { editPost(null); return; }
    const op = t.closest("[data-gt-open]");
    if (op) { editPost(S.admin.posts.find((q) => q.id === op.dataset.gtOpen)); return; }
    const rm = t.closest("[data-gt-rm]");
    if (rm) { S.edit.imgs = S.edit.imgs.filter((x) => x !== rm.dataset.gtRm); paint(); return; }
    const rmn = t.closest("[data-gt-rmn]");
    if (rmn) { S.edit.add.splice(+rmn.dataset.gtRmn, 1); paint(); return; }
    const sv = t.closest("[data-gt-save]");
    if (sv) { save(sv.dataset.gtSave); return; }
    if (t.closest("[data-gt-del]") && S.edit && S.edit.id) {
      if (!confirm("Delete this post for good? It cannot be undone.")) return;
      try { await call("/blog/delete", { id: S.edit.id }, S.key); S.note = "Deleted."; load(); openEditor(); } catch (err) { S.note = err.message; paint(); }
    }
  });
  read.addEventListener("input", (ev) => {
    const f = ev.target.closest("[data-gt-f]");
    if (!f || !S.edit || S.edit === true) return;
    S.edit[f.dataset.gtF] = f.value;
    const pv = read.querySelector(".gt-prevw");
    if (pv) pv.innerHTML = postHTML({ title: S.edit.title || "Title", body: S.edit.body, imgs: S.edit.imgs, project: S.edit.project, pub: Date.now() });
  });
  read.addEventListener("change", async (ev) => {
    const f = ev.target.closest("[data-gt-files]");
    if (!f || !S.edit || S.edit === true) return;
    const files = [...f.files].filter((x) => /^image\//.test(x.type));
    S.note = "Shrinking pictures..."; paint();
    for (const file of files) {
      if (S.edit.imgs.length + S.edit.add.length >= 12) { S.note = "Up to 12 pictures in one post."; break; }
      try { S.edit.add.push(await shrink(file)); S.note = ""; } catch (err) { S.note = err.message; }
    }
    paint();
  });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && S.open && !ev.target.closest("input, textarea, select")) show(false); });

  function keyFromHash() {
    const m = /^#blog(?:=([A-Za-z0-9_-]{24,128}))?$/.exec(location.hash);
    if (!m) return false;
    if (m[1]) { S.key = m[1]; store.set(KEY, S.key); }
    history.replaceState(null, "", location.pathname + location.search);
    return true;
  }
  if (keyFromHash()) setTimeout(() => { show(true); openEditor(); }, 400);
  addEventListener("hashchange", () => { if (keyFromHash()) { show(true); openEditor(); } });

  data().then((d) => { (d.projects || []).forEach((p) => { S.projects[p.slug] = p; }); if (S.open) paint(); }).catch(() => {});
  load();
  setInterval(() => { if (!document.hidden && !S.edit) load(); }, 120000);
  return { reload: load, open: () => show(true) };
}
