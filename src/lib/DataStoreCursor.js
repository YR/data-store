'use strict';

const keys = require('@yr/keys');

module.exports = class DataStoreCursor {
  /**
   * Constructor
   * @param {String} key
   * @param {DataStore} dataStore
   */
  constructor(key, dataStore) {
    this.dataStore = dataStore;
    this.key = key;
  }

  /**
   * Retrieve value stored at 'key'
   * Empty 'key' returns all data
   * Array of keys returns array of values
   * @param {String|Array} [key]
   * @returns {*}
   */
  get(key) {
    const fixKey = key => {
      // Prefix with cursor key if not root
      return !this._isRootKey(key) ? keys.join(this.key, key) : key;
    };

    // Handle empty key (set value at cursor root)
    if (!key) {
      key = this.key;
    }
    // Handle array of keys
    key = Array.isArray(key) ? key.map(fixKey) : fixKey(key);

    return this.dataStore.get(key);
  }

  /**
   * Store 'value' at 'key', notifying listeners of change
   * Allows passing of arbitrary additional args to listeners
   * Hash of 'key:value' pairs batches changes
   * @param {String|Object} key
   * @param {Object} value
   * @param {Object} [options]
   *  - {Boolean} merge
   */
  update(key, value, options, ...args) {
    // Handle empty key (set value at cursor root)
    if (!key) {
      key = this.key;
    }

    // Convert to batch
    if (typeof key === 'string') {
      key = { [key]: value };
    }

    // Fix keys (prefix with cursor key if not root)
    for (const k in key) {
      if (!this._isRootKey(k)) {
        key[keys.join(this.key, k)] = key[k];
        delete key[k];
      }
    }

    // Batch update
    this.dataStore.update(key, null, options, ...args);
  }

  /**
   * Retrieve an instance reference at 'key' to a subset of data
   * @param {String} key
   * @returns {DataStoreCursor}
   */
  createCursor(key) {
    return this.dataStore.createCursor(keys.join(this.key, key));
  }

  /**
   * Destroy instance
   */
  destroy() {
    this.dataStore = null;
  }

  /**
   * Determine if 'key' is global
   * @param {String} key
   * @returns {Boolean}
   */
  _isRootKey(key) {
    return key ? key.charAt(0) == '/' : false;
  }
};
