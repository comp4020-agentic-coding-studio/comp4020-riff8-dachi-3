// The 3D handscroll. A long strip of paper in mist, ink-wash mountains far
// behind, and every stroke standing on the paper as a ribbon of ink, the
// first at the far left, the open end (now) at the right. Everything that is
// text (notes, times, "yours") also lives in the DOM; this file only paints.
import * as THREE from "three";
import { BOX, prng } from "./lib/shapes.js";

const PAPER = 0xefe7d6;
const RIBBON_W = 2.1;
const RIBBON_H = 2.5;
const RIBBON_BASE = 0.1;
const VIEW_RANGE = 46; // world units either side of the camera that get drawn
const DETAIL_RANGE = 16; // beyond this, a ribbon swaps to its low-detail mesh
const MAX_RIBBONS = 160;
const SEAL = new THREE.Color(0xa8322a);
// flattens a ribbon onto the paper, cast back and a little right
const SHADOW_MATRIX = new THREE.Matrix4().set(1, 0.3, 0, 0, 0, 0, 0, 0.006, 0, -0.55, 1, 0, 0, 0, 0, 1);

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- textures, all generated: nothing to download -----------------------

function paperTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#efe6d3";
  g.fillRect(0, 0, 512, 512);
  const r = prng(4020);
  for (let i = 0; i < 9000; i++) {
    const shade = 200 + Math.floor(r() * 50);
    g.fillStyle = `rgba(${shade},${shade - 12},${shade - 34},${0.05 + r() * 0.08})`;
    g.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2);
  }
  // fibres
  g.lineWidth = 0.6;
  for (let i = 0; i < 700; i++) {
    const x = r() * 512;
    const y = r() * 512;
    const a = r() * Math.PI;
    const l = 4 + r() * 18;
    g.strokeStyle = `rgba(150,128,96,${0.05 + r() * 0.08})`;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + r() * 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// A mountain range: a few broad peaks plus fractal noise for the ridge,
// washed from a dark crest into nothing, with dry-brush texture strokes.
function ridgeTexture(seed, roughness) {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 512;
  const g = c.getContext("2d");
  const r = prng(seed);
  const lattice = Array.from({ length: 256 }, () => r());
  // periodic in `period`, so the range tiles along the scroll without a seam
  const vnoise = (x, period, offset) => {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    const at = (k) => lattice[(((k % period) + period) % period + offset) & 255];
    return at(i) * (1 - u) + at(i + 1) * u;
  };
  const peaks = Array.from({ length: 5 }, () => ({ at: r(), w: 0.04 + r() * 0.1, h: 0.4 + r() * 0.6 }));
  // wraps at the texture's edges, since the range repeats along the scroll
  const ridge = (x) => {
    const u = x / 2048;
    let y = 0;
    for (const p of peaks) {
      for (const shift of [-1, 0, 1]) {
        const d = (u - p.at - shift) / p.w;
        y = Math.max(y, p.h * Math.exp(-d * d));
      }
    }
    let n = 0;
    let amp = 0.5;
    for (let o = 0; o < 5; o++) {
      n += amp * vnoise(u * 8 * 2 ** o, 8 * 2 ** o, o * 37);
      amp *= 0.5;
    }
    return 470 - (y * 0.75 + n * 0.45 * roughness) * 380;
  };
  for (let x = 0; x < 2048; x += 2) {
    const top = ridge(x);
    const grad = g.createLinearGradient(0, top, 0, 512);
    grad.addColorStop(0, "rgba(46,50,52,0.6)");
    grad.addColorStop(0.12, "rgba(70,76,78,0.32)");
    grad.addColorStop(0.5, "rgba(96,100,100,0.06)");
    grad.addColorStop(1, "rgba(96,100,100,0)");
    g.fillStyle = grad;
    g.fillRect(x, top, 2, 512 - top);
  }
  // cun: short dry-brush strokes down the slopes, the texture of the hills
  for (let i = 0; i < 500; i++) {
    const x = r() * 2048;
    const top = ridge(x);
    const y = top + 4 + r() * 60;
    g.strokeStyle = `rgba(36,38,40,${0.04 + r() * 0.08})`;
    g.lineWidth = 1 + r() * 2;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + (r() - 0.5) * 10, y + 10, x + (r() - 0.5) * 20, y + 14 + r() * 24);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function softDot() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function labelTexture(text, { color = "#f6efe2", bg = "#a8322a" } = {}) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const g = c.getContext("2d");
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(8, 8, 240, 80, 10);
  g.fill();
  g.fillStyle = color;
  g.font = "600 46px ui-serif, Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- the ink shader ------------------------------------------------------

const inkVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aBirth;
  attribute float aSeed;
  attribute float aId;
  attribute float aAge;
  uniform float uTime;
  uniform float uMotion;
  uniform float uHover;
  uniform float uFocus;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vGrow;
  varying float vSeed;
  varying float vLit;
  varying float vAge;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vColor = aColor;
    vSeed = aSeed;
    vAge = aAge;
    vGrow = clamp((uTime - aBirth) / 1.8, 0.0, 1.0);
    vLit = max(abs(aId - uHover) < 0.5 ? 1.0 : 0.0, abs(aId - uFocus) < 0.5 ? 0.6 : 0.0);
    vec3 p = position;
    float h = max(p.y, 0.0);
    p.x += uMotion * sin(uTime * 0.55 + aSeed * 6.2831 + p.y * 1.3) * 0.035 * h;
    p.z += uMotion * cos(uTime * 0.4 + aSeed * 3.1 + p.x) * 0.03 * h;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const inkFragment = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vGrow;
  varying float vSeed;
  varying float vLit;
  varying float vAge;
  #include <fog_pars_fragment>
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  void main() {
    if (vUv.x > vGrow) discard;
    float d = abs(vUv.y * 2.0 - 1.0);            // 0 at the spine, 1 at the bleed's edge
    float n = noise(vec2(vUv.x * 46.0, vUv.y * 3.0 + vSeed * 50.0));
    float fibre = noise(vec2(vUv.x * 140.0 + vSeed * 9.0, vUv.y * 18.0));
    // ragged core: the brush's body, with dry-brush streaks toward the tail
    float coreEdge = 0.42 + 0.14 * n;
    float core = 1.0 - smoothstep(coreEdge - 0.08, coreEdge + 0.04, d);
    float dry = smoothstep(0.55, 1.0, vUv.x) * smoothstep(0.35, 0.75, fibre);
    core *= 1.0 - dry * 0.85;
    // the wash: pigment that ran into the damp paper around the stroke,
    // wider and paler as the ink settles with age
    float bleedEdge = 0.75 + 0.25 * vAge;
    float wash = (1.0 - smoothstep(0.3, bleedEdge, d)) * (0.16 + 0.12 * vAge) * (0.7 + 0.6 * n);
    float alpha = max(core * (0.78 + 0.22 * fibre), wash);
    // the growing tip: freshly laid ink is wet and dark
    float tip = smoothstep(vGrow - 0.08, vGrow, vUv.x) * (1.0 - step(1.0, vGrow));
    vec3 settled = mix(vColor, vec3(dot(vColor, vec3(0.3, 0.55, 0.15))) * 0.9, 0.35 * vAge);
    vec3 col = mix(settled * 1.25, settled * 0.62, core);
    col = mix(col, vec3(0.08), tip * 0.6);
    col = mix(col, col * 0.55 + vec3(0.07, 0.03, 0.02), vLit * 0.5);
    alpha = clamp(alpha + vLit * 0.12 * core, 0.0, 1.0);
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(col, alpha);
    #include <fog_fragment>
  }
`;

// --- ribbon geometry -----------------------------------------------------

// A path in the pad's box (y down) to points standing on the paper.
function toLocal(path, seed) {
  if (path.length === 1) {
    const [x, y] = path[0];
    path = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2.2;
      return [x + Math.cos(a) * 28 * (0.4 + i / 12), y + Math.sin(a) * 28 * (0.4 + i / 12)];
    });
  }
  const r = prng(seed);
  const curl = 0.08 + r() * 0.18;
  const phase = r() * Math.PI * 2;
  // every stroke stands on the paper: its lowest point touches down
  const lowest = Math.max(...path.map(([, y]) => y));
  const lift = ((BOX - lowest) / BOX) * RIBBON_H;
  return path.map(([x, y], i) => {
    const t = path.length === 1 ? 0 : i / (path.length - 1);
    return new THREE.Vector3(
      (x / BOX - 0.5) * RIBBON_W,
      (1 - y / BOX) * RIBBON_H + RIBBON_BASE - lift,
      Math.sin(phase + t * Math.PI * 1.6) * curl,
    );
  });
}

// Extrude a centreline into a flat brushstroke whose width swells and tapers.
// The strip includes the wash around the ink; the shader paints the core in
// its middle 45% or so, which is what `scale` and `widen` fit the outline
// drawn behind your own strokes to.
export function ribbonGeometry(points3, seed, segments, widen = 0, scale = 1) {
  const curve =
    points3.length >= 2
      ? new THREE.CatmullRomCurve3(points3, false, "centripetal")
      : new THREE.CatmullRomCurve3([points3[0], points3[0].clone().add(new THREE.Vector3(0.01, 0, 0))]);
  const pts = curve.getSpacedPoints(segments);
  const r = prng(seed ^ 0x9e3779b9);
  const pressure = 0.85 + r() * 0.5;
  const n = pts.length;
  const positions = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  const index = [];
  const tangent = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    tangent.subVectors(b, a);
    tangent.z = 0;
    if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
    tangent.normalize();
    // brush body: heavy at the press, thin at the lift, a little wobble
    const press = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.04)), 0.55);
    const w = (0.035 + 0.1 * press * pressure) * (0.92 + 0.16 * Math.sin(t * 17 + seed)) * 1.6 * scale + widen;
    const p = pts[i];
    positions.set([p.x - tangent.y * w, p.y + tangent.x * w, p.z, p.x + tangent.y * w, p.y - tangent.x * w, p.z], i * 6);
    uvs.set([t, 0, t, 1], i * 4);
    if (i < n - 1) {
      const k = i * 2;
      index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

function constant(geo, name, size, values) {
  const count = geo.attributes.position.count;
  const arr = new Float32Array(count * size);
  for (let i = 0; i < count; i++) arr.set(values, i * size);
  geo.setAttribute(name, new THREE.BufferAttribute(arr, size));
}

// --- the scene -----------------------------------------------------------

export function createScene(canvas, callbacks = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAPER);
  scene.fog = new THREE.FogExp2(PAPER, 0.052);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 140);
  const t0 = performance.now();
  const clock = { getElapsedTime: () => (performance.now() - t0) / 1000 };

  const inkMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uTime: { value: 0 }, uMotion: { value: 1 }, uHover: { value: -1 }, uFocus: { value: -1 } },
    ]),
    vertexShader: inkVertex,
    fragmentShader: inkFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: SEAL,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const dot = softDot();
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x3a2e22,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const poolGeometry = new THREE.CircleGeometry(0.42, 24);
  const poolMaterial = new THREE.MeshBasicMaterial({
    map: dot,
    color: 0x2b2118,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });

  // paper, mounted on silk, with rollers at both ends
  const paperTex = paperTexture();
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 7.2),
    new THREE.MeshBasicMaterial({ map: paperTex, color: 0xfffaf0 }),
  );
  paper.rotation.x = -Math.PI / 2;
  paper.renderOrder = -3;
  scene.add(paper);
  const silk = new THREE.Mesh(new THREE.PlaneGeometry(1, 8.4), new THREE.MeshBasicMaterial({ color: 0x8c9a94 }));
  silk.rotation.x = -Math.PI / 2;
  silk.position.y = -0.01;
  silk.renderOrder = -4;
  scene.add(silk);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x6d5a48, 2.2));
  const wood = new THREE.MeshLambertMaterial({ color: 0x5a3e2b });
  const rollerGeo = new THREE.CylinderGeometry(0.34, 0.34, 8.8, 24);
  const startRoller = new THREE.Mesh(rollerGeo, wood);
  startRoller.rotation.x = Math.PI / 2;
  startRoller.position.y = 0.34;
  const endRoller = startRoller.clone();
  // the unpainted remainder, still rolled up at the open end
  const rolled = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 7.2, 32), new THREE.MeshLambertMaterial({ map: paperTex, color: 0xf3ebdb }));
  rolled.rotation.x = Math.PI / 2;
  rolled.position.y = 0.5;
  scene.add(startRoller, endRoller, rolled);

  // ink-wash mountains, three ranges deep in the mist
  const ranges = [
    { z: -13, h: 6, seed: 11, rough: 0.8, color: 0x7a827e, y: -0.3, rep: 3.6 },
    { z: -22, h: 10, seed: 23, rough: 1.0, color: 0x939a95, y: -0.8, rep: 4.2 },
    { z: -34, h: 16, seed: 37, rough: 1.2, color: 0xb0b5ae, y: -1.6, rep: 4.8 },
  ].map((r) => {
    const tex = ridgeTexture(r.seed, r.rough);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, r.h),
      new THREE.MeshBasicMaterial({ map: tex, color: r.color, transparent: true, depthWrite: false, fog: true }),
    );
    mesh.position.set(0, r.y + r.h / 2, r.z);
    mesh.renderOrder = -5;
    mesh.userData.h = r.h;
    mesh.userData.rep = r.rep;
    scene.add(mesh);
    return mesh;
  });

  // mist drifting low over the paper
  const MIST = 140;
  const mistPos = new Float32Array(MIST * 3);
  const mistR = prng(99);
  for (let i = 0; i < MIST; i++) mistPos.set([(mistR() - 0.5) * 70, 0.2 + mistR() * 2.6, (mistR() - 0.5) * 16 - 2], i * 3);
  const mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute("position", new THREE.BufferAttribute(mistPos, 3));
  const mist = new THREE.Points(
    mistGeo,
    new THREE.PointsMaterial({ map: dot, size: 3.4, color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false, sizeAttenuation: true }),
  );
  mist.renderOrder = 5;
  scene.add(mist);

  // a faint thread across the paper where a returning visitor left off
  const boundary = new THREE.Group();
  const thread = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 7.2), new THREE.MeshBasicMaterial({ color: SEAL, transparent: true, opacity: 0.7 }));
  thread.rotation.x = -Math.PI / 2;
  thread.position.y = 0.02;
  const boundaryLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture("you left here", { bg: "rgba(168,50,42,0.85)" }), transparent: true }));
  boundaryLabel.scale.set(1.5, 0.56, 1);
  boundaryLabel.position.set(0, 2.8, -3);
  boundary.add(thread, boundaryLabel);
  boundary.visible = false;
  scene.add(boundary);

  const ribbons = new Map(); // id -> { group, mesh, pos, mark, hi, lo, lod }
  const ribbonList = [];
  let you = null;
  let extent = { start: 0, openEnd: 0 };
  let camX = 0;
  let targetX = 0;
  let lastReportedX = NaN;
  let running = true;
  let frameRequested = false;

  const yoursLabel = labelTexture("yours");
  const residentLabel = labelTexture("resident", { bg: "rgba(70,74,76,0.85)" });

  function birthNow() {
    return clock.getElapsedTime();
  }

  function buildRibbon(mark, pos, { grow = false, age = 0 } = {}) {
    const local = toLocal(mark.path, mark.seed);
    const color = new THREE.Color(mark.color);
    const hi = ribbonGeometry(local, mark.seed, Math.min(140, Math.max(24, local.length * 3)));
    const lo = ribbonGeometry(local, mark.seed, 12);
    for (const geo of [hi, lo]) {
      constant(geo, "aColor", 3, [color.r, color.g, color.b]);
      constant(geo, "aBirth", 1, [grow && !reducedMotion() ? birthNow() : -100]);
      constant(geo, "aSeed", 1, [(mark.seed % 10007) / 10007]);
      constant(geo, "aId", 1, [mark.id]);
      constant(geo, "aAge", 1, [age]);
    }
    const group = new THREE.Group();
    group.position.set(pos.x, 0, pos.z);
    const mesh = new THREE.Mesh(hi, inkMaterial);
    mesh.userData.id = mark.id;
    // a soft wash of shadow on the paper behind the ribbon, so it stands
    const shadow = new THREE.Mesh(lo, shadowMaterial);
    shadow.matrixAutoUpdate = false;
    shadow.matrix.copy(SHADOW_MATRIX);
    shadow.renderOrder = -2;
    // and a pool where the brush touched down
    const foot = local.reduce((a, b) => (b.y < a.y ? b : a));
    const pool = new THREE.Mesh(poolGeometry, poolMaterial);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(foot.x, 0.004, foot.z);
    pool.scale.setScalar(0.5 + (mark.seed % 7) / 14);
    pool.renderOrder = -2;
    group.add(shadow, pool, mesh);
    const entry = { group, mesh, pos, mark, hi, lo, lod: "hi", extras: [] };
    decorate(entry);
    scene.add(group);
    ribbons.set(mark.id, entry);
    ribbonList.push(entry);
    return entry;
  }

  // Your own ribbons get a seal-red outline and a "yours" seal; resident
  // hands get a grey "resident" one. Both are also said in text in the DOM.
  function decorate(entry) {
    for (const extra of entry.extras) entry.group.remove(extra);
    entry.extras = [];
    const mine = you && entry.mark.handle === you;
    if (mine) {
      const outline = new THREE.Mesh(ribbonGeometry(toLocal(entry.mark.path, entry.mark.seed), entry.mark.seed, 60, 0.03, 0.45), outlineMaterial);
      outline.position.z = -0.012;
      outline.renderOrder = -1;
      entry.extras.push(outline);
    }
    if (mine || entry.mark.resident) {
      const seal = new THREE.Sprite(new THREE.SpriteMaterial({ map: mine ? yoursLabel : residentLabel, transparent: true, depthWrite: false }));
      seal.scale.set(0.62, 0.23, 1);
      seal.position.set(RIBBON_W / 2 + 0.05, 0.22, 0.2);
      entry.extras.push(seal);
    }
    for (const extra of entry.extras) entry.group.add(extra);
  }

  function clearRibbons() {
    for (const entry of ribbonList) {
      scene.remove(entry.group);
      entry.hi.dispose();
      entry.lo.dispose();
    }
    ribbons.clear();
    ribbonList.length = 0;
  }

  function setExtent(next) {
    extent = next;
    const left = extent.start - 6;
    const right = extent.openEnd + 9;
    const len = right - left;
    paper.scale.x = len;
    paper.position.x = left + len / 2;
    paperTex.repeat.set(len / 7.2, 1);
    silk.scale.x = len + 0.6;
    silk.position.x = paper.position.x;
    startRoller.position.x = left - 0.3;
    rolled.position.x = right - 0.5;
    endRoller.position.x = right + 0.25;
    for (const range of ranges) {
      const w = len + 160;
      range.scale.x = w;
      range.position.x = paper.position.x;
      range.material.map.repeat.set(w / (range.userData.h * range.userData.rep), 1);
    }
  }

  // --- camera ------------------------------------------------------------

  function clampX(x) {
    return Math.max(extent.start - 3, Math.min(extent.openEnd + 3, x));
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestFrame();
  }

  function placeCamera() {
    const narrow = camera.aspect < 1;
    const back = narrow ? 8.8 : 5.8;
    camera.position.set(camX - (narrow ? 0.4 : 1.5), narrow ? 2.3 : 1.75, back);
    camera.lookAt(camX + (narrow ? 0.2 : 0.5), 1.1, -0.5);
  }

  // world units per screen pixel, at the paper's middle depth
  function unitsPerPixel() {
    const dist = camera.position.z;
    const visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    return visibleH / canvas.clientHeight;
  }

  // --- picking -----------------------------------------------------------

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const meshes = ribbonList.filter((e) => e.group.visible).map((e) => e.mesh);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? hit.object.userData.id : null;
  }

  let hoverId = null;
  function setHover(id, clientX, clientY) {
    if (id !== hoverId) {
      hoverId = id;
      inkMaterial.uniforms.uHover.value = id ?? -1;
      requestFrame();
    }
    callbacks.onHover?.(id, clientX, clientY);
  }

  let drag = null;
  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag = { id: event.pointerId, x0: event.clientX, x: event.clientX, y0: event.clientY, moved: false, t: performance.now() };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (drag && event.pointerId === drag.id) {
      const dx = event.clientX - drag.x;
      drag.x = event.clientX;
      if (Math.abs(event.clientX - drag.x0) + Math.abs(event.clientY - drag.y0) > 6) drag.moved = true;
      if (drag.moved) {
        targetX = clampX(targetX - dx * unitsPerPixel() * 1.6);
        callbacks.onUserMove?.();
        requestFrame();
      }
      return;
    }
    if (event.pointerType === "mouse") setHover(pick(event.clientX, event.clientY), event.clientX, event.clientY);
  });
  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved && event.type === "pointerup") {
      const id = pick(event.clientX, event.clientY);
      setHover(id, event.clientX, event.clientY);
      if (id !== null) callbacks.onPick?.(id);
    }
    drag = null;
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse" && !drag) setHover(null);
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const next = clampX(targetX + delta * 0.012);
      if (next === targetX) return; // at an end: let the page scroll
      event.preventDefault();
      targetX = next;
      callbacks.onUserMove?.();
      requestFrame();
    },
    { passive: false },
  );

  // --- per-frame ---------------------------------------------------------

  // Only ribbons near the camera are drawn, and far ones at low detail.
  function updateVisibility() {
    const near = [];
    for (const entry of ribbonList) {
      const d = Math.abs(entry.pos.x - camX);
      if (d < VIEW_RANGE && !entry.hidden) near.push([d, entry]);
      else entry.group.visible = false;
    }
    near.sort((a, b) => a[0] - b[0]);
    near.forEach(([d, entry], i) => {
      entry.group.visible = i < MAX_RIBBONS;
      const lod = d > DETAIL_RANGE ? "lo" : "hi";
      if (lod !== entry.lod) {
        entry.mesh.geometry = entry[lod];
        entry.lod = lod;
      }
    });
  }

  const extraFrames = new Set();
  function frame() {
    frameRequested = false;
    if (!running) return;
    const motion = reducedMotion() ? 0 : 1;
    const t = clock.getElapsedTime();
    inkMaterial.uniforms.uTime.value = t;
    inkMaterial.uniforms.uMotion.value = motion;

    const ease = motion ? 0.09 : 1;
    camX += (targetX - camX) * ease;
    if (Math.abs(targetX - camX) < 0.001) camX = targetX;
    placeCamera();
    updateVisibility();

    mist.position.x = Math.floor(camX / 70) * 70;
    if (motion) {
      const arr = mistGeo.attributes.position.array;
      for (let i = 0; i < MIST; i++) {
        arr[i * 3] += 0.004 + (i % 7) * 0.0007;
        if (arr[i * 3] > 35 + (camX - mist.position.x)) arr[i * 3] -= 70;
        if (arr[i * 3] < -35 + (camX - mist.position.x)) arr[i * 3] += 70;
      }
      mistGeo.attributes.position.needsUpdate = true;
    }
    for (const fn of extraFrames) fn(t, motion);

    renderer.render(scene, camera);
    if (camX !== lastReportedX) {
      lastReportedX = camX;
      callbacks.onCamera?.(camX);
    }
    // Keep animating while anything moves; otherwise rest until asked.
    if (motion || camX !== targetX) requestFrame();
  }

  function requestFrame() {
    if (frameRequested || !running) return;
    frameRequested = true;
    requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    running = document.visibilityState === "visible";
    if (running) requestFrame();
  });
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", requestFrame);
  new ResizeObserver(resize).observe(canvas);
  resize();

  const projected = new THREE.Vector3();

  return {
    THREE,
    scene,
    camera,
    get x() {
      return camX;
    },
    get narrow() {
      return camera.aspect < 1;
    },
    get targetX() {
      return targetX;
    },
    setYou(handle) {
      you = handle;
      for (const entry of ribbonList) decorate(entry);
      requestFrame();
    },
    setMarks(marks, lay, ages = new Map()) {
      clearRibbons();
      marks.forEach((mark, i) => buildRibbon(mark, lay.positions[i], { age: ages.get(mark.id) ?? 0 }));
      setExtent(lay);
      requestFrame();
    },
    addMark(mark, pos, lay, { grow = true } = {}) {
      if (ribbons.has(mark.id)) return;
      buildRibbon(mark, pos, { grow });
      setExtent(lay);
      requestFrame();
    },
    setExtent(lay) {
      setExtent(lay);
      requestFrame();
    },
    setAge(id, age) {
      const entry = ribbons.get(id);
      if (!entry) return;
      for (const geo of [entry.hi, entry.lo]) {
        geo.attributes.aAge.array.fill(age);
        geo.attributes.aAge.needsUpdate = true;
      }
    },
    // Hide or show a ribbon (Play mode reveals them as the camera arrives).
    setHidden(id, hidden, { grow = false } = {}) {
      const entry = ribbons.get(id);
      if (!entry) return;
      entry.hidden = hidden;
      if (!hidden && grow) {
        for (const geo of [entry.hi, entry.lo]) {
          geo.attributes.aBirth.array.fill(reducedMotion() ? -100 : birthNow());
          geo.attributes.aBirth.needsUpdate = true;
        }
      }
      requestFrame();
    },
    ribbon: (id) => ribbons.get(id),
    goTo(x, { instant = false } = {}) {
      targetX = clampX(x);
      if (instant) camX = targetX;
      requestFrame();
    },
    nudge(dx) {
      targetX = clampX(targetX + dx);
      requestFrame();
    },
    setFocus(id) {
      inkMaterial.uniforms.uFocus.value = id ?? -1;
      requestFrame();
    },
    setBoundary(x) {
      boundary.visible = x !== null;
      if (x !== null) boundary.position.x = x;
      requestFrame();
    },
    toScreen(x, y, z) {
      projected.set(x, y, z).project(camera);
      const rect = canvas.getBoundingClientRect();
      return { x: ((projected.x + 1) / 2) * rect.width, y: ((1 - projected.y) / 2) * rect.height, visible: projected.z < 1 };
    },
    onFrame(fn) {
      extraFrames.add(fn);
      requestFrame();
      return () => extraFrames.delete(fn);
    },
    requestFrame,
    softDot: dot,
  };
}
