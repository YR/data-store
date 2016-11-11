'use strict';

const assign = require('object-assign');
const isPlainObject = require('is-plain-obj');
const property = require('@yr/property');
const runtime = require('@yr/runtime');

const DEFAULT_OPTIONS = {
  // Browser immutable by default
  immutable: runtime.isBrowser,
  serialisable: true,
  merge: true
};

/**
 * Store prop 'key' with 'value'
 * Returns stored value
 * @param {DataStore} store
 * @param {String} key
 * @param {*} value
 * @param {Object} [options]
 *  - {Boolean} immutable
 *  - {Boolean} reference
 *  - {Boolean} merge
 * @returns {*}
 */
module.exports = function set (store, key, value, options) {
  options = assign({}, DEFAULT_OPTIONS, options);

  // TODO: check if value already has reference and track
  // Write reference key
  if (options.reference && isPlainObject(value)) value[store.REFERENCE_KEY] = store.getRootKey(key);

  if (options.immutable) {
    // Returns same if no change
    const newData = property.set(store._data, key, value, options);

    if (newData !== store._data) {
      store._data = newData;
    } else {
      store.debug('WARNING no change after set "%s', key);
    }
  } else {
    property.set(store._data, key, value, options);
  }

  return value;
};