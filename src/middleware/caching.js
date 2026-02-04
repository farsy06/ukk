const NodeCache = require("node-cache");
const logger = require("../config/logging");

// In-memory cache dengan TTL 5 menit (300 detik)
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
});

/**
 * Cache middleware untuk menyimpan hasil query
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in seconds (opsional)
 * @returns {Function} - Express middleware function
 */
const cacheMiddleware = (key, ttl = 300) => {
  return async (req, res, next) => {
    try {
      // Generate cache key yang unik
      const userKey =
        req.user && req.user.id ? `user:${req.user.id}` : "user:anon";
      const cacheKey =
        typeof key === "function"
          ? key(req)
          : `${key}:${userKey}:${req.originalUrl}:${JSON.stringify(req.query)}`;

      // Cek cache terlebih dahulu
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        logger.info(`Cache hit for key: ${cacheKey}`);
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

      // Override res.json untuk menyimpan ke cache
      const originalJson = res.json;
      res.json = function (data) {
        // Simpan ke cache jika response sukses
        if (this.statusCode >= 200 && this.statusCode < 300) {
          cache.set(cacheKey, data, ttl);
          logger.info(`Cache set for key: ${cacheKey} (TTL: ${ttl}s)`);
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
          if (!err && this.statusCode >= 200 && this.statusCode < 300) {
            cache.set(cacheKey, { __type: "html", html }, ttl);
            logger.info(`Cache set for key: ${cacheKey} (TTL: ${ttl}s)`);
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
   * @param {any} data - Data to cache
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
            `Invalidated cache keys matching pattern "${pattern}": ${keys.length} keys`,
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
  cacheMiddleware,
  cacheHelper,
  invalidateCache,
};
