'use strict';

const property = require('@yr/property');

/**
 * Retrieve value stored at 'key'
 * Empty 'key' returns all data
 * Array of keys returns array of values
 * @param {DataStore} store
 * @param {String|Array} [key]
 * @returns {*}
 */
module.exports = function get (store, key) {
  if (!key) return store._data;

  if ('string' == typeof key) return doGet(store, key);
  if (Array.isArray(key)) return key.map((k) => doGet(store, k));
};

/**
 * Retrieve value stored at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @returns {*}
 */
function doGet (store, key) {
  // Resolve back to original key if referenced
  key = store._resolveKeyRef(key);
  return property.get(store._data, key);
}