import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { createAnimator } from './anim.js';
import { createShoot } from './shoot.js';

// Масштаб: этаж = 1 единица высоты, сторона этажа = sqrt(параметры слоя) / SIDE_DIV.
// Тогда объём здания пропорционален параметрам FFN.
const FLOOR_H = 1;
const SIDE_DIV = 4000;
const BAND_BASE = 2;      // толщина ленты при 128k
const BAND_STEP = 1.5;    // прибавка за каждое удвоение контекста
const BAND_PAD = 1;       // ленты чуть шире самого широкого этажа
const GAP = 14;           // между зданиями в квартале
const CLOSED_GAP = 34;    // между открытыми моделями и прикидками закрытых
const QUARTER_PAD = 6;
const STREET = 48;        // улица между кварталами: рядом, но не впритык
const GLASS_ALPHA = 0.35; // прозрачность негорящих клеток MoE-этажей
const GHOST_ALPHA = 0.3; // прозрачность силуэта-прикидки
const ANNEX_H = 6;        // высота склада эмбеддингов
const ANNEX_GAP = 1.5;
const DECAL_W = 72;      // ширина надписи провайдера на земле

const FORMATS = {
  text:  { name: 'Text',       color: '#9a9890' },
  image: { name: 'Image', color: '#8b7fe8' },
  audio: { name: 'Audio',       color: '#e0663a' },
  video: { name: 'Video',       color: '#d4537e' },
  file:  { name: 'Files',       color: '#3fb08f' },
  series:{ name: 'Series',       color: '#4fa3d9' },
  vector:{ name: 'Vectors',     color: '#c9b458' },   // эмбеддинги
  score: { name: 'Score',      color: '#b0788f' },   // число релевантности у ранкеров
};

// Форма основания = чем занимается модель. Площадь этажа одна и та же при любой форме.
const KINDS = {
  llm:      { name: 'Language',        sides: 4 },
  speech:   { name: 'Speech & audio',     sides: 48 },
  image:    { name: 'Image',     sides: 6 },
  video:    { name: 'Video',           sides: 8 },
  forecast: { name: 'Forecasting',        sides: 5 },
  utility:  { name: 'Utility',       sides: 3 },
};
const kindOf = (m) => KINDS[m.kind] || KINDS.llm;
const PROVIDER_COLORS = ['#4f8cc9', '#8a6fd1', '#3fa38a', '#d0763f', '#c9a23a', '#c95a7a', '#6aa84f', '#5aa9b8'];

const THEMES = {
  dark:  { bg: '#0b1018', wall: '#3a4558', edge: '#8ea3c0', edgeSel: '#58b4ff', retrain: '#74d4b4', emissive: 1.0, ground: '#111826', plate: 0.22, hemi: 1.4, dir: 1.1, sign: '#c3cddc' },
  light: { bg: '#f4f2ec', wall: '#f2efe8', edge: '#4a5260', edgeSel: '#1f6fc4', retrain: '#0b8f63', emissive: 0.25, ground: '#e9e6de', plate: 0.25, hemi: 1.6, dir: 1.0, sign: '#3a404a' },
};
const LIT = '#ffc94d';
const LIT_ENCODER = '#7fd8ff';   // энкодеры светятся холодным, декодеры — тёплым
const REC = '#ff3b3b';
const LOOP = '#c792ff';          // рекуррентное ядро           // точка записи на крыше realtime-модели

const state = {
  theme: 'dark',
  fog: false,
  selected: null,
  focus: null,      // здание, на котором идёт показ работы: остальные приглушены
  filters: { search: '', providers: new Set(), kinds: new Set(), inputs: new Set(), open: 'all', fresh: 'all' },
};

let data, asOf;
const buildings = [];   // { model, group, meshes, edges, materials, label, height, W }
const pickables = [];

// ---------- сцена ----------

const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
container.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 30000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = 1.35;
controls.screenSpacePanning = false;
controls.minDistance = 20;
controls.maxDistance = 1500;

const hemi = new THREE.HemisphereLight(0xffffff, 0x445066, 1.4);
scene.add(hemi);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(1, 2.2, 1.6);
scene.add(dirLight);

// Земля не пишет глубину и рисуется первой: плиты кварталов и надписи лежат на ней
// почти в одной плоскости и иначе мигают при повороте камеры.
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshBasicMaterial({ depthWrite: false }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
ground.renderOrder = -3;
scene.add(ground);

// ---------- утилиты ----------

function rng(seed) {
  let s = 0;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  s = s || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

const bandThickness = (ctx) => BAND_BASE + BAND_STEP * Math.max(0, Math.log2(ctx / 131072));
const runLayerParams = (r) => r.ffn_per_expert * ((r.experts || 1) + (r.shared || 0));
const runSide = (r) => Math.sqrt(runLayerParams(r)) / SIDE_DIV;

// ---------- текстуры этажей ----------

const CW = 8, RH = 6;

// Фасад: строки — этажи, столбцы — эксперты по краю сетки этажа.
// Карта цвета: стена серая, горящие клетки жёлтые; карта свечения — только горящие клетки.
// faces — сколько сторон квадрата покрывает текстура: у многоугольников она обходит весь периметр.
function facadeTextures(run, rand, faces = 1, litColor = LIT) {
  const dense = run.kind === 'dense';
  const n = dense ? 1 : Math.ceil(Math.sqrt(run.experts + run.shared));
  const cols = (dense ? 1 : n) * faces;
  const cw = dense ? 32 : CW;
  const w = cols * cw, h = run.count * RH;
  const p = dense ? 1 : (run.active + run.shared) / (run.experts + run.shared);
  const lit = [];
  for (let f = 0; f < run.count; f++) for (let i = 0; i < cols; i++) if (rand() < p) lit.push([f, i]);

  // У MoE-этажей стекло: негорящие клетки полупрозрачные, сквозь них видны плотные слои.
  const map = canvasTex(w, h, (g) => {
    g.fillStyle = dense ? '#d0d0d0' : `rgba(208,208,208,${GLASS_ALPHA})`; g.fillRect(0, 0, w, h);
    if (!dense) {
      g.fillStyle = 'rgba(160,160,160,0.6)';
      for (let i = 1; i < cols; i++) g.fillRect(i * cw, 0, 1, h);
    }
    g.fillStyle = litColor;
    for (const [f, i] of lit) g.fillRect(i * cw + 1, f * RH + 1, cw - 2, RH - 2);
    g.fillStyle = 'rgba(138,138,138,0.8)';
    for (let f = 0; f <= run.count; f++) g.fillRect(0, f * RH, w, 1);
  });
  const emissive = canvasTex(w, h, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff';
    for (const [f, i] of lit) g.fillRect(i * cw + 1, f * RH + 1, cw - 2, RH - 2);
  });
  return { map, emissive };
}

// Крыша: вся сетка экспертов; горит ровно столько клеток, сколько активно на токен.
function roofTextures(run, rand, litColor = LIT) {
  const dense = run.kind === 'dense';
  const N = dense ? 1 : run.experts + run.shared;
  const A = dense ? 1 : run.active + run.shared;
  const n = Math.ceil(Math.sqrt(N));
  const cs = dense ? 32 : 10;
  const size = n * cs;
  const idx = [...Array(N).keys()];
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const lit = new Set(idx.slice(0, A));
  const cell = (k) => [(k % n) * cs, Math.floor(k / n) * cs];
  const map = canvasTex(size, size, (g) => {
    g.fillStyle = dense ? '#9a9a9a' : 'rgba(154,154,154,0.7)'; g.fillRect(0, 0, size, size);
    for (let k = 0; k < N; k++) {
      const [x, y] = cell(k);
      g.fillStyle = lit.has(k) ? litColor : dense ? '#d6d6d6' : `rgba(214,214,214,${GLASS_ALPHA + 0.2})`;
      g.fillRect(x + 1, y + 1, cs - 2, cs - 2);
    }
  });
  const emissive = canvasTex(size, size, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, size, size);
    g.fillStyle = '#fff';
    for (const k of lit) { const [x, y] = cell(k); g.fillRect(x + 1, y + 1, cs - 2, cs - 2); }
  });
  return { map, emissive };
}

