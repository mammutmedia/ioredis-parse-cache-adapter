const IORedisCacheAdapter = require('../src/index.js')

function wait(sleep) {
  return new Promise(function (resolve) {
    setTimeout(resolve, sleep)
  })
}

describe('IORedisAdapter tests', () => {
  const KEY = 'hello'
  const VALUE = 'world'
  let cache

  beforeEach(async () => {
    cache = new IORedisCacheAdapter(null, 100)
    await cache.clear()
  })

  it('should get/set/clear', done => {
    const cacheNaN = new IORedisCacheAdapter({
      ttl: Number.NaN
    })

    cacheNaN
      .put(KEY, VALUE)
      .then(() => cacheNaN.get(KEY))
      .then(value => expect(value).toEqual(VALUE))
      .then(() => cacheNaN.clear())
      .then(() => cacheNaN.get(KEY))
      .then(value => expect(value).toEqual(null))
      .then(() => cacheNaN.clear())
      .then(done)
  })

  it('should expire after ttl', done => {
    cache
      .put(KEY, VALUE)
      .then(() => cache.get(KEY))
      .then(value => expect(value).toEqual(VALUE))
      .then(wait.bind(null, 102))
      .then(() => cache.get(KEY))
      .then(value => expect(value).toEqual(null))
      .then(done)
  })

  it('should not store value for ttl=0', done => {
    cache
      .put(KEY, VALUE, 0)
      .then(() => cache.get(KEY))
      .then(value => expect(value).toEqual(null))
      .then(done)
  })

  it('should not expire when ttl=Infinity', done => {
    cache
      .put(KEY, VALUE, Number.POSITIVE_INFINITY)
      .then(() => cache.get(KEY))
      .then(value => expect(value).toEqual(VALUE))
      .then(wait.bind(null, 102))
      .then(() => cache.get(KEY))
      .then(value => expect(value).toEqual(VALUE))
      .then(done)
  })

  it('should fallback to default ttl', done => {
    let promise = Promise.resolve()
    const values = [-100, null, undefined, 'not number', true]

    for (const ttl of values) {
      promise = promise.then(() =>
        cache
          .put(KEY, VALUE, ttl)
          .then(() => cache.get(KEY))
          .then(value => expect(value).toEqual(VALUE))
          .then(wait.bind(null, 102))
          .then(() => cache.get(KEY))
          .then(value => expect(value).toEqual(null))
      )
    }

    promise.then(done)
  })

  it('should find un-expired records', done => {
    cache
      .put(KEY, VALUE)
      .then(() => cache.get(KEY))
      .then(value => expect(value).toEqual(VALUE))
      .then(wait.bind(null, 1))
      .then(() => cache.get(KEY))
      .then(value => expect(value).not.toEqual(null))
      .then(done)
  })
})
