// ============================================================
// LÓGICA DEL JUEGO
// ============================================================

const CONFIG = {
  cols: 13,
  rows: 9,
  castle: { x: 6, y: 4 },     // casilla central
  castleHp: 100,
  startGold: 100,
  aggroRadius: 5,             // distancia (desde el castillo) a la que las unidades salen a por los enemigos
  spawn: { x: 12, y: 4 },     // punto por donde llegan siempre los enemigos
  spawnPerTurn: 2,            // enemigos que aparecen cada turno
  waveBonus: 25,              // oro extra al superar una oleada
};

let state = null;
const $ = (id) => document.getElementById(id);

// ---------- Utilidades ----------
const inBounds = (x, y) => x >= 0 && y >= 0 && x < CONFIG.cols && y < CONFIG.rows;
const isCastle = (x, y) => x === CONFIG.castle.x && y === CONFIG.castle.y;
const isSlot = (x, y) =>
  !isCastle(x, y) && Math.abs(x - CONFIG.castle.x) <= 1 && Math.abs(y - CONFIG.castle.y) <= 1;
const dist = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
const entityAt = (x, y) => state.entities.find((e) => e.x === x && e.y === y && e.hp > 0);
const isFree = (x, y) => inBounds(x, y) && !isCastle(x, y) && !entityAt(x, y);

function log(msg) {
  state.log.unshift(msg);
  state.log = state.log.slice(0, 6);
}

function makeEntity(side, typeKey, x, y) {
  const def = side === 'enemy' ? ENEMY_TYPES[typeKey] : UNIT_TYPES[typeKey];
  return { side, type: typeKey, def, x, y, hx: x, hy: y, hp: def.hp, maxHp: def.hp };
}

// ---------- Inicio de partida ----------
function newGame() {
  state = {
    turn: 1,
    wave: 1,
    gold: CONFIG.startGold,
    castleHp: CONFIG.castleHp,
    entities: [],
    queue: [],
    kills: 0,
    over: false,
    selected: null,
    log: [],
  };
  startWave();
  $('overlay').classList.add('hidden');
  render();
}

function startWave() {
  state.queue = waveComposition(state.wave);
  log(`🌊 Oleada ${state.wave}: vienen ${state.queue.length} enemigos`);
}

// ---------- Movimiento ----------
// Mueve la entidad hasta `move` casillas hacia (tx, ty), parando cuando esté a `stopRange`.
function stepToward(e, tx, ty, stopRange) {
  for (let i = 0; i < e.def.move; i++) {
    if (dist(e.x, e.y, tx, ty) <= stopRange) return;
    let best = null;
    let bestD = (e.x - tx) ** 2 + (e.y - ty) ** 2;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = e.x + dx;
        const ny = e.y + dy;
        if (!isFree(nx, ny)) continue;
        const d = (nx - tx) ** 2 + (ny - ty) ** 2;
        if (d < bestD) { bestD = d; best = { x: nx, y: ny }; }
      }
    }
    if (!best) return;
    e.x = best.x;
    e.y = best.y;
  }
}

// ---------- Combate ----------
function tryAttack(e) {
  if (e.def.atk <= 0) return false;
  const { x: cx, y: cy } = CONFIG.castle;

  if (e.side === 'player') {
    const targets = state.entities.filter(
      (t) => t.side === 'enemy' && t.hp > 0 && dist(e.x, e.y, t.x, t.y) <= e.def.range
    );
    if (!targets.length) return false;
    targets.sort(
      (a, b) => dist(e.x, e.y, a.x, a.y) - dist(e.x, e.y, b.x, b.y) || a.hp - b.hp
    );
    targets[0].hp -= e.def.atk;
    return true;
  }

  // Enemigo: prioriza el castillo si lo tiene a tiro
  if (dist(e.x, e.y, cx, cy) <= e.def.range) {
    state.castleHp -= e.def.atk;
    return true;
  }
  const targets = state.entities.filter(
    (t) => t.side === 'player' && t.hp > 0 && dist(e.x, e.y, t.x, t.y) <= e.def.range
  );
  if (!targets.length) return false;
  targets.sort((a, b) => a.hp - b.hp);
  targets[0].hp -= e.def.atk;
  return true;
}

function playerPhase() {
  const { x: cx, y: cy } = CONFIG.castle;
  for (const e of state.entities.filter((x) => x.side === 'player')) {
    if (e.hp <= 0) continue;
    if (tryAttack(e)) continue;
    if (!e.def.mobile) continue;

    const foes = state.entities.filter(
      (t) => t.side === 'enemy' && t.hp > 0 && dist(t.x, t.y, cx, cy) <= CONFIG.aggroRadius
    );
    if (foes.length) {
      foes.sort((a, b) => dist(e.x, e.y, a.x, a.y) - dist(e.x, e.y, b.x, b.y));
      stepToward(e, foes[0].x, foes[0].y, e.def.range);
      tryAttack(e);
    } else if (e.x !== e.hx || e.y !== e.hy) {
      stepToward(e, e.hx, e.hy, 0); // vuelve a su casilla
    }
  }
}