// Лента: сегменты по форматам.
function bandTexture(formats) {
  const k = formats.length;
  return canvasTex(64 * k, 8, (g) => {
    formats.forEach((f, i) => { g.fillStyle = (FORMATS[f] || FORMATS.text).color; g.fillRect(i * 64, 0, 64, 8); });
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 1; i < k; i++) g.fillRect(i * 64, 0, 2, 8);
  });
}

// Пристройки: стеллажи без этажей — это не слои.
function annexTexture() {
  return canvasTex(64, 32, (g) => {
    g.fillStyle = '#c8d4d6'; g.fillRect(0, 0, 64, 32);
    g.fillStyle = '#7f9599';
    for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 2, 32);
    for (let y = 0; y < 32; y += 8) g.fillRect(0, y, 64, 1);
  });
}

// ---------- здания ----------

function wallMaterial(map, emissiveMap, glass = false, litColor = LIT) {
  const m = new THREE.MeshLambertMaterial({
    color: THEMES[state.theme].wall,
    map,
    emissiveMap,
    emissive: emissiveMap ? new THREE.Color(litColor) : new THREE.Color(0x000000),
    emissiveIntensity: THEMES[state.theme].emissive,
  });
  if (glass) {
    m.userData.glass = true;
    m.transparent = true;
    m.depthWrite = false;
  }
  return m;
}

function addEdges(b, mesh, dashed) {
  // у круга не рисуем рёбра между сегментами — только верхний и нижний контур
  const round = mesh.geometry.parameters?.radialSegments > 12;
  const geo = new THREE.EdgesGeometry(mesh.geometry, round ? 30 : 1);
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color: THEMES[state.theme].edge, dashSize: 1.2, gapSize: 0.8 })
    : new THREE.LineBasicMaterial({ color: THEMES[state.theme].edge });
  const line = new THREE.LineSegments(geo, mat);
  if (dashed) line.computeLineDistances();
  line.position.copy(mesh.position);
  b.group.add(line);
  b.edges.push(line);
}

// Призма с основанием-многоугольником той же площади, что квадрат side × side.
// Квадрат — обычный Box (6 групп материалов), остальные — Cylinder (стена, крыша, дно).
function circumradius(sides, side) {
  return side * Math.sqrt(1 / ((sides / 2) * Math.sin((2 * Math.PI) / sides)));
}

function prismGeometry(sides, side, h) {
  if (sides === 4) return new THREE.BoxGeometry(side, h, side);
  const r = circumradius(sides, side);
  // плоская грань смотрит вперёд (+z)
  return new THREE.CylinderGeometry(r, r, h, sides, 1, false, Math.PI / sides);
}

const footprint = (sides, side) => (sides === 4 ? side : 2 * circumradius(sides, side));

function addBox(b, w, h, y, materials, { pick = true, sides = 4 } = {}) {
  const mesh = new THREE.Mesh(prismGeometry(sides, w, h), materials);
  mesh.position.y = y + h / 2;
  mesh.userData.building = b;
  b.group.add(mesh);
  b.meshes.push(mesh);
  (Array.isArray(materials) ? materials : [materials]).forEach((m) => b.materials.add(m));
  if (pick) pickables.push(mesh);
  return mesh;
}

// Материалы по группам геометрии: у Box 6 граней (+x, -x, +y, -y, +z, -z), у Cylinder 3 (стена, крыша, дно).
const faceMaterials = (sides, wallA, wallB, top, bottom) =>
  (sides === 4 ? [wallA, wallB, top, bottom, wallB, wallA] : [wallA, top, bottom]);

function addBand(b, W, y, t, formats) {
  const sides = b.sides;
  const side = new THREE.MeshLambertMaterial({ color: '#ffffff', map: bandTexture(sides === 4 ? formats : [...formats, ...formats]) });
  const cap = new THREE.MeshLambertMaterial({ color: THEMES[state.theme].wall });
  b.bandCaps.push(cap);
  const mesh = addBox(b, W, t, y, faceMaterials(sides, side, side, cap, cap), { sides });
  addEdges(b, mesh, b.estimated);
  b.bands.push(mesh);
}

