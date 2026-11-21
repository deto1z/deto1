# Presupuesto de APIs — Fase 3 (para tu decisión)

**Estado actual: NO se ha contratado ni activado nada de pago.** Sin clave en el servidor y sin tu autorización escrita (`AUTORIZO`), ninguna IA ni herramienta de pago puede ejecutarse. Este documento es para que decidas.

## 1. Qué APIs necesita cada función

| Función | Opción de pago | Alternativa gratuita | Nota |
|---|---|---|---|
| Cerebro de TITAN X y los 6 agentes (razonar, redactar, delegar) | **Anthropic API (Claude)** — por token | Modelo local/compatible vía Ollama (adaptador `openai_compat`) o un plan gratuito de otro proveedor | Calidad del modelo local ≪ Claude; tendrás que probarlo. Precios de otros proveedores: **no verificados**. |
| Tendencias / noticias (VIRAL HUNTER) | Brave Search API | **Google News RSS** (ya integrado, gratis) + RSS de medios deportivos + **YouTube Data API** | Precio de Brave: **no verificado**; verifícalo antes de activarlo. |
| Videos populares en YouTube | — | **YouTube Data API**: gratis dentro de 10 000 unidades/día (`search.list` cuesta 100 → máx. ~100 búsquedas/día; `videos.list` cuesta 1) | Requiere clave de Google Cloud (gratis). |
| Lectura de noticia original | — | Descarga directa con protección SSRF (gratis) | Web fetch de Anthropic también es gratis, pero no se usa. |
| Estadísticas propias (DATA BOSS) | — | APIs oficiales de YouTube/Facebook/Instagram/TikTok con OAuth de **tu** cuenta (lectura) | **Sin conectar.** Mientras tanto registras resultados reales a mano (`POST /api/results`). |
| Portadas (PIXEL QUEEN) | — | Conceptos + SVG propios generados por el modelo (sin costo extra) | Generación de imágenes con IA de pago: **no incluida**. |
| Voz/escucha | — | Voz del navegador (gratis) | |

## 2. Precios verificados (Anthropic, página oficial consultada 2026-11-21)

| Modelo | Entrada / 1M tokens | Salida / 1M tokens | Lectura de caché |
|---|---|---|---|
| Claude Opus 5.5 | $4 | $20 | $0.20 |
| Claude Sonnet 5.5 | $2 | $10 | $0.10 |
| Claude Haiku 5.5 | $0.10 | $0.50 | — (≤100k tokens de prompt) |
| Claude Fable 5.2 | $8 | $40 | — |
| Búsqueda web de Anthropic | $10 por 1 000 búsquedas | | |

El servidor trae esta tabla con `verified:true`; un modelo sin precio **se bloquea** (no se llama a ciegas).

## 3. Estimación de costo (ESTIMACIÓN, no medición)

Supuestos (míos, sin datos reales aún): un ciclo completo = 6 tareas de agente + revisión de TITAN + propuesta final; ≈ 8 pasos por tarea; ≈ 60 000 tokens de entrada acumulados y ≈ 6 000 de salida por tarea; un ciclo ≈ 7 tareas ≈ 420 000 entrada + 42 000 salida (sin caché).

| Modelo único | Por tarea | Por ciclo | 1 ciclo/día (30 días) | 3 ciclos/día (90) |
|---|---|---|---|---|
| Opus 5.5 | ≈ $0.36 | ≈ $2.5 | ≈ $75 | ≈ $225 |
| Sonnet 5.5 | ≈ $0.18 | ≈ $1.3 | ≈ $38 | ≈ $113 |
| Haiku 5.5 | ≈ $0.009 | ≈ $0.06 | ≈ $2 | ≈ $6 |

Si se usa la caché de prompt, baja. Si se usa búsqueda web de Anthropic: +$0.01 por búsqueda. **La primera prueba real medirá el costo verdadero** y el panel «Costos» lo mostrará por agente.

**Recomendación:** empezar con Haiku 5.5 o Sonnet 5.5 en la primera prueba (1 ciclo), medir calidad y gasto real, y subir a Opus solo en los agentes que lo necesiten. Los modelos por agente se cambian desde `/api/agents/:id`.

## 4. Sistema de control de gasto (ya implementado y probado)

- **Antes de cada llamada** se estima el peor caso (entrada + máximo de salida) y se bloquea si superaría un límite.
- Límites por defecto (editables en «Costos»): **$0.50 por tarea · $3 por ciclo · $2 diario · $30 mensual.** (Con los $2 diarios, un ciclo con Opus no cabe: ajusta límites o modelo.)
- Al alcanzar el tope diario/mensual se **activa solo el interruptor de emergencia**.
- **Interruptor de emergencia** manual (botón rojo): bloquea toda llamada y cancela tareas.
- Límites duros por tarea: 20 pasos, 30 llamadas a herramientas, 8 min, máx. 2 correcciones, 3 tareas simultáneas.
- Todo uso queda en la tabla `ai_usage` (agente, modelo, tokens, USD) y en la auditoría.

## 5. Decisiones que necesito de ti

1. ¿Autorizas contratar Anthropic API? Si sí: crea la clave tú, ponla en `server/.env` (`ANTHROPIC_API_KEY`), y escribe `AUTORIZO` en el panel. **Nunca me envíes la clave por chat.**
2. Modelo para la primera prueba (Haiku / Sonnet / Opus) y tope mensual que aceptas.
3. ¿Activamos YouTube Data API (gratis, requiere crear clave en Google Cloud)?
4. ¿Brave Search (de pago, precio por verificar) o nos quedamos con RSS + YouTube?
5. ¿Probamos primero un modelo local gratuito (Ollama) sin gasto?

Fuentes: página oficial de precios de Claude (platform.claude.com, consultada 2026-11-21); documentación de cuota de YouTube Data API (10 000 unidades/día; `search.list` = 100).
