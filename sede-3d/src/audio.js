// Sonido ambiental opcional, sintetizado con WebAudio (sin archivos ni licencias).
let ctx = null, master = null, timer = null, nodes = [];
export function startAmbient() {
  if (ctx) { ctx.resume?.(); master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.8); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  master.gain.setTargetAtTime(0.5, ctx.currentTime, 1.2);
  // zumbido grave (dos osciladores desafinados) con filtro y LFO lento
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.connect(master);
  [55, 82.6, 110.4].forEach((f, i) => { const o = ctx.createOscillator(); o.type = i ? 'sine' : 'sawtooth'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = i ? 0.05 : 0.035; o.connect(g); g.connect(lp); o.start(); nodes.push(o); });
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 90; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); nodes.push(lfo);
  // aire / ventilación (ruido filtrado)
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
  const ng = ctx.createGain(); ng.gain.value = 0.018; n.connect(bp); bp.connect(ng); ng.connect(master); n.start(); nodes.push(n);
  // destellos tecnológicos suaves (pentatónica) con eco
  const delay = ctx.createDelay(1); delay.delayTime.value = 0.38; const fb = ctx.createGain(); fb.gain.value = 0.4; delay.connect(fb); fb.connect(delay); delay.connect(master);
  const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  const blip = () => {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = notes[Math.floor(Math.random() * notes.length)];
    g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);
    o.connect(g); g.connect(master); g.connect(delay); o.start(); o.stop(ctx.currentTime + 1.5);
    timer = setTimeout(blip, 2500 + Math.random() * 4500);
  };
  blip();
}
export function stopAmbient() {
  if (!ctx) return;
  master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
  clearTimeout(timer);
  const c = ctx; setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch (e) { /* ya detenido */ } }); nodes = []; c.close(); }, 1200);
  ctx = null; master = null;
}
