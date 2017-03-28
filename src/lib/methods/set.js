'use strict';

const assign = require('object-assign');
const isPlainObject = require('is-plain-obj');
const property = require('@yr/property');
const runtime = require('@yr/runtime');

const DEFAULT_OPTIONS = {
  // Browser immutable by default
  immutable: runtime.isBrowser,
  merge: true
};

module.exports = set;
module.exports.all = setAll;

/**
 * Store 'value' at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @param {*} value
 * @param {Object} [options]
 *  - {Boolean} immutable
 *  - {Boolean} merge
 * @returns {void}
 */
function set(store, key, value, options) {
  store.changed = doSet(store, key, value, assign({}, DEFAULT_OPTIONS, options));
}

/**
 * Batch version of 'set()'
 * Accepts hash of key/value pairs
 * @param {DataStore} store
 * @param {Object} keys
 * @param {Object} [options]
 *  - {Boolean} immutable
 *  - {Boolean} merge
 */
function setAll(store, keys, options) {
  let changed = false;

  if (isPlainObject(keys)) {
    options = assign({}, DEFAULT_OPTIONS, options);
    for (const key in keys) {
      if (doSet(store, key, keys[key], options)) {
        changed = true;
      }
    }
  }

  store.changed = changed;
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