// Пристройки: части модели вне слоёв (склад эмбеддингов, текстовый энкодер, VAE, аудиокодек)
// в том же масштабе объёма, что и этажи. Высота постоянная, длина растёт с числом параметров.
function addAnnexes(b, annexes) {
  let x = b.W / 2;
  for (const a of annexes || []) {
    if (!a?.value) continue;
    const volume = a.value / (SIDE_DIV * SIDE_DIV) * FLOOR_H;
    const depth = Math.min(b.W, Math.max(3, Math.sqrt(volume / ANNEX_H)));
    const length = volume / (ANNEX_H * depth);
    const mat = wallMaterial(annexTexture(), null);
    const mesh = addBox(b, 1, ANNEX_H, 0, mat);
    mesh.scale.set(length, 1, depth);
    mesh.position.x = x + ANNEX_GAP + length / 2;
    b.annexMeshes.push(mesh);
    addEdges(b, mesh, a.status === 'estimate');
    b.edges[b.edges.length - 1].scale.copy(mesh.scale);

    const el = document.createElement('div');
    el.className = 'label annex';
    el.textContent = a.name;
    const lbl = new CSS2DObject(el);
    lbl.position.set(mesh.position.x, ANNEX_H + 1.5, 0);
    b.group.add(lbl);
    b.annexLabels.push(lbl);
    x += ANNEX_GAP + length;
  }
  b.spanX = x + b.W / 2;
}

// Realtime: мигающая точка записи на крыше, не отдельный элемент здания.
const recDots = [];
function addRecDot(b) {
  const r = Math.max(0.7, b.W * 0.07);
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(r, 16, 12),
    new THREE.MeshBasicMaterial({ color: REC, transparent: true }),
  );
  dot.position.set(b.W * 0.22, b.height + r, b.W * 0.22);
  b.group.add(dot);
  recDots.push(dot);
}

// Рекуррентное ядро: этажи, которые модель проходит несколько раз подряд.
// Дуга со стрелкой снаружи левой стены — «с верха ядра обратно вниз», рядом кратность.
function addLoopMark(b, run, width, y, h) {
  const x0 = -width / 2 - 0.6;
  const r = Math.min(h * 0.3, Math.max(4, width * 0.25));
  const pts = new THREE.EllipseCurve(x0, y + h / 2, r, h / 2 - 0.5, Math.PI / 2, -Math.PI / 2, false)
    .getPoints(40).map((p) => new THREE.Vector3(p.x, p.y, 0));
  // стрелка внизу: дуга возвращается к низу ядра
  const end = pts[pts.length - 1], a = Math.min(2.5, h * 0.08);
  const head = [end, new THREE.Vector3(end.x - a, end.y + a * 0.6, 0), end, new THREE.Vector3(end.x - a * 0.2, end.y + a * 1.1, 0)];
  const mat = new THREE.LineBasicMaterial({ color: LOOP, transparent: true });
  const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
  const tip = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(head), mat);
  // сами этажи ядра — цветной контур
  const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 0.4, h, width + 0.4)), mat);
  box.position.y = y + h / 2;
  b.group.add(arc, tip, box);
  b.loopMats.push(mat);

  const el = document.createElement('div');
  el.className = 'label loop';
  el.textContent = `↻ core × ${run.loop.passes}${run.loop.max > run.loop.passes ? `–${run.loop.max}` : ''}`;
  const lbl = new CSS2DObject(el);
  lbl.position.set(x0 - r - 1, y + h / 2, 0);
  lbl.center.set(1, 0.5);
  b.group.add(lbl);
  b.annexLabels.push(lbl);
}

function buildModel(model) {
  const runs = model.layers?.value;
  const rand = rng(model.id);
  const b = {
    model, group: new THREE.Group(), meshes: [], edges: [], materials: new Set(), bandCaps: [], annexLabels: [], bands: [], annexMeshes: [], loopMats: [],
    estimated: model.total_params?.status === 'estimate',
    sides: kindOf(model).sides,
  };
  b.group.userData.building = b;

  if (!runs || !runs.length) {
    // Заглушка: размер не задан — пунктирный контур стандартного размера, «не в масштабе».
    const mat = new THREE.MeshBasicMaterial({ color: THEMES[state.theme].wall, transparent: true, opacity: 0.25 });
    const mesh = addBox(b, 10, 30, 0, mat);
    addEdges(b, mesh, true);
    b.W = 10; b.height = 30; b.spanX = 10;
  } else {
    const ctx = model.context?.value || 131072;
    const t = bandThickness(ctx);
    const sides = b.sides;
    const bandSide = Math.max(...runs.map(runSide)) + BAND_PAD;
    let y = 0;
    addBand(b, bandSide, y, t, model.input?.value || ['text']);
    y += t;
    for (const run of runs) {
      const side = runSide(run);
      const h = run.count * FLOOR_H;
      const lit = run.part === 'encoder' ? LIT_ENCODER : LIT;
      const faces = sides === 4 ? 1 : 4;
      const f1 = facadeTextures(run, rand, faces, lit), f2 = facadeTextures(run, rand, faces, lit);
      const roof = roofTextures(run, rand, lit);
      const glass = run.kind === 'moe';
      const wallA = wallMaterial(f1.map, f1.emissive, glass, lit);
      const wallB = wallMaterial(f2.map, f2.emissive, glass, lit);
      const top = wallMaterial(roof.map, roof.emissive, glass, lit);
      const bottom = wallMaterial(null, null, glass);
      if (glass) bottom.opacity = GLASS_ALPHA;
      const mesh = addBox(b, side, h, y, faceMaterials(sides, wallA, wallB, top, bottom), { sides });
      addEdges(b, mesh, b.estimated);
      if (run.loop) addLoopMark(b, run, footprint(sides, side), y, h);
      y += h;
    }
    addBand(b, bandSide, y, t, model.output?.value || ['text']);
    y += t;
    b.W = footprint(sides, bandSide); b.height = y;
    addAnnexes(b, model.annexes);
    if (model.realtime) addRecDot(b);
  }

  const el = document.createElement('div');
  el.className = 'label';
  el.textContent = model.name;
  b.label = new CSS2DObject(el);
  b.label.position.set(0, b.height + 3, 0);
  b.group.add(b.label);
  addPlaque(b);

  scene.add(b.group);
  buildings.push(b);
  return b;
}

// ---------- табличка с названием на земле перед зданием ----------
// Висячие метки видны только при наведении и выборе, а на общем виде модель называет табличка.
// Ширина — место здания вместе с пристройками плюс часть прохода: на соседнюю табличку не налезает.

// глубина таблички растёт с шириной, чтобы надпись у большого здания читалась издалека
const plaqueDepth = (b) => Math.min(20, Math.max(7, (b.W + GAP) * 0.34));
const plaques = [];

