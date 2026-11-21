// Plantel de la empresa: cada agente usa un modelo 3D real (Quaternius «Ultimate Modular Men/Women Pack», CC0 1.0)
// con ajustes de material propios (colores de la marca). Animaciones: Quaternius «Universal Animation Library», CC0 1.0.
const emi = (c, k = 1) => ({ emissive: c, emissiveIntensity: k });
export const LOOKS3D = {
  'titan-x': { file: 'men_Suit', tweaks: { Suit: { color: '#05060c', roughness: 0.4, metalness: 0.25 }, White: { color: '#e8ecff' }, Tie: { color: '#1f6bff', ...emi('#2f7bff', 1.6) }, Hair: { color: '#cfd4e2' }, Eyebrows: { color: '#9aa0b4' } } },
  'viral-hunter': { file: 'men_Casual2', tweaks: { Red_Dark: { color: '#0d6a7a', ...emi('#2ee6ff', 0.35) }, LightBlue: { color: '#14425a' }, LightBrown: { color: '#2a2f3a' } } },
  'hook-master': { file: 'men_Punk', tweaks: { Red_Dark: { color: '#b0208f', ...emi('#ff4fd8', 0.35) }, Red: { color: '#d430aa', ...emi('#ff4fd8', 0.4) }, LightBlue: { color: '#26204f' } } },
  'pixel-queen': { file: 'women_Punk', tweaks: { Pink: { color: '#7a2bd6', ...emi('#b45bff', 0.45) }, Hair_Brown: { color: '#9b4bff', ...emi('#9b2bff', 0.25) }, Grey: { color: '#1a1530' } } },
  'filter-x': { file: 'women_Suit', tweaks: { Black: { color: '#0b2a22', ...emi('#25e08a', 0.18) }, White: { color: '#e4f3ec' }, Hair_Blond: { color: '#d9c9a0' } } },
  'idea-storm': { file: 'women_Casual', tweaks: { Orange: { color: '#e0a31a', ...emi('#ffc531', 0.35) }, Grey: { color: '#2a2418' } } },
  'data-boss': { file: 'men_Spacesuit', tweaks: { SciFi_Main: { color: '#0a2a66', ...emi('#2f7bff', 0.3) }, SciFi_MainDark: { color: '#061233' }, SciFi_Light_Accent: { color: '#2f7bff', ...emi('#2f7bff', 1.4) } } },
};
export const TITAN = { id: 'titan-x', name: 'TITAN X', role: 'CEO · Director de la empresa', color: '#2f7bff' };
export const CAST = [];   // se rellena en constants (agentes) para la galería
