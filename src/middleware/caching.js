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
      const cacheKey =
        typeof key === "function"
          ? key(req)
          : `${key}:${req.originalUrl}:${JSON.stringify(req.query)}`;

      // Cek cache terlebih dahulu
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        logger.info(`Cache hit for key: ${cacheKey}`);
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
    // Override res.json untuk invalidasi cache setelah operasi sukses
    const originalJson = res.json;
    res.json = function (data) {
      if (this.statusCode >= 200 && this.statusCode < 300) {
        // Invalidasi cache yang relevan
        patterns.forEach((pattern) => {
          const keys = cache.keys().filter((key) => key.includes(pattern));
          keys.forEach((key) => cache.del(key));
          if (keys.length > 0) {
            logger.info(
              `Invalidated cache keys matching pattern "${pattern}": ${keys.length} keys`,
            );
          }
        });
      }
      return originalJson.call(this, data);
    };
    next();
  };
};

module.exports = {
  cacheMiddleware,
  cacheHelper,
  invalidateCache,
};
