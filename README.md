# 🏰 Defensa del Castillo

Juego de defensa (mezcla de tower defense y combate por turnos) hecho en HTML + JavaScript.
Defiende el castillo (a la izquierda) colocando unidades y edificios en las 8 casillas que lo rodean.
Los soldados, arqueros y enemigos son humanoides que caminan libremente por el mapa.

## Cómo jugar
1. **Preparación:** elige una unidad abajo y pulsa una casilla junto al castillo. Solo puedes comprar y colocar en esta fase.
2. Pulsa **Iniciar combate**: desde ese momento todo es automático hasta que mueran todos los enemigos o caiga el castillo.
3. Las unidades móviles salen a por los enemigos cuando se acercan a la base.
4. Al terminar la oleada, tus unidades vuelven a su casilla y empieza una nueva fase de preparación (con oro extra por superarla).
5. El botón **Velocidad** acelera el combate (x1, x2, x4).

## Estructura
| Archivo | Qué contiene |
|---|---|
| `index.html` | La página |
| `style.css` | Aspecto de la página |
| `units.js` | **Datos**: unidades, edificios, enemigos y oleadas |
| `sprites.js` | **Dibujos**: cómo se ven los humanoides y los edificios |
| `game.js` | Reglas: fases, movimiento, combate, interfaz |

## Añadir una unidad nueva
1. En `units.js`: copia una entrada de `UNIT_TYPES` o `ENEMY_TYPES` y cambia nombre y estadísticas (alcance y velocidad en casillas).
2. En `sprites.js`: añade sus colores en `PEOPLE` y, si quieres, un adorno o arma propios en `drawPerson`. Si no, puedes reutilizar el `look` de otra.

## Ajustes rápidos
En `CONFIG` (arriba de `game.js`): oro inicial, radio de alerta de las unidades, ritmo de aparición de enemigos...

## Ideas pendientes
- Marcador compartido entre amigos (ahora se guarda solo en el navegador)
- Vender o mejorar unidades; curar el castillo entre oleadas
- Más tipos de enemigos y jefes; enemigos que escalan con la oleada
- Sonidos y animaciones
