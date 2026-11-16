// ============================================================
// LÓGICA DEL JUEGO (tiempo real sobre canvas, movimiento continuo)
// Flujo: PREPARACIÓN (el jugador compra) -> COMBATE (automático) -> REGRESO (automático)
// Las medidas de units.js están en casillas; aquí se convierten a píxeles con CONFIG.tile.
// ============================================================

const CONFIG = {
  width: 960,
  height: 540,
  tile: 64,                   // tamaño de una casilla en píxeles
  castle: { x: 150, y: 270 }, // centro del castillo (a la izquierda)
  castleHp: 100,
  startGold: 100,
  aggroRadius: 5.5,           // casillas desde el castillo a las que las unidades salen a por los enemigos
  spawnInterval: 0.7,         // segundos entre enemigos que aparecen por la derecha
  waveBonus: 25,              // oro extra al superar una oleada
  speeds: [1, 2, 4],          // velocidades del botón de velocidad
};

const W = CONFIG.width, H = CONFIG.height, TILE = CONFIG.tile;
const CX = CONFIG.castle.x, CY = CONFIG.castle.y;
const ATTACK_ANIM = 0.28;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);

let state = null;

// ---------- Utilidades ----------
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const castleDist = (e) =>
  Math.hypot(Math.max(Math.abs(e.x - CX) - TILE / 2, 0), Math.max(Math.abs(e.y - CY) - TILE / 2, 0));
const slotPos = (gx, gy) => ({ x: CX + gx * TILE, y: CY + gy * TILE });
const isValidSlot = (gx, gy) => Math.abs(gx) <= 1 && Math.abs(gy) <= 1 && !(gx === 0 && gy === 0);
const slotTaken = (gx, gy) => state.entities.some((e) => e.side === 'player' && e.gx === gx && e.gy === gy);

function log(msg) {
  state.log.unshift(msg);
  state.log = state.log.slice(0, 6);
  $('log').innerHTML = state.log.map((l) => `<li>${l}</li>`).join('');
}

function makeEntity(side, key, x, y) {
  const def = side === 'enemy' ? ENEMY_TYPES[key] : UNIT_TYPES[key];
  const scale = def.scale || 1;
  return {
    side, key, def, x, y, hx: x, hy: y, gx: null, gy: null,
    hp: def.hp, maxHp: def.hp,
    scale, r: def.building ? 26 : 10 * scale,
    cd: 0, atkT: 99, walk: Math.random() * 6, face: side === 'enemy' ? -1 : 1,
  };
}

// ---------- Inicio de partida ----------
function newGame() {
  state = {
    phase: 'build',            // 'build' | 'combat' | 'return'
    wave: 1,
    gold: CONFIG.startGold,
    castleHp: CONFIG.castleHp,
    entities: [],
    queue: [],
    spawnT: 0,
    returnT: 0,
    kills: 0,
    over: false,
    selected: null,
    hover: null,
    speedIdx: 0,
    log: [],
    fx: [],
  };
  startWave();
  $('overlay').classList.add('hidden');
  refreshUI();
}

function startWave() {
  state.queue = waveComposition(state.wave);
  log(`🌊 Oleada ${state.wave}: vienen ${state.queue.length} enemigos`);
}

// ---------- Movimiento ----------
function moveToward(e, tx, ty, stop, dt) {
  const d = dist(e.x, e.y, tx, ty);
  if (d <= stop) return false;
  const step = Math.min(e.def.speed * TILE * dt, d - stop);
  const dx = (tx - e.x) / d, dy = (ty - e.y) / d;
  e.x += dx * step;
  e.y += dy * step;
  if (Math.abs(dx) > 0.15) e.face = dx > 0 ? 1 : -1;
  e.walk += step * 0.22;
  return true;
}

