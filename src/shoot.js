import * as THREE from 'three';

// Режим съёмки (?shoot, тема — &theme=light): кадр 1080×1920 без интерфейса, заданные пролёты камеры
// и запись клипов в MP4. Запись покадровая, а не в реальном времени: каждый кадр рендерится с шагом 1/30 с
// и кодируется WebCodecs, поэтому в клипе нет рывков, сколько бы ни считался кадр.
// Клипы — по плану съёмки рила «Как ИИ выглядит изнутри» (AI Studio, ai-blog/reel-02-model-park/brief.md).

const W = 1080, H = 1920, FPS = 30;
const MUXER = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/+esm';
const CODECS = ['avc1.640033', 'avc1.4d0033', 'avc1.420033'];
const WORK_MODEL = 'glm-5.3-flash';
const WORK_SECONDS = 34;   // полный показ работы: запрос и 5 токенов ответа при скорости 1×

const deg = THREE.MathUtils.degToRad;
const center = (box) => box.getCenter(new THREE.Vector3());

// Отдать управление браузеру между кадрами. Не setTimeout: в фоновой вкладке он замедляется до раза в секунду.
const channel = new MessageChannel();
const yieldTask = () => new Promise((r) => { channel.port1.onmessage = r; channel.port2.postMessage(0); });

// Положение камеры: точка взгляда, азимут от фасада (+z), высота над горизонтом, расстояние.
const pose = (target, az, el, dist) => ({ target, az, el, dist });
// То же, заданное точкой камеры и точкой взгляда — для низких кадров с земли.
function look(cam, target) {
  const d = cam.clone().sub(target), dist = d.length();
  return pose(target, THREE.MathUtils.radToDeg(Math.atan2(d.x, d.z)), THREE.MathUtils.radToDeg(Math.asin(d.y / dist)), dist);
}
// Путь камеры — ключи [секунда, положение]. Между ключами кубический сплайн Эрмита: скорость меняется
// без скачков. В первом и последнем ключе и в повторяющихся подряд ключах (удержание кадра) скорость нулевая.
const vec = (p) => [p.target.x, p.target.y, p.target.z, p.az, p.el, Math.log(p.dist)];   // расстояние — по логарифму
const unvec = (v) => pose(new THREE.Vector3(v[0], v[1], v[2]), v[3], v[4], Math.exp(v[5]));

function spline(keys) {
  const t = keys.map((k) => k[0]), P = keys.map((k) => vec(k[1]));
  const same = (i, j) => P[j] && P[i].every((x, n) => Math.abs(x - P[j][n]) < 1e-6);
  const M = P.map((p, i) => (i === 0 || i === P.length - 1 || same(i, i - 1) || same(i, i + 1)
    ? p.map(() => 0)
    : p.map((_, n) => (P[i + 1][n] - P[i - 1][n]) / (t[i + 1] - t[i - 1]))));
  return (sec) => {
    if (sec <= t[0]) return unvec(P[0]);
    let i = 0;
    while (i < t.length - 2 && sec > t[i + 1]) i++;
    const h = t[i + 1] - t[i], s = Math.min(1, (sec - t[i]) / h);
    const s2 = s * s, s3 = s2 * s;
    return unvec(P[i].map((x, n) => (2 * s3 - 3 * s2 + 1) * x + (s3 - 2 * s2 + s) * h * M[i][n]
      + (-2 * s3 + 3 * s2) * P[i + 1][n] + (s3 - s2) * h * M[i + 1][n]));
  };
}

