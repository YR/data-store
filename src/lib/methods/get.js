"use strict";

const property = require("@nrk/yr-property");

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
  if (key === "" || key == null) {
    return store._data;
  }
  return doGet(store, key, options);
}

/**
 * Retrieve value stored at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @param {Object} [options]
 *  - {Number} referenceDepth
 * @returns {*}
 */
function doGet(store, key, options = {}) {
  const { referenceDepth = 1 } = options;
  const cacheKey = `${key}:${referenceDepth}`;
  const shouldCache = !store._isWritable;

  if (shouldCache) {
    if (store._getCache[cacheKey]) {
      return store._getCache[cacheKey];
    }
  }

  let value = property.get(store._data, key);

  if (shouldCache) {
    store._getCache[cacheKey] = value;
  }

  return value;
}
