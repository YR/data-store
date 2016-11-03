const DEFAULT_STORAGE_OPTIONS = {
  keyLength: 2
};

  /**
   * Bootstrap from 'storage' and/or 'data'
   * @param {Object} storage
   * @param {Object} data
   */
  bootstrap (storage, data) {
    const { keyLength, store } = storage;
    const options = { immutable: false };

    if (store) {
      let storageData = property.reshape(store.get('/'), 1);

      for (const namespace in storageData) {
        const value = storageData[namespace];

        // Handle version mismatch
        if (store.shouldUpgrade(namespace)) {
          // Clear all storage data for namespace
          for (const key in property.reshape(value, keyLength - 1)) {
            store.remove(keys.join(namespace, key));
          }
          // Allow handlers to override
          storageData[namespace] = this.upgradeStorageData(namespace, value);
        }
      }
      // TODO: persist
      this.set(storageData, options);
    }

    this.set(data, options);
  }

  /**
   * Retrieve storage keys for 'key'
   * based on storage.keyLength
   * @param {String} key
   * @returns {Array}
   */
  getStorageKeys (key = '') {
    const { keyLength } = this._storage;
    const length = keys.length(key);

    if (length < keyLength) {
      const parentData = property.reshape(this._get(keys.slice(key, 0, -1)), keyLength);

      return Object.keys(parentData)
        .filter((k) => k.indexOf(key) == 0)
        .map((k) => `/${k}`);
    }

    return [`/${keys.slice(key, 0, this._storage.keyLength)}`];
  }

  /**
   * Save to local storage
   * @param {String} key
   */
  _persist (key) {
    if (this._storage.store) {
      this.getStorageKeys(key).forEach((storageKey) => {
        // Storage keys are global, so trim
        this._storage.store.set(storageKey, this._get(storageKey.slice(1)));
      });
    }
  }

  /**
   * Remove from local storage
   * @param {String} key
   */
  _unpersist (key) {
    if (this._storage.store) {
      this.getStorageKeys(key).forEach((storageKey) => {
        this._storage.store.remove(storageKey);
      });
    }
  }

  /**
   * Update storage when versions don't match
   * @param {String} key
   * @param {Object} value
   * @returns {Object}
   */
  _upgradeStorageData (key, value) {
    // Delete as default
    return null;
  }