function drawPlaque(b) {
  const p = b.plaque;
  const g = p.canvas.getContext('2d');
  const W = p.canvas.width, H = p.canvas.height;
  g.clearRect(0, 0, W, H);
  const font = (s) => `600 ${s}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  // одна строка или две по словам — что даст более крупный шрифт
  const ref = 100;
  g.font = font(ref);
  const fit = (lines, maxH) => ({ lines, size: Math.min(maxH, ref * W * 0.96 / Math.max(...lines.map((l) => g.measureText(l).width))) });
  let best = fit([b.model.name], H * 0.72);
  const words = b.model.name.split(' ');
  for (let i = 1; i < words.length; i++) {
    const two = fit([words.slice(0, i).join(' '), words.slice(i).join(' ')], H * 0.44);
    if (two.size > best.size) best = two;
  }
  const { lines, size } = best;
  g.font = font(size);
  g.fillStyle = state.selected === b ? THEMES[state.theme].edgeSel : THEMES[state.theme].sign;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.1));
  p.texture.needsUpdate = true;
}

function addPlaque(b) {
  const w = b.spanX + GAP - 3, d = plaqueDepth(b);
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = Math.round(512 * d / w);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(-b.W / 2 + b.spanX / 2, 0.06, b.W / 2 + 1 + d / 2);
  mesh.renderOrder = -1;
  mesh.userData.building = b;   // клик по табличке выбирает здание
  b.group.add(mesh);
  pickables.push(mesh);
  b.plaque = { mesh, canvas, texture };
  plaques.push(b);
  drawPlaque(b);
}

// ---------- расстановка: город из кварталов-провайдеров ----------
// Квартал — почти квадрат: здания стоят рядами. Камера смотрит с +z, поэтому дальний ряд — меньший z:
// сзади закрытые прикидки (они выше), спереди открытые по дате, перед ними полоса с вывеской.

const maxHeight = (q) => Math.max(...q.list.map((b) => b.height));
const SIGN_STRIP = DECAL_W / 4 + QUARTER_PAD;

// Раскладка группы зданий по рядам не шире width.
function packRows(list, width) {
  const rows = [];
  let row = null;
  for (const b of list) {
    if (!row || row.width + GAP + b.spanX > width) rows.push(row = { list: [], width: -GAP, depth: 0, plaque: 0 });
    row.list.push(b);
    row.width += GAP + b.spanX;
    row.plaque = Math.max(row.plaque, plaqueDepth(b) + 2);
    row.maxW = Math.max(row.maxW || 0, b.W);
    row.depth = row.maxW + row.plaque;
  }
  return rows;
}

function planQuarter(provider, list) {
  const byDate = (a, c) => (a.model.released?.value || '').localeCompare(c.model.released?.value || '');
  const bySize = (a, c) => (a.model.total_params?.value || 0) - (c.model.total_params?.value || 0);
  const groups = [
    list.filter((b) => !b.model.open_weights).sort((a, c) => bySize(c, a)),   // самые большие — в самом дальнем ряду
    list.filter((b) => b.model.open_weights).sort(byDate),
  ].filter((g) => g.length);
  // ширина ряда — чуть больше стороны квадрата той же площади (ряды заполняются неплотно),
  // но не уже самого широкого здания и вывески
  const area = list.reduce((s, b) => s + (b.spanX + GAP) * (b.W + GAP), 0);
  const inner = Math.max(Math.sqrt(area) * 1.3, ...list.map((b) => b.spanX), DECAL_W);
  const parts = groups.map((g) => packRows(g, inner));
  const rows = parts.flat();
  const width = Math.max(...rows.map((r) => r.width), DECAL_W) + QUARTER_PAD * 2;
  const depth = rows.reduce((s, r) => s + r.depth, 0) + GAP * (rows.length - 1)
    + (parts.length > 1 ? CLOSED_GAP - GAP : 0) + QUARTER_PAD * 2 + SIGN_STRIP;
  return { provider, list, parts, width, depth };
}

function layout() {
  const byProvider = new Map();
  for (const b of buildings) {
    const p = b.model.provider;
    if (!byProvider.has(p)) byProvider.set(p, []);
    byProvider.get(p).push(b);
  }
  const quarters = [...byProvider.entries()]
    .map(([provider, list]) => planQuarter(provider, list))
    // высокие кварталы в дальних рядах, чтобы не заслоняли маленькие модели
    .sort((a, c) => maxHeight(c) - maxHeight(a) || a.provider.localeCompare(c.provider));

  // город: ряды кварталов через улицы, общий контур близок к квадрату
  const cityW = Math.max(Math.sqrt(quarters.reduce((s, q) => s + (q.width + STREET) * (q.depth + STREET), 0)) * 1.15,
    ...quarters.map((q) => q.width));
  const cityRows = [];
  let cr = null;
  for (const q of quarters) {
    if (!cr || cr.width + STREET + q.width > cityW) cityRows.push(cr = { list: [], width: -STREET, depth: 0 });
    cr.list.push(q);
    cr.width += STREET + q.width;
    cr.depth = Math.max(cr.depth, q.depth);
  }
  let z = 0;
  for (const [ri, row] of cityRows.entries()) {
    let x = (cityW - row.width) / 2;
    for (const q of row.list) {
      // кварталы ряда выровнены по передней улице
      q.x = x; q.z = z + row.depth - q.depth; q.row = ri;
      x += q.width + STREET;
    }
    z += row.depth + STREET;
  }

  const box = new THREE.Box3();
  quarters.forEach((q, qi) => {
    let rz = q.z + QUARTER_PAD;
    q.parts.forEach((rows, pi) => {
      if (pi > 0) {
        // граница между прикидками закрытых (сзади) и открытыми моделями: пунктир поперёк квартала
        rz += CLOSED_GAP - GAP;
        addDivider(q.x + 2, rz - CLOSED_GAP / 2, q.x + q.width - 2, rz - CLOSED_GAP / 2);
      }
      for (const row of rows) {
        let bx = q.x + (q.width - row.width) / 2;
        for (const b of row.list) {
          b.group.position.set(bx + b.W / 2, 0, rz + (row.depth - row.plaque) / 2);
          bx += b.spanX + GAP;
        }
        rz += row.depth + GAP;
      }
    });
    const color = PROVIDER_COLORS[qi % PROVIDER_COLORS.length];
    const plateMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: THEMES[state.theme].plate, depthWrite: false });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(q.width, q.depth), plateMat);
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(q.x + q.width / 2, 0.02, q.z + q.depth / 2);
    plate.renderOrder = -2;   // земля → плита → надпись, без борьбы глубин
    plate.userData.plate = true;
    scene.add(plate);
    plates.push(plate);

    addProviderSign(q.provider, q.x + q.width / 2, q.z + q.depth - QUARTER_PAD / 2 - DECAL_W / 8);

    const qb = new THREE.Box3(new THREE.Vector3(q.x, 0, q.z), new THREE.Vector3(q.x + q.width, 0, q.z + q.depth));
    for (const b of q.list) qb.expandByPoint(new THREE.Vector3(b.group.position.x, b.height, b.group.position.z));
    quarterBoxes.push({ provider: q.provider, row: q.row, box: qb });
    box.union(qb);
  });
  parkBox.copy(box);
}

const quarterBoxes = [];   // { provider, row, box } — для маршрутов камеры в режиме съёмки
const plates = [];
const dividers = [];
const parkBox = new THREE.Box3();

function addDivider(x0, z0, x1, z1) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, 0.1, z0), new THREE.Vector3(x1, 0.1, z1)]);
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: THEMES[state.theme].edge, dashSize: 2, gapSize: 1.5 }));
  line.computeLineDistances();
  line.renderOrder = -1;
  scene.add(line);
  dividers.push(line);
}

// ---------- надписи провайдеров на земле ----------

const signs = [];   // { group, canvas, texture, name, logo }

function drawSign(s) {
  const g = s.canvas.getContext('2d');
  const W = s.canvas.width, H = s.canvas.height;
  g.clearRect(0, 0, W, H);
  const icon = H * 0.8, pad = H * 0.1;
  if (s.logo?.complete && s.logo.naturalWidth) {
    g.save();
    g.beginPath();
    g.roundRect(pad, pad, icon, icon, icon * 0.22);
    g.clip();
    g.fillStyle = '#ffffff';   // подложка: тёмные логотипы (OpenAI) не теряются на тёмной земле
    g.fillRect(pad, pad, icon, icon);
    g.drawImage(s.logo, pad, pad, icon, icon);
    g.restore();
  }
  let size = H * 0.5;
  g.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const maxW = W - icon - pad * 4;
  const w = g.measureText(s.name).width;
  if (w > maxW) { size *= maxW / w; g.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`; }
  g.fillStyle = THEMES[state.theme].sign;
  g.textBaseline = 'middle';
  g.fillText(s.name, icon + pad * 3, H / 2);
  s.texture.needsUpdate = true;
}

