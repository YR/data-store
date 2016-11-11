'use strict';

const clock = require('@yr/clock');
const keys = require('@yr/keys');
const set = require('./set');

/**
 * Store prop 'key' with 'value', notifying listeners of change
 * Allows passing of arbitrary additional args to listeners
 * @param {DataStore} store
 * @param {String} key
 * @param {Object} value
 * @param {Object} options
 *  - {Boolean} reference
 *  - {Boolean} merge
 */
module.exports = function update (store, key, value, options, ...args) {
  options = options || {};

  // TODO: move to set()
  // Resolve reference keys (use reference key to write to original object)
  const parent = store.get(keys.slice(key, 0, -1));

  if (parent && parent[store.REFERENCE_KEY]) key = keys.join(parent[store.REFERENCE_KEY], keys.last(key));

  store.debug('update %s', key);

  const oldValue = store.get(key);
  // TODO: bail if no oldValue?

  set(store, key, value, options);

  // Delay to prevent race condition
  clock.immediate(() => {
    store.emit(`update:${key}`, value, oldValue, options, ...args);
    store.emit('update', key, value, oldValue, options, ...args);
  });
};