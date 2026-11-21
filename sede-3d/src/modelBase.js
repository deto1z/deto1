// Dónde están los modelos 3D. En la app normal: relativo al script (funciona en cualquier ruta).
// En la versión de enlace privado (todo en línea): la página fija window.__MODELS_BASE__.
const HERE = import.meta.url;   // (variable a propósito: evita que el empaquetador duplique los modelos)
export const modelPath = (rel) => ((typeof window !== 'undefined' && window.__MODELS_BASE__) || new URL('../models/', HERE).href) + rel + ((typeof window !== 'undefined' && window.__MODELS_SUFFIX__) || '');   // el sufijo permite servir los .glb con un tipo binario admitido