function addProviderSign(name, x, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(DECAL_W, DECAL_W / 4),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  const group = new THREE.Group();
  group.position.set(x, 0.05, z);
  group.add(mesh);
  scene.add(group);
  const s = { group, canvas, texture, name, logo: null };
  const info = data.providers?.find((p) => p.name === name);
  if (info?.logo) {
    s.logo = new Image();
    s.logo.onload = () => drawSign(s);
    s.logo.src = info.logo;
  }
  drawSign(s);
  signs.push(s);
}

function fitCamera(target = parkBox, animate = true) {
  const center = target.getCenter(new THREE.Vector3());
  const size = target.getSize(new THREE.Vector3());
  const aspect = camera.aspect;
  // в вертикальном окне углы города иначе обрезаются боковыми краями
  const radius = Math.max(size.x, size.y, size.z) * (aspect < 1 ? 0.66 : 0.62);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
  const dist = radius / Math.sin(Math.min(fov, hfov) / 2);
  controls.maxDistance = Math.max(controls.maxDistance, dist * 1.2);   // иначе в узком окне камера упрётся в предел и город не войдёт
  const dir = new THREE.Vector3(0.75, 0.62, 1).normalize();
  const pos = center.clone().add(dir.multiplyScalar(dist));
  center.y = Math.min(center.y, size.y * 0.35);
  if (animate) flyTo(pos, center); else { camera.position.copy(pos); controls.target.copy(center); controls.update(); }
}

let fly = null;
function flyTo(pos, target) {
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: performance.now() };
}

function focusBuilding(b) {
  const box = new THREE.Box3().setFromObject(b.group);
  box.expandByScalar(b.W * 0.6);
  fitCamera(box);
}

// ---------- тема ----------

function applyTheme() {
  const th = THEMES[state.theme];
  document.documentElement.dataset.theme = state.theme;
  scene.background = new THREE.Color(th.bg);
  ground.material.color.set(th.ground);
  hemi.intensity = th.hemi;
  dirLight.intensity = th.dir;
  for (const b of buildings) {
    for (const m of b.materials) {
      if (m.map && m.map.image && m.map.image.height === 8) continue; // ленты форматов
      if (m.emissiveMap !== undefined) { m.color.set(th.wall); m.emissiveIntensity = th.emissive; }
    }
    for (const m of b.bandCaps) m.color.set(th.wall);
  }
  for (const p of plates) p.material.opacity = th.plate;
  for (const d of dividers) d.material.color.set(th.edge);
  signs.forEach(drawSign);
  plaques.forEach(drawPlaque);
  const light = state.theme === 'dark';
  document.getElementById('btn-theme').innerHTML = `<span class="long">${light ? 'Light' : 'Dark'}</span><span class="short">${light ? '☀' : '☾'}</span>`;
  document.querySelector('meta[name="theme-color"]').content = th.bg;
  updateHighlight();
}

// ---------- фильтры и выделение ----------

