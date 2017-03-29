'use strict';

const assign = require('object-assign');
const property = require('@yr/property');
const runtime = require('@yr/runtime');

const DEFAULT_OPTIONS = {
  // Browser immutable by default
  immutable: runtime.isBrowser,
  merge: true
};

module.exports = set;

/**
 * Store 'value' at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @param {*} value
 * @param {Object} [options]
 *  - {Boolean} immutable
 *  - {Boolean} merge
 * @returns {Boolean}
 */
function set(store, key, value, options) {
  return doSet(store, key, value, assign({}, DEFAULT_OPTIONS, options));
}

/**
 * Store 'value' at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @param {*} value
 * @param {Object} [options]
 *  - {Boolean} immutable
 *  - {Boolean} merge
 * @returns {Boolean}
 */
function doSet(store, key, value, options) {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Returns same if no change
  const newData = property.set(store._data, key, value, options);

  if (options.immutable) {
    if (newData !== store._data) {
      store._data = newData;
    } else {
      store.debug('WARNING no change after set "%s', key);
      return false;
    }
  }
  return true;
}
