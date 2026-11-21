# Seguridad — Fase 3

- **Claves solo en el servidor** (`.env`, ignorado por git). El navegador solo recibe booleanos («hay clave»). Tokens OAuth futuros: cifrados AES-256-GCM.
- **Acceso privado**: usuario único creado con `npm run setup-owner`; contraseña ≥ 12 caracteres, hash scrypt; cookie httpOnly SameSite=Strict; token CSRF + comprobación de origen; bloqueo tras 5 fallos en 15 min; límites de peticiones.
- **Servidor solo local** (127.0.0.1) por defecto. Para exponerlo hace falta HTTPS delante (`DETONADOR_SECURE_COOKIES=1`); no se ha expuesto nada.
- **Registro de acciones** encadenado por hash (alteración detectable; verificado en `/api/status`).
- **Herramientas con lista blanca por agente**, validación de entradas, límites de pasos/tiempo/bytes. **No existe ninguna herramienta de publicación** (`publishToolPresent:false`).
- **SSRF**: se resuelve DNS, se bloquean redes privadas, se revalidan redirecciones, límites de tamaño/tiempo/tipo.
- **Contenido web = datos, no instrucciones** (inyección de prompts): los agentes lo tratan como dato; URLs solo si salieron de herramientas en la misma tarea.
- **Archivos subidos**: tipo por firma binaria (no por extensión), 5 MB, nombre generado, SVG saneado.
- **Gasto**: ver `PRESUPUESTO_APIS.md` §4.
- **No se toca DETONADOR CLIPS AI** (no está en este repositorio).
