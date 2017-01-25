'use strict';

var get = require('./get');
var isPlainObject = require('is-plain-obj');
var load = require('./load');

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
module.exports = function fetch(store, key, url) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  if (!key) return;

  if ('string' == typeof key) return doFetch(store, key, url, options);
  if (isPlainObject(key)) {
    return Promise.all(Object.keys(key).map(function (k) {
      return doFetch(store, k, key[k], options);
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
  var staleWhileRevalidate = options.staleWhileRevalidate,
      staleIfError = options.staleIfError;

  var value = get(store, key);
  var isMissingOrExpired = !value || hasExpired(value, store.EXPIRES_KEY);

  // Load if missing or expired
  if (isMissingOrExpired) {
    store.debug('fetch %s from %s', key, url);

    var promiseToLoad = new Promise(function (resolve, reject) {
      load(store, key, url, options).then(function (res) {
        resolve({
          duration: res.duration,
          headers: res.headers,
          data: get(store, key)
        });
      }).catch(function (err) {
        if (!staleIfError) return reject(err);
        resolve({
          duration: 0,
          error: err,
          headers: { status: err.status },
          data: value
        });
      });
    });

    if (!(value && staleWhileRevalidate)) return promiseToLoad;
    // Prevent unhandled
    promiseToLoad.catch(function (err) {/* promise never returned, so swallow error */});
  }

  // Return data (possibly stale)
  return Promise.resolve({
    duration: 0,
    headers: { status: 200 },
    data: value
  });
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