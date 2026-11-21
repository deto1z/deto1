# DETONADOR AI EMPIRE — Sede virtual 3D

## Fase 1 · Inspección del proyecto

El repositorio `deto1` contiene solo:
- `main.jsx` (punto de entrada React que importa `App.jsx` e `index.css`, que **no existen** en el repo).
- `README.md`, que en realidad contiene el código de un sitio estático de fútbol ("La Cancha del Deto").
- No hay `package.json`, backend, base de datos ni código de **DETONADOR CLIPS AI**.

**Decisión:** la sede se desarrolla como **módulo independiente** en `sede-3d/` (Vite + React + Three.js), con su propio
`package.json`. No se modificó ningún archivo existente. Cuando compartas el código real de DETONADOR CLIPS AI
(o su repo) se evaluará la integración (Fase 6) con respaldo previo; hasta entonces no hay nada que integrar ni que pueda romperse.

## Arquitectura prevista

```
Navegador (sede-3d, React + R3F)  ⇄  API REST + WebSocket  ⇄  Orquestador (Node)  ⇄  Agentes (herramientas)
        Fase 2 (hecha)                       Fase 4                    Fase 4                 Fase 5
```

- **Frontend (hecho):** edificio 3D, cámara, UI. Todo el texto de las pantallas está rotulado *DEMO · sin datos reales*.
- **Orquestador (Fase 4):** TITAN X recibe órdenes → crea tareas → las asigna → supervisa → pide correcciones → entrega propuestas.
  Estados `disponible / trabajando / esperando / terminado`, persistencia en base de datos (SQLite/Postgres) y WebSocket para tiempo real.
- **Agentes (Fases 3–5):** cada uno con herramientas y permisos explícitos (lista blanca). Noticias con fuente, enlace y fecha, separando
  *verificado* de *rumor*. DATA BOSS solo accede a cuentas que tú autorices.
- **Seguridad:** nada se publica sin tu aprobación explícita; sin credenciales sin tu permiso; resultados nunca simulados como reales.

## Fase 2 · Edificio (estado actual)

- 2 plantas (32 × 24 m, 10 m de alto), cristal + metal negro, tiras RGB animadas azul↔violeta, bloom, ciudad nocturna.
- Planta 1: 6 estaciones gaming (3 monitores, torre RGB, silla), carteles con nombre, videowall, escalera central, núcleos de IA, cámaras de cine.
- Planta 2: despacho de TITAN X (escritorio, sillón, logo, holograma, pantallas de rendimiento, panel de tareas), sala de juntas, lounge, balcón con vista a la planta 1.
- Navegación: órbita 360°/zoom, 7 vistas preestablecidas, caminar (WASD / joystick táctil, escalera y colisiones), recorrido cinematográfico, filtro de plantas, calidad Alta/Media/Baja (móvil arranca en Baja).
- Clic en un escritorio: panel del agente (sin conectar, sin tareas simuladas).

## Fase 2b · Revisión visual y preparación (actual)
- Mármol negro y madera oscura (texturas procedurales), sombras suaves, reflejos, 6 modelos GLB con licencia (ver CREDITOS.md), ciudad nocturna con ventanas, tráfico y partículas.
- Entrada cinematográfica (fachada → ENTRAR A MI EMPRESA → vuelo hasta el despacho de TITAN X), sonido ambiental opcional.
- 7 personajes con rig y animaciones (PERSONAJES.md). Estaciones reaccionan a estados reales (luz, avatar, tarea, alerta).
- Chat privado con TITAN X (voz, adjuntos, historial, órdenes, aprobaciones, detener, resumen). **Sin backend**: las órdenes quedan en cola local, nada se simula.
- Rutina de 3 reuniones (7:00, 12:00, 18:00 America/New_York), editable, **bloqueada** hasta la Fase 5 (`node test-schedule.mjs`).

## Pendiente
Avatares y animaciones (Fase 3, GLB), órdenes/tareas (4), herramientas reales (5), integración (6).

## Ejecutar
```
cd sede-3d && npm install && npm run dev      # http://localhost:5173
npm run build                                  # producción (dist/)
node test-walk.mjs                             # prueba de navegación/colisiones
```
