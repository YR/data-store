'use strict';

var property = require('@yr/property');

/**
 * Retrieve value stored at 'key'
 * Empty 'key' returns all data
 * Array of keys returns array of values
 * @param {DataStore} store
 * @param {String} [key]
 * @returns {*}
 */
module.exports = function get(store, key) {
  if (!key) return store._data;
  if ('string' == typeof key) return property.get(store._data, key);
  if (Array.isArray(key)) return key.map(function (k) {
    return property.get(store._data, k);
  });
};