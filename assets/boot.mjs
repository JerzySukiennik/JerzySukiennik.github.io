/* Gzowo Labs boot: once per visit the plot appears like a drop falling into water, first in Mac System 7 black and white
   (Atkinson dithered, like the old Macs did it), then a second ripple brings the colour back. */

const root = document.documentElement;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function snapshot(world, mapCanvas, box, scale = 1, read = false) {
  const c = document.createElement("canvas");
  c.width = Math.round(box.w * scale); c.height = Math.round(box.h * scale);
  const x = c.getContext("2d", read ? { willReadFrequently: true } : undefined);
  x.setTransform(scale, 0, 0, scale, -box.x * scale, -box.y * scale);
  x.fillStyle = "#fff";
  x.fillRect(box.x, box.y, box.w, box.h);
  const mr = mapCanvas.getBoundingClientRect();
  if (mapCanvas.width) x.drawImage(mapCanvas, mr.left, mr.top, mr.width, mr.height);
  const items = [...world.querySelectorAll(".life-cloud, .wx-cloud, .spot .spr, .mural canvas")].map((e) => ({ e, z: parseInt((e.closest(".spot, .mural") || e).style.zIndex, 10) || 0 }));
  items.sort((a, b) => a.z - b.z);
  for (const { e } of items) {
    const r = e.getBoundingClientRect();
    if (r.bottom < box.y || r.top > box.y + box.h || r.right < box.x || r.left > box.x + box.w || !r.width) continue;
    try { x.drawImage(e, r.left, r.top, r.width, r.height); } catch (err) {}
  }
  return c;
}

function dither(rgba, W, H) {
  const n = W * H, lum = new Float32Array(n), out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const l = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
    lum[i] = Math.min(1, Math.max(0, (l - 0.5) * 1.35 + 0.56));
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, v = lum[i], b = v < 0.5 ? 0 : 1, e = (v - b) / 8;
      out[i] = b * 255;
      if (x + 1 < W) lum[i + 1] += e;
      if (x + 2 < W) lum[i + 2] += e;
      if (y + 1 < H) { if (x > 0) lum[i + W - 1] += e; lum[i + W] += e; if (x + 1 < W) lum[i + W + 1] += e; }
      if (y + 2 < H) lum[i + 2 * W] += e;
    }
  }
  return out;
}

const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}";
const FS = `precision highp float;
uniform sampler2D uTex;uniform vec2 uSize;uniform float uDpr,uR1,uR2;
void main(){
  vec2 px=vec2(gl_FragCoord.x,uSize.y*uDpr-gl_FragCoord.y)/uDpr;
  vec2 v=px-uSize*0.5;float d=length(v);vec2 dir=d>0.0?v/d:vec2(0.0);
  float w1=d-uR1,w2=d-uR2;
  float disp=7.0*sin(w1*0.3)*exp(-w1*w1/900.0)+2.5*sin(w1*0.22)*exp(min(w1,0.0)/70.0)*step(w1,0.0)+6.0*sin(w2*0.3)*exp(-w2*w2/600.0);
  vec2 q=clamp((px+dir*disp)/uSize,0.0,1.0);
  vec2 cell=floor(px);
  float chk=mod(cell.x+cell.y,2.0);
  float c=d>uR1?chk:texture2D(uTex,q).r;
  if(abs(w1)<1.3)c=0.0;
  if(w1<-5.0&&w1>-70.0&&sin(w1*0.3)>0.94&&chk<0.5)c=1.0-c;
  float a=1.0;
  if(d<uR2)a=0.0;
  if(abs(w2)<1.6){c=1.0;a=1.0;}
  if(w2<-3.0&&w2>-40.0&&sin(w2*0.3)>0.96){c=1.0;a=0.55;}
  gl_FragColor=vec4(vec3(c)*a,a);
}`;

function program(gl) {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("link");
  return p;
}

export async function playBoot({ world, mapCanvas, ready, desk }) {
  const cover = document.getElementById("boot");
  if (!cover || !root.classList.contains("booting")) { if (cover) cover.remove(); return; }
  cover.classList.add("is-live");
  const t0 = performance.now();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    cover.remove();
    root.classList.remove("booting");
    try { sessionStorage.setItem("gl-boot", "1"); } catch (e) {}
    if (desk) { desk.classList.add("is-arriving"); setTimeout(() => desk.classList.remove("is-arriving"), 900); }
  };
  setTimeout(finish, 12000);
  try {
    await Promise.race([ready, wait(5000)]);
    const imgs = [...world.querySelectorAll("img")].filter((i) => !i.complete);
    await Promise.race([Promise.all(imgs.map((i) => i.decode().catch(() => {}))), wait(1500)]);
    const left = 700 - (performance.now() - t0);
    if (left > 0) await wait(left);
    const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    const shot = snapshot(world, mapCanvas, { x: 0, y: 0, w: W, h: H }, 1, true);
    const bits = dither(shot.getContext("2d").getImageData(0, 0, W, H).data, W, H);
    const cv = document.createElement("canvas");
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) throw new Error("no webgl");
    const prog = program(gl);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, W, H, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, bits);
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
    const u = (n) => gl.getUniformLocation(prog, n);
    gl.uniform2f(u("uSize"), W, H);
    gl.uniform1f(u("uDpr"), cv.width / W);
    gl.viewport(0, 0, cv.width, cv.height);
    const uR1 = u("uR1"), uR2 = u("uR2"), max = Math.hypot(W, H) / 2 + 60;
    const draw = (r1, r2) => { gl.uniform1f(uR1, r1); gl.uniform1f(uR2, r2); gl.drawArrays(gl.TRIANGLES, 0, 3); };
    draw(0, -100);
    cover.append(cv);
    cover.style.background = "none";
    cover.classList.add("is-drop");
    const start = performance.now();
    const out = (x) => 1 - Math.pow(1 - x, 3), inout = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    await new Promise((res) => {
      const step = (now) => {
        const t = now - start;
        const r1 = t < 260 ? 0 : max * out(Math.min(1, (t - 260) / 1150));
        const r2 = t < 1350 ? -100 : max * inout(Math.min(1, (t - 1350) / 1050)) - 2;
        draw(r1, r2);
        if (t < 2450) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  } catch (e) {
    cover.classList.add("is-fade");
    await wait(350);
  } finally {
    finish();
  }
}
