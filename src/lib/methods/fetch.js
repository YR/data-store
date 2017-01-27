'use strict';

const get = require('./get');
const isPlainObject = require('is-plain-obj');
const load = require('./load');

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
module.exports = function fetch (store, key, url, options = {}) {
  if (!key) return;

  if ('string' == typeof key) return doFetch(store, key, url, options);
  if (isPlainObject(key)) {
    return Promise.all(Object.keys(key).map((k) => doFetch(store, k, key[k], options)));
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
function doFetch (store, key, url, options) {
  const { staleWhileRevalidate, staleIfError } = options;
  const value = get(store, key);
  const isMissingOrExpired = !value || hasExpired(value, store.EXPIRES_KEY);

  // Load if missing or expired
  if (isMissingOrExpired) {
    store.debug('fetch %s from %s', key, url);

    const promiseToLoad = new Promise((resolve, reject) => {
      load(store, key, url, options)
        .then((res) => {
          resolve({
            duration: res.duration,
            headers: res.headers,
            data: get(store, key)
          });
        })
        .catch((err) => {
          if (!staleIfError) return reject(err);
          resolve({
            duration: 0,
            error: err,
            headers: { expires: new Date(value[store.EXPIRES_KEY] + store.GRACE).toUTCString(), status: err.status },
            data: value
          });
        });
    });

    if (!(value && staleWhileRevalidate)) return promiseToLoad;
    // Prevent unhandled
    promiseToLoad.catch((err) => { /* promise never returned, so swallow error */ });
    // TODO: notify on load
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
function hasExpired (obj, expiresKey) {
  return obj
    && isPlainObject(obj)
    && expiresKey in obj
    && Date.now() > obj[expiresKey];
}