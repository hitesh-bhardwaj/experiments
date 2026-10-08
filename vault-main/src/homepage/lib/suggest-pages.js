/**
 * "Did you mean": rank real pages against what the visitor asked for.
 * Search terms come from the path and any ?q= / ?search= / ?s= param, and are
 * matched against each page's label, URL and keywords (effect category,
 * description, dependencies). Falls back to fuzzy matching the last path segment.
 *
 *   suggestPages('/scroll-reveal', pages, { search: '?q=text' })
 */
function lev(a, b) {
  const m = a.length, n = b.length, d = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

const STOP = new Set(['effects', 'effect', 'demo', 'docs', 'the', 'and', 'for', 'www', 'html', 'page']);
const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

export function getSearchTerms(asked, search = '') {
  const params = new URLSearchParams(search);
  const query = ['q', 'query', 'search', 's'].map((k) => params.get(k) || '').join(' ');
  const path = String(asked || '').split(/[?#]/)[0];
  return [...new Set([...words(query), ...words(path)])].filter((w) => w.length > 1 && !STOP.has(w));
}

function termScore(term, pageWords) {
  let best = 0;
  for (const w of pageWords) {
    if (w === term) return 1;
    if (w.startsWith(term) || term.startsWith(w)) best = Math.max(best, w.length > 2 ? 0.75 : 0.3);
    else if (w.includes(term) || (w.length > 3 && term.includes(w))) best = Math.max(best, 0.5);
    else if (term.length > 3) {
      const d = lev(term, w) / Math.max(term.length, w.length);
      if (d <= 0.34) best = Math.max(best, 0.6 - d);
    }
  }
  return best;
}

function fuzzyLastSegment(asked, pages, limit) {
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

export function suggestPages(asked, pages, { search = '', limit = 6 } = {}) {
  const terms = getSearchTerms(asked, search);
  if (terms.length) {
    const ranked = pages
      .map((p) => {
        const primary = [...words(p.label), ...words(p.href)];
        const extra = words(p.keywords);
        let score = 0;
        for (const t of terms) score += Math.max(termScore(t, primary), termScore(t, extra) * 0.6);
        return [score / terms.length, p];
      })
      .filter(([score]) => score >= 0.3)
      .sort((a, b) => b[0] - a[0])
      .slice(0, limit)
      .map((r) => r[1]);
    if (ranked.length) return Object.assign(ranked, { matched: true });
  }
  return Object.assign(fuzzyLastSegment(asked, pages, Math.min(limit, 3)), { matched: false });
}
