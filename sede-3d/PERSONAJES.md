# Arquitectura de personajes y herramientas para conseguir modelos 3D

## Estado actual
Siete personajes humanoides con **rig de articulaciones propio** (`src/Avatar.jsx`), cada uno con aspecto distinto
(TITAN X, VIRAL HUNTER, HOOK MASTER, PIXEL QUEEN, FILTER X, IDEA STORM, DATA BOSS). Son personajes estilizados hechos en código:
una base sólida para validar animaciones y flujo, **no** el acabado final fotorrealista.

Animaciones (`ACTIONS`): en pie, caminar, sentarse, escribir, hablar (con boca animada), mirar pantallas, reunión, hablar de pie.
Vista previa: botón «Casting de personajes» (`?casting`).

## Diseño desacoplado (para cambiar el modelo sin rehacer nada)
- La **acción** de cada agente sale del estado real (`getAgentView` en `src/store.js`):
  `working → type`, `done → talk`, `waiting/alert → look`, `available/offline → sit`.
- El **modelo** se sustituye por un GLB con esqueleto humanoide (nombres tipo Mixamo/Ready Player Me) y las mismas acciones
  se mapean a clips de animación. Cambia solo `Avatar.jsx`; estaciones, estados y orquestador no se tocan.
- Convención: el personaje mira a +Z; `seatTop` es la altura del asiento.

## Cómo conseguir modelos de mayor calidad (no se ha comprado ni contratado nada)
Verifica los términos vigentes de cada servicio antes de usarlo; esta lista es de mi conocimiento y no pude consultar las páginas desde este entorno.

| Opción | Costo | Licencia / nota |
|---|---|---|
| **Quaternius**, **Kenney** (personajes y mobiliario low-poly) | Gratis | CC0 |
| **Poly Haven** (modelos y texturas de mobiliario, plantas, sofás) | Gratis | CC0 |
| **Mixamo** (personajes + animaciones: caminar, sentarse, escribir, hablar) | Gratis con cuenta Adobe | Uso libre en proyectos; no redistribuir los archivos sueltos. Requiere que **tú** inicies sesión |
| **Sketchfab** (modelos CC0/CC-BY descargables) | Gratis / pago | Revisar licencia modelo por modelo; requiere cuenta |
| **Generadores IA** (ForgeGUI, Meshy, Tripo…): modelos a partir de texto o imagen | De pago (créditos) | **Requiere tu autorización de gasto.** Necesitan retopología/rig |
| **Bibliotecas de pago** (CGTrader, TurboSquid) | De pago | **Requiere tu autorización** |

Recomendación: Mixamo para los 7 personajes (rig + animaciones gratis) y Poly Haven/Quaternius para mobiliario gaming;
generación por IA solo si autorizas el gasto. Los archivos se colocan en `public/models/` y se registran en `src/Asset.jsx`.

## Estados visuales (listos para datos reales)
`setAgentState(id, { status, task:{title, progress?}, alert? })` — `progress` solo se muestra si el orquestador envía un número real;
sin él, la barra es *indeterminada* (sin porcentaje). Sin datos, el agente aparece «SIN CONECTAR».
El botón «Vista previa de estados» muestra el aspecto de cada estado con datos de ejemplo y un aviso permanente.
