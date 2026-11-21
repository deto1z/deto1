// Mide el rendimiento por nivel de calidad en un navegador real (Chromium).
// Uso: node tools/measure-performance.mjs <url-base> <salida.json>
// IMPORTANTE: en este entorno no hay GPU (render por software SwiftShader): los FPS NO representan a un equipo real;
// sí son fiables las cifras de geometría, memoria, descarga y tiempo de carga relativo.
import { chromium, devices } from 'playwright';
import fs from 'fs';
const [base, out] = [process.argv[2] ?? 'http://localhost:4173', process.argv[3] ?? 'rendimiento-resultados.json'];
const args = { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
const configs = [['Alta', 'high', false], ['Media', 'medium', false], ['Baja', 'low', false], ['Mínima', 'min', false], ['Móvil (iPhone 13, Baja)', 'low', true]];
const results = [];
for (const [label, q, mobile] of configs) {
  const b = await chromium.launch(args);
  const ctx = await b.newContext(mobile ? { ...devices['iPhone 13'] } : { viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage(); let bytes = 0; p.on('response', async (r) => { try { const h = r.headers()['content-length']; bytes += h ? +h : (await r.body()).length; } catch (e) { /* sin cuerpo */ } });
  const t0 = Date.now(); await p.goto(`${base}/?debug&q=${q}`);
  await p.waitForFunction(() => window.__fps !== undefined, null, { timeout: 170000 }).catch(() => {});
  const tFirst = Date.now() - t0;
  await p.evaluate(() => { const s = window.__detonador.getState(); s.setPhase('app'); s.jumpTo({ pos: [40, 33, 44], target: [0, 2, 0], fov: 30, cutaway: true }); });
  await p.waitForTimeout(40000);
  const r = await p.evaluate(() => {
    let meshes = 0, tris = 0, skinned = 0, lights = 0, inst = 0;
    window.__scene.traverse((o) => { if (o.isLight && o.visible) lights++; if (!o.isMesh && !o.isPoints) return; let v = true; for (let a = o; a; a = a.parent) if (a.visible === false) v = false; if (!v) return; meshes++; if (o.isSkinnedMesh) skinned++; const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3; const k = o.isInstancedMesh ? o.count : 1; if (o.isInstancedMesh) inst++; tris += n * k; });
    const i = window.__gl.info; return { meshesVisibles: meshes, triangulos: Math.round(tris), mallasConHuesos: skinned, mallasInstanciadas: inst, lucesActivas: lights, geometriasEnMemoria: i.memory.geometries, texturasEnMemoria: i.memory.textures, programasShader: i.programs?.length, fpsSoftware: window.__fps, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
  });
  results.push({ configuracion: label, ...r, descargaMB: +(bytes / 1048576).toFixed(1), segundosHastaPrimerFotograma: +(tFirst / 1000).toFixed(1) });
  console.log(JSON.stringify(results[results.length - 1]));
  await b.close();
}
fs.writeFileSync(out, JSON.stringify({ fecha: new Date().toISOString(), entorno: 'Chromium headless + SwiftShader (sin GPU)', resultados: results }, null, 1));
