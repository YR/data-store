'use strict';

var clock = require('@yr/clock');
var get = require('./get');
var load = require('./load');

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
module.exports = function reload(store, key, url, options) {
  var minExpiry = options.minExpiry;

  var value = get(store, key);
  // Guard against invalid duration
  var duration = Math.max((value && value[store.EXPIRES_KEY] || 0) - Date.now(), minExpiry);

  clock.timeout(duration, function () {
    load(store, key, url, options).then(function (res) {
      var value = get(store, key);

      store.emit('reload:' + key, value);
      store.emit('reload', key, value);
      reload(store, key, url, options);
    }).catch(function (err) {
      // TODO: error never logged
      store.debug('unable to reload "%s" from %s', key, url);
      reload(store, key, url, options);
    });
  }, key);
};