/**
 * "Did you mean": rank real pages against the URL the visitor asked for.
 * Compares the last path segment by normalised Levenshtein distance; substring matches get a boost.
 *
 *   suggestPages('/effects/stak-spred', [{ label: 'Stack Spread', href: '/effects/stack-spread' }, …], 3)
 */
function lev(a, b) {
  const m = a.length, n = b.length, d = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

export function suggestPages(asked, pages, limit = 3) {
  const q = (String(asked || '').toLowerCase().split(/[?#]/)[0].split('/').filter(Boolean).pop() || '');
  if (!q) return pages.slice(0, limit);
  return pages
    .map((p) => {
      const s = (p.href.split('/').filter(Boolean).pop() || p.href).toLowerCase();
      let d = lev(q, s) / Math.max(q.length, s.length, 1);
      if (s.indexOf(q) > -1 || q.indexOf(s) > -1) d *= 0.4;
      return [d, p];
    })
    .sort((a, b) => a[0] - b[0])
    .slice(0, limit)
    .map((r) => r[1]);
}
