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

/**
 * Store 'value' at 'key'
 * Hash of 'key:value' pairs batches changes
 * @param {DataStore} store
 * @param {String|Object} key
 * @param {*} value
 * @param {Object} [options]
 *  - {Boolean} immutable
 *  - {Boolean} merge
 * @returns {null}
 */
module.exports = function set(store, key, value, options) {
  if (!key) {
    return;
  }

  options = assign({}, DEFAULT_OPTIONS, options);

  if (typeof key === 'string') {
    return doSet(store, key, value, options);
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
};

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