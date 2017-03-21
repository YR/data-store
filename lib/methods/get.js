'use strict';

var isPlainObject = require('is-plain-obj');
var property = require('@yr/property');

module.exports = get;
module.exports.all = getAll;

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
 * Batch version of 'get()'
 * Accepts array of 'keys'
 * @param {DataStore} store
 * @param {Array} keys
 * @returns {Array}
 */
function getAll(store, keys) {
  return keys.map(function (key) {
    return doGet(store, key);
  });
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

  var value = property.get(store._data, key);

  // Shallow resolve embedded references
  // Should in theory mutate value, but may cause false equality with previous
  if (Array.isArray(value)) {
    return value.map(function (item) {
      return store._isRefValue(item) ? property.get(store._data, store._parseRefKey(item)) : item;
    });
  } else if (isPlainObject(value)) {
    var v = {};

    for (var prop in value) {
      v[prop] = store._isRefValue(value[prop]) ? property.get(store._data, store._parseRefKey(value[prop])) : value[prop];
    }
    return v;
  }

  return value;
}