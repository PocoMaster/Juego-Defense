# 🏰 Defensa del Castillo

Juego por turnos (mezcla de tower defense y combate por turnos) hecho en HTML + JavaScript.
Defiende el castillo (a la izquierda) colocando unidades y edificios en las 8 casillas que lo rodean.

## Cómo jugar
1. **Preparación:** elige una unidad abajo y pulsa una casilla verde junto al castillo. Solo puedes comprar y colocar en esta fase.
2. Pulsa **Iniciar combate**: desde ese momento todo es automático hasta que mueran todos los enemigos o caiga el castillo.
3. Las unidades móviles salen a por los enemigos cuando se acercan a la base.
4. Al terminar la oleada, tus unidades vuelven a su casilla y empieza una nueva fase de preparación (con oro extra por superarla).

## Estructura
| Archivo | Qué contiene |
|---|---|
| `index.html` | La página |
| `style.css` | Aspecto |
| `units.js` | **Datos**: unidades, edificios, enemigos y oleadas |
| `game.js` | Reglas: fases, movimiento, combate, interfaz |

## Ajustes rápidos
En `CONFIG` (arriba de `game.js`): velocidad del combate (`stepDelay`), enemigos por paso (`spawnPerStep`), oro inicial, etc.

## Añadir una unidad nueva
Edita solo `units.js`: copia una entrada de `UNIT_TYPES`, cambia nombre, emoji y estadísticas. Aparecerá sola en el menú.

## Ideas pendientes
- Marcador compartido entre amigos (ahora se guarda solo en el navegador)
- Vender o mejorar unidades
- Más tipos de enemigos y jefes
- Sonidos y animaciones
