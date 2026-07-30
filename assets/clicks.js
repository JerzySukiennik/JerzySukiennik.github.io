/* Gzowo Labs — the click counter.
   The only live piece of the site. Firebase Realtime Database over plain REST, so
   there is no SDK to load: reading is one GET, and counting one open is a PATCH with
   the server-side increment. The database rules only allow +1 on an integer. */

window.GzowoClicks = (function () {
  'use strict';

  const BASE = (window.GZOWO && window.GZOWO.rtdb) || '';

  function all() {
    if (!BASE) return Promise.resolve(null);
    return fetch(BASE + '/clicks.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }

  function get(slug) {
    if (!BASE) return Promise.resolve(0);
    return fetch(BASE + '/clicks/' + encodeURIComponent(slug) + '.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : 0))
      .then((v) => (typeof v === 'number' ? v : 0))
      .catch(() => 0);
  }

  /* fire and forget: nobody waits for a counter before opening a game */
  function bump(slug) {
    if (!BASE || !slug) return;
    const body = JSON.stringify({ [slug]: { '.sv': { increment: 1 } } });
    if (navigator.sendBeacon) {
      // sendBeacon cannot PATCH, so use the REST override header via fetch keepalive
      fetch(BASE + '/clicks.json?x-http-method-override=PATCH', {
        method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
      return;
    }
    fetch(BASE + '/clicks.json', {
      method: 'PATCH', body, keepalive: true, headers: { 'Content-Type': 'application/json' }
    }).catch(() => {});
  }

  return { all, get, bump };
})();