function monthsBetween(a, b) {
  const d1 = new Date(a), d2 = new Date(b);
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function matches(m) {
  const f = state.filters;
  if (f.search && !(`${m.name} ${m.provider}`.toLowerCase().includes(f.search.toLowerCase()))) return false;
  if (f.providers.size && !f.providers.has(m.provider)) return false;
  if (f.kinds.size && !f.kinds.has(m.kind || 'llm')) return false;
  if (f.inputs.size && ![...f.inputs].every((x) => (m.input?.value || []).includes(x))) return false;
  if (f.open === 'open' && !m.open_weights) return false;
  if (f.open === 'closed' && m.open_weights) return false;
  if (f.fresh !== 'all') {
    const age = monthsBetween(m.released?.value || '2000-01-01', asOf);
    if (age > Number(f.fresh)) return false;
  }
  return true;
}

function updateHighlight() {
  const th = THEMES[state.theme];
  let shown = 0;
  for (const b of buildings) {
    const visible = matches(b.model) && (!state.focus || state.focus === b);
    if (matches(b.model)) shown++;
    const fogged = state.fog && b.estimated;
    // прикидка (закрытая модель) — полупрозрачный силуэт с пунктирными рёбрами
    const base = b.estimated ? GHOST_ALPHA : 1;
    const opacity = !visible ? 0.07 : base * (fogged ? 0.4 : 1);
    for (const m of b.materials) {
      const glass = m.userData.glass;
      m.transparent = glass || opacity < 1;
      m.opacity = opacity;
      m.depthWrite = !glass && opacity === 1;
      m.needsUpdate = true;
    }
    const sel = state.selected === b;
    for (const e of b.edges) {
      // зелёные грани: дообучена из другой модели, то есть физически почти такое же здание
      e.material.color.set(sel ? th.edgeSel : b.model.retrain ? th.retrain : th.edge);
      e.material.transparent = !visible;
      e.material.opacity = visible ? 1 : 0.15;
    }
    b.loopMats.forEach((m) => (m.opacity = visible ? 1 : 0.12));
    b.label.element.classList.toggle('dim', !visible);
    b.annexLabels.forEach((l) => l.element.classList.toggle('dim', !visible));
    b.label.element.classList.toggle('selected', sel);
    b.meshes.forEach((mesh) => (mesh.userData.hidden = !visible));
    b.plaque.mesh.userData.hidden = !visible;
    b.plaque.mesh.material.opacity = visible ? 1 : 0.12;
    if (b.plaque.sel !== sel) { b.plaque.sel = sel; drawPlaque(b); }
  }
  updateLabels();
  document.getElementById('status').textContent =
    `Showing ${shown} of ${buildings.length} · data as of ${asOf}`;
}

// Висячие метки (название, пристройки, ядро) — только у здания под курсором, выбранного или показанного в анимации.
let hovered = null;
function updateLabels() {
  for (const b of buildings) {
    const on = b === hovered || b === state.selected || b === state.focus;
    b.label.element.classList.toggle('off', !on);
    b.annexLabels.forEach((l) => l.element.classList.toggle('off', !on));
  }
}

// ---------- карточка ----------

const fmtNum = (v) => {
  if (v == null) return '—';
  if (v >= 1e12) return `${trim(v / 1e12)}T`;
  if (v >= 1e9) return `${trim(v / 1e9)}B`;
  if (v >= 1e6) return `${trim(v / 1e6)}M`;
  return String(v);
};
const trim = (x) => (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10).toString();

// Порядок величины для режима «туман»: «~2–3 трлн».
function orderOfMagnitude(v) {
  const unit = v >= 1e12 ? [1e12, 'T'] : v >= 1e9 ? [1e9, 'B'] : [1e6, 'M'];
  const x = v / unit[0];
  const step = x >= 100 ? 100 : x >= 10 ? 10 : 1;
  const lo = Math.floor(x / step) * step;
  return `~${lo}–${lo + step}${unit[1]}`;
}

const fmtCtx = (v) => (v >= 1048576 * 0.95 ? `${trim(v / 1048576)}M` : `${Math.round(v / 1024)}k`);
const fmtCtxFor = (p) => (v) => fmtCtx(v) + (p?.unit === 'points' ? ' points' : ' tokens');
const CONF = { high: 'high confidence', medium: 'medium confidence', low: 'low confidence' };

function badge(p) {
  if (!p || p.value == null) return '<span class="badge missing">no data</span>';
  if (p.status === 'estimate') return `<span class="badge estimate">estimate${p.confidence ? ', ' + CONF[p.confidence] : ''}</span>`;
  return '<span class="badge known">known</span>';
}

function valueCell(p, render) {
  if (!p || p.value == null) return `— ${badge(p)}${p?.note ? `<div class="note">${esc(p.note)}</div>` : ''}`;
  const shown = state.fog && p.status === 'estimate' && typeof p.value === 'number' ? orderOfMagnitude(p.value) : render(p.value);
  // собственные заметки-исследования не публикуем: у прикидки ссылка только на внешний источник
  const src = p.source && !p.source.startsWith('docs/') ? ` <a href="${esc(p.source)}" target="_blank" rel="noopener">source</a>` : '';
  return `${shown} ${badge(p)}${src}${p.note ? `<div class="note">${esc(p.note)}</div>` : ''}`;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtList = (list) => list.map((f) => `<span class="fmt"><i style="background:${(FORMATS[f] || FORMATS.text).color}"></i>${(FORMATS[f] || { name: f }).name}</span>`).join('');

function layersSummary(runs) {
  const loop = runs.find((r) => r.loop);
  if (loop) {
    // рекуррентная глубина: уникальные этажи и сколько стадий они дают с повторами ядра
    const { passes, max = passes } = loop.loop;
    const total = runs.reduce((s, r) => s + r.count, 0);
    const stages = (k) => total + loop.count * (k - 1);
    return `${total} unique; the ${loop.count}-floor core is passed ${passes}${max > passes ? `–${max}` : ''} times → `
      + `${stages(passes)}${max > passes ? `–${stages(max)}` : ''} stages`;
  }
  const total = runs.reduce((s, r) => s + r.count, 0);
  const count = (f) => runs.filter(f).reduce((s, r) => s + r.count, 0);
  if (runs.some((r) => r.mixer)) {
    // гибрид Mamba и трансформера: слои без FFN считаем по типу
    const enc = count((r) => r.part === 'encoder');
    return `${total}: ` + [[enc, 'encoder'], [count((r) => r.mixer === 'mamba'), 'Mamba'],
      [count((r) => r.mixer === 'attention'), 'attention'], [count((r) => r.kind === 'moe'), 'MoE']]
      .filter(([n]) => n).map(([n, l]) => `${l} ${n}`).join(' + ');
  }
  if (runs.some((r) => r.part)) {
    // энкодер-декодер: перечисляем части снизу вверх
    return `${total}: ` + runs.map((r) => `${r.label || (r.part === 'encoder' ? 'encoder' : 'decoder')} ${r.count}`).join(' + ');
  }
  const dense = runs.filter((r) => r.kind === 'dense').reduce((s, r) => s + r.count, 0);
  const moe = total - dense;
  if (!moe) return `${total}, all dense`;
  return dense ? `${total}: ${dense} dense + ${moe} MoE` : `${total}, all MoE`;
}

function expertsSummary(runs) {
  const moe = runs.find((r) => r.kind === 'moe');
  if (!moe) return 'none (dense model)';
  const sizes = [...new Set(runs.filter((r) => r.kind === 'moe').map((r) => r.experts))];
  if (sizes.length > 1) {
    // число экспертов подобрано для каждого слоя отдельно
    return `${Math.min(...sizes)}–${Math.max(...sizes)} per floor${moe.shared ? ` + ${moe.shared} shared` : ''}; per token ${moe.active}${moe.shared ? ` + ${moe.shared} shared` : ''}`;
  }
  return `${moe.experts}${moe.shared ? ` + ${moe.shared} shared` : ''}; per token ${moe.active}${moe.shared ? ` + ${moe.shared} shared` : ''}`;
}

const publicSources = (m) => (m.sources || []).filter((s) => !s.startsWith('docs/'));

function showCard(b) {
  state.selected = b;
  const m = b.model;
  const runs = m.layers?.value || [];
  const layersProp = m.layers ? { ...m.layers, value: runs.length ? runs : null } : null;
  const rows = [
    ['Total parameters', valueCell(m.total_params, fmtNum)],
    ['Active per token', valueCell(m.active_params, fmtNum)],
    ['Layers (floors)', valueCell(layersProp, layersSummary)],
    ['Experts', valueCell(layersProp && { ...layersProp, note: null }, expertsSummary)],
    ...(m.annexes || []).map((a) => [`Annex: ${esc(a.name)}`, valueCell(a, fmtNum)]),
    ['Context', valueCell(m.context, fmtCtxFor(m.context))],
    ['Input', valueCell(m.input, fmtList)],
    ['Output', valueCell(m.output, fmtList)],
    ...(m.retrain ? [['Post-trained from', valueCell(m.retrain, esc)]] : []),
    ['Released', valueCell(m.released, (v) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))],
    ['Weights', m.open_weights ? `open${m.license ? ` (${esc(m.license)})` : ''}` : 'closed'],
  ];
  document.getElementById('card-body').innerHTML = `
    <h2>${esc(m.name)}</h2>
    <div class="sub">${esc(m.provider)} · ${kindOf(m).name}${m.realtime ? ' · <span class="rec">● realtime</span>' : ''}</div>
    ${canAnimate(m) ? '<button id="btn-animate" class="btn small play">▶ Show it working</button>' : ''}
    <table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
    ${m.note ? `<div class="notes">${esc(m.note)}</div>` : ''}
    ${publicSources(m).length ? `<div class="sources">Sources:<br>${publicSources(m).map((s) => `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a>`).join('<br>')}</div>` : ''}
  `;
  document.getElementById('card').hidden = false;
  document.getElementById('btn-animate')?.addEventListener('click', () => {
    animator.start(b);
    if (window.innerWidth <= 720) hideCard();
  });
  updateHighlight();
}

// ---------- показ работы модели ----------

const animator = createAnimator({
  scene, camera, controls, FLOOR_H, FORMATS, LIT, LIT_ENCODER, bandThickness, runSide, fmtNum,
  onStart(b) {
    state.focus = b;
    updateHighlight();
    // свои статичные горящие клетки приглушаем, чтобы были видны вспышки показа
    for (const m of b.materials) if (m.emissiveMap) m.emissiveIntensity = THEMES[state.theme].emissive * 0.2;
    focusBuilding(b);
  },
  onStop() {
    state.focus = null;
    applyTheme();
  },
});

const canAnimate = (m) => kindOf(m) === KINDS.llm && m.layers?.value?.length;

function hideCard() {
  state.selected = null;
  document.getElementById('card').hidden = true;
  updateHighlight();
}

// ---------- интерфейс ----------

function chip(container, label, pressed, onClick, color) {
  const btn = document.createElement('button');
  btn.className = 'chip';
  btn.setAttribute('aria-pressed', String(pressed));
  btn.innerHTML = `${color ? `<span class="dot" style="background:${color}"></span>` : ''}${esc(label)}`;
  btn.addEventListener('click', () => onClick(btn));
  container.appendChild(btn);
  return btn;
}

function buildFilters() {
  const f = state.filters;
  const providers = [...new Set(data.models.map((m) => m.provider))].sort();
  const pBox = document.getElementById('f-provider');
  for (const p of providers) {
    chip(pBox, p, false, (btn) => {
      f.providers.has(p) ? f.providers.delete(p) : f.providers.add(p);
      btn.setAttribute('aria-pressed', String(f.providers.has(p)));
      updateHighlight();
    });
  }
  const kBox = document.getElementById('f-kind');
  const kinds = new Set(data.models.map((m) => m.kind || 'llm'));
  for (const [key, k] of Object.entries(KINDS)) {
    if (!kinds.has(key)) continue;
    chip(kBox, k.name, false, (btn) => {
      f.kinds.has(key) ? f.kinds.delete(key) : f.kinds.add(key);
      btn.setAttribute('aria-pressed', String(f.kinds.has(key)));
      updateHighlight();
    });
  }
  const iBox = document.getElementById('f-input');
  const present = new Set(data.models.flatMap((m) => m.input?.value || []));
  for (const [key, fm] of Object.entries(FORMATS)) {
    if (!present.has(key)) continue;
    chip(iBox, fm.name, false, (btn) => {
      f.inputs.has(key) ? f.inputs.delete(key) : f.inputs.add(key);
      btn.setAttribute('aria-pressed', String(f.inputs.has(key)));
      updateHighlight();
    }, fm.color);
  }
  radioChips('f-open', [['all', 'All'], ['open', 'Open'], ['closed', 'Closed']], 'open');
  radioChips('f-fresh', [['all', 'All'], ['12', 'Past year'], ['6', 'Past 6 months'], ['3', 'Past 3 months']], 'fresh');

  document.getElementById('search').addEventListener('input', (e) => { f.search = e.target.value.trim(); updateHighlight(); });
  document.getElementById('f-reset').addEventListener('click', () => {
    f.search = ''; f.providers.clear(); f.kinds.clear(); f.inputs.clear(); f.open = 'all'; f.fresh = 'all';
    document.getElementById('search').value = '';
    document.querySelectorAll('#filters .chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
    document.querySelectorAll('#f-open .chip, #f-fresh .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.value === 'all')));
    updateHighlight();
  });
}

function radioChips(id, options, key) {
  const box = document.getElementById(id);
  const btns = options.map(([value, label]) => {
    const btn = chip(box, label, value === state.filters[key], () => {
      state.filters[key] = value;
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
      updateHighlight();
    });
    btn.dataset.value = value;
    return btn;
  });
}

function buildLegend() {
  document.getElementById('legend-formats').innerHTML = fmtList(Object.keys(FORMATS));
  const steps = [[131072, '128k'], [262144, '256k'], [1048576, '1M'], [2097152, '2M'], [10485760, '10M']];
  document.getElementById('legend-context').innerHTML = steps
    .map(([v, l]) => `<div><div class="bar" style="height:${bandThickness(v) * 4}px"></div>${l}</div>`).join('');
}

function togglePanel(btnId, panelId, otherBtn, otherPanel) {
  const btn = document.getElementById(btnId), panel = document.getElementById(panelId);
  btn.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) { document.getElementById(otherPanel).hidden = true; document.getElementById(otherBtn).setAttribute('aria-expanded', 'false'); }
    if (open && window.innerWidth <= 720) hideCard();
  });
}

