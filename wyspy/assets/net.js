// Presence over Firebase Realtime Database. Everything here fails soft: if the
// database is unreachable the island simply stays single player.

const CONFIG = {
  apiKey: "AIzaSyAaTuELH_mToxH3hRJ4WPIVTECSH7Z8-FY",
  authDomain: "gzowos-games.firebaseapp.com",
  databaseURL: "https://gzowos-games-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gzowos-games",
  storageBucket: "gzowos-games.firebasestorage.app",
  messagingSenderId: "658227201482",
  appId: "1:658227201482:web:28115a4b81fe6cd6c4bb33"
};

const SDK = "https://www.gstatic.com/firebasejs/10.12.5/";
const SEND_HZ = 10;

export class Net {
  constructor(island, color) {
    this.island = island;
    this.color = color;
    this.ready = false;
    this.failed = false;
    this.peers = new Map();
    this.onJoin = () => {};
    this.onMove = () => {};
    this.onLeave = () => {};
    this.onStatus = () => {};
    this.last = { x: 1e9, z: 1e9, r: 1e9, at: 0 };
  }

  async start() {
    try {
      const [app, auth, db] = await Promise.all([
        import(SDK + "firebase-app.js"),
        import(SDK + "firebase-auth.js"),
        import(SDK + "firebase-database.js")
      ]);
      const a = app.initializeApp(CONFIG, "wyspy");
      const authInstance = auth.getAuth(a);
      const cred = await auth.signInAnonymously(authInstance);
      this.uid = cred.user.uid + "-" + tabId();
      this.db = db;
      this.root = db.ref(db.getDatabase(a), "wyspy/" + this.island);
      this.me = db.child(this.root, this.uid);
      await db.set(this.me, { x: 0, z: 0, r: 0, c: this.color, t: db.serverTimestamp() });
      db.onDisconnect(this.me).remove();

      db.onChildAdded(this.root, (snap) => this.handle(snap, true));
      db.onChildChanged(this.root, (snap) => this.handle(snap, false));
      db.onChildRemoved(this.root, (snap) => {
        if (snap.key === this.uid) return;
        this.peers.delete(snap.key);
        this.onLeave(snap.key);
      });

      this.ready = true;
      this.onStatus("online");
      addEventListener("pagehide", () => { try { db.remove(this.me); } catch (e) { /* leaving anyway */ } });
    } catch (e) {
      this.failed = true;
      this.onStatus("solo");
    }
  }

  handle(snap, isNew) {
    if (snap.key === this.uid) return;
    const v = snap.val();
    if (!v || typeof v.x !== "number" || typeof v.z !== "number") return;
    const p = { x: v.x, z: v.z, r: v.r || 0, c: v.c || 0x9ec48b };
    this.peers.set(snap.key, p);
    if (isNew) this.onJoin(snap.key, p);
    else this.onMove(snap.key, p);
  }

  send(x, z, r) {
    if (!this.ready) return;
    const now = performance.now();
    if (now - this.last.at < 1000 / SEND_HZ) return;
    const still = Math.abs(x - this.last.x) < 0.03 &&
      Math.abs(z - this.last.z) < 0.03 &&
      Math.abs(r - this.last.r) < 0.03;
    if (still && now - this.last.at < 5000) return;
    this.last = { x, z, r, at: now };
    try {
      this.db.update(this.me, {
        x: Math.round(x * 100) / 100,
        z: Math.round(z * 100) / 100,
        r: Math.round(r * 100) / 100,
        c: this.color,
        t: this.db.serverTimestamp()
      });
    } catch (e) { /* a dropped frame of presence is not worth handling */ }
  }

  get count() { return this.peers.size + (this.ready ? 1 : 0); }
}

function tabId() {
  let id = sessionStorage.getItem("wyspy.tab");
  if (!id) {
    id = Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem("wyspy.tab", id);
  }
  return id;
}

export function pickColor() {
  const saved = localStorage.getItem("wyspy.color");
  if (saved) return parseInt(saved, 10);
  const hues = [0.02, 0.08, 0.13, 0.33, 0.46, 0.55, 0.62, 0.72, 0.85, 0.94];
  const h = hues[Math.floor(Math.random() * hues.length)];
  const c = hslToHex(h, 0.55, 0.55);
  localStorage.setItem("wyspy.color", String(c));
  return c;
}

function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))));
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}
