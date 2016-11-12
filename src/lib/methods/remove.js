'use strict';

const get = require('./get');
const keys = require('@yr/keys');
const set = require('./set');

/**
 * Remove 'key'
 * Array of keys batch removes values
 * @param {DataStore} store
 * @param {String} key
 * @returns {null}
 */
module.exports = function remove (store, key) {
  if (!key) return;
  if ('string' == typeof key) return doRemove(store, key);
  if (Array.isArray(key)) return key.map((k) => doRemove(store, k));
};

/**
 * Remove 'key'
 * @param {DataStore} store
 * @param {String} key
 */
function doRemove (store, key) {
  // Remove value from parent
  const length = keys.length(key);
  const lastKey = (length == 1) ? key : keys.last(key);
  const data = (length == 1) ? store._data : get(store, keys.slice(key, 0, -1));

  // Only remove existing (prevent recursive trap)
  if (data && lastKey in data) {
    store.debug('remove "%s"', key);
    set(store, lastKey, undefined);
  }
}