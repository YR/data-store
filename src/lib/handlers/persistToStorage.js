'use strict';

const get = require('../methods/get');
const keys = require('@yr/keys');
const property = require('@yr/property');

/**
 * Handler factory for persisting data to 'storage'
 * @param {RegExp} match
 * @param {Object} storage
 * @param {Number} storageKeyLength
 * @param {Function} upgradeStorageData
 * @returns {Object}
 */
module.exports = function handlerFactory (match, storage, storageKeyLength, upgradeStorageData) {
  return {
    reset: [{
      match: null,
      handler: function resetFromStorage (store, context) {
        let storageData = storage.get();

        for (const storageKey in storageData) {
          if (store.isMatchKey(storageKey, match)) {
            const storageValue = storageData[storageKey];

            if (storage.shouldUpgrade(storageKey)) {
              storageData[storageKey] = upgradeStorageData(storageKey, storageValue);
              storage.set(storageKey, storageData[storageKey]);
            }
          } else {
            delete storageData[storageKey];
          }
        }

        storageData = property.reshape(storageData, 1);
        // Deep merge
        for (const key in context.data) {
          property.set(storageData, key, context.data[key], { immutable: false, merge: true });
        }
        context.data = storageData;
      }
    }],
    set: [{
      match,
      handler: function persistToStorage (store, context) {
        getStorageKeys(store, context.key, storageKeyLength)
          .forEach((storageKey) => {
            storage.set(storageKey, context.value);
          });
      }
    }],
    remove: [{
      match,
      handler: function unpersistFromStorage (store, context) {
        getStorageKeys(store, context.key, storageKeyLength)
          .forEach((storageKey) => {
            storage.remove(storageKey);
          });
      }
    }]
  };
};

/**
 * Retrieve storage keys for 'key' based on 'storageKeyLength'
 * @param {DataStore} store
 * @param {String} key
 * @param {Number} storageKeyLength
 * @returns {Array}
 */
function getStorageKeys (store, key = '', storageKeyLength) {
  const length = keys.length(key);

  if (length < storageKeyLength) {
    const parentData = property.reshape(get(store, keys.slice(key, 0, -1)), storageKeyLength);

    return Object.keys(parentData)
      .filter((k) => k.indexOf(key) == 0);
  }

  return [keys.slice(key, 0, storageKeyLength)];
}