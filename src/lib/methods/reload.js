'use strict';

const clock = require('@yr/clock');
const get = require('./get');
const load = require('./load');

/**
 * Reload data from 'url'
 * @param {DataStore} store
 * @param {String} key
 * @param {String} url
 * @param {Object} options
 *  - {Boolean} abort
 *  - {Boolean} ignoreQuery
 *  - {Number} minExpiry
 *  - {Number} retries
 *  - {Number} timeout
 */
module.exports = function reload (store, key, url, options) {
  const { minExpiry } = options;
  const value = get(store, key);
  // Guard against invalid duration
  const duration = Math.max((value && value[store.EXPIRES_KEY] || 0) - Date.now(), minExpiry);

  clock.timeout(duration, () => {
    load(store, key, url, options)
      .then((res) => {
        const value = get(store, key);

        store.emit(`reload:${key}`, value);
        store.emit('reload', key, value);
        reload(store, key, url, options);
      })
      .catch((err) => {
        // TODO: error never logged
        store.debug('unable to reload "%s" from %s', key, url);
        reload(store, key, url, options);
      });
  }, key);
};