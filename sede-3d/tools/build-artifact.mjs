// Genera la versión de ENLACE PRIVADO: una sola página con el código en línea + carpeta de modelos.
// Uso: node tools/build-artifact.mjs   (salida en ./artifact)
import { execSync } from 'child_process';
import fs from 'fs';
execSync('npx vite build', { stdio: 'inherit' });
const html = fs.readFileSync('dist/index.html', 'utf8');
const js = fs.readFileSync('dist/assets/' + fs.readdirSync('dist/assets').find((f) => f.endsWith('.js')), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync('dist/assets/' + fs.readdirSync('dist/assets').find((f) => f.endsWith('.css')), 'utf8');
fs.rmSync('artifact', { recursive: true, force: true }); fs.mkdirSync('artifact/models/characters', { recursive: true });
const page = `<title>DETONADOR AI EMPIRE</title>
<style>
  :root { --bg: #05060f; --fg: #eaf0ff; --accent: #2f7bff; color-scheme: dark; }
  body { background: var(--bg); color: var(--fg); }
${css}
</style>
<div id="root"></div>
<script>window.__MODELS_BASE__ = new URL('models/', document.baseURI).href; window.__MODELS_SUFFIX__ = '.wasm';</script>   <!-- los .glb se sirven como .glb.wasm (tipo binario admitido); se leen con fetch -->
<script type="module">
${js}
</script>
`;
fs.writeFileSync('artifact/index.html', page);
for (const f of fs.readdirSync('dist/models')) { const p = 'dist/models/' + f; if (fs.statSync(p).isDirectory()) fs.readdirSync(p).forEach((g) => fs.copyFileSync(p + '/' + g, 'artifact/models/' + f + '/' + g + '.wasm')); else fs.copyFileSync(p, 'artifact/models/' + f + '.wasm'); }
console.log('artifact/index.html', (page.length / 1048576).toFixed(2), 'MB · modelos:', fs.readdirSync('artifact/models', { recursive: true }).length, 'archivos');
