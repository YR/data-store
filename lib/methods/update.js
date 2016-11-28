'use strict';

var clock = require('@yr/clock');
var get = require('./get');
var isPlainObject = require('is-plain-obj');

/**
 * Store 'value' at 'key', notifying listeners of change
 * Allows passing of arbitrary additional args to listeners
 * Hash of 'key:value' pairs batches changes
 * @param {DataStore} store
 * @param {String} key
 * @param {Object} value
 * @param {Object} [options]
 *  - {Boolean} merge
 * @returns {null}
 */
module.exports = function update(store, key, value, options) {
  if (!key) return;

  options = options || {};

  for (var _len = arguments.length, args = Array(_len > 4 ? _len - 4 : 0), _key = 4; _key < _len; _key++) {
    args[_key - 4] = arguments[_key];
  }

  if ('string' == typeof key) return doUpdate.apply(undefined, [store, key, value, options].concat(args));
  if (isPlainObject(key)) {
    for (var k in key) {
      doUpdate.apply(undefined, [store, k, key[k], options].concat(args));
    }
  }
};

/**
 * Store 'value' at 'key', notifying listeners of change
 * Allows passing of arbitrary additional args to listeners
 * @param {DataStore} store
 * @param {String} key
 * @param {Object} value
 * @param {Object} [options]
 *  - {Boolean} merge
 */
function doUpdate(store, key, value, options) {
  for (var _len2 = arguments.length, args = Array(_len2 > 4 ? _len2 - 4 : 0), _key2 = 4; _key2 < _len2; _key2++) {
    args[_key2 - 4] = arguments[_key2];
  }

  if (key.charAt(0) == '/') key = key.slice(1);

  store.debug('update %s', key);

  var oldValue = get(store, key);
  // TODO: bail if no oldValue?

  // Remove if setting to 'null'
  // Normally would want to enforce direct use of 'remove()',
  // but cursors only have access to 'update()', so handle it here.
  // Call via store to enable handling
  if (value == null) {
    store.remove(key);
  } else {
    store.set(key, value, options);
  }

  // Delay to prevent potential race conditions
  clock.immediate(function () {
    store.emit.apply(store, ['update:' + key, value, oldValue, options].concat(args));
    store.emit.apply(store, ['update', key, value, oldValue, options].concat(args));
  });
}