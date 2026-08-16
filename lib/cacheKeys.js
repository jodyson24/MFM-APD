// NOTE: the 'apd:' namespace prefix is added by lib/cache.js (fullKey), so
// keys built here must NOT include it — delByPrefix relies on the exact
// `apd:<ns>:*` layout.

// Scope signature: super admin sees everything ('all'), everyone else gets a
// stable sorted signature of their visible org unit ids so two users sharing a
// scope share a cache entry.
function scopeSignature(req) {
  if (!req.scope) return 'none';
  if (req.scope.all) return 'all';
  return (req.scope.orgUnitIds || []).slice().sort().join(',');
}

// Fold query params into the key so different filters never collide.
function querySuffix(req) {
  const q = req.query || {};
  const keys = Object.keys(q).sort();
  if (keys.length === 0) return '';
  const parts = keys.map((k) => {
    const v = q[k];
    return `${k}=${Array.isArray(v) ? v.join(',') : String(v)}`;
  });
  return `?${parts.join('&')}`;
}

function buildCacheKey(req, { ns, scopeKey = true, userKey = false, parts = [] }) {
  const segs = [ns];
  if (scopeKey) segs.push(`s:${scopeSignature(req)}`);
  if (userKey) segs.push(`u:${req.user._id}`);
  // The route path uniquely identifies the endpoint (e.g. /status vs /rules).
  segs.push(`p:${req.originalUrl.split('?')[0]}`);
  for (const part of parts || []) segs.push(String(part(req)));
  const q = querySuffix(req);
  if (q) segs.push(q);
  return segs.join(':');
}

module.exports = { buildCacheKey };
