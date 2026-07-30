/* Gzowo Labs — the meadow.
   Five layers of grass with the wind running through them, drawn as one fullscreen
   fragment shader. One draw call per frame, so it stays cheap on an Intel Radeon. */

(() => {
  'use strict';

  const canvas = document.getElementById('bg');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { canvas.style.display = 'none'; return; }

  const VERT = 'attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }';

  const FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'float hash12(vec2 p){',
    '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
    '  p3 += dot(p3, p3.yzx + 33.33);',
    '  return fract((p3.x + p3.y) * p3.z);',
    '}',
    'float vnoise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float a = hash12(i);',
    '  float b = hash12(i + vec2(1.0, 0.0));',
    '  float c = hash12(i + vec2(0.0, 1.0));',
    '  float d = hash12(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
    '}',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes.xy;',
    '  float ar = uRes.x / uRes.y;',
    '  float t = uTime;',
    '  vec3 paper = vec3(0.980, 0.980, 0.972);',
    '  vec3 col = mix(vec3(0.929, 0.949, 0.878), paper, smoothstep(0.10, 0.95, uv.y));',
    '  vec2 sun = vec2(0.80, 0.80);',
    '  float sd = length((uv - sun) * vec2(ar, 1.0));',
    '  col += vec3(1.0, 0.85, 0.45) * 0.22 * exp(-sd * 3.2);',
    // far layers first, the dark row at your feet last
    '  for (int j = 0; j < 5; j++){',
    '    float z = 1.0 - float(j) / 4.0;',
    '    float near = 1.0 - z;',
    '    float wind = sin(t * (0.20 + 0.40 * near) + z * 4.0 + uv.x * 3.0) * 0.006 * near',
    '               + vnoise(vec2(uv.x * 2.0 + t * 0.11, z * 11.0)) * 0.007 * near;',
    '    float h = 0.020 + 0.115 * near * near;',
    '    h += 0.020 * vnoise(vec2(uv.x * 3.5 + z * 17.0, z * 3.0));',
    '    h += vnoise(vec2(uv.x * (60.0 + 55.0 * near) + z * 31.0, z * 7.0)) * 0.034 * (0.35 + 0.65 * near);',
    '    float y = uv.y + wind;',
    '    float m = 1.0 - smoothstep(h - 0.0022, h + 0.0022, y);',
    '    vec3 pine = vec3(0.161, 0.318, 0.145);',
    '    vec3 haze = mix(vec3(0.451, 0.612, 0.271), paper, 0.66);',
    '    col = mix(col, mix(pine, haze, z * z), m);',
    '  }',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.style.display = 'none'; return; }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.style.display = 'none'; return; }
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, 'uRes');
  const uTime = gl.getUniformLocation(program, 'uTime');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  let clock = 0;
  let last = performance.now();
  let running = true;

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });

  function draw() {
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, clock);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    clock += dt;
    draw();
    requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    clock = 4.2;            // one still frame of a meadow, no motion
    draw();
    window.addEventListener('resize', () => { resize(); draw(); });
  } else {
    requestAnimationFrame(frame);
  }
})();
