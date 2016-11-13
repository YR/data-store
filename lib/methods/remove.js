'use strict';

var get = require('./get');
var keys = require('@yr/keys');
var set = require('./set');

/**
 * Remove 'key'
 * Array of keys batch removes values
 * @param {DataStore} store
 * @param {String} key
 * @returns {null}
 */
module.exports = function remove(store, key) {
  if (!key) return;
  if ('string' == typeof key) return doRemove(store, key);
  if (Array.isArray(key)) return key.map(function (k) {
    return doRemove(store, k);
  });
};

/**
 * Remove 'key'
 * @param {DataStore} store
 * @param {String} key
 */
function doRemove(store, key) {
  // Remove value from parent
  var length = keys.length(key);
  var lastKey = length == 1 ? key : keys.last(key);
  var data = length == 1 ? store._data : get(store, keys.slice(key, 0, -1));

  // Only remove existing (prevent recursive trap)
  if (data && lastKey in data) {
    store.debug('remove "%s"', key);
    set(store, lastKey, undefined);
  }
}