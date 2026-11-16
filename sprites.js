// ============================================================
// DIBUJOS — humanoides y edificios dibujados con código (canvas).
// Cada personaje se dibuja de pie, mirando a la derecha; el juego lo voltea si hace falta.
// ============================================================

const PEOPLE = {
  soldado:   { skin: '#f2c9a0', body: '#3b6fd6', legs: '#2b3a66' },
  arquero:   { skin: '#f2c9a0', body: '#2f9e5b', legs: '#3b3a2a' },
  goblin:    { skin: '#7bc043', body: '#6b4f2a', legs: '#4a3a22' },
  orco:      { skin: '#5c7a3a', body: '#5a5f66', legs: '#3a2f25' },
  saqueador: { skin: '#d9a273', body: '#b03a2e', legs: '#3a2020' },
};
const BUILDINGS = { torre: true, muro: true, mina: true };
const isBuildingLook = (look) => !!BUILDINGS[look];

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function tri(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill();
}
function circle(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// o: { s: escala, face: 1|-1, walk: fase de caminar, atk: 0..1 progreso del ataque }
function drawPerson(ctx, look, x, y, o = {}) {
  const P = PEOPLE[look];
  const s = o.s || 1, face = o.face || 1, walk = o.walk || 0, atk = o.atk || 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 0, 9 * s, 3.5 * s, 0, 0, Math.PI * 2); ctx.fill();

  ctx.scale(face, 1);
  ctx.translate(0, -Math.abs(Math.cos(walk)) * 1.2 * s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const sw = Math.sin(walk);

  // piernas
  ctx.strokeStyle = P.legs; ctx.lineWidth = 3.4 * s;
  line(ctx, -1.5 * s, -13 * s, -1.5 * s + sw * 5 * s, 0);
  line(ctx, 1.5 * s, -13 * s, 1.5 * s - sw * 5 * s, 0);

  // brazo trasero
  const sx = 0, sy = -25 * s;
  ctx.strokeStyle = P.skin; ctx.lineWidth = 2.8 * s;
  line(ctx, sx, sy, sx - sw * 4 * s, sy + 9 * s);

  // torso
  ctx.fillStyle = P.body;
  ctx.fillRect(-5 * s, -28 * s, 10 * s, 16 * s);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-5 * s, -17 * s, 10 * s, 2 * s); // cinturón

  // escudo del soldado (sobre el torso)
  if (look === 'soldado') {
    ctx.fillStyle = '#c9a227'; circle(ctx, -1 * s, -20 * s, 5.2 * s);
    ctx.strokeStyle = '#7a5c10'; ctx.lineWidth = 1 * s;
    ctx.beginPath(); ctx.arc(-1 * s, -20 * s, 5.2 * s, 0, Math.PI * 2); ctx.stroke();
  }

  // cabeza
  const hx = 1 * s, hy = -33 * s;
  ctx.fillStyle = P.skin; circle(ctx, hx, hy, 5.2 * s);
  ctx.fillStyle = '#222'; circle(ctx, hx + 2.4 * s, hy - 0.6 * s, 0.9 * s);

  // adornos de la cabeza
  if (look === 'soldado') {
    ctx.fillStyle = '#9aa4b2';
    ctx.beginPath(); ctx.arc(hx, hy - 0.8 * s, 5.8 * s, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(hx - 5.8 * s, hy - 1.2 * s, 11.6 * s, 1.6 * s);
  } else if (look === 'arquero') {
    ctx.fillStyle = '#1f7a45';
    tri(ctx, hx - 6 * s, hy, hx + 0.5 * s, hy - 10 * s, hx + 6.2 * s, hy);
  } else if (look === 'goblin') {
    ctx.fillStyle = P.skin;
    tri(ctx, hx - 4 * s, hy - 1 * s, hx - 12 * s, hy - 5 * s, hx - 4 * s, hy + 2.5 * s);
    tri(ctx, hx + 4 * s, hy - 1 * s, hx + 11 * s, hy - 6 * s, hx + 4 * s, hy + 2.5 * s);
    ctx.fillStyle = '#5a9a2c'; tri(ctx, hx + 4.5 * s, hy + 0.5 * s, hx + 8 * s, hy + 2 * s, hx + 4.5 * s, hy + 3 * s);
  } else if (look === 'orco') {
    ctx.fillStyle = '#e9e4d0';
    tri(ctx, hx + 1 * s, hy + 3 * s, hx + 2.2 * s, hy + 6.5 * s, hx + 3.4 * s, hy + 3 * s);
    tri(ctx, hx + 3.6 * s, hy + 3 * s, hx + 4.7 * s, hy + 6.5 * s, hx + 5.6 * s, hy + 2.6 * s);
    ctx.strokeStyle = '#2d3d1a'; ctx.lineWidth = 1.4 * s;
    line(ctx, hx + 0 * s, hy - 3 * s, hx + 5 * s, hy - 1.6 * s);
  } else if (look === 'saqueador') {
    ctx.fillStyle = '#8a2a20';
    tri(ctx, hx - 6 * s, hy + 0.5 * s, hx - 0.5 * s, hy - 9 * s, hx + 6.2 * s, hy + 0.5 * s);
    ctx.fillStyle = '#b03a2e';
    ctx.fillRect(hx - 4 * s, hy + 2.2 * s, 9 * s, 2.6 * s); // pañuelo
  }

  // brazo delantero y arma
  const ranged = look === 'arquero';
  const th = ranged ? -0.05 : (atk > 0 ? -1.4 + 2.2 * atk : 0.55 + sw * 0.12);
  const arm = 9 * s;
  const hxA = sx + Math.cos(th) * arm, hyA = sy + Math.sin(th) * arm;
  ctx.strokeStyle = P.skin; ctx.lineWidth = 2.8 * s;
  line(ctx, sx, sy, hxA, hyA);

  const dirx = Math.cos(th - 0.35), diry = Math.sin(th - 0.35);
  if (look === 'soldado') {
    ctx.strokeStyle = '#dfe6ee'; ctx.lineWidth = 2.2 * s;
    line(ctx, hxA, hyA, hxA + dirx * 14 * s, hyA + diry * 14 * s);
    ctx.strokeStyle = '#7a5c10'; ctx.lineWidth = 2.6 * s;
    line(ctx, hxA - dirx * 1.5 * s, hyA - diry * 1.5 * s, hxA + dirx * 1.5 * s, hyA + diry * 1.5 * s);
  } else if (look === 'arquero') {
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 1.9 * s;
    ctx.beginPath(); ctx.arc(hxA - 2 * s, hyA, 9 * s, -1.15, 1.15); ctx.stroke();
    const tx = hxA - 2 * s + Math.cos(1.15) * 9 * s, ty1 = hyA - Math.sin(1.15) * 9 * s, ty2 = hyA + Math.sin(1.15) * 9 * s;
    ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 0.9 * s;
    if (atk > 0 && atk < 0.7) { line(ctx, tx, ty1, tx - 5 * s * (1 - atk), hyA); line(ctx, tx - 5 * s * (1 - atk), hyA, tx, ty2); }
    else line(ctx, tx, ty1, tx, ty2);
    if (atk > 0 && atk < 0.7) { ctx.strokeStyle = '#e8d9b0'; ctx.lineWidth = 1.2 * s; line(ctx, tx - 5 * s * (1 - atk), hyA, hxA + 10 * s, hyA); }
  } else if (look === 'goblin' || look === 'saqueador') {
    ctx.strokeStyle = '#d4dbe0'; ctx.lineWidth = 1.8 * s;
    line(ctx, hxA, hyA, hxA + dirx * 8 * s, hyA + diry * 8 * s);
  } else if (look === 'orco') {
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 3.8 * s;
    line(ctx, hxA, hyA, hxA + dirx * 15 * s, hyA + diry * 15 * s);
    ctx.fillStyle = '#6b4a2b'; circle(ctx, hxA + dirx * 15 * s, hyA + diry * 15 * s, 3.6 * s);
  }
  ctx.restore();
}

// ---------- Edificios (centrados en su casilla) ----------
function drawBuilding(ctx, look, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 22, 24, 6, 0, 0, Math.PI * 2); ctx.fill();

  if (look === 'torre') {
    ctx.fillStyle = '#8d909b';
    ctx.beginPath(); ctx.moveTo(-14, 22); ctx.lineTo(-11, -14); ctx.lineTo(11, -14); ctx.lineTo(14, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a3a6b1'; ctx.fillRect(-16, -22, 32, 9);
    for (const mx of [-16, -4, 8]) ctx.fillRect(mx, -28, 8, 6);
    ctx.fillStyle = '#2a2d36'; ctx.fillRect(-3, -6, 6, 11);
    ctx.strokeStyle = '#5b4026'; ctx.lineWidth = 1.5; line(ctx, 0, -28, 0, -42);
    ctx.fillStyle = '#3b6fd6'; tri(ctx, 0, -42, 12, -38, 0, -34);
  } else if (look === 'muro') {
    ctx.fillStyle = '#b07a54'; ctx.fillRect(-26, -12, 52, 34);
    ctx.fillStyle = '#c28d66'; ctx.fillRect(-26, -12, 52, 6);
    ctx.strokeStyle = '#7a4f33'; ctx.lineWidth = 1.2;
    for (let r = 0; r < 3; r++) {
      const yy = -6 + r * 9;
      line(ctx, -26, yy + 9, 26, yy + 9);
      for (let c = (r % 2 ? 0 : -9); c < 26; c += 18) line(ctx, c, yy, c, yy + 9);
    }
    ctx.strokeStyle = '#7a4f33'; ctx.strokeRect(-26, -12, 52, 34);
  } else if (look === 'mina') {
    ctx.fillStyle = '#7a5230'; ctx.fillRect(-20, -4, 40, 26);
    ctx.fillStyle = '#4a2f1b'; tri(ctx, -26, -4, 0, -26, 26, -4);
    ctx.fillStyle = '#1a1208'; ctx.fillRect(-7, 6, 14, 16);
    ctx.fillStyle = '#f0b429'; circle(ctx, -14, 18, 2.6); circle(ctx, 13, 17, 2.2); circle(ctx, 17, 20, 1.8);
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 2; line(ctx, 10, 20, 20, 2);
    ctx.strokeStyle = '#9aa4b2'; ctx.lineWidth = 2.4; line(ctx, 14, 3, 24, 5);
  }
  ctx.restore();
}

function drawCastle(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 24, 32, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9a9ca6'; ctx.fillRect(-27, -6, 54, 30);
  ctx.fillStyle = '#868995';
  ctx.fillRect(-31, -20, 14, 44); ctx.fillRect(17, -20, 14, 44);
  ctx.fillStyle = '#a9acb7'; ctx.fillRect(-12, -26, 24, 50);
  ctx.fillStyle = '#c1c4ce';
  for (const mx of [-31, -24, -17]) ctx.fillRect(mx, -25, 5, 5);
  for (const mx of [17, 24, 29 - 5]) ctx.fillRect(mx, -25, 5, 5);
  for (const mx of [-12, -3, 6]) ctx.fillRect(mx, -32, 6, 6);
  ctx.fillStyle = '#2a2d36'; ctx.beginPath(); ctx.moveTo(-6, 24); ctx.lineTo(-6, 10); ctx.arc(0, 10, 6, Math.PI, 0); ctx.lineTo(6, 24); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a2d36'; ctx.fillRect(-26, -10, 3, 7); ctx.fillRect(23, -10, 3, 7);
  ctx.strokeStyle = '#5b4026'; ctx.lineWidth = 2; line(ctx, 0, -32, 0, -48);
  ctx.fillStyle = '#3b6fd6'; tri(ctx, 0, -48, 15, -43, 0, -38);
  ctx.restore();
}

function drawLook(ctx, look, x, y, o = {}) {
  if (isBuildingLook(look)) drawBuilding(ctx, look, x, y);
  else drawPerson(ctx, look, x, y, o);
}

function drawBar(ctx, x, y, w, pct) {
  ctx.fillStyle = '#400'; ctx.fillRect(x - w / 2, y, w, 4);
  ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#f87171';
  ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, pct)), 4);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2, y, w, 4);
}

// Icono pequeño (data URL) para el menú de compra
const _icons = {};
function iconFor(look) {
  if (_icons[look]) return _icons[look];
  const c = document.createElement('canvas');
  c.width = 56; c.height = 64;
  const g = c.getContext('2d');
  if (isBuildingLook(look)) { g.translate(28, 34); g.scale(0.85, 0.85); drawBuilding(g, look, 0, 0); }
  else drawPerson(g, look, 28, 58, { s: 1.35, face: 1 });
  return (_icons[look] = c.toDataURL());
}