togglePanel('btn-filters', 'filters', 'btn-legend', 'legend');
togglePanel('btn-legend', 'legend', 'btn-filters', 'filters');
// Знакомство показываем один раз; без localStorage — при каждом открытии.
const intro = document.getElementById('intro');
function introSeen() { try { return localStorage.getItem('intro-seen') === '1'; } catch { return false; } }
intro.hidden = introSeen();
document.getElementById('intro-close').addEventListener('click', () => {
  intro.hidden = true;
  try { localStorage.setItem('intro-seen', '1'); } catch { /* приватный режим */ }
});

document.getElementById('card-close').addEventListener('click', hideCard);
document.getElementById('fog-toggle').addEventListener('change', (e) => {
  state.fog = e.target.checked;
  updateHighlight();
  if (state.selected) showCard(state.selected);
});
document.getElementById('btn-theme').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
});
document.getElementById('btn-reset').addEventListener('click', () => { hideCard(); fitCamera(); });

// выбор здания: клик без перетаскивания
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; fly = null; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
  const hit = pick(e);
  if (hit) {
    showCard(hit);
    for (const id of ['filters', 'legend']) if (window.innerWidth <= 720) document.getElementById(id).hidden = true;
  } else hideCard();
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const hit = e.buttons ? hovered : pick(e);   // при вращении камеры не перебираем здания
  renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
  if (hit !== hovered) { hovered = hit; updateLabels(); }
});
renderer.domElement.addEventListener('pointerleave', () => { hovered = null; updateLabels(); });
// двойной клик: по зданию — приблизиться к нему, по земле — перенести туда центр вращения
renderer.domElement.addEventListener('dblclick', (e) => {
  const hit = pick(e);
  if (hit) { focusBuilding(hit); return; }
  const g = raycaster.intersectObject(ground, false)[0];
  if (!g) return;
  const p = g.point.setY(0);
  flyTo(camera.position.clone().add(p.clone().sub(controls.target)), p);
});

