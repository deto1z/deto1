# Lista de correcciones realizadas (revisión v2)

## 1. Acceso
- Versión de prueba **privada** publicada como página de Claude (solo la abre tu cuenta). Sin alojamiento de pago, sin claves ni credenciales en el código. Generada con `node tools/build-artifact.mjs`.
- Lanzador local para Windows (`INICIAR_DETONADOR.bat`) y `npm run dev`.

## 2. Correcciones visuales
| Pedido | Qué se hizo |
|---|---|
| Eliminar el resplandor blanco del suelo | **Causa real hallada**: los modelos GLB de plantas/sofás traían *luces incrustadas* (una direccional de intensidad 3 y decenas de puntuales) que se duplicaban en cada copia. Se eliminan al cargar. Además: suelos menos metálicos, reflejo del entorno atenuado, luz direccional suave, tráfico de la ciudad más lejano y tenue, RGB sin sobreexponer. Confirmado en capturas |
| Cámaras y objetos que bloquean | Cámaras de cine reubicadas a esquinas y laterales; escritorio del CEO sin monitor central; truss de focos más fino y alto |
| TITAN X claramente visible | Sentado tras su escritorio con avatar 3D real; monitores laterales; vista «Oficina del CEO» más cercana |
| RGB azul y violeta | Tiras con **efecto de persecución** (onda azul→violeta→cian) en fachada, techo y escalera; focos del truss con haces de luz animados |
| Reflejos de cristal y materiales | Cristal físico con clearcoat y reflejos de tiras de luz; mármol, madera, metal; reflejos controlables en Gráficos |
| Detalles de estudio de streaming | Cartel ON AIR, paneles acústicos, softboxes, aro de luz, micrófonos con brazo, mesa de mezclas, truss con focos, cámaras de cine, Stream Deck |
| Dos plantas completas | Conservadas; ambas visibles con «Vista general» y por separado |

## 3. Personajes
- Siete humanoides 3D **reales** (Quaternius, CC0), distintos entre sí, con los colores de la empresa. Sin primitivas.
- Animaciones de captura de movimiento (Quaternius UAL, CC0) retargeteadas a cada esqueleto. Inventario y licencias: `INVENTARIO_MODELOS.md`.

## 4. Estaciones por especialidad
VIRAL HUNTER (fútbol/tendencias) · HOOK MASTER (guiones) · PIXEL QUEEN (diseño de portadas) · FILTER X (verificación) · IDEA STORM (calendario editorial) · DATA BOSS (redes) · TITAN X (mando ejecutivo): cabina propia con panel y rótulo, pantallas temáticas y objetos propios. Todo el contenido de pantallas está rotulado **DEMO · sin datos reales**.

## 5. Cámaras y chat
Vista general isométrica (sin techo), exterior, entrada, planta 1, planta 2, oficina del CEO, sala de juntas, vista individual de cada trabajador y modo caminar opcional. Chat con TITAN X siempre disponible (botón fijo; recuerda si estaba abierto).

## 6. Animaciones
Caminar, sentarse, escribir, mirar monitores, hablar, reunión y descanso. Los agentes pueden **levantarse y caminar por rutas fijas (incluida la escalera)** al escritorio, a la sala de juntas o al lounge (`test-routes.mjs`: 38 rutas verificadas). Listas para enlazar con estados reales (`getAgentView` / `setAgentState`).

## 7. Rendimiento
Ver `RENDIMIENTO.md` (cifras reales antes/después).

## Errores propios encontrados y corregidos en el proceso
- Pantalla negra en vistas cenitales: provocada por las partículas «Sparkles» (NaN en el bloom). Sustituidas.
- Cadera de los personajes desplazada al origen (error de espacio de coordenadas en el retargeting).
- Ruta de TITAN X fallaba (detectado por `test-routes.mjs`).
- Maceta duplicada de 82 mil triángulos en los modelos de planta.
