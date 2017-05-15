'use strict';

const { join } = require('@yr/keys');

module.exports = class DataStoreCursor {
  /**
   * Constructor
   * @param {String} key
   * @param {DataStore} dataStore
   */
  constructor(key, dataStore) {
    this.dataStore = dataStore;
    this.key = key;
    this.trigger = dataStore.trigger.bind(dataStore);
  }

  /**
   * Retrieve value stored at 'key'
   * Empty 'key' returns all data
   * @param {String} [key]
   * @returns {*}
   */
  get(key) {
    // Handle empty key (set value at cursor root)
    if (!key) {
      key = this.key;
    }

    // Prefix with cursor key if not root
    key = !this._isRootKey(key) ? join(this.key, key) : key;

    return this.dataStore.get(key);
  }

  /**
   * Batch version of 'get()'
   * Accepts array of 'keys'
   * @param {Array} keys
   * @returns {Array}
   */
  getAll(keys) {
    return keys.map(key => {
      // Prefix with cursor key if not root
      key = !this._isRootKey(key) ? join(this.key, key) : key;

      return this.dataStore.get(key);
    });
  }

  /**
   * Retrieve an instance reference at 'key' to a subset of data
   * @param {String} key
   * @returns {DataStoreCursor}
   */
  createCursor(key) {
    return this.dataStore.createCursor(join(this.key, key));
  }

  /**
   * Destroy instance
   */
  destroy() {
    this.dataStore = null;
    this.trigger = null;
  }

  /**
   * Determine if 'key' is global
   * @param {String} key
   * @returns {Boolean}
   */
  _isRootKey(key) {
    return key ? key.charAt(0) === '/' || this.dataStore._isRefValue(key) : false;
  }
};
