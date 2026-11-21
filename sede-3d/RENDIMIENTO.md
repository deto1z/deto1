# Pruebas de rendimiento (resultados reales)

**Cómo se midió:** `node tools/measure-performance.mjs` abre la app en Chromium real, espera 40 s en la «Vista general» y lee los contadores del motor 3D. Resultados en bruto: `rendimiento-antes.json` y `rendimiento-despues.json`.

> **Limitación importante:** este entorno no tiene tarjeta gráfica (render por software SwiftShader). Los **FPS medidos (0–1) no representan a un equipo real** y no se usan para concluir nada. Las cifras de geometría, memoria y descarga sí son fiables. **No se ha medido en una GPU real ni en un teléfono real**; eso queda pendiente de tu prueba (activa «Mostrar FPS» en ⚙ Gráficos).

## Antes y después de optimizar (calidad Alta)
| Métrica | Antes | Después |
|---|---|---|
| Descarga total | 15,1 MB | **8,3 MB** (−45 %) |
| Triángulos en pantalla | 248.497 | **166.007** (−33 %) |
| Geometrías en memoria de GPU | 2.240 | **696** (−69 %) |
| Memoria JS | 78 MB | **69 MB** |
| Mallas visibles | 549 | 539 |
| Texturas en memoria | 197 | 197 |

## Qué se optimizó
- Modelos GLB comprimidos con meshopt y simplificados (modelos 11,7 MB → 4,7 MB).
- Se eliminó la maceta duplicada de los modelos de planta (−82.000 triángulos) y las luces incrustadas en los GLB (reducen el coste de iluminación).
- Mallas estáticas del edificio fusionadas por material y copias originales liberadas de la GPU.
- Piezas rígidas de cada personaje fusionadas por material.
- Pantallas animadas lejanas se redibujan con menos frecuencia.
- Sombras, reflejos, brillo y resolución son ajustables.

## Niveles de calidad (⚙ Gráficos)
| Nivel | Sombras | Reflejos | Brillo neón | Resolución | Modelos decorativos | Triángulos medidos |
|---|---|---|---|---|---|---|
| Alta | sí | sí | sí | 100 % | sí | 166.007 |
| Media | sí | no | sí | 85 % | sí | 166.007 |
| Baja (móvil por defecto) | no | no | no | 75 % | sí | 165.274 |
| Mínima | no | no | no | 50 % | **no** | **125.637** |

Si el equipo va lento (<20 FPS tras 8 s) y no elegiste calidad, la app baja un escalón sola y lo avisa.

## Rendimiento por equipo: qué esperar (estimación, sin verificar)
Con ~166 mil triángulos y ~540 mallas, un portátil o PC con GPU integrada moderna debería ir fluido en Media/Baja; la calidad Alta (sombras + reflejos) requiere GPU dedicada o integrada reciente. En móvil usar Baja o Mínima. **Es una estimación, no una medición.**

## Pruebas automáticas incluidas
- `node test-walk.mjs`: navegación (escalera, barandillas, colisiones).
- `node test-schedule.mjs`: horarios America/New_York, incluido cambio de horario de verano.
- `node test-routes.mjs`: 38 rutas de movimiento de los agentes.
