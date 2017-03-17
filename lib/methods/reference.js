'use strict';

/**
 * Retrieve reference to value stored at 'key'
 * Array of keys returns array of references
 * @param {DataStore} store
 * @param {String|Array} [key]
 * @returns {String}
 */

module.exports = function reference(store, key) {
  if (!key) {
    return store.REF_KEY;
  }
  if (typeof key === 'string') {
    return doReference(store, key);
  }
  if (Array.isArray(key)) {
    return key.map(function (k) {
      return doReference(store, k);
    });
  }
};

/**
 * Retrieve reference to value stored at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @returns {String}
 */
function doReference(store, key) {
  // Resolve back to original key if referenced
  key = store._resolveRefKey(key);
  return '' + store.REF_KEY + key;
}