export function createShoot(env) {
  // env: { renderer, labelRenderer, camera, controls, animator, parkBox, quarterBoxes, buildings, renderFrame, hideCard, setTheme }
  const params = new URLSearchParams(location.search);
  const active = params.has('shoot');
  let clips = [];
  let clip = null, t0 = 0, recording = false;
  let ui = null;

  const vfov = deg(env.camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (W / H));
  // расстояние, на котором предмет заданной ширины и высоты целиком входит в кадр
  const fit = (width, height) => Math.max(width / 2 / Math.tan(hfov / 2), height / 2 / Math.tan(vfov / 2));

  function plan() {
    const city = env.parkBox, cc = center(city);
    const size = city.getSize(new THREE.Vector3());
    const Dc = fit(Math.hypot(size.x, size.z) * 0.5, 0);

    const bld = (id) => env.buildings.find((x) => x.model.id === id);
    const at = (b, y = 0) => b.group.position.clone().setY(y);
    const quarter = (name) => env.quarterBoxes.find((q) => q.provider === name).box;
    // табличка квартала лежит на земле в передней полосе плиты
    const sign = (name) => { const q = quarter(name); return new THREE.Vector3((q.min.x + q.max.x) / 2, 0, q.max.z - 12); };

    const b = bld(WORK_MODEL);
    const bc = at(b, b.height / 2);
    const Db = fit(b.W * 1.8, b.height * 1.5);
    const whole = pose(bc, 30, 10, Db);
    const work = pose(bc, 40, 12, Db);

    // 02: табличка Mistral → дома Mistral → большой Qwen3.8 Max рядом с тонким Qwen3.8 27B
    const big = bld('qwen4-max'), small = bld('qwen3.8-27b');
    const pair = at(big).lerp(at(small), 0.3).setY(big.height * 0.4);
    const mistral = quarter('Mistral AI');
    const sm = pose(sign('Mistral AI'), 12, 40, fit(72 * 1.35, 0));
    const sm2 = pose(sign('Mistral AI').add(new THREE.Vector3(-12, 0, -4)), 16, 37, fit(72 * 1.5, 0));
    // выше крыш переднего ряда кварталов, иначе камера идёт сквозь дома DeepSeek
    const passing = pose(new THREE.Vector3(mistral.min.x + 25, 28, (mistral.min.z + mistral.max.z) / 2 + 10), 30, 34, 175);
    const pairShot = pose(pair, 16, 28, fit((big.W + small.W + 40) * 1.5, big.height * 1.3));

    // 05: GLM-5.3 Flash → таблички закрытых кварталов → открытый gpt-oss-120b перед огромным GPT-6 Astra
    const astra = bld('gpt-6.2-astra'), oss = bld('gpt-oss-120b');
    // камера низко на улице между кварталами Z.ai и Xiaomi: до gpt-oss ~250, до Astra ~390 —
    // Astra выше и втрое шире, хотя стоит дальше; ближе подходить нельзя, gpt-oss заслонит весь кадр
    // взгляд правее башни, чтобы gpt-oss встал на линию взгляда, а Astra целиком вошла в кадр слева от неё
    const aim = at(astra, 58).setX(at(oss).x + 3);
    const low = look(new THREE.Vector3(at(oss).x - 62, 10, at(oss).z + 253), aim);
    const low2 = look(new THREE.Vector3(at(oss).x - 60, 12, at(oss).z + 233), aim);
    const leave = pose(at(astra, astra.height * 0.4).add(new THREE.Vector3(0, 0, 40)), 12, 38, 420);
    const glm = pose(bc, 5, 12, Db);

    const two = (dur, from, to) => [[0, from], [dur, to]];
    // облёт любых зданий и кварталов: &model=id1,id2 и &quarter=Провайдер — для новых роликов и проверки
    const orbit = (target, w, h) => two(5, pose(target, 20, 18, fit(w, h)), pose(target, 55, 24, fit(w, h)));
    const extra = [
      ...(params.get('model') || '').split(',').filter(bld).map((id) => {
        const x = bld(id);
        return { id: `model-${id}`, title: x.model.name, dur: 5, keys: orbit(at(x, x.height / 2), x.W * 1.8, x.height * 1.4) };
      }),
      ...(params.get('quarter') || '').split(',').filter((n) => env.quarterBoxes.some((q) => q.provider === n)).map((n) => {
        const q = quarter(n), s = q.getSize(new THREE.Vector3());
        return { id: `quarter-${n.replace(/\W+/g, '')}`, title: `Квартал ${n}`, dur: 5,
          keys: orbit(center(q).setY(s.y * 0.35), Math.hypot(s.x, s.z) * 0.9, s.y * 1.3) };
      }),
    ];
    return [
      { id: '01-city', title: 'Пролёт над городом', dur: 5,
        keys: two(5, pose(cc, 10, 55, Dc * 1.15), pose(cc, 40, 36, Dc * 0.85)) },
      { id: '02-quarters-v2', title: 'Вдоль кварталов', dur: 9,
        keys: [[0, sm], [0.5, sm], [2, sm2], [4.5, passing], [8, pairShot], [9, pairShot]] },
      { id: '03-building-v2', title: `Этажи ${b.model.name}`, dur: 10,
        keys: [[0, pose(at(b, 15), 30, 5, 58)], [0.5, pose(at(b, 15), 30, 5, 58)], [2, pose(at(b, 18), 30, 5, 58)],
          [5.6, pose(at(b, b.height - 10), 30, 6, 58)], [6.8, whole], [10, whole]] },
      { id: '04-work', title: 'Показ работы', dur: WORK_SECONDS, work: b,
        keys: two(WORK_SECONDS, work, pose(bc, 5, 12, Db)) },
      { id: '05-closed-v2', title: 'Закрытые модели', dur: 15,
        keys: [[0, glm], [0.5, glm], [3, pose(sign('Anthropic').setY(25), 14, 26, 330)],
          [5.6, pose(sign('OpenAI').setY(25), 14, 24, 300)], [7, low], [10.6, low2], [14.5, leave], [15, leave]] },
      { id: '06-final', title: 'Общий план', dur: 6,
        keys: two(6, pose(cc, 40, 36, Dc * 0.85), pose(cc, 70, 44, Dc * 0.95)) },
      ...extra,
    ].map((c) => ({ ...c, path: spline(c.keys) }));
  }

  function place(p) {
    const a = deg(p.az), e = deg(p.el);
    env.camera.position.set(
      p.target.x + p.dist * Math.cos(e) * Math.sin(a),
      p.target.y + p.dist * Math.sin(e),
      p.target.z + p.dist * Math.cos(e) * Math.cos(a),
    );
    env.camera.lookAt(p.target);
    env.controls.target.copy(p.target);   // после клипа ручное вращение продолжается с этого места
  }

  // Ставит камеру текущего клипа; false — клипа нет, камерой управляет пользователь.
  function camera(now) {
    if (!clip) return false;
    const sec = (now - t0) / 1000;
    place(clip.path(Math.min(clip.dur, sec)));
    if (sec > clip.dur && !recording) clip = null;
    return true;
  }

  function begin(c, now) {
    env.animator.stop();
    env.hideCard();
    clip = c;
    if (c.work) env.animator.start(c.work);
    t0 = now ?? performance.now();
  }

  // ---------- запись ----------

  async function record(c) {
    if (!('VideoEncoder' in window)) throw new Error('браузер не поддерживает WebCodecs — нужен Chrome или Edge');
    const { Muxer, ArrayBufferTarget } = await import(MUXER);
    let codec = null;
    for (const x of CODECS) {
      const cfg = { codec: x, width: W, height: H, bitrate: 20e6, framerate: FPS };
      if ((await VideoEncoder.isConfigSupported(cfg)).supported) { codec = cfg; break; }
    }
    if (!codec) throw new Error('кодировщик H.264 недоступен');

    const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory' });
    let failure = null;
    const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { failure = e; } });
    enc.configure(codec);

    recording = true;
    const n = Math.round(c.dur * FPS);
    try {
      begin(c);
      const start = t0;
      for (let i = 0; i < n && !failure; i++) {
        env.renderFrame(start + (i * 1000) / FPS);
        const frame = new VideoFrame(env.renderer.domElement, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
        enc.encode(frame, { keyFrame: i % FPS === 0 });
        frame.close();
        while (enc.encodeQueueSize > 4) await new Promise((r) => enc.addEventListener('dequeue', r, { once: true }));
        if (i % 10 === 0) {
          status(`Запись «${c.title}»: кадр ${i + 1} из ${n}`);
          await yieldTask();
        }
      }
      await enc.flush();
      if (failure) throw failure;
    } finally {
      enc.close();
      recording = false;
      clip = null;
    }
    muxer.finalize();
    return save(`reel02-${c.id}.mp4`, muxer.target.buffer);
  }

  // Сохраняем через tools/park_server.py; на простом сервере — скачиванием.
  async function save(name, buffer) {
    try {
      const res = await fetch(`/save?name=${encodeURIComponent(name)}`, { method: 'POST', body: buffer });
      if (res.ok) return (await res.json()).path;
    } catch { /* сервер без приёма файлов */ }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buffer], { type: 'video/mp4' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    return `скачан ${name}`;
  }

  async function run(list) {
    setBusy(true);
    const saved = [];
    try {
      for (const c of list) saved.push(await record(c));
      status(`Готово:\n${saved.join('\n')}`);
    } catch (e) {
      status(`Ошибка: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  // ---------- интерфейс ----------

  function status(text) { ui.status.textContent = text; }
  function setBusy(busy) { ui.root.querySelectorAll('button').forEach((x) => (x.disabled = busy)); }

  function buildPanel() {
    const root = document.createElement('aside');
    root.className = 'shoot-panel';
    root.innerHTML = `<div class="shoot-head">Съёмка · ${W}×${H} · ${FPS} к/с</div>
      <div class="shoot-clips"></div>
      <div class="shoot-actions"><button class="btn small" data-all>● Записать все</button>
      <button class="btn small" data-theme>Тема</button></div>
      <div class="shoot-status">▶ — просмотр, ● — запись в MP4. Между клипами камеру можно вращать мышью.</div>`;
    const list = root.querySelector('.shoot-clips');
    for (const c of clips) {
      const row = document.createElement('div');
      row.className = 'shoot-clip';
      row.innerHTML = `<span>${/^\d/.test(c.id) ? `${c.id.slice(0, 2)}. ` : '+ '}${c.title} <i>${c.dur} с</i></span>
        <button class="btn small" title="Просмотр">▶</button><button class="btn small" title="Записать">●</button>`;
      const [play, rec] = row.querySelectorAll('button');
      play.addEventListener('click', () => { begin(c); status(`Просмотр «${c.title}»`); });
      rec.addEventListener('click', () => run([c]));
      list.append(row);
    }
    root.querySelector('[data-all]').addEventListener('click', () => run(clips));
    root.querySelector('[data-theme]').addEventListener('click', () =>
      env.setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    document.body.append(root);
    ui = { root, status: root.querySelector('.shoot-status') };
  }

  function init() {
    if (!active) return;
    document.body.classList.add('shoot');
    env.renderer.setPixelRatio(1);
    env.renderer.setSize(W, H, false);
    Object.assign(env.renderer.domElement.style, { width: '', height: '' });   // размер на экране задаёт CSS
    env.camera.aspect = W / H;
    env.camera.updateProjectionMatrix();
    env.controls.maxDistance = 20000;
    document.getElementById('anim-follow').checked = false;   // камерой ведёт клип
    if (params.get('theme') === 'light') env.setTheme('light');
    clips = plan();
    buildPanel();
    place(clips[0].keys[0][1]);
  }

  return { init, camera, get active() { return active; }, get recording() { return recording; } };
}