// Evita que los personajes se solapen y que atraviesen edificios o el castillo
function separate() {
  const ents = state.entities;
  const obstacles = [{ x: CX, y: CY, r: 34 }];
  for (const e of ents) if (e.def.building) obstacles.push(e);

  for (let i = 0; i < ents.length; i++) {
    const a = ents[i];
    if (a.def.building) continue;
    for (const o of obstacles) {
      const d = dist(a.x, a.y, o.x, o.y), m = a.r + o.r;
      if (d < m) {
        const nx = d > 0.001 ? (a.x - o.x) / d : 1, ny = d > 0.001 ? (a.y - o.y) / d : 0;
        a.x += nx * (m - d);
        a.y += ny * (m - d);
      }
    }
    for (let j = i + 1; j < ents.length; j++) {
      const b = ents[j];
      if (b.def.building) continue;
      const d = dist(a.x, a.y, b.x, b.y), m = a.r + b.r;
      if (d < m) {
        const nx = d > 0.001 ? (a.x - b.x) / d : 1, ny = d > 0.001 ? (a.y - b.y) / d : 0;
        const p = (m - d) / 2;
        a.x += nx * p; a.y += ny * p;
        b.x -= nx * p; b.y -= ny * p;
      }
    }
    a.x = Math.max(8, Math.min(W + 30, a.x));
    a.y = Math.max(22, Math.min(H - 6, a.y));
  }
}

// ---------- Combate ----------
function nearestIn(from, list, reach) {
  let best = null, bd = Infinity;
  for (const t of list) {
    const d = dist(from.x, from.y, t.x, t.y);
    if (d - t.r <= reach && d < bd) { bd = d; best = t; }
  }
  return best;
}

function addHitFx(x, y) { state.fx.push({ kind: 'hit', x, y, t: 0, dur: 0.18 }); }

function strike(e, target) {
  e.atkT = 0;
  e.cd = e.def.rate;
  if (e.def.range > 1.5) {
    state.fx.push({
      kind: 'shot', x0: e.x, y0: e.y - 24 * e.scale, x1: target.x, y1: target.y - 14, t: 0, dur: 0.14,
    });
  }
  if (target.isCastle) { state.castleHp -= e.def.atk; addHitFx(CX, CY - 6); }
  else { target.hp -= e.def.atk; addHitFx(target.x, target.y - 14); }
}

function playerAct(e, dt) {
  const reach = e.def.range * TILE;
  if (e.def.atk > 0) {
    const foes = state.entities.filter((t) => t.side === 'enemy' && t.hp > 0);
    const tgt = nearestIn(e, foes, reach);
    if (tgt) {
      if (!e.def.building) e.face = tgt.x >= e.x ? 1 : -1;
      if (e.cd <= 0) strike(e, tgt);
      return;
    }
  }
  if (!e.def.mobile) return;

  const aggro = CONFIG.aggroRadius * TILE;
  let foe = null, bd = Infinity;
  for (const t of state.entities) {
    if (t.side !== 'enemy' || t.hp <= 0) continue;
    if (dist(t.x, t.y, CX, CY) > aggro) continue;
    const d = dist(e.x, e.y, t.x, t.y);
    if (d < bd) { bd = d; foe = t; }
  }
  if (foe) moveToward(e, foe.x, foe.y, reach * 0.85 + foe.r, dt);
  else moveToward(e, e.hx, e.hy, 3, dt);
}

function enemyAct(e, dt) {
  const reach = e.def.range * TILE;
  if (castleDist(e) <= reach) {
    e.face = -1;
    if (e.cd <= 0) strike(e, { isCastle: true, x: CX, y: CY });
    return;
  }
  const mine = state.entities.filter((t) => t.side === 'player' && t.hp > 0);
  const tgt = nearestIn(e, mine, reach);
  if (tgt) {
    e.face = tgt.x >= e.x ? 1 : -1;
    if (e.cd <= 0) strike(e, tgt);
    return;
  }
  moveToward(e, CX, CY, 0, dt);
}

