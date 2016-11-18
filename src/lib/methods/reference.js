'use strict';

/**
 * Retrieve reference to value stored at 'key'
 * Array of keys returns array of references
 * @param {DataStore} store
 * @param {String|Array} [key]
 * @returns {String}
 */
module.exports = function reference (store, key) {
  if (!key) return '__ref:';
  if ('string' == typeof key) return doReference(store, key);
  if (Array.isArray(key)) return key.map((k) => doReference(store, k));
};

/**
 * Retrieve reference to value stored at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @returns {String}
 */
function doReference (store, key) {
  // Resolve back to original key if referenced
  key = store._resolveKeyRef(key);
  return `__ref:${key}`;
}