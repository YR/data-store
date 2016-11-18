'use strict';

/**
 * Retrieve reference to value stored at 'key'
 * Array of keys returns array of references
 * @param {DataStore} store
 * @param {String} [key]
 * @returns {*}
 */
module.exports = function reference (store, key) {
  if (!key) return '__ref:';
  if ('string' == typeof key) return `__ref:${key}`;
  if (Array.isArray(key)) return key.map((k) => `__ref:${k}`);
};