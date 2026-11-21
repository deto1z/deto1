# Inventario de modelos 3D, animaciones y licencias

Todos los recursos de terceros son **gratuitos y con licencia que permite uso comercial**. No se compró ni contrató nada.

## Personajes (7 en uso)
Fuente: Quaternius, *Ultimate Modular Men Pack* y *Ultimate Modular Women Pack* — **CC0 1.0** (dominio público, sin atribución obligatoria).
Origen de los archivos: copia de los paquetes de Quaternius incluida en el repositorio `trebeljahr/quaternius-showcase` (código MIT; su `LICENSES.md` declara estos paquetes como CC0-1.0).

| Agente | Archivo | Pack | Licencia | Ajustes propios |
|---|---|---|---|---|
| TITAN X | `characters/men_Suit.glb` | Modular Men · Suit | CC0 1.0 | traje negro, corbata azul luminosa, pelo plata |
| VIRAL HUNTER | `characters/men_Casual2.glb` | Modular Men · Casual 2 | CC0 1.0 | chaqueta cian |
| HOOK MASTER | `characters/men_Punk.glb` | Modular Men · Punk | CC0 1.0 | acentos magenta |
| PIXEL QUEEN | `characters/women_Punk.glb` | Modular Women · Punk | CC0 1.0 | atuendo violeta, pelo violeta |
| FILTER X | `characters/women_Suit.glb` | Modular Women · Suit | CC0 1.0 | traje verde oscuro con acento verde |
| IDEA STORM | `characters/women_Casual.glb` | Modular Women · Casual | CC0 1.0 | prenda dorada |
| DATA BOSS | `characters/men_Spacesuit.glb` | Modular Men · Spacesuit | CC0 1.0 | traje sci-fi azul |

Los ajustes de color/emisión están en `src/characters.js` (no se modificó la malla original).

## Animaciones
Fuente: Quaternius, *Universal Animation Library* (versión estándar gratuita) — **CC0 1.0**.
Origen: repositorio `J-Ponzo/gltf-universal-animation-library` (copia en glTF; LICENSE CC0 1.0 incluido).
Se usan 11 clips (`public/models/ual_animations.glb`, solo esqueleto + animaciones):
`Idle_Loop`, `Idle_Talking_Loop`, `Walk_Loop`, `Walk_Formal_Loop`, `Sitting_Enter`, `Sitting_Idle_Loop`, `Sitting_Talking_Loop`, `Sitting_Exit`, `Interact`, `Driving_Loop`, `Crouch_Idle_Loop`.
Se **retargetean en tiempo real** al esqueleto de cada personaje (`src/RiggedAvatar.jsx`). «Escribir» y «mirar monitores» son capas procedurales sobre «sentado».

## Mobiliario y decoración (GLB)
Fuente: KhronosGroup/glTF-Sample-Assets (autores: Wayfair, LLC y Darmstadt Graphics Group GmbH).

| Modelo | Licencia | Atribución requerida |
|---|---|---|
| SheenChair | CC0 1.0 | No |
| GlassVaseFlowers | CC0 1.0 | No |
| GlamVelvetSofa | CC BY 4.0 | Sí — © Wayfair, LLC |
| SheenWoodLeatherSofa | CC BY 4.0 | Sí — © Darmstadt Graphics Group GmbH |
| DiffuseTransmissionPlant | CC BY 4.0 | Sí — © Darmstadt Graphics Group GmbH |
| IridescenceLamp | CC BY 4.0 | Sí — © Wayfair, LLC |

Los archivos se redimensionaron (texturas 1024 px WebP) y simplificaron con glTF-Transform. Se eliminaron las luces que traían incrustadas. Atribución visible en la app (botón «Créditos»).

## Creación propia (sin terceros)
Edificio, escalera, escritorios gaming, PCs, micrófonos, cámaras de cine, truss de focos, paneles acústicos, softboxes, cartel ON AIR, props de cada estación, texturas de mármol y madera (procedurales), logo, ciudad nocturna.

## Herramientas
three.js, @react-three/fiber, @react-three/drei, postprocessing (MIT) · glTF-Transform (MIT).

## Investigado y descartado por ahora
Mixamo (requiere cuenta Adobe del propietario), Poly Haven / Kenney / Quaternius.com / Sketchfab (no accesibles desde el entorno de desarrollo). Generadores de IA y bibliotecas de pago: **no usados (sin gasto autorizado)**.
