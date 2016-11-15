'use strict';

const clock = require('@yr/clock');
const get = require('./get');
const isPlainObject = require('is-plain-obj');

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
module.exports = function update (store, key, value, options, ...args) {
  if (!key) return;

  options = options || {};

  if ('string' == typeof key) return doUpdate(store, key, value, options, ...args);
  if (isPlainObject(key)) {
    for (const k in key) {
      doUpdate(store, k, key[k], options, ...args);
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
function doUpdate (store, key, value, options, ...args) {
  if (key.charAt(0) == '/') key = key.slice(1);

  store.debug('update %s', key);

  const oldValue = get(store, key);
  // TODO: bail if no oldValue?

  // Enable handling
  store.set(key, value, options);

  // Delay to prevent potential race conditions
  clock.immediate(() => {
    store.emit(`update:${key}`, value, oldValue, options, ...args);
    store.emit('update', key, value, oldValue, options, ...args);
  });
}