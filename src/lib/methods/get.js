'use strict';

const isPlainObject = require('is-plain-obj');
const property = require('@yr/property');

module.exports = get;

/**
 * Retrieve value stored at 'key'
 * Empty/null/undefined 'key' returns all data
 * @param {DataStore} store
 * @param {String} [key]
 * @param {Object} [options]
 *  - {Boolean} resolveReferences
 * @returns {*}
 */
function get(store, key, options) {
  if (key === '' || key == null) {
    return store._data;
  }
  return doGet(store, key, options);
}

/**
 * Retrieve value stored at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @param {Object} [options]
 *  - {Boolean} resolveReferences
 * @returns {*}
 */
function doGet(store, key, options = {}) {
  // Resolve back to original key if referenced
  key = store._resolveRefKey(key);

  const { resolveReferences = true } = options;
  const cacheKey = `${key}:${resolveReferences}`;
  const shouldCache = !store._isWritable;

  if (shouldCache) {
    if (store._cache[cacheKey]) {
      return store._cache[cacheKey];
    }
  }

  let value = property.get(store._data, key);

  if (resolveReferences) {
    // Shallow resolve embedded references
    // Should in theory mutate value, but may cause false equality with previous
    if (Array.isArray(value)) {
      value = value.map(item => {
        return store._isRefValue(item) ? property.get(store._data, store._parseRefKey(item)) : item;
      });
    } else if (isPlainObject(value)) {
      const v = {};

      for (const prop in value) {
        v[prop] = store._isRefValue(value[prop])
          ? property.get(store._data, store._parseRefKey(value[prop]))
          : value[prop];
      }

      value = v;
    }
  }

  if (shouldCache) {
    store._cache[cacheKey] = value;
  }

  return value;
}
