# ioredis-parse-cache-adapter

parse-server cache-adapter for ioredis

Base on this file:
[RedisCacheAdapter.js](https://github.com/parse-community/parse-server/blob/master/src/Adapters/Cache/RedisCacheAdapter.js)

## Installation

`npm install --save ioredis-parse-cache-adapter`

## Usage

Redis single node or Redis sentinel configuration:

```js
const parseServer = new ParseServer({

    /// Other options

    cacheAdapter: new RedisCacheAdapter({ url: process.env.REDIS_URL });
});
```

Redis Cluster configuration:

```js
const parseServer = new ParseServer({

    /// Other options

    cacheAdapter: new RedisCacheAdapter({
      cluster: {
        nodes: process.env.REDIS_CLUSTER_NODES.split(','),
        options: {
          redisOptions: {
            password: process.env.REDIS_PASSWORD,
          },
        }
      }
    });
});
```

You can pass any option that [ioredis](https://github.com/luin/ioredis) supports.
You may have a look at their documentation.
