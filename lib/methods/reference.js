'use strict';

module.exports = reference;
module.exports.all = referenceAll;

/**
 * Retrieve reference to value stored at 'key'
 * @param {DataStore} store
 * @param {String} [key]
 * @returns {String}
 */
function reference(store, key) {
  if (!key) {
    return store.REF_KEY;
  }
  return doReference(store, key);
}

/**
 * Batch version of 'reference()'
 * Accepts array of 'keys'
 * @param {DataStore} store
 * @param {Array<String>} keys
 * @returns {Array<String>}
 */
function referenceAll(store, keys) {
  return keys.map(function (key) {
    return doReference(store, key);
  });
}

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