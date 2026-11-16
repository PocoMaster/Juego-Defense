// ============================================================
// DATOS DEL JUEGO — aquí se añaden unidades, edificios y enemigos.
// No hace falta tocar game.js para añadir uno nuevo.
// ============================================================

// Lo que el jugador puede colocar en las 8 casillas alrededor del castillo.
//  cost   : oro necesario
//  hp     : vida
//  atk    : daño por paso de combate (0 = no ataca)
//  range  : alcance en casillas (1 = cuerpo a cuerpo, diagonales incluidas)
//  move   : casillas que se mueve por paso
//  mobile : true = sale a perseguir enemigos cuando se acercan a la base
//  income : oro que genera al superar cada oleada (opcional)
const UNIT_TYPES = {
  soldado: { name: 'Soldado', emoji: '🗡️', cost: 30, hp: 40, atk: 8,  range: 1, move: 1, mobile: true,  desc: 'Cuerpo a cuerpo' },
  arquero: { name: 'Arquero', emoji: '🏹', cost: 40, hp: 25, atk: 7,  range: 3, move: 1, mobile: true,  desc: 'Ataca de lejos' },
  torre:   { name: 'Torre',   emoji: '🗼', cost: 50, hp: 60, atk: 10, range: 4, move: 0, mobile: false, desc: 'Fija, gran alcance' },
  muro:    { name: 'Muro',    emoji: '🧱', cost: 20, hp: 100, atk: 0, range: 0, move: 0, mobile: false, desc: 'Bloquea y aguanta' },
  mina:    { name: 'Mina',    emoji: '⛏️', cost: 40, hp: 30, atk: 0,  range: 0, move: 0, mobile: false, income: 30, desc: '+30 oro/oleada' },
};

// Enemigos. reward = oro que dan al morir.
const ENEMY_TYPES = {
  goblin: { name: 'Goblin', emoji: '👺', hp: 20, atk: 5,  range: 1, move: 1, reward: 5 },
  orco:   { name: 'Orco',   emoji: '👹', hp: 60, atk: 10, range: 1, move: 1, reward: 12 },
  lobo:   { name: 'Lobo',   emoji: '🐺', hp: 15, atk: 6,  range: 1, move: 2, reward: 7 },
};

// Composición de cada oleada: lista de enemigos en orden aleatorio.
function waveComposition(n) {
  const list = [];
  for (let i = 0; i < 3 + n * 2; i++) list.push('goblin');
  for (let i = 0; i < Math.floor(n / 2); i++) list.push('lobo');
  for (let i = 0; i < Math.floor((n - 1) / 2); i++) list.push('orco');
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
