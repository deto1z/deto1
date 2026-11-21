# DETONADOR AI EMPIRE · Sede virtual 3D

Aplicación independiente (no modifica DETONADOR CLIPS AI). Entorno de desarrollo: **no hay agentes conectados** y nada se publica.

- Ejecutar: `npm install && npm run dev` (Windows: doble clic en `INICIAR_DETONADOR.bat`, ver `LEEME-WINDOWS.txt`).
- Versión de enlace privado: `node tools/build-artifact.mjs` genera `artifact/` (página + modelos).
- Documentos: `CORRECCIONES.md`, `INVENTARIO_MODELOS.md` (licencias), `RENDIMIENTO.md`, `ARQUITECTURA.md`, `PERSONAJES.md`, `CREDITOS.md`.
- Pruebas: `node test-walk.mjs`, `node test-schedule.mjs`, `node test-routes.mjs`.
- Respaldos (carpeta `../respaldos/`): versión Fase 2 inicial y versión previa a las correcciones v2.

---
## Fase 3 (staging): servidor, memoria y agentes
Ver `ARQUITECTURA_FASE3.md`, `PRESUPUESTO_APIS.md`, `SEGURIDAD.md`, `PRUEBA_REAL.md`.
Windows: `INICIAR_STAGING.bat` (Node ≥ 22.5). Manual: `npm run setup-owner` → `npm run start:staging` → http://127.0.0.1:8787. Pruebas: `npm run test:server`.
**Ningún servicio de pago está activo y nada se publica.**
