const Redis = require('ioredis')
const LRU = require('lru-cache')

/* Setting the default time to live for the cache to 30 seconds. */
const DEFAULT_REDIS_TTL = 30 * 1000

/**
 * If the ttl is a number and greater than 0, return true, otherwise return false.
 */
const isValidTTL = ttl => typeof ttl === 'number' && ttl > 0

/* Setting the default values for the LRU cache. */
const defaultLruConfig = {
  max: 1000,
  maxAge: 1000 * 60 /// 1 min
}

/* It's a wrapper around the ioredis library that provides a cache interface */
class IORedisCacheAdapter {
  /**
   * The constructor function takes in a redisContext, a ttl, and an lruConfig. If the redisContext is not provided, an
   * error is thrown. If the ttl is not provided, the default ttl is used. If the lruConfig is not provided, the default
   * lruConfig is used
   * @param redisContext - This is the Redis connection context. It can be a single Redis instance or a Redis cluster.
   * @param [ttl] - The time to live for the cache.
   * @param [lruConfig] - This is the configuration for the LRU cache.
   */
  constructor(redisContext, ttl = DEFAULT_REDIS_TTL, lruConfig = defaultLruConfig) {
    if (!redisContext) {
      throw new Error('Redis context is required')
    }

    this.client =
      redisContext.cluster && redisContext.cluster.nodes
        ? new Redis.Cluster(redisContext.cluster.nodes, redisContext.cluster.options)
        : new Redis(redisContext)

    this.ttl = isValidTTL(ttl) ? ttl : DEFAULT_REDIS_TTL
    this.map = new LRU(lruConfig)
  }

  /**
   * "If there is a promise in the map for the given key, return it. Otherwise, return a resolved promise, then chain the
   * given function to it, and store it in the map."
   *
   * The function is used like this:
   * @param key - The key to store the promise under.
   * @param promFunction - A function that returns a promise.
   * @returns A promise that will be resolved when the promise returned by promFunction is resolved.
   */
  chainPromise(key, promFunction) {
    let p = this.map.get(key)
    if (!p) {
      p = Promise.resolve()
    }

    p = p.then(promFunction)
    this.map.set(key, p)
    return p
  }

  /**
   * It returns a promise that resolves to the value of the key in the cache, or null if the key doesn't exist
   * @param key - The key to get the value for
   * @returns A promise that resolves to the value of the key in the cache.
   */
  get(key) {
    return this.chainPromise(
      key,
      () =>
        new Promise(resolve => {
          this.client.get(key, function (error, response) {
            if (!response || error) {
              return resolve(null)
            }
            resolve(JSON.parse(response))
          })
        })
    )
  }

  /**
   * The function takes in a key, value, and ttl (time to live) and sets the value of the key to the value
   * @param key - The key to store the value under.
   * @param value - The value to be stored in the cache.
   * @param [ttl] - Time to live in milliseconds.
   * @returns A promise that resolves when the value is set.
   */
  put(key, value, ttl = this.ttl) {
    value = JSON.stringify(value)
    if (ttl === 0) {
      return this.chainPromise(key, () => Promise.resolve())
    }

    if (ttl === Number.POSITIVE_INFINITY) {
      return this.chainPromise(
        key,
        () =>
          new Promise(resolve => {
            this.client.set(key, value, function () {
              resolve()
            })
          })
      )
    }

    if (!isValidTTL(ttl)) {
      ttl = this.ttl
    }

    return this.chainPromise(
      key,
      () =>
        new Promise(resolve => {
          if (ttl === Number.POSITIVE_INFINITY) {
            this.client.set(key, value, function () {
              resolve()
            })
          } else {
            this.client.psetex(key, ttl, value, function () {
              resolve()
            })
          }
        })
    )
  }

  /**
   * It returns a promise that resolves when the redis client has deleted the key
   * @param key - The key to delete
   * @returns A promise that resolves when the redis client has deleted the key.
   */
  del(key) {
    return this.chainPromise(
      key,
      () =>
        new Promise(resolve => {
          this.client.del(key, function () {
            resolve()
          })
        })
    )
  }

  /**
   * It returns a promise that resolves when the Redis database is cleared
   * @returns A promise that resolves when the database is cleared.
   */
  clear() {
    return new Promise(resolve => {
      this.client.flushdb(function () {
        resolve()
      })
    })
  }

  /**
   * It returns a promise that resolves to an array of all the keys in the Redis database
   * @returns A promise that resolves to an array of all the keys in the redis database.
   */
  // Used for testing
  async getAllKeys() {
    return new Promise((resolve, reject) => {
      this.client.keys('*', (error, keys) => {
        if (error) {
          reject(error)
        } else {
          resolve(keys)
        }
      })
    })
  }
}

module.exports = IORedisCacheAdapter
module.exports.default = IORedisCacheAdapter
