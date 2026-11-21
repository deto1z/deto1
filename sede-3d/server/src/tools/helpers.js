/* Utilidades de las herramientas: HTML→texto, RSS, saneado de SVG. */
export const decode = (s = '') => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
export const htmlToText = (html) => decode(html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/div>|<\/h\d>|<\/li>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
export const htmlTitle = (html) => decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? decode(m[1]).trim() : ''; };
export function parseFeed(xml, limit = 20) {
  const items = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0]).slice(0, limit);
  return items.map((x) => {
    const link = tag(x, 'link') || (x.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
    const source = (x.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1];
    return { title: tag(x, 'title'), url: link, published_at: tag(x, 'pubDate') || tag(x, 'published') || tag(x, 'updated'), source: source ? decode(source).trim() : '', summary: htmlToText(tag(x, 'description') || tag(x, 'summary')).slice(0, 400) };
  }).filter((i) => i.title && /^https?:\/\//.test(i.url));
}
// SVG: lista blanca de elementos/atributos; sin scripts, imágenes externas ni manejadores de eventos.
const OK_TAGS = new Set(['svg', 'g', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text', 'tspan', 'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'title', 'desc']);
const OK_ATTR = new Set(['viewbox', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'fill', 'stroke', 'stroke-width', 'opacity', 'transform', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'id', 'offset', 'stop-color', 'stop-opacity', 'gradientunits', 'xmlns', 'fill-opacity', 'stroke-opacity', 'letter-spacing', 'clip-path', 'gradienttransform', 'preserveaspectratio']);
export function sanitizeSvg(svg) {
  if (typeof svg !== 'string' || svg.length > 60_000 || !/^\s*<svg[\s>]/i.test(svg)) return null;
  if (/<!ENTITY|<!DOCTYPE|<\?xml|javascript:|data:|url\(\s*['"]?https?:/i.test(svg)) return null;
  let bad = false;
  const out = svg.replace(/<\/?([a-zA-Z][\w:-]*)([^>]*)>/g, (full, name, attrs) => {
    const n = name.toLowerCase(); if (!OK_TAGS.has(n)) { bad = true; return ''; }
    if (full.startsWith('</')) return `</${n}>`;
    const kept = [...attrs.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)].filter((m) => { const a = m[1].toLowerCase(); if (a.startsWith('on') || a.includes('href')) { bad = true; return false; } return OK_ATTR.has(a); })
      .map((m) => `${m[1]}="${(m[3] ?? m[4]).replace(/"/g, '&quot;')}"`).join(' ');
    return `<${n}${kept ? ' ' + kept : ''}${/\/\s*>$/.test(full) ? '/' : ''}>`;
  });
  return bad ? null : out;
}
export const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
export const validDate = (s) => { const d = new Date(s); return !Number.isNaN(d.getTime()) && d.getFullYear() > 2000 && d.getTime() < Date.now() + 36 * 3600_000; };
