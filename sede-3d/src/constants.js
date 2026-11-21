// Dimensiones y datos de la sede. Unidades: metros.
export const W = 32;          // ancho (x: -16..16)
export const D = 24;          // fondo (z: -12..12)
export const H1 = 5;          // altura de planta 1 (piso 2 a y=5)
export const H2 = 10;         // techo
export const SLAB_EDGE_Z = -0.5; // el piso 2 cubre z < SLAB_EDGE_Z; delante hay atrio a doble altura
export const STAIR = { x: 1.6, z0: 8, z1: -0.5, rise: 5 }; // semiancho, inicio (y=0), fin (y=5)

export const C = {
  black: '#05060f', metal: '#0b0d1a', metal2: '#151833',
  blue: '#1f6bff', violet: '#9b2bff', white: '#f4f7ff', cyan: '#2ee6ff',
};

// Estados previstos (Fase 3/4). En esta fase ningún agente está conectado.
export const STATUS = {
  offline:   { label: 'SIN CONECTAR', color: '#6b7088' },
  available: { label: 'DISPONIBLE',   color: '#25e08a' },
  working:   { label: 'TRABAJANDO',   color: '#2f7bff' },
  waiting:   { label: 'ESPERANDO',    color: '#ffc531' },
  done:      { label: 'TERMINADO',    color: '#b45bff' },
};

export const AGENTS = [
  { id: 'viral-hunter', name: 'VIRAL HUNTER', role: 'Investigador de tendencias', pos: [-9, 7],   color: '#2ee6ff',
    duties: ['Busca tendencias de fútbol, noticias, entretenimiento y temas virales', 'Registra enlace y fecha de cada fuente', 'Distingue información verificada de rumores'],
    tools: ['Búsqueda web / noticias (por integrar)', 'Registro de fuentes'] },
  { id: 'hook-master', name: 'HOOK MASTER', role: 'Especialista en ganchos', pos: [-9, 1.5], color: '#ff4fd8',
    duties: ['Genera títulos e introducciones', 'Ganchos de 3 segundos', 'Propuestas para aumentar la retención'],
    tools: ['Generación de texto (por integrar)'] },
  { id: 'pixel-queen', name: 'PIXEL QUEEN', role: 'Diseñadora visual', pos: [-9, -5], color: '#b45bff',
    duties: ['Conceptos de portadas y miniaturas', 'Imágenes y material gráfico', 'Coherencia visual de marca'],
    tools: ['Generación de imágenes (por integrar)'] },
  { id: 'filter-x', name: 'FILTER X', role: 'Verificador de información', pos: [9, 7], color: '#25e08a',
    duties: ['Comprueba noticias y contrasta fuentes', 'Detecta información falsa', 'Selecciona contenido relevante'],
    tools: ['Contraste de fuentes (por integrar)'] },
  { id: 'idea-storm', name: 'IDEA STORM', role: 'Planificador de contenido', pos: [9, 1.5], color: '#ffc531',
    duties: ['Organiza publicaciones de mañana, tarde y noche', 'Mantiene el calendario editorial'],
    tools: ['Calendario editorial (por integrar)'] },
  { id: 'data-boss', name: 'DATA BOSS', role: 'Analista de redes', pos: [9, -5], color: '#2f7bff',
    duties: ['Analiza visualizaciones, retención e interacciones', 'Solo cuentas autorizadas y conectadas por el propietario'],
    tools: ['APIs de analítica (requieren tu autorización)'] },
];

export const PRESETS = {
  exterior: { label: 'Exterior',        pos: [36, 13, 40],  target: [0, 5, 0] },
  frente:   { label: 'Fachada',         pos: [0, 6, 40],    target: [0, 5, 0] },
  aerea:    { label: 'Vista aérea',     pos: [0, 52, 26],   target: [0, 2, 0] },
  planta1:  { label: 'Planta 1',        pos: [-8.5, 3.3, 10.6], target: [2, 1.2, -3] },
  planta2:  { label: 'Planta 2',        pos: [0, 6.9, 5.5], target: [0, 6, -8] },
  titan:    { label: 'Oficina TITAN X', pos: [0, 6.8, -3.9], target: [0, 6.6, -11] },
  juntas:   { label: 'Sala de juntas',  pos: [9.2, 6.9, -4.6], target: [12.5, 5.9, -9.5] },
};
