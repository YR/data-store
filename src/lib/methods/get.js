'use strict';

const isPlainObject = require('is-plain-obj');
const property = require('@yr/property');

module.exports = get;

/**
 * Retrieve value stored at 'key'
 * Empty/null/undefined 'key' returns all data
 * @param {DataStore} store
 * @param {String} [key]
 * @returns {*}
 */
function get(store, key) {
  if (key === '' || key == null) {
    return store._data;
  }
  return doGet(store, key);
}

/**
 * Retrieve value stored at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @returns {*}
 */
function doGet(store, key) {
  // Resolve back to original key if referenced
  key = store._resolveRefKey(key);

  const value = property.get(store._data, key);

  // Shallow resolve embedded references
  // Should in theory mutate value, but may cause false equality with previous
  if (Array.isArray(value)) {
    return value.map(item => {
      return store._isRefValue(item) ? property.get(store._data, store._parseRefKey(item)) : item;
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
