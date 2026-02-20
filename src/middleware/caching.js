const NodeCache = require("node-cache");
const logger = require("../config/logging");

const PUBLIC_CACHEABLE_ROUTES = new Set(["/", "/home", "/tos"]);
const CACHE_VERSION = "v1";
const CACHE_TYPE_HTML = "html";

const isSuccessStatus = (statusCode) => statusCode >= 200 && statusCode < 300;

const normalizeQuery = (query) => {
  return Object.keys(query)
    .sort()
    .reduce((obj, key) => {
      const value = query[key];
      obj[key] = Array.isArray(value) ? [...value].sort() : value;
      return obj;
    }, {});
};

const toQueryPart = (req, key) => {
  if (typeof key === "function") {
    return key(req);
  }

  return `${req.originalUrl}:${JSON.stringify(normalizeQuery(req.query || {}))}`;
};

const createCacheKey = (key, req) => {
  const userKey = req.user && req.user.id ? `user:${req.user.id}` : "user:anon";
  const baseKey =
    typeof key === "function" ? key.name || "dynamic" : String(key);
  const queryPart = toQueryPart(req, key);
  return `${CACHE_VERSION}:${baseKey}:${userKey}:${queryPart}`;
};

const sendCachedResponse = (res, cachedData) => {
  if (cachedData && cachedData.__type === CACHE_TYPE_HTML) {
    res.setHeader("X-Cache", "HIT");
    return res.send(cachedData.html);
  }

  return res.json({
    ...cachedData,
    cached: true,
    timestamp: new Date().toISOString(),
  });
};

const hookResponseCaching = ({ res, cacheKey, ttl, resolve, reject }) => {
  // Override res.json untuk menyimpan ke cache
  const originalJson = res.json;
  res.json = function (data) {
    if (isSuccessStatus(this.statusCode)) {
      cache.set(cacheKey, data, ttl);
      logger.info(`Cache set: ${cacheKey.substring(0, 60)}... (TTL: ${ttl}s)`);
      resolve(data);
    } else {
      reject(new Error(`Request failed with status ${this.statusCode}`));
    }

    return originalJson.call(this, data);
  };

  // Override res.render untuk menyimpan HTML ke cache
  const originalRender = res.render;
  res.render = function (view, options, callback) {
    const renderCallback =
      typeof options === "function"
        ? options
        : typeof callback === "function"
          ? callback
          : null;
    const renderOptions = typeof options === "object" ? options : undefined;

    const done = (err, html) => {
      if (!err && isSuccessStatus(this.statusCode)) {
        const payload = { __type: CACHE_TYPE_HTML, html };
        cache.set(cacheKey, payload, ttl);
        logger.info(
          `Cache set: ${cacheKey.substring(0, 60)}... (TTL: ${ttl}s)`,
        );
        resolve(payload);
      } else {
        reject(
          err || new Error(`Render failed with status ${this.statusCode}`),
        );
      }

      if (renderCallback) {
        return renderCallback(err, html);
      }

      if (err) {
        return this.status(500).send(err.message || "Render error");
      }

      return this.send(html);
    };

    return originalRender.call(this, view, renderOptions, done);
  };
};

const setNoStoreHeaders = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
};

const setHttpCachePolicy = (req, res, next) => {
  const hasCookieHeader =
    typeof req.headers.cookie === "string" && req.headers.cookie.length > 0;

  // Only GET/HEAD are cacheable by HTTP semantics.
  if (!["GET", "HEAD"].includes(req.method)) {
    setNoStoreHeaders(res);
    return next();
  }

  // Never allow browser/proxy caching for authenticated sessions.
  if (req.user) {
    setNoStoreHeaders(res);
    res.append("Vary", "Cookie");
    return next();
  }

  // Requests carrying cookies should not receive publicly cacheable HTML.
  // This prevents guest-cached pages being reused after login/logout state changes.
  if (hasCookieHeader) {
    setNoStoreHeaders(res);
    res.append("Vary", "Cookie");
    return next();
  }

  // Public landing pages can be cached briefly.
  if (PUBLIC_CACHEABLE_ROUTES.has(req.path)) {
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.append("Vary", "Cookie");
    return next();
  }

  // Default deny browser/proxy cache for dynamic HTML.
  setNoStoreHeaders(res);
  return next();
};

// In-memory cache dengan TTL default 5 menit (300 detik)
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false, // Keep false: rely on immutable cached data; cloning can fail on complex objects
  maxKeys: 10000, // Prevent unbounded memory growth
});

