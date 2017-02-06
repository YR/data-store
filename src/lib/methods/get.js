'use strict';

const isPlainObject = require('is-plain-obj');
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
  key = store._resolveRefKey(key);

  const value = property.get(store._data, key);

  // Shallow resolve embedded references
  if (Array.isArray(value)) {
    return value.map((item) => {
      return store._isRefValue(item)
        ? property.get(store._data, store._parseRefKey(item))
        : item;
    });
  } else if (isPlainObject(value)) {
    let v = {};

    for (const prop in value) {
      v[prop] = store._isRefValue(value[prop])
        ? property.get(store._data, store._parseRefKey(value[prop]))
        : value[prop];
    }
    return v;
  }

  return value;
}