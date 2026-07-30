/* Gzowo Labs — the shelf.
   Reads data/projects.json (the file the /projects skill commits) and the click
   counter from Firebase, then renders the grid. Most opened project goes first. */

(() => {
  'use strict';

  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const count = document.getElementById('count');
  const search = document.getElementById('q');
  const segButtons = [...document.querySelectorAll('.seg__btn')];

  const state = { projects: [], clicks: {}, author: '', query: '' };

  GzowoWordmark.init(document.getElementById('mark'), { heightBudget: 0.46 });

  /* pinned to the top, then a manual nudge for anything too new to have clicks,
     then the honest signal: how often people actually opened it */
  function rank(p) {
    return (p.pinned ? 1e9 : 0) + (Number(p.boost) || 0) * 1000 + (state.clicks[p.slug] || 0);
  }

  function visible() {
    const q = state.query.trim().toLowerCase();
    return state.projects
      .filter((p) => !p.hidden)
      .filter((p) => !state.author || p.author === state.author)
      .filter((p) => {
        if (!q) return true;
        return [p.name, p.description, p.category, p.author, (p.stack || []).join(' ')]
          .join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
  }

  function statusClass(status) {
    if (status === 'building') return 'status--building';
    if (status === 'archived') return 'status--archived';
    return 'status--live';
  }

  function statusLabel(status) {
    if (status === 'building') return 'Building';
    if (status === 'archived') return 'Archived';
    return 'Live';
  }

  function card(p) {
    const a = document.createElement('a');
    a.className = 'card';
    a.href = 'project.html?p=' + encodeURIComponent(p.slug);

    const shot = document.createElement('div');
    shot.className = 'card__shot';
    if (p.image) {
      const img = document.createElement('img');
      img.src = p.image;
      img.alt = p.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      shot.appendChild(img);
    }

    const body = document.createElement('div');
    body.className = 'card__body';

    const h = document.createElement('h3');
    h.className = 'card__name';
    h.textContent = p.name;

    const d = document.createElement('p');
    d.className = 'card__desc';
    d.textContent = p.description || '';

    const foot = document.createElement('div');
    foot.className = 'card__foot';

    const left = document.createElement('span');
    left.className = 'tagline-row';
    const kind = document.createElement('span');
    kind.className = 'kind';
    kind.textContent = p.category || '';
    left.appendChild(kind);
    if (p.pinned) {
      const pin = document.createElement('span');
      pin.className = 'pin';
      pin.textContent = 'Pinned';
      left.appendChild(pin);
    }

    const right = document.createElement('span');
    right.className = 'tagline-row';
    const sig = document.createElement('span');
    sig.className = 'sig';
    sig.textContent = (p.author || '').split(' ')[0];
    const st = document.createElement('span');
    st.className = 'status ' + statusClass(p.status);
    st.textContent = statusLabel(p.status);
    right.append(sig, st);

    foot.append(left, right);
    body.append(h, d, foot);
    a.append(shot, body);
    return a;
  }

  function render() {
    const list = visible();
    grid.textContent = '';
    list.forEach((p) => grid.appendChild(card(p)));
    empty.hidden = list.length > 0;
    const total = state.projects.filter((p) => !p.hidden).length;
    count.textContent = list.length === total ? total + ' projects' : list.length + ' of ' + total;
  }

  segButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.author = btn.dataset.author;
      segButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render();
    });
  });

  if (search) {
    search.addEventListener('input', () => { state.query = search.value; render(); });
  }

  fetch('data/projects.json', { cache: 'no-cache' })
    .then((r) => r.json())
    .then((data) => {
      state.projects = data.projects || [];
      render();
      return GzowoClicks.all();
    })
    .then((clicks) => {
      if (!clicks) return;
      state.clicks = clicks;
      render();
    })
    .catch(() => { /* the shelf still renders without the counter */ });
})();