function cleanup() {
  for (const e of state.entities) {
    if (e.hp > 0) continue;
    if (e.side === 'enemy') {
      state.gold += e.def.reward;
      state.kills++;
    } else {
      log(`💀 ${e.def.name} ha caído`);
    }
  }
  state.entities = state.entities.filter((e) => e.hp > 0);
}

function spawnEnemy() {
  const y = 50 + Math.random() * (H - 100);
  state.entities.push(makeEntity('enemy', state.queue.shift(), W + 12, y));
}

const waveCleared = () =>
  !state.queue.length && !state.entities.some((e) => e.side === 'enemy');

function combatUpdate(dt) {
  if (state.queue.length) {
    state.spawnT -= dt;
    if (state.spawnT <= 0) { spawnEnemy(); state.spawnT = CONFIG.spawnInterval; }
  }
  for (const e of [...state.entities]) {
    if (e.hp <= 0) continue;
    e.cd = Math.max(0, e.cd - dt);
    e.atkT += dt;
    if (e.side === 'player') playerAct(e, dt); else enemyAct(e, dt);
  }
  separate();
  cleanup();

  if (state.castleHp <= 0) { state.castleHp = 0; gameOver(); return; }
  if (waveCleared()) { state.phase = 'return'; state.returnT = 0; refreshUI(); }
}

function returnUpdate(dt) {
  state.returnT += dt;
  let allHome = true;
  for (const e of state.entities) {
    if (e.side !== 'player' || !e.def.mobile) continue;
    if (dist(e.x, e.y, e.hx, e.hy) > 3) { moveToward(e, e.hx, e.hy, 0, dt); allHome = false; }
  }
  separate();
  if (allHome || state.returnT > 6) {
    for (const e of state.entities) {
      if (e.side === 'player') { e.x = e.hx; e.y = e.hy; e.face = 1; }
    }
    finishWave();
    state.phase = 'build';
    refreshUI();
  }
}

function finishWave() {
  const income = state.entities.reduce(
    (s, e) => s + (e.side === 'player' ? e.def.income || 0 : 0), 0
  );
  const total = CONFIG.waveBonus + income;
  state.gold += total;
  log(`✅ Oleada ${state.wave} superada (+${total} oro)`);
  state.wave++;
  startWave();
}

function update(dt) {
  if (!state || state.over) return;
  if (state.phase === 'combat') combatUpdate(dt);
  else if (state.phase === 'return') returnUpdate(dt);
  for (const f of state.fx) f.t += dt;
  state.fx = state.fx.filter((f) => f.t < f.dur);
}

function startCombat() {
  if (state.phase !== 'build' || state.over) return;
  state.phase = 'combat';
  state.selected = null;
  state.spawnT = 0;
  refreshUI();
}

// ---------- Puntuación ----------
const score = () => (state.wave - 1) * 50 + state.kills * 10;

function loadScores() {
  try { return JSON.parse(localStorage.getItem('td-scores')) || []; } catch { return []; }
}

function saveScore() {
  let name = null;
  try { name = localStorage.getItem('td-name'); } catch { /* sin almacenamiento */ }
  if (!name) {
    name = (prompt('Tu nombre para el marcador:') || 'Anónimo').slice(0, 16);
    try { localStorage.setItem('td-name', name); } catch { /* sin almacenamiento */ }
  }
  const scores = loadScores();
  scores.push({ name, score: score() });
  scores.sort((a, b) => b.score - a.score);
  try { localStorage.setItem('td-scores', JSON.stringify(scores.slice(0, 5))); } catch { /* sin almacenamiento */ }
}

function gameOver() {
  state.over = true;
  saveScore();
  $('final-score').textContent = score();
  $('scores').innerHTML = loadScores().map((s) => `<li>${s.name}: ${s.score}</li>`).join('');
  $('overlay').classList.remove('hidden');
  refreshUI();
}

