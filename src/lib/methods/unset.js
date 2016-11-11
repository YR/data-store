'use strict';

const clock = require('@yr/clock');
const get = require('./get');
const keys = require('@yr/keys');

/**
 * Remove 'key'
 * @param {DataStore} store
 * @param {String} key
 */
module.exports = function unset (store, key) {
  // Remove prop from parent
  const length = keys.length(key);
  const k = (length == 1) ? key : keys.last(key);
  const data = (length == 1) ? store._data : get(store, keys.slice(key, 0, -1));

  // Only remove existing (prevent recursive trap)
  if (data && k in data) {
    const oldValue = data[k];

    store.debug('unset "%s"', key);
    delete data[k];

    // Delay to prevent race condition
    clock.immediate(() => {
      store.emit(`unset:${key}`, null, oldValue);
      store.emit('unset', key, null, oldValue);
    });
  }
};