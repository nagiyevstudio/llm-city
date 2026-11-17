import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Замедленный показ работы языковой модели на одном здании.
// Порядок: вход → prefill (весь запрос одной волной) → выход → слово возвращается на вход →
// генерация по одному токену. На каждом этаже: роутер перебирает экспертов, загораются выбранные,
// лучи внимания тянутся к входной ленте, ствол здания (поток данных) растёт вверх.
// Какие именно эксперты горят — случайно; число экспертов, этажей и работающих параметров — настоящее.

const PROMPT = ['What', ' is', ' model', ' park', '?'];
const ANSWER = ['A', ' city', ' of', ' models', '.'];
const T = { focus: 900, input: 1100, prefill: 2600, decode: 3800, output: 1100, back: 1300 }; // мс при скорости 1×
const ROUTER = 0.4;   // доля времени этажа на перебор экспертов роутером
const COLORS = { dim: new THREE.Color('#1f2a3a'), route: new THREE.Color('#6f86a8'), shared: new THREE.Color('#ffffff') };
const PULSE = '#fff1c2';
const LOOP_COLOR = '#c792ff';

export function createAnimator(env) {
  // env: { scene, controls, camera, FLOOR_H, FORMATS, LIT, LIT_ENCODER, bandThickness, runSide, fmtNum, onStart, onStop }
  const hud = {
    root: document.getElementById('anim-hud'),
    title: document.getElementById('anim-title'),
    phase: document.getElementById('anim-phase'),
    count: document.getElementById('anim-count'),
    text: document.getElementById('anim-text'),
    pause: document.getElementById('anim-pause'),
    step: document.getElementById('anim-step'),
    follow: document.getElementById('anim-follow'),
    speed: document.getElementById('anim-speed'),
  };
  let a = null;          // текущий показ
  let speed = 1;
  let last = 0;

  hud.pause.addEventListener('click', () => {
    if (!a) return;
    if (phase().type === 'done') { replay(); return; }
    setPaused(!a.paused);
  });
  hud.step.addEventListener('click', () => a && stepForward());
  document.getElementById('anim-stop').addEventListener('click', stop);
  hud.speed.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
    speed = Number(btn.dataset.speed);
    hud.speed.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
  }));
  window.addEventListener('keydown', (e) => {
    if (!a) return;
    if (e.key === 'Escape') stop();
    if (e.key === ' ' && e.target === document.body) { e.preventDefault(); setPaused(!a.paused); }
  });

  // повтор без перелёта камеры: сразу со входа
  function replay() {
    a.pi = 1; a.elapsed = 0; a.answer = '';
    a.rand = mulberry(hash(a.m.id + Math.random()));
    hud.text.textContent = `Prompt: ${PROMPT.join('')}`;
    setPaused(false);
    enter();
  }

  function setPaused(p) {
    a.paused = p;
    hud.pause.textContent = p ? 'Resume' : 'Pause';
    hud.step.disabled = !p;
  }

  // ---------- сборка ----------

  function floorsOf(m) {
    const t = env.bandThickness(m.context?.value || 131072);
    const floors = [];
    let y = t;
    let unique = 0;
    for (const run of m.layers.value) {
      const passes = run.loop?.passes || 1;
      for (let p = 0; p < passes; p++) {
        // повтор ядра: те же этажи ещё раз, импульс возвращается к низу ядра
        for (let i = 0; i < run.count; i++) {
          floors.push({ y: y + i * env.FLOOR_H, run, n: unique + i, pass: run.loop ? p + 1 : 0, passes, jump: p > 0 && i === 0 });
        }
      }
      unique += run.count;
      y += run.count * env.FLOOR_H;
    }
    return { floors, t, top: y, unique };
  }

  // Срез этажа: сетка клеток-экспертов, рисуется поверх стен.
  function makeSlice(run) {
    const moe = run.kind === 'moe';
    const experts = moe ? run.experts : 1, shared = moe ? run.shared || 0 : 0;
    const N = experts + shared;
    const side = env.runSide(run);
    const n = Math.ceil(Math.sqrt(N)), c = side / n;
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(c * 0.82, env.FLOOR_H * 0.8, c * 0.82),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }),
      N,
    );
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      mtx.makeTranslation(-side / 2 + c * ((i % n) + 0.5), env.FLOOR_H / 2, -side / 2 + c * (Math.floor(i / n) + 0.5));
      mesh.setMatrixAt(i, mtx);
      mesh.setColorAt(i, COLORS.dim);
    }
    mesh.renderOrder = 10;
    mesh.visible = false;
    const lit = new THREE.Color(run.part === 'encoder' ? env.LIT_ENCODER : env.LIT);
    return { mesh, experts, shared, k: moe ? run.active : 1, moe, lit, chosen: new Set() };
  }

  function overlay(band, color) {
    const mesh = new THREE.Mesh(band.geometry, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    mesh.position.copy(band.position);
    mesh.scale.setScalar(1.02);
    mesh.renderOrder = 8;
    return mesh;
  }

  function buildPhases() {
    const p = [
      { type: 'focus', dur: T.focus },
      { type: 'input', dur: T.input, prefill: true },
      { type: 'floors', dur: T.prefill, prefill: true, token: 0 },
      { type: 'output', dur: T.output, token: 0 },
    ];
    for (let i = 1; i < ANSWER.length; i++) {
      p.push({ type: 'back', dur: T.back, token: i - 1 });
      p.push({ type: 'input', dur: T.input * 0.6, token: i - 1 });
      p.push({ type: 'floors', dur: T.decode, token: i });
      p.push({ type: 'output', dur: T.output, token: i });
    }
    p.push({ type: 'done', dur: Infinity });
    return p;
  }

  function start(b) {
    stop();
    const m = b.model;
    const geo = floorsOf(m);
    const root = new THREE.Group();
    root.position.copy(b.group.position);
    env.scene.add(root);

    const slices = new Map();
    for (const run of m.layers.value) {
      const s = makeSlice(run);
      slices.set(run, s);
      root.add(s.mesh);
    }

    const bandSide = Math.max(...m.layers.value.map(env.runSide)) + 1;
    const r = Math.max(0.35, bandSide * 0.025);
    const coreMat = new THREE.MeshBasicMaterial({ color: PULSE, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 12), coreMat);
    core.renderOrder = 9;
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(r * 2.4, 16, 12), coreMat);
    pulse.renderOrder = 11;
    root.add(core, pulse);

    const BEAMS = 16;
    const beamGeo = new THREE.BufferGeometry();
    beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BEAMS * 6), 3));
    const beams = new THREE.LineSegments(beamGeo, new THREE.LineBasicMaterial({
      color: env.LIT, transparent: true, opacity: 0, depthTest: false, depthWrite: false,
    }));
    beams.renderOrder = 9;
    root.add(beams);

    const annexGeo = new THREE.BufferGeometry();
    annexGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const annexLine = new THREE.Line(annexGeo, new THREE.LineBasicMaterial({
      color: env.LIT, transparent: true, opacity: 0, depthTest: false, depthWrite: false,
    }));
    annexLine.renderOrder = 9;
    root.add(annexLine);

    const fmtColor = (list) => (env.FORMATS[list?.[0]] || env.FORMATS.text).color;
    const inBand = overlay(b.bands[0], fmtColor(m.input?.value));
    const outBand = overlay(b.bands[1], fmtColor(m.output?.value));
    root.add(inBand, outBand);

    const el = document.createElement('div');
    el.className = 'label token';
    const token = new CSS2DObject(el);
    token.position.set(0, geo.top + geo.t + 5, 0);
    token.visible = false;
    root.add(token);

    const total = m.total_params?.value;
    const ffnActive = m.layers.value.reduce((s, x) =>
      s + x.count * x.ffn_per_expert * (x.kind === 'moe' ? x.active + (x.shared || 0) : 1), 0);
    const active = m.active_params?.value || ffnActive;
    const loopExtra = m.layers.value.reduce((s, x) => s + (x.loop
      ? x.count * x.ffn_per_expert * (x.active + (x.shared || 0)) * (x.loop.passes - 1) : 0), 0);

    a = {
      b, m, geo, root, slices, core, pulse, beams, beamGeo, annexLine, inBand, outBand, token, bandSide,
      phases: buildPhases(), pi: 0, elapsed: 0, fi: -1, paused: false, slice: null, answer: '',
      active, loopExtra, activeKnown: !!m.active_params?.value, total, rand: mulberry(hash(m.id)),
      annexes: (b.annexMeshes || []).filter((x) => x.material.emissive),
    };

    hud.title.textContent = m.name;
    hud.text.textContent = `Prompt: ${PROMPT.join('')}`;
    hud.root.hidden = false;
    setPaused(false);
    last = performance.now();
    env.onStart(b);
    enter();
  }

  function stop() {
    if (!a) return;
    a.root.traverse((o) => { if (o.material && o !== a.inBand && o !== a.outBand) o.material.dispose?.(); });
    a.slices.forEach((s) => s.mesh.geometry.dispose());
    a.token.element.remove();
    env.scene.remove(a.root);
    for (const mesh of a.annexes) { mesh.material.emissive.set(0x000000); }
    for (const m of a.b.loopMats) m.color.set(LOOP_COLOR);
    const b = a.b;
    a = null;
    hud.root.hidden = true;
    env.onStop(b);
  }

  // ---------- фазы ----------

  const phase = () => a.phases[a.pi];

  function enter() {
    const ph = phase();
    a.fi = -1;
    a.slices.forEach((s) => (s.mesh.visible = false));
    a.beams.material.opacity = 0;
    a.token.visible = false;
    const word = (i) => `"${ANSWER[i].trim()}"`;
    const n = ANSWER.length;
    switch (ph.type) {
      case 'focus':
        say('Flying to the building', '');
        break;
      case 'input':
        say(ph.prefill
          ? `Input: a ${PROMPT.length}-token prompt enters the bottom band`
          : `Input: token ${word(ph.token)} is now part of the context`, '');
        break;
      case 'floors':
        a.core.scale.y = 0.001;
        a.loopFlash = 0;
        say((ph.prefill
          ? 'Prefill: the whole prompt passes the floors as one wide wave. Each token has its own experts, so many cells light up on a floor'
          : `Generating token ${ph.token + 1} of ${n}: a narrow pulse, only the chosen experts light up on each floor`)
          + (a.loopExtra ? '. The pulse passes the purple core several times in a row: recurrent depth.' : ''));
        break;
      case 'output':
        a.answer += ANSWER[ph.token];
        a.token.element.textContent = ANSWER[ph.token].trim();
        a.token.visible = true;
        say(`Output: the top band emits the next word, ${word(ph.token)}`, '');
        hud.text.textContent = `Prompt: ${PROMPT.join('')}\nAnswer: ${a.answer}`;
        break;
      case 'back':
        a.token.visible = true;
        say('The word goes back down to the input: the next token will see it in the context', '');
        break;
      case 'done':
        a.core.scale.y = 0.001;
        a.pulse.visible = false;
        hud.pause.textContent = 'Replay';
        hud.step.disabled = true;
        say('Done. Each token lit its own cells: the choice of experts here is random, '
          + 'while the number of floors, experts and working parameters is real.', '');
        break;
    }
  }

  function say(phaseText, countText) {
    hud.phase.textContent = phaseText;
    if (countText !== undefined) hud.count.textContent = countText;
  }

  function countText(ph) {
    const F = a.geo.floors.length, f = a.geo.floors[a.fi];
    const who = ph.prefill ? 'prompt' : `token ${ph.token + 1} of ${ANSWER.length}`;
    const head = F > a.geo.unique
      ? `floor ${f.n + 1} of ${a.geo.unique}${f.pass ? ` · ↻ core pass ${f.pass} of ${f.passes}` : ''} · stage ${a.fi + 1} of ${F} · ${who}`
      : `floor ${a.fi + 1} of ${F} · ${who}`;
    const anyMoe = a.m.layers.value.some((x) => x.kind === 'moe');
    if (!anyMoe) return `${head}\ndense model: all ${env.fmtNum(a.total)} parameters work on every token`;
    if (ph.prefill) return `${head}\nprompt wave: experts of all ${PROMPT.length} tokens at once`;
    const pct = a.total ? Math.max(0.1, Math.round((a.active / a.total) * 1000) / 10) : null;
    return `${head}\nworking: ${a.activeKnown ? '' : '≈'}${env.fmtNum(a.active)} of ${env.fmtNum(a.total)} parameters`
      + (pct ? ` (${pct}%)` : '')
      + (a.loopExtra ? ` per pass; ≈${env.fmtNum(a.active + a.loopExtra)} with core repeats` : '');
  }

  function update(now) {
    const dt = Math.min(100, now - last);
    last = now;
    if (!a) return;
    if (!a.paused) advance(dt * speed);
    render(now);
  }

  function advance(dt) {
    a.elapsed += dt;
    while (a.elapsed >= phase().dur) {
      a.elapsed -= phase().dur;
      a.pi++;
      enter();
    }
  }

  // Шаг на паузе: следующий этаж, а вне этажей — следующая фаза.
  function stepForward() {
    const ph = phase();
    if (ph.type === 'done') return;
    if (ph.type === 'floors') {
      const per = ph.dur / a.geo.floors.length;
      const target = (Math.floor(a.elapsed / per) + 1) * per + per * ROUTER + 1;
      advance(Math.max(0, Math.min(target, ph.dur) - a.elapsed));
    } else advance(ph.dur - a.elapsed);
  }

  function render(now) {
    const ph = phase();
    const k = Math.min(1, a.elapsed / ph.dur);
    const { t, top, floors } = a.geo;
    let pulseY = null;

    a.inBand.material.opacity = ph.type === 'input' ? 0.6 * Math.sin(Math.PI * k) : 0;
    a.outBand.material.opacity = ph.type === 'output' ? 0.6 * Math.sin(Math.PI * Math.min(1, k * 1.6)) : 0;

    if (ph.type === 'input') pulseY = t / 2;
    if (ph.type === 'output') pulseY = top + t / 2;
    if (ph.type === 'back') {
      // по стене снаружи, сверху вниз
      const y = top + t / 2 - (top) * easeInOut(k);
      a.pulse.position.set(a.bandSide / 2 + 2, y, a.bandSide / 2 + 2);
      a.token.position.set(a.bandSide / 2 + 2, y + 4, a.bandSide / 2 + 2);
      pulseY = y;
    } else {
      a.token.position.set(0, top + t + 10, 0);
      a.pulse.position.x = 0; a.pulse.position.z = 0;
    }

    if (ph.type === 'floors') {
      const per = ph.dur / floors.length;
      const fi = Math.min(floors.length - 1, Math.floor(a.elapsed / per));
      const sub = (a.elapsed - fi * per) / per;
      if (fi !== a.fi) enterFloor(fi, ph);
      const f = floors[fi];
      pulseY = f.y + env.FLOOR_H / 2;
      a.core.scale.y = Math.max(a.core.scale.y, pulseY - t);
      a.core.position.set(0, t + a.core.scale.y / 2, 0);
      paintSlice(a.slice, sub, ph);
      if (a.loopFlash > 0) {
        a.loopFlash = Math.max(0, a.loopFlash - 0.03);
      }
      for (const m of a.b.loopMats) m.color.set(a.loopFlash > 0.05 ? '#ffffff' : LOOP_COLOR);
      a.beams.material.opacity = 0.75 * (1 - sub);
      a.annexLine.material.opacity = Math.max(0, a.annexLine.material.opacity - 0.02);
      for (const mesh of a.annexes) mesh.material.emissiveIntensity = a.annexLine.material.opacity;
      hud.count.textContent = countText(ph);
    } else {
      a.annexLine.material.opacity = 0;
      for (const mesh of a.annexes) mesh.material.emissiveIntensity = 0;
      if (ph.type !== 'done') a.core.scale.y = Math.max(0.001, a.core.scale.y * 0.9);
    }

    a.pulse.visible = pulseY != null;
    if (pulseY != null) {
      a.pulse.position.y = pulseY;
      a.pulse.scale.setScalar(0.85 + 0.15 * Math.sin(now / 90));
    }

    // камера следует за импульсом по высоте
    if (hud.follow.checked && pulseY != null) {
      const target = a.root.position.y + pulseY;
      const dy = (target - env.controls.target.y) * 0.06;
      env.controls.target.y += dy;
      env.camera.position.y += dy;
    }
  }

  function enterFloor(fi, ph) {
    a.fi = fi;
    const f = a.geo.floors[fi];
    const s = a.slices.get(f.run);
    if (a.slice && a.slice !== s) a.slice.mesh.visible = false;
    a.slice = s;
    s.mesh.visible = true;
    s.mesh.position.y = f.y;
    // выбор экспертов: на запросе — объединение выборов всех токенов, на генерации — ровно k
    s.chosen.clear();
    if (s.moe) {
      const want = ph.prefill ? Math.min(s.experts, s.k * PROMPT.length) : s.k;
      while (s.chosen.size < want) s.chosen.add(Math.floor(a.rand() * s.experts));
    } else s.chosen.add(0);
    s.flicker = -1;
    if (f.jump) a.loopFlash = 1;

    // лучи внимания: от этажа вниз к входной ленте (к токенам контекста)
    const pos = a.beamGeo.attributes.position.array;
    const nBeams = ph.prefill ? 16 : 6 + Math.min(10, ph.token * 2);
    const half = a.bandSide / 2 * 0.9;
    for (let i = 0; i < 16; i++) {
      const o = i * 6;
      if (i >= nBeams) { pos.fill(0, o, o + 6); continue; }
      pos[o] = 0; pos[o + 1] = f.y + env.FLOOR_H / 2; pos[o + 2] = 0;
      pos[o + 3] = (a.rand() * 2 - 1) * half; pos[o + 4] = a.geo.t; pos[o + 5] = (a.rand() * 2 - 1) * half;
    }
    a.beamGeo.attributes.position.needsUpdate = true;

    // пристройки (склад эмбеддингов и т. п.) подмешиваются на втором этаже
    if (fi === 1 && a.annexes.length) {
      const mesh = a.annexes[0];
      const p = a.annexLine.geometry.attributes.position.array;
      p.set([mesh.position.x, mesh.position.y, mesh.position.z, 0, f.y + env.FLOOR_H / 2, 0]);
      a.annexLine.geometry.attributes.position.needsUpdate = true;
      a.annexLine.material.opacity = 1;
      for (const am of a.annexes) am.material.emissive.set(env.LIT);
    }
  }

  function paintSlice(s, sub, ph) {
    const mesh = s.mesh;
    const routing = s.moe && sub < ROUTER;
    const state = routing ? Math.floor(sub * 20) : 99;   // перебор роутера мигает несколько раз за этаж
    if (state === s.flicker) return;
    s.flicker = state;
    const N = s.experts + s.shared;
    for (let i = 0; i < N; i++) {
      let c = COLORS.dim;
      if (i >= s.experts) c = COLORS.shared;
      else if (routing) c = a.rand() < Math.min(0.5, (s.k * 3) / s.experts) ? COLORS.route : COLORS.dim;
      else if (s.chosen.has(i)) c = s.lit;
      mesh.setColorAt(i, c);
    }
    mesh.instanceColor.needsUpdate = true;
    mesh.material.opacity = ph.prefill ? 0.9 : 0.95;
  }

  return { start, stop, update, get running() { return !!a; }, get building() { return a?.b; } };
}

const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function mulberry(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
