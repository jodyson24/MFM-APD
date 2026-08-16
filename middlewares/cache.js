const { getJson, setJson } = require('../lib/cache');
const { buildCacheKey } = require('../lib/cacheKeys');

/**
 * Response cache middleware for GET routes.
 * - `ns`: cache namespace (must match the resource name used by notifyChange)
 * - `ttl`: seconds to keep entries
 * - `scopeKey`: fold the user's org-unit scope into the key (default true)
 * - `userKey`: fold the user's own id into the key (for per-user data)
 * - `parts`: optional extra key segments derived from the request
 *
 * Only successful responses (status < 400) are stored.
 */
function cacheable({ ttl, ns, scopeKey = true, userKey = false, parts = [] }) {
  return async (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return next();
    if (res.locals.__cacheWrapped) return next();

    let key;
    try {
      key = buildCacheKey(req, { ns, scopeKey, userKey, parts });
    } catch (err) {
      return next();
    }

    try {
      const cached = await getJson(key);
      if (cached !== null) {
        res.set('X-Cache', 'HIT');
        return res.status(200).json(cached);
      }
    } catch (err) {
      // fall through to the live handler
    }

    res.set('X-Cache', 'MISS');
    res.locals.__cacheWrapped = true;
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400 && body !== undefined) {
        setJson(key, body, ttl).catch(() => {});
      }
      return originalJson(body);
    };
    return next();
  };
}

module.exports = { cacheable };
