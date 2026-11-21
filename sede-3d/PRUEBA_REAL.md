# Primera prueba real (cuando autorices las herramientas)

## Resultado de las pruebas automáticas (hoy)
- **59 pruebas del servidor, 59 OK** (`npm run test:server`, ~2 s): seguridad, costos/límites/interruptor, herramientas (SSRF, validación), flujo completo de los 6 agentes con un proveedor **simulado solo para pruebas** (no existe en producción), rutinas, contratos HTTP de los adaptadores Anthropic/OpenAI-compatible contra servidores locales falsos, API/autenticación/CSRF.
- Pruebas visuales previas (recorridos, rutas, horarios) siguen OK.
- Prueba de navegador con servidor real: login, mensaje a TITAN X, panel de costos y autorizaciones. Sin proveedor autorizado, TITAN X responde con un aviso de sistema y **no inventa respuesta ni tareas**.

**Lo que NO se ha podido probar**: llamadas reales a Claude, a Google News/YouTube y a las redes (este entorno no tiene clave ni salida de red). La calidad real de TITAN X y de los agentes se verá en la prueba real.

## Requisitos
1. Node ≥ 22.5. 2. `INICIAR_STAGING.bat` (crea tu cuenta). 3. Clave en `server/.env` + escribir AUTORIZO en «Costos» para el proveedor elegido. 4. Límites revisados.

## Pasos
1. Inicia sesión → «Costos»: verifica límites y que el interruptor está apagado.
2. Autoriza el proveedor (y, si quieres, YouTube).
3. Abre la oficina del CEO y escribe: *«Busca las cinco mejores oportunidades de contenido viral sobre fútbol y noticias de hoy»*.
4. Observa: pestaña «Tareas» y colores del edificio (azul trabajando → amarillo revisando → violeta completado; rojo si falla).
5. Revisa en «Aprobar» la propuesta: fuentes originales con fecha, por qué funciona, gancho, guion, título, portada, plataforma, horario. Verifica tú los enlaces.
6. Mira «Costos»: gasto real por agente vs. estimado.
7. Aprobar / Mejorar / Rechazar (nada se publica).

## Criterios de éxito
Enlaces reales y abiertos; fechas correctas; ninguna noticia «verificada» sin segunda fuente; sin duplicados; gasto ≤ límite; estados coherentes con lo que ocurre.
