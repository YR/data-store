'use strict';

const property = require('@yr/property');

/**
 * Retrieve property value with `key`
 * @param {DataStore} store
 * @param {String} [key]
 * @returns {*}
 */
module.exports = function get (store, key) {
  // Return all if no key specified
  if (!key) return store._data;
  return property.get(store._data, key);
};