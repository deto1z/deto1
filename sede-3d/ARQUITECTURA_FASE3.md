# Arquitectura funcional — Fase 3 (staging)

```
Navegador (edificio 3D + panel TITAN X)
   │  cookie httpOnly + CSRF           ▲ SSE /api/events (estados reales)
   ▼                                   │
Servidor Fastify (127.0.0.1:8787) ── Orquestador ── Proveedores de IA (solo si hay clave Y autorización)
   │                                   │                Anthropic · OpenAI-compatible/Ollama
   │                                   └── Herramientas con lista blanca (RSS, fetch seguro, YouTube, Brave…)
   └── SQLite persistente (WAL): conversaciones, preferencias, tareas, noticias, guiones, portadas,
       calendario, resultados, errores, gasto de IA, historial de aprobaciones, auditoría
```

**Flujo**: Jefe → TITAN X (con memoria y preferencias) → `create_pipeline` → VIRAL HUNTER → FILTER X → HOOK MASTER → PIXEL QUEEN → DATA BOSS → IDEA STORM → revisión de TITAN X (aceptar o pedir corrección, máx. 2) → propuesta final armada **por el servidor** con datos reales (solo noticias `verified`) → botones Aprobar / Mejorar / Rechazar. Aprobar **no publica**: no existe herramienta de publicación.

**Estados reales en el edificio** (vienen del orquestador, no de animaciones inventadas): Disponible = verde · Trabajando = azul · Revisando = amarillo · Completado = violeta · Error = rojo · Desconectado = gris (sin proveedor autorizado). Los escritorios muestran el título de la tarea y «paso N» reales, nunca porcentajes inventados.

**Rutinas** 7:00 / 12:00 / 18:00 (America/New_York, editables): desactivadas hasta que autorices `automation:routines` y actives cada una. Si el servidor estuvo apagado en la hora, hay ventana de 10 min; no se ejecuta con retraso arbitrario.

**Reinicio**: las tareas interrumpidas pasan a *Error* (no se relanzan solas, para no gastar sin permiso); la memoria persiste.

**Sin servidor** (p. ej. el Artifact web de demostración) la app sigue en modo visual local y lo indica; no simula agentes.

Módulos: `server/src/{app,orchestrator,agents,memory,proposals,scheduler,costs,security,db,config}.js`, `providers/`, `tools/`. Cliente: `src/backend.js`, `src/ServerPanel.jsx`.
