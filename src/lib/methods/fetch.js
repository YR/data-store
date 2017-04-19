'use strict';

const agent = require('@yr/agent');
const assign = require('object-assign');
const get = require('./get');
const isPlainObject = require('is-plain-obj');

const DEFAULT_LOAD_OPTIONS = {
  cacheControl: 'public, max-age=120, stale-while-revalidate=150, stale-if-error=180',
  rejectOnError: true,
  retry: 2,
  timeout: 5 * 1000
};
const RE_CACHE_CONTROL = /max-age=(\d+)|stale-while-revalidate=(\d+)|stale-if-error=(\d+)/g;

module.exports = fetch;

/**
 * Fetch data. If expired, load from 'url' and store at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @param {String} url
 * @param {Object} options
 *  - {Boolean} abort
 *  - {String} cacheControl
 *  - {Boolean} ignoreQuery
 *  - {Number} retry
 *  - {Boolean} rejectOnError
 *  - {Number} timeout
 * @returns {Promise<Response>}
 */
function fetch(store, key, url, options) {
  options = assign({}, DEFAULT_LOAD_OPTIONS, options);
  options.cacheControl = parseCacheControl(options.cacheControl);

  if (!key) {
    return Promise.resolve({
      body: undefined,
      duration: 0,
      headers: generateHeaders(),
      key,
      status: 400
    });
  }

  return doFetch(store, key, url, options);
}

/**
 * Fetch data. If expired, load from 'url' and store at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @param {String} url
 * @param {Object} options
 *  - {Boolean} abort
 *  - {Object} cacheControl
 *  - {Boolean} ignoreQuery
 *  - {Number} retry
 *  - {Boolean} rejectOnError
 *  - {Number} timeout
 * @returns {Promise}
 */
function doFetch(store, key, url, options) {
  const { rejectOnError } = options;
  const value = get(store, key);
  const isExpired = hasExpired(value, store.HEADERS_KEY);
  const isMissing = !value;

  store.debug('fetch %s from %s', key, url);

  // Load if missing or expired
  if (isMissing || isExpired) {
    if (!url) {
      return Promise.resolve({
        body: value,
        duration: 0,
        headers: generateHeaders(),
        key,
        status: 400
      });
    }

    const promiseToLoad = new Promise((resolve, reject) => {
      load(store, key, url, options)
        .then(res => {
          store.debug('fetched %s from %s', key, url);
          resolve({
            body: get(store, key),
            duration: res.duration,
            headers: generateHeaders(res.headers),
            key,
            status: res.status
          });
        })
        .catch(err => {
          if (rejectOnError) {
            return reject(err);
          }
          store.debug('fetched stale %s after load error', key);
          return resolve({
            body: value,
            duration: 0,
            error: err,
            headers: generateHeaders(),
            key,
            status: err.status
          });
        });
    });

    if (!value) {
      return promiseToLoad;
    }
    // Prevent unhandled
    promiseToLoad.catch(err => {
      /* promise never returned, so swallow error */
    });
  }

  store.debug('fetched %s %s', isMissing ? 'new' : isExpired ? 'stale' : 'existing', key);
  // Return data (possibly stale)
  return Promise.resolve({
    body: value,
    duration: 0,
    headers: generateHeaders(),
    key,
    status: 200
  });
}

/**
 * Load data from 'url' and store at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @param {String} url
 * @param {Object} options
 *  - {Boolean} abort
 *  - {Boolean} ignoreQuery
 *  - {Number} minExpiry
 *  - {Number} retry
 *  - {Boolean} staleIfError
 *  - {Number} timeout
 * @returns {Promise}
 */
function load(store, key, url, options) {
  const { cacheControl, rejectOnError, retry, timeout } = options;

  options.id = key;

  store.debug('load %s from %s', key, url);

  return agent
    .get(url, options)
    .timeout(timeout)
    .retry(retry)
    .then(res => {
      store.debug('loaded "%s" in %dms', key, res.duration);

      // Guard against empty data
      if (res.body) {
        const data = res.body;

        // Parse cache-control headers
        if (res.headers && 'expires' in res.headers) {
          data[store.HEADERS_KEY] = parseHeaders(res.headers, cacheControl);
        }

        // Enable handling by not calling inner set()
        store.set(key, data, options);
      }

      return res;
    })
    .catch(err => {
      store.debug('unable to load "%s" from %s', key, url);

      if (rejectOnError) {
        store.set(key, undefined, options);
      }

      throw err;
    });
}

/**
 * Parse 'cacheControlString'
 * @param {String} cacheControlString
 * @returns {Object}
 */
function parseCacheControl(cacheControlString) {
  if (cacheControlString && typeof cacheControlString === 'string') {
    const match = cacheControlString.match(RE_CACHE_CONTROL);

    if (match) {
      const [, maxAge, staleWhileRevalidate, staleIfError] = match;

      return {
        maxAge: maxAge ? parseInt(maxAge, 10) : 0,
        staleWhileRevalidate: staleWhileRevalidate ? parseInt(staleWhileRevalidate, 10) : 0,
        staleIfError: staleIfError ? parseInt(staleIfError, 10) : 0
      };
    }
  }

  return {
    maxAge: 0,
    staleWhileRevalidate: 0,
    staleIfError: 0
  };
}

/**
 * Parse 'headers'
 * @param {Object} headers
 * @param {Object} defaultCacheControl
 * @returns {Number}
 */
function parseHeaders(headers, defaultCacheControl) {
  const now = Date.now();
  let expires = now;

  if (headers.expires) {
    expires = typeof headers.expires === 'string' ? Number(new Date(headers.expires)) : headers.expires;
  }

  return {
    cacheControl: assign({}, defaultCacheControl, parseCacheControl(headers['cache-control'])),
    expires: now > expires ? now + (defaultCacheControl.maxAge * 1000) : expires
  };
}

/**
 * Retrieve headers object
 * @param {Number} [expires]
 * @param {Number} minExpiry
 * @param {Number} grace
 * @returns {Object}
 */
function generateHeaders(expires, minExpiry, grace = 0) {
  const now = Date.now();

  if (!expires || expires < now) {
    expires = now + minExpiry;
  }

  expires += grace;

  return {
    // Round up to nearest second
    'cache-control': `public, max-age=${Math.ceil((expires - now) / 1000)}`,
    expires: new Date(expires).toUTCString()
  };
}

/**
 * Check if 'obj' has expired
 * @param {Object} obj
 * @param {String} headersKey
 * @returns {Boolean}
 */
function hasExpired(obj, headersKey) {
  // Round up to nearest second
  const now = Math.ceil(Date.now() / 1000) * 1000;

  return !(obj && isPlainObject(obj) && headersKey in obj && now < obj[headersKey].expires);
}
