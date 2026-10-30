/* Gzowo Labs glass: while it rains, drops land on the screen like on a window, grow, merge and run down leaving little trails, then dry up.
   The drops are simulated in JS and drawn with WebGL: first a water map of every drop, then each drop shows the plot behind it upside down. */

const HALO = 1.4, M = 64, MAXR = 26;
const R = (a, b) => a + Math.random() * (b - a);

const VS_DROP = `attribute vec4 d;uniform vec2 uF;uniform float uPx;varying float vR,vS;
void main(){vec2 p=(d.xy+${M}.0)/uF;gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.0,1.0);gl_PointSize=d.z*d.w*${(2 * HALO).toFixed(1)}*uPx;vR=d.z;vS=d.w;}`;
const FS_DROP = `precision mediump float;varying float vR,vS;
void main(){
  vec2 q=(gl_PointCoord-0.5)*${(2 * HALO).toFixed(1)}*vec2(vS,1.0);
  q.x*=1.0+max(-q.y,0.0)*(vS-1.0)*0.6;
  float d=length(q);
  if(d>${HALO.toFixed(1)})discard;
  gl_FragColor=vec4(q/max(d,1.0)*0.5+0.5,min(vR/32.0,1.0),smoothstep(${HALO.toFixed(1)},0.55,d));
}`;
const VS_COMP = "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}";
const FS_COMP = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uW,uS;uniform vec2 uV,uF,uSz,uO;uniform float uPx,uA;
void main(){
  vec2 c=vec2(gl_FragCoord.x,uV.y*uPx-gl_FragCoord.y)/uPx;
  vec4 w=texture2D(uW,vec2((c.x+${M}.0)/uF.x,1.0-(c.y+${M}.0)/uF.y));
  if(w.a<0.34){gl_FragColor=vec4(0.0);return;}
  vec3 v=w.rgb/w.a;
  vec2 n=v.xy*2.0-1.0;
  float m=smoothstep(0.37,0.49,w.a),l=min(length(n),1.0);
  vec3 col=texture2D(uS,clamp((c+uO-n*(12.0+v.z*96.0))/uSz,0.0,1.0)).rgb;
  col=(col*1.08+0.03)*(1.0-0.5*smoothstep(0.8,1.0,l));
  vec3 N=vec3(n,sqrt(1.0-l*l));
  col+=pow(max(dot(N,normalize(vec3(-0.45,-0.6,0.66))),0.0),28.0)*0.85;
  col+=pow(max(dot(N,normalize(vec3(0.3,0.75,0.6))),0.0),6.0)*0.07;
  gl_FragColor=vec4(col*m,m)*uA;
}`;

export function createGlass(world) {
  const cv = document.createElement("canvas");
  cv.className = "wx-glass";
  cv.setAttribute("aria-hidden", "true");
  const gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return null;

  const program = (vs, fs) => {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p, u, a: gl.getAttribLocation(p, vs.includes("vec4 d") ? "d" : "p") };
  };
  let pd, pc;
  try { pd = program(VS_DROP, FS_DROP); pc = program(VS_COMP, FS_COMP); } catch (e) { return null; }

  const tri = gl.createBuffer(), buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const tex = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
    return t;
  };
  const water = tex(), scene = tex(), fbo = gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D, scene);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([90, 110, 130, 255]));
  const maxPoint = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64;

  let W = 0, H = 0, px = 1, FW = 0, FH = 0, SW = 1, SH = 1, rate = 0, shown = false;
  let data = new Float32Array(4096);
  const big = [], mist = [], acc = { big: 0, mist: 0 };
  world.append(cv);

  function resize() {
    W = innerWidth;
    H = Math.max(1, cv.getBoundingClientRect().height || innerHeight);
    px = Math.min(1.5, devicePixelRatio || 1);
    cv.width = Math.round(W * px); cv.height = Math.round(H * px);
    FW = W + 2 * M; FH = H + 2 * M;
    gl.bindTexture(gl.TEXTURE_2D, water);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Math.round(FW * px), Math.round(FH * px), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, water, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function show(on) {
    if (shown === on) return;
    shown = on;
    cv.classList.toggle("on", on);
    if (on) resize();
  }

  function spawn(x, y, r) {
    for (const d of big) {
      const k = (d.r + r) * 0.8;
      if (Math.abs(d.x - x) < k && Math.abs(d.y - y) < k * d.s && Math.hypot(d.x - x, (d.y - y) / d.s) < k) { d.r = Math.min(MAXR, Math.hypot(d.r, r)); return; }
    }
    big.push({ x, y, r, v: 0, s: 1, w: 0, ty: y });
  }

  function grid(list, size) {
    const g = new Map();
    list.forEach((d) => { const k = Math.floor(d.x / size) + "," + Math.floor(d.y / size); const c = g.get(k); if (c) c.push(d); else g.set(k, [d]); });
    return (x, y, rad, f) => {
      for (let gx = Math.floor((x - rad) / size); gx <= Math.floor((x + rad) / size); gx++)
        for (let gy = Math.floor((y - rad) / size); gy <= Math.floor((y + rad) / size); gy++) (g.get(gx + "," + gy) || []).forEach(f);
    };
  }

  function step(dt) {
    const A = (W * H) / 1e6;
    if (rate > 0) {
      acc.big += dt * A * [0, 14, 24, 38][rate];
      acc.mist += dt * A * [0, 150, 240, 340][rate];
      for (; acc.big >= 1; acc.big--) if (big.length < 230 * A + 20) spawn(R(-8, W + 8), R(-12, H), Math.random() < 0.12 ? R(8, 13) : 2 + 6.5 * Math.random() ** 1.6);
      for (; acc.mist >= 1; acc.mist--) if (mist.length < 1500 * A + 120) mist.push({ x: R(0, W), y: R(0, H), r: R(0.55, 2) });
    }
    const dry = rate === 0;
    for (const d of big) {
      if (dry) d.r -= dt * (0.32 + d.r * 0.035);
      if (d.v === 0) {
        if (d.r > 5.2 && Math.random() < (d.r - 4.6) * 0.05 * dt) { d.v = 26 + d.r * 4; d.ty = d.y; }
      } else {
        d.v += (d.r - 3.4) * 26 * dt;
        d.v *= Math.pow(0.32, dt);
        if (d.r < 4.2 || (d.v < 16 && Math.random() < 2.2 * dt)) d.v = 0;
        d.w = (d.w + R(-1, 1) * 90 * dt) * Math.pow(0.08, dt);
        d.x += d.w * dt;
        d.y += d.v * dt;
        if (d.y - d.ty > d.r * 1.25) {
          d.ty = d.y;
          if (Math.random() < 0.85) {
            const tr = d.r * R(0.15, 0.3);
            mist.push({ x: d.x + R(-0.25, 0.25) * d.r, y: d.y - d.r * d.s * 1.05, r: tr });
            d.r = Math.sqrt(Math.max(0, d.r * d.r - tr * tr * 0.5));
          }
        }
      }
      d.s += (1 + Math.min(0.28, d.v / 420) - d.s) * Math.min(1, dt * 8);
    }
    const near = grid(big, 48), wet = grid(mist, 24);
    for (const d of big) {
      if (d.v === 0 || d.dead) continue;
      near(d.x, d.y, d.r * 2 + MAXR, (e) => {
        if (e === d || e.dead || d.dead) return;
        if (Math.hypot(e.x - d.x, (e.y - d.y) / Math.max(d.s, e.s)) < (d.r + e.r) * 0.72) {
          const [a, b] = e.r > d.r * 1.4 ? [e, d] : [d, e];
          a.r = Math.min(MAXR, Math.hypot(a.r, b.r));
          a.v = Math.max(a.v, b.v) * 0.9 + 6;
          a.ty = a.y;
          b.dead = true;
        }
      });
      if (d.dead) continue;
      wet(d.x, d.y, d.r * d.s + 3, (m) => {
        if (!m.dead && Math.hypot(m.x - d.x, (m.y - d.y) / d.s) < d.r * 1.02 + m.r) { m.dead = true; d.r = Math.min(MAXR, Math.hypot(d.r, m.r * 0.35)); }
      });
    }
    for (const m of mist) m.r -= dt * (dry ? 0.24 : 0.035);
    for (let i = big.length - 1; i >= 0; i--) { const d = big[i]; if (d.dead || d.r < 0.6 || d.y - d.r * d.s * HALO > H + M - 2) big.splice(i, 1); }
    for (let i = mist.length - 1; i >= 0; i--) if (mist[i].dead || mist[i].r < 0.4) mist.splice(i, 1);
  }

  function draw(ox, oy) {
    const n = mist.length + big.length;
    if (data.length < n * 4) data = new Float32Array(Math.ceil(n * 1.5) * 4);
    const lim = maxPoint / (2 * HALO * px);
    let i = 0;
    for (const m of mist) { data[i++] = m.x; data[i++] = m.y; data[i++] = m.r; data[i++] = 1; }
    big.sort((a, b) => a.r - b.r);
    for (const d of big) { data[i++] = d.x; data[i++] = d.y; data[i++] = Math.min(d.r, lim / d.s); data[i++] = d.s; }

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, Math.round(FW * px), Math.round(FH * px));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(pd.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, i), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(pd.a);
    gl.vertexAttribPointer(pd.a, 4, gl.FLOAT, false, 0, 0);
    gl.uniform2f(pd.u.uF, FW, FH);
    gl.uniform1f(pd.u.uPx, px);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.POINTS, 0, i / 4);
    gl.disable(gl.BLEND);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(pc.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, tri);
    gl.enableVertexAttribArray(pc.a);
    gl.vertexAttribPointer(pc.a, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, water);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, scene);
    gl.uniform1i(pc.u.uW, 0); gl.uniform1i(pc.u.uS, 1);
    gl.uniform2f(pc.u.uV, W, H); gl.uniform2f(pc.u.uF, FW, FH);
    gl.uniform2f(pc.u.uSz, SW, SH); gl.uniform2f(pc.u.uO, ox, oy);
    gl.uniform1f(pc.u.uPx, px); gl.uniform1f(pc.u.uA, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return {
    rain(level) { rate = level; if (level) show(true); },
    scene(c, w, h) {
      SW = w; SH = h;
      gl.bindTexture(gl.TEXTURE_2D, scene);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    },
    frame(dt, ox, oy) {
      if (!shown) return false;
      step(Math.min(dt, 0.05));
      if (!rate && !big.length && !mist.length) { show(false); return false; }
      draw(ox, oy);
      return true;
    },
    resize() { if (shown) resize(); },
    clear() { rate = 0; big.length = 0; mist.length = 0; show(false); },
  };
}
