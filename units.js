// ============================================================
// DATOS DEL JUEGO — aquí se añaden unidades, edificios y enemigos.
// Para añadir uno nuevo: copia una entrada, cámbiale las estadísticas
// y, si quieres un aspecto propio, añade su dibujo en sprites.js.
// ============================================================
//
// Unidades de medida: 1 casilla = 1 "tile" (64 px). El movimiento es continuo.
//  look     : aspecto (nombre del dibujo en sprites.js)
//  cost     : oro necesario
//  hp       : vida
//  atk      : daño por ataque (0 = no ataca)
//  range    : alcance en casillas (0.7 = cuerpo a cuerpo, 3 = arco...)
//  speed    : velocidad en casillas por segundo
//  rate     : segundos entre ataques
//  mobile   : true = sale a perseguir enemigos cuando se acercan a la base
//  building : true = edificio fijo (no es humanoide)
//  income   : oro que genera al superar cada oleada (opcional)

// Lo que el jugador puede colocar en las 8 casillas alrededor del castillo.
const UNIT_TYPES = {
  soldado: { name: 'Soldado', look: 'soldado', cost: 30, hp: 40,  atk: 8,  range: 0.7, speed: 1.9, rate: 1, mobile: true,  desc: 'Cuerpo a cuerpo' },
  arquero: { name: 'Arquero', look: 'arquero', cost: 40, hp: 25,  atk: 7,  range: 3,   speed: 1.7, rate: 1, mobile: true,  desc: 'Ataca de lejos' },
  torre:   { name: 'Torre',   look: 'torre',   cost: 50, hp: 60,  atk: 10, range: 4,   speed: 0,   rate: 1, mobile: false, building: true, desc: 'Fija, gran alcance' },
  muro:    { name: 'Muro',    look: 'muro',    cost: 20, hp: 100, atk: 0,  range: 0,   speed: 0,   rate: 1, mobile: false, building: true, desc: 'Bloquea y aguanta' },
  mina:    { name: 'Mina',    look: 'mina',    cost: 40, hp: 30,  atk: 0,  range: 0,   speed: 0,   rate: 1, mobile: false, building: true, income: 30, desc: '+30 oro/oleada' },
};

// Enemigos (todos humanoides). reward = oro que dan al morir. scale = tamaño del dibujo.
const ENEMY_TYPES = {
  goblin:    { name: 'Goblin',    look: 'goblin',    hp: 20, atk: 5,  range: 0.6, speed: 1.4, rate: 1,   reward: 5,  scale: 0.85 },
  orco:      { name: 'Orco',      look: 'orco',      hp: 60, atk: 10, range: 0.8, speed: 1.0, rate: 1.2, reward: 12, scale: 1.25 },
  saqueador: { name: 'Saqueador', look: 'saqueador', hp: 15, atk: 6,  range: 0.6, speed: 2.6, rate: 0.8, reward: 7,  scale: 0.95 },
};

// Composición de cada oleada: lista de enemigos en orden aleatorio.
function waveComposition(n) {
  const list = [];
  for (let i = 0; i < 3 + n * 2; i++) list.push('goblin');
  for (let i = 0; i < Math.floor(n / 2); i++) list.push('saqueador');
  for (let i = 0; i < Math.floor((n - 1) / 2); i++) list.push('orco');
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
