// Tag kinds are for display only. Names are never changed.
export function tagKind(name) {
  if (/^\d+$/.test(name)) return 'number';
  if (/^\d+[A-Za-z]/.test(name)) return 'position';
  return 'name';
}

// Screenshot_20251008_223530_Opera.jpg -> 2025-10-08T22:35:30
// 20241221_173204.jpg -> 2024-12-21T17:32:04
// IMG-20241110-WA0000.jpg -> 2024-11-10T00:00:00
export function dateFromFilename(filename) {
  let m = /(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/.exec(filename);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
  m = /(?:^|\D)((?:19|20)\d{2})(\d{2})(\d{2})(?:\D|$)/.exec(filename);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T00:00:00`;
  return null;
}

export function basename(p) {
  const s = String(p).replace(/\\/g, '/');
  return s.slice(s.lastIndexOf('/') + 1);
}