// Метка центра вращения: видна, пока зажата правая кнопка (сдвиг карты вместе с центром).
const pivot = new THREE.Mesh(
  new THREE.RingGeometry(1.2, 1.8, 32),
  new THREE.MeshBasicMaterial({ color: '#58b4ff', transparent: true, opacity: 0, depthWrite: false }),
);
pivot.rotation.x = -Math.PI / 2;
pivot.renderOrder = 1;
scene.add(pivot);
let pivotShownAt = -1e9, rightDown = false;
renderer.domElement.addEventListener('pointerdown', (e) => { if (e.button === 2) rightDown = true; });
window.addEventListener('pointerup', (e) => { if (e.button === 2) rightDown = false; });

function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickables, false).find((h) => !h.object.userData.hidden);
  return hit ? hit.object.userData.building : null;
}

window.addEventListener('resize', () => {
  if (shoot.active) return;   // в режиме съёмки кадр фиксированный
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(now) {
  requestAnimationFrame(animate);
  if (!shoot.recording) renderFrame(now);   // при записи кадры ведёт режим съёмки
}

function renderFrame(now) {
  if (shoot.camera(now)) fly = null;   // клип съёмки ставит камеру сам
  else {
    if (fly) {
      const k = Math.min(1, (now - fly.start) / 700);
      const e = k * (2 - k);
      camera.position.lerpVectors(fly.p0, fly.p1, e);
      controls.target.lerpVectors(fly.t0, fly.t1, e);
      if (k === 1) fly = null;
    }
    controls.update();
  }
  animator.update(now);
  if (rightDown) pivotShownAt = now;
  pivot.position.set(controls.target.x, 0.15, controls.target.z);
  pivot.scale.setScalar(camera.position.distanceTo(controls.target) / 120);
  pivot.material.opacity = THREE.MathUtils.clamp(1 - (now - pivotShownAt - 600) / 400, 0, 1) * 0.9;
  const pulse = 0.5 + 0.5 * Math.sin(now / 280);
  for (const d of recDots) d.material.opacity = 0.25 + 0.75 * pulse;
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

// ---------- запуск ----------

// Сервис-воркер: установка на телефон и работа без сети. Без него сайт тоже работает.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

async function start() {
  try {
    // Без кэша: после правки данных карта обновляется простой перезагрузкой страницы.
    const res = await fetch('data/models.json', { cache: 'no-store' });
    data = await res.json();
  } catch (err) {
    document.getElementById('status').textContent = 'Could not load data/models.json. Open the site through a web server.';
    throw err;
  }
  asOf = data.as_of || new Date().toISOString().slice(0, 10);
  data.models.filter((m) => !m.archived).forEach(buildModel);
  layout();
  buildFilters();
  buildLegend();
  applyTheme();
  fitCamera(parkBox, false);
  shoot.init();
  requestAnimationFrame(animate);
}

// ---------- режим съёмки (?shoot) ----------

const shoot = createShoot({
  renderer, labelRenderer, camera, controls, animator, parkBox, quarterBoxes, buildings, renderFrame,
  hideCard,
  setTheme(theme) { state.theme = theme; applyTheme(); },
});

start();
