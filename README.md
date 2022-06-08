# ioredis-parse-cache-adapter

parse-server cache-adapter for ioredis

Base on this file:
https://github.com/parse-community/parse-server/blob/master/src/Adapters/Cache/RedisCacheAdapter.js

# Installation

`npm install --save ioredis-parse-cache-adapter`

# Usage
```js
const parseServer = new ParseServer({

    /// Other options

    cacheAdapter: new RedisCacheAdapter({ url: process.env.REDIS_URL });
});
```
