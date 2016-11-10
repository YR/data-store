'use strict';

const assign = require('object-assign');
const property = require('@yr/property');

const DEFAULT_STORAGE_KEY_LENGTH = 2;

/**
 * Handler factory for persisting 'key' to localStorage
 * @returns {Object}
 */
module.exports = function handlerFactory (match, storage, storageKeyLength, upgradeStorageData) {
  return {
    reset: [{
      match: null,
      handler: function resetFromLocalStorage (store, context) {
        let storageData = storage.get();

        for (const storageKey in storageData) {
          if (store.isMatchKey(storageKey, match)) {
            const storageValue = storageData[storageKey];

            if (storage.shouldUpgrade(storageKey)) {
              store.remove(storageKey);
              storageData[storageKey] = upgradeStorageData(storageKey, storageValue);
            }
          } else {
            delete storageData[storageKey];
          }
        }

        // Merge
        context.data = assign(storageData, context.data);
      }
    }]
  };
};