// ---------- Colocación ----------
function placeUnit(gx, gy) {
  const key = state.selected;
  if (!key || state.over || state.phase !== 'build') return false;
  const def = UNIT_TYPES[key];
  if (state.gold < def.cost) return false;
  if (!isValidSlot(gx, gy) || slotTaken(gx, gy)) return false;
  const p = slotPos(gx, gy);
  const e = makeEntity('player', key, p.x, p.y);
  e.gx = gx; e.gy = gy;
  state.gold -= def.cost;
  state.entities.push(e);
  refreshUI();
  return true;
}

// ---------- Dibujo ----------
function buildBackground() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#35553a';
  g.fillRect(0, 0, W, H);
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 240; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(70,108,66,0.35)' : 'rgba(40,72,46,0.35)';
    g.beginPath();
    g.ellipse(rnd() * W, rnd() * H, 12 + rnd() * 34, 8 + rnd() * 22, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#2b4a30'; g.lineWidth = 1.4; g.lineCap = 'round';
  for (let i = 0; i < 220; i++) {
    const x = rnd() * W, y = rnd() * H;
    line(g, x, y, x - 2, y - 5); line(g, x, y, x + 2, y - 6); line(g, x, y, x, y - 4);
  }
  for (let i = 0; i < 30; i++) {
    const x = rnd() * W, y = rnd() * H;
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(x + 1, y + 2, 7, 3.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8a8d94'; g.beginPath(); g.ellipse(x, y, 6, 4, 0, 0, Math.PI * 2); g.fill();
  }
  const gr = g.createLinearGradient(W - 110, 0, W, 0);
  gr.addColorStop(0, 'rgba(140,40,40,0)');
  gr.addColorStop(1, 'rgba(140,40,40,0.55)');
  g.fillStyle = gr; g.fillRect(W - 110, 0, 110, H);
  return c;
}
const bg = buildBackground();

function drawGrid() {
  // Solo las 8 casillas alrededor del castillo, más el suelo del castillo
  ctx.fillStyle = 'rgba(120,100,70,0.55)';
  ctx.fillRect(CX - TILE / 2, CY - TILE / 2, TILE, TILE);
  for (let gx = -1; gx <= 1; gx++) {
    for (let gy = -1; gy <= 1; gy++) {
      if (!isValidSlot(gx, gy)) continue;
      const p = slotPos(gx, gy);
      ctx.fillStyle = 'rgba(160,220,170,0.16)';
      ctx.fillRect(p.x - TILE / 2, p.y - TILE / 2, TILE, TILE);
      ctx.strokeStyle = 'rgba(190,235,200,0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(p.x - TILE / 2 + 1, p.y - TILE / 2 + 1, TILE - 2, TILE - 2);
    }
  }
  ctx.setLineDash([]);
}

function drawHover() {
  const hv = state.hover;
  if (!hv || !state.selected || state.phase !== 'build' || state.over) return;
  if (!isValidSlot(hv.gx, hv.gy) || slotTaken(hv.gx, hv.gy)) return;
  const def = UNIT_TYPES[state.selected];
  const p = slotPos(hv.gx, hv.gy);
  const ok = state.gold >= def.cost;
  ctx.fillStyle = ok ? 'rgba(120,255,150,0.28)' : 'rgba(255,100,100,0.3)';
  ctx.fillRect(p.x - TILE / 2, p.y - TILE / 2, TILE, TILE);
  ctx.globalAlpha = 0.55;
  drawLook(ctx, def.look, p.x, isBuildingLook(def.look) ? p.y : p.y + 20, { s: 1.15 });
  ctx.globalAlpha = 1;
}

function render() {
  ctx.drawImage(bg, 0, 0);
  drawGrid();
  drawHover();

  const items = state.entities.map((e) => ({ y: e.y, e }));
  items.push({ y: CY + 20, castle: true });
  items.sort((a, b) => a.y - b.y);

  for (const it of items) {
    if (it.castle) {
      drawCastle(ctx, CX, CY);
      drawBar(ctx, CX, CY - 58, 56, state.castleHp / CONFIG.castleHp);
      continue;
    }
    const e = it.e;
    if (e.def.building) {
      drawBuilding(ctx, e.def.look, e.x, e.y);
      drawBar(ctx, e.x, e.y - 40, 36, e.hp / e.maxHp);
    } else {
      const a = e.atkT < ATTACK_ANIM ? Math.max(0.02, e.atkT / ATTACK_ANIM) : 0;
      drawPerson(ctx, e.def.look, e.x, e.y, { s: e.scale, face: e.face, walk: e.walk, atk: a });
      if (e.hp < e.maxHp) drawBar(ctx, e.x, e.y - 46 * e.scale, 24, e.hp / e.maxHp);
    }
  }

  for (const f of state.fx) {
    const k = f.t / f.dur;
    if (f.kind === 'shot') {
      const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k;
      const ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
      ctx.strokeStyle = '#f5e6b3'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      line(ctx, x - Math.cos(ang) * 9, y - Math.sin(ang) * 9, x, y);
    } else {
      ctx.fillStyle = `rgba(255,240,180,${1 - k})`;
      circle(ctx, f.x, f.y, 4 + k * 9);
    }
  }
}

// ---------- Interfaz ----------
const PHASE_NAMES = { build: 'Preparación', combat: 'Combate ⚔️', return: 'Regresando…' };

function updateHud() {
  $('gold').textContent = state.gold;
  $('castle-hp').textContent = `${state.castleHp}/${CONFIG.castleHp}`;
  $('wave').textContent = state.wave;
  $('phase').textContent = PHASE_NAMES[state.phase];
  $('score').textContent = score();
}

function refreshUI() {
  const building = state.phase === 'build' && !state.over;
  $('start-combat').disabled = !building;
  $('speed').textContent = `⏩ Velocidad x${CONFIG.speeds[state.speedIdx]}`;

  const palette = $('palette');
  palette.innerHTML = '';
  for (const [key, def] of Object.entries(UNIT_TYPES)) {
    const b = document.createElement('button');
    b.innerHTML = `<img alt="" src="${iconFor(def.look)}">${def.name}<br>💰${def.cost} · ${def.desc}`;
    if (state.selected === key) b.classList.add('selected');
    b.disabled = !building || state.gold < def.cost;
    b.addEventListener('click', () => {
      state.selected = state.selected === key ? null : key;
      refreshUI();
    });
    palette.appendChild(b);
  }
  updateHud();
}

function pointerToSlot(ev) {
  const r = canvas.getBoundingClientRect();
  const x = (ev.clientX - r.left) * (W / r.width);
  const y = (ev.clientY - r.top) * (H / r.height);
  const gx = Math.round((x - CX) / TILE), gy = Math.round((y - CY) / TILE);
  return isValidSlot(gx, gy) ? { gx, gy } : null;
}

canvas.addEventListener('pointermove', (ev) => { state.hover = pointerToSlot(ev); });
canvas.addEventListener('pointerleave', () => { state.hover = null; });
canvas.addEventListener('click', (ev) => {
  const s = pointerToSlot(ev);
  if (s) placeUnit(s.gx, s.gy);
});

$('start-combat').addEventListener('click', startCombat);
$('restart').addEventListener('click', newGame);
$('speed').addEventListener('click', () => {
  state.speedIdx = (state.speedIdx + 1) % CONFIG.speeds.length;
  refreshUI();
});

// ---------- Bucle principal ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  let rem = dt * CONFIG.speeds[state.speedIdx];
  while (rem > 0) {
    const h = Math.min(rem, 1 / 60);
    update(h);
    rem -= h;
  }
  updateHud();
  render();
  requestAnimationFrame(frame);
}

newGame();
requestAnimationFrame(frame);
