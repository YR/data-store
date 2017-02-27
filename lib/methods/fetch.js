'use strict';

var agent = require('@yr/agent');
var assign = require('object-assign');
var get = require('./get');
var isPlainObject = require('is-plain-obj');

var DEFAULT_LOAD_OPTIONS = {
  minExpiry: 60000,
  retry: 2,
  timeout: 5000
};

/**
 * Fetch data. If expired, load from 'url' and store at 'key'
 * Hash of 'key:url' pairs batches calls
 * @param {DataStore} store
 * @param {String|Object} key
 * @param {String} url
 * @param {Object} options
 *  - {Boolean} abort
 *  - {Boolean} ignoreQuery
 *  - {Number} minExpiry
 *  - {Number} retry
 *  - {Boolean} staleWhileRevalidate
 *  - {Boolean} staleIfError
 *  - {Number} timeout
 * @returns {Promise}
 */
module.exports = function fetch(store, key, url, options) {
  if (!key) {
    return Promise.resolve({
      body: undefined,
      duration: 0,
      headers: { status: 500 },
      key: key
    });
  }

  options = assign({}, DEFAULT_LOAD_OPTIONS, options);

  if ('string' == typeof key) return doFetch(store, key, url, options);
  if (isPlainObject(key)) {
    return Promise.all(Object.keys(key).sort().map(function (k) {
      return doFetch(store, k, key[k], options);
    }));
  }
  if (Array.isArray(key)) {
    return Promise.all(key.map(function (args) {
      var k = args[0],
          u = args[1],
          _args$ = args[2],
          o = _args$ === undefined ? {} : _args$;


      return doFetch(store, k, u, assign({}, options, o));
    }));
  }
};

/**
 * Fetch data. If expired, load from 'url' and store at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @param {String} url
 * @param {Object} options
 *  - {Boolean} abort
 *  - {Boolean} ignoreQuery
 *  - {Number} minExpiry
 *  - {Number} retry
 *  - {Boolean} staleWhileRevalidate
 *  - {Boolean} staleIfError
 *  - {Number} timeout
 * @returns {Promise}
 */
function doFetch(store, key, url, options) {
  var minExpiry = options.minExpiry,
      staleWhileRevalidate = options.staleWhileRevalidate,
      staleIfError = options.staleIfError;

  var value = get(store, key);
  var isMissingOrExpired = !value || hasExpired(value, store.EXPIRES_KEY);

  // Load if missing or expired
  if (isMissingOrExpired) {
    if (!url) {
      return Promise.resolve({
        body: value,
        duration: 0,
        headers: { status: 500 },
        key: key
      });
    }

    store.debug('fetch %s from %s', key, url);

    var promiseToLoad = new Promise(function (resolve, reject) {
      load(store, key, url, options).then(function (res) {
        resolve({
          body: get(store, key),
          duration: res.duration,
          headers: res.headers,
          key: key
        });
      }).catch(function (err) {
        if (!(value && staleIfError)) return reject(err);
        resolve({
          body: value,
          duration: 0,
          error: err,
          headers: { expires: new Date(Date.now() + minExpiry).toUTCString(), status: err.status },
          key: key
        });
      });
    });

    if (!(value && staleWhileRevalidate)) return promiseToLoad;
    // Prevent unhandled
    promiseToLoad.catch(function (err) {/* promise never returned, so swallow error */});
  }

  // Return data (possibly stale)
  return Promise.resolve({
    body: value,
    duration: 0,
    headers: { status: 200 },
    key: key
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
 *  - {Number} retries
 *  - {Boolean} staleIfError
 *  - {Number} timeout
 * @returns {Promise}
 */
function load(store, key, url, options) {
  options.id = key;

  store.debug('load %s from %s', key, url);

  return agent.get(url, options).timeout(options.timeout).retry(options.retries).then(function (res) {
    store.debug('loaded "%s" in %dms', key, res.duration);

    // Guard against empty data
    if (res.body) {
      var data = res.body;

      // Add expires header
      if (res.headers && 'expires' in res.headers) {
        data[store.EXPIRES_KEY] = getExpiry(res.headers.expires, options.minExpiry, store.GRACE);
      }

      // Enable handling by not calling inner set()
      store.set(key, data, options);
    }

    return res;
  }).catch(function (err) {
    store.debug('unable to load "%s" from %s', key, url);

    if (!options.staleIfError) store.set(key, null, options);

    throw err;
  });
}

/**
 * Retrieve expiry from 'dateString'
 * @param {Number} dateString
 * @param {Number} minimum
 * @param {Number} grace
 * @returns {Number}
 */
function getExpiry(dateString, minimum, grace) {
  // Add latency overhead to compensate for transmission time
  var expires = +new Date(dateString) + grace;
  var now = Date.now();

  return expires > now ? expires
  // Local clock is set incorrectly
  : now + minimum;
}

/**
 * Check if 'obj' has expired
 * @param {Object} obj
 * @param {String} expiresKey
 * @returns {Boolean}
 */
function hasExpired(obj, expiresKey) {
  return obj && isPlainObject(obj) && expiresKey in obj && Date.now() > obj[expiresKey];
}