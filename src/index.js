const Redis = require('ioredis')
const LRU = require('lru-cache')

const DEFAULT_REDIS_TTL = 30 * 1000 // 30 seconds in milliseconds

const isValidTTL = ttl => typeof ttl === 'number' && ttl > 0

const defaultLruConfig = {
  max: 1000,
  maxAge: 1000 * 60 /// 1 min
}

class IORedisCacheAdapter {
  constructor(redisCtx, ttl = DEFAULT_REDIS_TTL, lruConfig = defaultLruConfig) {
    this.ttl = isValidTTL(ttl) ? ttl : DEFAULT_REDIS_TTL
    this.client = new Redis(redisCtx)
    this.map = new LRU(lruConfig)
  }

  chainPromise(key, promFunc) {
    let p = this.map.get(key)
    if (!p) {
      p = Promise.resolve()
    }

    p = p.then(promFunc)
    this.map.set(key, p)
    return p
  }

  get(key) {
    return this.chainPromise(
      key,
      () =>
        new Promise(resolve => {
          this.client.get(key, function (err, res) {
            if (!res || err) {
              return resolve(null)
            }
            resolve(JSON.parse(res))
          })
        })
    )
  }

  put(key, value, ttl = this.ttl) {
    value = JSON.stringify(value)
    if (ttl === 0) {
      return this.chainPromise(key, () => Promise.resolve())
    }

    if (ttl === Infinity) {
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
          if (ttl === Infinity) {
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

  clear() {
    return new Promise(resolve => {
      this.client.flushdb(function () {
        resolve()
      })
    })
  }

  // Used for testing
  async getAllKeys() {
    return new Promise((resolve, reject) => {
      this.client.keys('*', (err, keys) => {
        if (err) {
          reject(err)
        } else {
          resolve(keys)
        }
      })
    })
  }
}

module.exports = IORedisCacheAdapter
module.exports.default = IORedisCacheAdapter
