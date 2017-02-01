'use strict';

var agent = require('@yr/agent');

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
module.exports = function load(store, key, url, options) {
  options.id = key;

  store.debug('load %s from %s', key, url);

  return agent.get(url, options).timeout(options.timeout).retry(options.retries).then(function (res) {
    store.debug('loaded "%s" in %dms', key, res.duration);

    var value = void 0;

    // Guard against empty data
    if (res.body) {
      var data = res.body;

      // Add expires header
      if (res.headers && 'expires' in res.headers) {
        data[store.EXPIRES_KEY] = getExpiry(res.headers.expires, options.minExpiry, store.GRACE);
      }

      // Enable handling by not calling inner set()
      value = store.set(key, data, options);
    }

    store.emit('load:' + key, value);
    store.emit('load', key, value);

    return res;
  }).catch(function (err) {
    store.debug('unable to load "%s" from %s', key, url);

    if (!options.staleIfError) store.set(key, null, options);

    throw err;
  });
};

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