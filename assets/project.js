/* Gzowo Labs — one project.
   Everything comes from data/projects.json; the page is a template the skill never
   has to touch. Opening the project is what the counter counts. */

(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const slug = params.get('p');
  const root = document.getElementById('project');
  const missing = document.getElementById('missing');

  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function statusLabel(s) {
    if (s === 'building') return 'Building';
    if (s === 'archived') return 'Archived';
    return 'Live';
  }

  function fact(label, value) {
    const li = el('li');
    li.append(label + ' ', el('b', null, value));
    return li;
  }

  function render(data) {
    const projects = (data.projects || []).filter((p) => !p.hidden);
    const p = projects.find((x) => x.slug === slug);
    if (!p) { missing.hidden = false; return; }

    document.title = p.name + ' — Gzowo Labs';
    const meta = document.querySelector('meta[name="description"]');
    if (meta && p.description) meta.setAttribute('content', p.description);

    root.hidden = false;

    document.getElementById('titleSr').textContent = p.name;
    const mark = document.getElementById('mark');
    GzowoWordmark.init(mark, { lines: [p.name], heightBudget: 0.34 });

    const facts = document.getElementById('facts');
    facts.append(
      fact('Kind', p.category || 'Project'),
      fact('Status', statusLabel(p.status)),
      fact('Year', String(p.year || '')),
      fact('Built by', p.author || '')
    );

    const actions = document.getElementById('actions');
    if (p.url) {
      const a = el('a', 'btn', p.category === 'Game' ? 'Play it' : 'Open it');
      a.href = p.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.addEventListener('click', () => GzowoClicks.bump(p.slug));
      actions.appendChild(a);
    }
    if (p.repo) {
      const r = el('a', 'btn btn--ghost', 'See the code');
      r.href = p.repo;
      r.target = '_blank';
      r.rel = 'noopener';
      r.addEventListener('click', () => GzowoClicks.bump(p.slug));
      actions.appendChild(r);
    }

    const prose = document.getElementById('prose');
    const body = (p.body && p.body.length ? p.body : [p.description]).filter(Boolean);
    body.forEach((para) => prose.appendChild(el('p', null, para)));

    const stackBox = document.getElementById('stackBox');
    if (p.stack && p.stack.length) {
      stackBox.appendChild(el('h2', null, 'Built with'));
      const ul = el('ul');
      p.stack.forEach((s) => ul.appendChild(el('li', null, s)));
      stackBox.appendChild(ul);
    }

    const shots = document.getElementById('shots');
    const gallery = (p.shots && p.shots.length ? p.shots : (p.image ? [p.image] : []));
    gallery.forEach((src, i) => {
      const fig = el('figure');
      const img = el('img');
      img.src = src;
      img.alt = p.name + ' — screenshot ' + (i + 1);
      img.loading = i === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      fig.appendChild(img);
      shots.appendChild(fig);
    });

    const siblings = document.getElementById('siblings');
    projects
      .filter((x) => x.slug !== p.slug)
      .slice(0, 6)
      .forEach((x) => {
        const a = el('a', null, x.name);
        a.href = 'project.html?p=' + encodeURIComponent(x.slug);
        siblings.appendChild(a);
      });
  }

  if (!slug) { missing.hidden = false; return; }

  fetch('data/projects.json', { cache: 'no-cache' })
    .then((r) => r.json())
    .then(render)
    .catch(() => { missing.hidden = false; });
})();
