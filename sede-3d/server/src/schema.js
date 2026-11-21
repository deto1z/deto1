/* Validador mínimo de JSON-Schema (subconjunto) para las entradas de herramientas: lo que envía el modelo nunca se confía. */
export function validate(schema, v, path = 'entrada') {
  const t = schema.type;
  if (t === 'object') {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return `${path}: debe ser un objeto`;
    for (const k of schema.required ?? []) if (v[k] === undefined || v[k] === null || v[k] === '') return `${path}.${k}: es obligatorio`;
    for (const [k, s] of Object.entries(schema.properties ?? {})) if (v[k] !== undefined) { const e = validate(s, v[k], `${path}.${k}`); if (e) return e; }
    if (schema.additionalProperties === false) for (const k of Object.keys(v)) if (!(k in (schema.properties ?? {}))) return `${path}.${k}: campo no permitido`;
    return null;
  }
  if (t === 'array') {
    if (!Array.isArray(v)) return `${path}: debe ser una lista`;
    if (schema.minItems !== undefined && v.length < schema.minItems) return `${path}: mínimo ${schema.minItems} elementos`;
    if (schema.maxItems !== undefined && v.length > schema.maxItems) return `${path}: máximo ${schema.maxItems} elementos`;
    for (let i = 0; i < v.length; i++) { const e = schema.items ? validate(schema.items, v[i], `${path}[${i}]`) : null; if (e) return e; }
    return null;
  }
  if (t === 'string') {
    if (typeof v !== 'string') return `${path}: debe ser texto`;
    if (schema.minLength !== undefined && v.length < schema.minLength) return `${path}: demasiado corto`;
    if (schema.maxLength !== undefined && v.length > schema.maxLength) return `${path}: demasiado largo (máx. ${schema.maxLength})`;
    if (schema.enum && !schema.enum.includes(v)) return `${path}: valor no permitido (${schema.enum.join(' | ')})`;
    if (schema.pattern && !new RegExp(schema.pattern).test(v)) return `${path}: formato inválido`;
    return null;
  }
  if (t === 'number' || t === 'integer') {
    if (typeof v !== 'number' || !Number.isFinite(v) || (t === 'integer' && !Number.isInteger(v))) return `${path}: debe ser ${t === 'integer' ? 'entero' : 'número'}`;
    if (schema.minimum !== undefined && v < schema.minimum) return `${path}: mínimo ${schema.minimum}`;
    if (schema.maximum !== undefined && v > schema.maximum) return `${path}: máximo ${schema.maximum}`;
    return null;
  }
  if (t === 'boolean') return typeof v === 'boolean' ? null : `${path}: debe ser verdadero/falso`;
  return null;
}