// Simple single-flight to prevent thundering herd on cache miss
const inFlightRequests = new Map();

/**
 * Cache middleware untuk menyimpan hasil query
 * @param {string|Function} key - Cache key (string) or function that returns key
 * @param {number} ttl - Time to live in seconds (opsional)
 * @returns {Function} - Express middleware function
 *
 * IMPORTANT: Load order matters. Place this middleware AFTER any other middleware
 * that may override res.json/res.render/res.redirect to avoid conflicts.
 */
const cacheMiddleware = (key, ttl = 300) => {
  return (req, res, next) => {
    try {
      const cacheKey = createCacheKey(key, req);

      // Cek cache terlebih dahulu
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        logger.info(`Cache hit: ${cacheKey.substring(0, 60)}...`);
        return sendCachedResponse(res, cachedData);
      }

      // Single-flight: if a request is already in progress for this key, wait for it
      const existingPromise = inFlightRequests.get(cacheKey);
      if (existingPromise) {
        logger.debug(
          `Single-flight: waiting for in-flight request: ${cacheKey.substring(0, 40)}...`,
        );
        return existingPromise
          .then((data) => sendCachedResponse(res, data))
          .catch((err) => {
            logger.error("Single-flight promise rejected:", err);
            next(err);
          });
      }

      let resolvePromise;
      let rejectPromise;
      const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });
      inFlightRequests.set(cacheKey, promise);

      hookResponseCaching({
        res,
        cacheKey,
        ttl,
        resolve: resolvePromise,
        reject: rejectPromise,
      });

      // Ensure cleanup if middleware chain exits unexpectedly.
      const cleanupInFlight = () => {
        inFlightRequests.delete(cacheKey);
      };
      res.on("finish", cleanupInFlight);
      res.on("close", cleanupInFlight);

      promise.catch(() => {}).finally(cleanupInFlight);
      next();
    } catch (error) {
      logger.error("Cache middleware error:", error);
      next();
    }
  };
};

/**
 * Cache helper function untuk manual caching
 */
const cacheHelper = {
  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {any} - Cached data or undefined
   */
  get: (key) => {
    return cache.get(key);
  },

  /**
   * Set data to cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache (should be plain JSON-serializable)
   * @param {number} ttl - Time to live in seconds
   */
  set: (key, data, ttl = 300) => {
    return cache.set(key, data, ttl);
  },

  /**
   * Delete data from cache
   * @param {string} key - Cache key
   */
  del: (key) => {
    return cache.del(key);
  },

  /**
   * Clear all cache
   */
  clear: () => {
    return cache.flushAll();
  },

  /**
   * Get cache stats
   */
  getStats: () => {
    return cache.getStats();
  },

  /**
   * Get all cache keys
   * @returns {Array<string>} - Array of all cache keys
   */
  keys: () => {
    return cache.keys();
  },
};

/**
 * Cache invalidation middleware
 * Untuk invalidasi cache ketika data diupdate
 */
const invalidateCache = (patterns) => {
  return (req, res, next) => {
    let invalidated = false;

    const invalidateMatchingKeys = () => {
      if (invalidated) return;
      invalidated = true;

      patterns.forEach((pattern) => {
        const keys = cache.keys().filter((key) => key.includes(pattern));
        keys.forEach((key) => cache.del(key));
        if (keys.length > 0) {
          logger.info(
            `Cache invalidation: pattern "${pattern}" cleared ${keys.length} keys`,
          );
        }
      });
    };

    // Override res.json untuk invalidasi cache setelah operasi sukses
    const originalJson = res.json;
    res.json = function (data) {
      if (isSuccessStatus(this.statusCode)) {
        invalidateMatchingKeys();
      }
      return originalJson.call(this, data);
    };

    // Override res.render untuk invalidasi cache setelah operasi sukses
    const originalRender = res.render;
    res.render = function (view, options, callback) {
      if (isSuccessStatus(this.statusCode)) {
        invalidateMatchingKeys();
      }
      return originalRender.call(this, view, options, callback);
    };

    // Override res.redirect untuk invalidasi cache setelah operasi sukses
    const originalRedirect = res.redirect;
    res.redirect = function (...args) {
      if (this.statusCode >= 200 && this.statusCode < 400) {
        invalidateMatchingKeys();
      }
      return originalRedirect.apply(this, args);
    };

    next();
  };
};

module.exports = {
  setHttpCachePolicy,
  cacheMiddleware,
  cacheHelper,
  invalidateCache,
  // Export cache instance for advanced use (optional)
  _cache: cache,
};
