'use strict';

var assign = require('object-assign');
var isPlainObject = require('is-plain-obj');
var property = require('@yr/property');
var runtime = require('@yr/runtime');

var DEFAULT_OPTIONS = {
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
  if (!key) {
    return;
  }

  options = assign({}, DEFAULT_OPTIONS, options);

  if (typeof key === 'string') {
    return void doSet(store, key, value, options);
  }
  if (isPlainObject(key)) {
    for (var k in key) {
      doSet(store, k, key[k], options);
    }
  }
  if (Array.isArray(key)) {
    for (var i = 0, n = key.length; i < n; i++) {
      var _key$i = key[i],
          _k = _key$i[0],
          v = _key$i[1],
          _key$i$ = _key$i[2],
          o = _key$i$ === undefined ? {} : _key$i$;


      doSet(store, _k, v, assign({}, DEFAULT_OPTIONS, o));
    }
  }
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
  options = assign({}, DEFAULT_OPTIONS, options);

  if (isPlainObject(keys)) {
    for (var key in keys) {
      doSet(store, key, keys[key], options);
    }
  }
}

/**
 * Store 'value' at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @param {*} value
 * @param {Object} [options]
 *  - {Boolean} immutable
 *  - {Boolean} merge
 */
function doSet(store, key, value, options) {
  // Resolve back to original key if referenced
  key = store._resolveRefKey(key);

  if (options.immutable) {
    // Returns same if no change
    var newData = property.set(store._data, key, value, options);

    if (newData !== store._data) {
      store._data = newData;
    } else {
      store.debug('WARNING no change after set "%s', key);
    }
    return;
  }

  property.set(store._data, key, value, options);
}