function enemyPhase() {
  const { x: cx, y: cy } = CONFIG.castle;
  for (const e of state.entities.filter((x) => x.side === 'enemy')) {
    if (e.hp <= 0) continue;
    if (tryAttack(e)) continue;
    stepToward(e, cx, cy, e.def.range);
    tryAttack(e);
  }
}

function cleanup() {
  for (const e of state.entities) {
    if (e.hp > 0) continue;
    if (e.side === 'enemy') {
      state.gold += e.def.reward;
      state.kills++;
    } else {
      log(`${e.def.emoji} ${e.def.name} ha caído`);
    }
  }
  state.entities = state.entities.filter((e) => e.hp > 0);
}

function spawnEnemies() {
  const { x: sx, y: sy } = CONFIG.spawn;
  const rows = [...Array(CONFIG.rows).keys()].sort((a, b) => Math.abs(a - sy) - Math.abs(b - sy));
  let n = CONFIG.spawnPerTurn;
  while (n > 0 && state.queue.length) {
    const y = rows.find((r) => isFree(sx, r));
    if (y === undefined) break;
    state.entities.push(makeEntity('enemy', state.queue.shift(), sx, y));
    n--;
  }
}

// ---------- Turno ----------
function endTurn() {
  if (state.over) return;

  playerPhase();
  cleanup();
  enemyPhase();
  cleanup();

  if (state.castleHp <= 0) {
    state.castleHp = 0;
    gameOver();
    return;
  }

  spawnEnemies();

  const income = state.entities.reduce((s, e) => s + (e.side === 'player' ? e.def.income || 0 : 0), 0);
  if (income) state.gold += income;
  state.turn++;

  if (!state.queue.length && !state.entities.some((e) => e.side === 'enemy')) {
    state.gold += CONFIG.waveBonus;
    log(`✅ Oleada ${state.wave} superada (+${CONFIG.waveBonus} oro)`);
    state.wave++;
    startWave();
  }
  render();
}

// ---------- Puntuación ----------
const score = () => (state.wave - 1) * 50 + state.kills * 10;

function loadScores() {
  try { return JSON.parse(localStorage.getItem('td-scores')) || []; } catch { return []; }
}

function saveScore() {
  let name = localStorage.getItem('td-name');
  if (!name) {
    name = (prompt('Tu nombre para el marcador:') || 'Anónimo').slice(0, 16);
    localStorage.setItem('td-name', name);
  }
  const scores = loadScores();
  scores.push({ name, score: score() });
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem('td-scores', JSON.stringify(scores.slice(0, 5)));
}

function gameOver() {
  state.over = true;
  saveScore();
  render();
  $('final-score').textContent = score();
  $('scores').innerHTML = loadScores().map((s) => `<li>${s.name}: ${s.score}</li>`).join('');
  $('overlay').classList.remove('hidden');
}

// ---------- Interfaz ----------
function placeUnit(x, y) {
  const key = state.selected;
  if (!key || state.over) return;
  const def = UNIT_TYPES[key];
  if (state.gold < def.cost) return;
  if (!isSlot(x, y) || entityAt(x, y)) return;
  state.gold -= def.cost;
  state.entities.push(makeEntity('player', key, x, y));
  render();
}

function render() {
  $('gold').textContent = state.gold;
  $('castle-hp').textContent = `${state.castleHp}/${CONFIG.castleHp}`;
  $('wave').textContent = state.wave;
  $('turn').textContent = state.turn;
  $('score').textContent = score();

  const board = $('board');
  board.innerHTML = '';
  for (let y = 0; y < CONFIG.rows; y++) {
    for (let x = 0; x < CONFIG.cols; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (isSlot(x, y)) cell.classList.add('slot');
      if (x === CONFIG.spawn.x) cell.classList.add('spawn');
      let hpPct = null;

      if (isCastle(x, y)) {
        cell.classList.add('castle');
        cell.textContent = '🏰';
        hpPct = state.castleHp / CONFIG.castleHp;
      } else {
        const e = entityAt(x, y);
        if (e) {
          cell.textContent = e.def.emoji;
          hpPct = e.hp / e.maxHp;
        }
      }
      if (hpPct !== null) {
        const bar = document.createElement('div');
        bar.className = 'hp';
        bar.innerHTML = `<i style="width:${Math.max(0, hpPct) * 100}%"></i>`;
        cell.appendChild(bar);
      }
      if (isSlot(x, y)) cell.addEventListener('click', () => placeUnit(x, y));
      board.appendChild(cell);
    }
  }

  const palette = $('palette');
  palette.innerHTML = '';
  for (const [key, def] of Object.entries(UNIT_TYPES)) {
    const b = document.createElement('button');
    b.innerHTML = `${def.emoji} ${def.name}<br>💰${def.cost} · ${def.desc}`;
    if (state.selected === key) b.classList.add('selected');
    b.disabled = state.gold < def.cost;
    b.addEventListener('click', () => {
      state.selected = state.selected === key ? null : key;
      render();
    });
    palette.appendChild(b);
  }

  $('log').innerHTML = state.log.map((l) => `<li>${l}</li>`).join('');
}

$('end-turn').addEventListener('click', endTurn);
$('restart').addEventListener('click', newGame);
newGame();
