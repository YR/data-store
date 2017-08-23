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
 *  - {Number} referenceDepth
 * @returns {*}
 */
function doGet(store, key, options = {}) {
  // Resolve back to original key if referenced
  key = store._resolveRefKey(key);

  const { referenceDepth = 1 } = options;
  const cacheKey = `${key}:${referenceDepth}`;
  const shouldCache = !store._isWritable;

  if (shouldCache) {
    if (store._cache[cacheKey]) {
      return store._cache[cacheKey];
    }
  }

  let value = property.get(store._data, key);

  if (referenceDepth > 0) {
    value = resolveReferences(store, value, referenceDepth);
  }

  if (shouldCache) {
    store._cache[cacheKey] = value;
  }

  return value;
}

/**
 * Resolve all references in 'value' up to max 'depth'
 * @param {DataStore} store
 * @param {Object} value
 * @param {Number} depth
 * @returns {Object}
 */
function resolveReferences(store, value, depth) {
  if (--depth < 0) {
    return value;
  }

  if (Array.isArray(value)) {
    const n = value.length;
    const v = new Array(n);
    let item;

    for (let i = n - 1; i >= 0; i--) {
      item = value[i];
      v[i] = resolveReferences(
        store,
        store._isRefValue(item) ? property.get(store._data, store._parseRefKey(item)) : item,
        depth
      );
    }

    value = v;
  } else if (isPlainObject(value)) {
    const v = {};
    let item;

    for (const prop in value) {
      item = value[prop];
      v[prop] = resolveReferences(
        store,
        store._isRefValue(item) ? property.get(store._data, store._parseRefKey(item)) : item,
        depth
      );
    }

    value = v;
  }

  return value;
}
