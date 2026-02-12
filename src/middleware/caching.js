const NodeCache = require("node-cache");
const logger = require("../config/logging");

const PUBLIC_CACHEABLE_ROUTES = new Set(["/", "/home", "/tos"]);

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
      // Generate cache key yang unik
      const userKey =
        req.user && req.user.id ? `user:${req.user.id}` : "user:anon";

      let queryPart;
      if (typeof key === "function") {
        // For function keys, use the result directly (dynamic key generation)
        queryPart = key(req);
      } else {
        // Normalize query parameters: sort keys and normalize arrays
        const normalizedQuery = Object.keys(req.query)
          .sort()
          .reduce((obj, k) => {
            const value = req.query[k];
            // Normalize arrays: sort array values for consistent keys
            if (Array.isArray(value)) {
              obj[k] = [...value].sort();
            } else {
              obj[k] = value;
            }
            return obj;
          }, {});
        // Build query string with version prefix
        queryPart = `${req.originalUrl}:${JSON.stringify(normalizedQuery)}`;
      }

      // Version prefix allows bulk invalidation on structural changes
      const cacheKey = `v1:${key}:${userKey}:${queryPart}`;

      // Cek cache terlebih dahulu
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        logger.info(`Cache hit: ${cacheKey.substring(0, 60)}...`);
        if (cachedData.__type === "html") {
          res.setHeader("X-Cache", "HIT");
          return res.send(cachedData.html);
        }

        return res.json({
          ...cachedData,
          cached: true,
          timestamp: new Date().toISOString(),
        });
      }

      // Single-flight: if a request is already in progress for this key, wait for it
      const existingPromise = inFlightRequests.get(cacheKey);
      if (existingPromise) {
        logger.debug(
          `Single-flight: waiting for in-flight request: ${cacheKey.substring(0, 40)}...`,
        );
        return existingPromise
          .then((data) => {
            if (data.__type === "html") {
              res.setHeader("X-Cache", "HIT");
              return res.send(data.html);
            }
            return res.json({
              ...data,
              cached: true,
              timestamp: new Date().toISOString(),
            });
          })
          .catch((err) => {
            logger.error("Single-flight promise rejected:", err);
            next(err);
          });
      }

      // Create a promise that will be resolved when the cache is populated
      const promise = new Promise((resolve, reject) => {
        // Store the promise to prevent duplicate fetches
        inFlightRequests.set(cacheKey, promise);

        // Override res.json untuk menyimpan ke cache
        const originalJson = res.json;
        res.json = function (data) {
          // Simpan ke cache jika response sukses
          if (this.statusCode >= 200 && this.statusCode < 300) {
            cache.set(cacheKey, data, ttl);
            logger.info(
              `Cache set: ${cacheKey.substring(0, 60)}... (TTL: ${ttl}s)`,
            );
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
          const renderOptions =
            typeof options === "object" ? options : undefined;

          const done = (err, html) => {
            if (!err && this.statusCode >= 200 && this.statusCode < 300) {
              cache.set(cacheKey, { __type: "html", html }, ttl);
              logger.info(
                `Cache set: ${cacheKey.substring(0, 60)}... (TTL: ${ttl}s)`,
              );
              resolve({ __type: "html", html });
            } else {
              const error =
                err ||
                new Error(`Render failed with status ${this.statusCode}`);
              reject(error);
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

        // Also clean up the in-flight map when response finishes (in case middleware chain breaks)
        res.on("finish", () => {
          inFlightRequests.delete(cacheKey);
        });
        res.on("close", () => {
          inFlightRequests.delete(cacheKey);
        });
      });

      promise.catch(() => {});
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
    const invalidateMatchingKeys = () => {
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
      if (this.statusCode >= 200 && this.statusCode < 300) {
        invalidateMatchingKeys();
      }
      return originalJson.call(this, data);
    };

    // Override res.render untuk invalidasi cache setelah operasi sukses
    const originalRender = res.render;
    res.render = function (view, options, callback) {
      if (this.statusCode >= 200 && this.statusCode < 300) {
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
