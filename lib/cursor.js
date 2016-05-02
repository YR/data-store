'use strict';

var keys = require('@yr/keys');

/**
 * Instance factory
 * @param {String} key
 * @param {DataStore} dataStore
 * @returns {DataStoreCursor}
 */
exports.create = function create(key, dataStore) {
  return new DataStoreCursor(key, dataStore);
};

var DataStoreCursor = function () {
  /**
   * Constructor
   * @param {String} key
   * @param {DataStore} dataStore
   */

  function DataStoreCursor(key, dataStore) {
    babelHelpers.classCallCheck(this, DataStoreCursor);

    this.dataStore = dataStore;
    this.key = key;
  }

  /**
   * Retrieve prop value with `key`
   * @param {String} [key]
   * @returns {Object}
   */


  DataStoreCursor.prototype.get = function get(key) {
    var _this = this;

    var fixKey = function fixKey(k) {
      return !_this.dataStore.isRootKey(k) ? keys.join(_this.key, k) : k;
    };

    // Handle empty key (set value at cursor root)
    if (!key) key = this.key;
    // Handle array of keys
    key = Array.isArray(key) ? key.map(fixKey) : fixKey(key);

    return this.dataStore.get(key);
  };

  /**
   * Store prop 'key' with 'value', notifying listeners of change
   * @param {String} key
   * @param {Object} value
   * @param {Object} [options]
   */


  DataStoreCursor.prototype.update = function update(key, value, options) {
    // Handle empty key (set value at cursor root)
    if (!key) key = this.key;

    // Convert to batch
    if ('string' == typeof key) {
      var _key;

      key = (_key = {}, _key[key] = value, _key);
    }

    // Fix keys
    for (var k in key) {
      if (!this.dataStore.isRootKey(k)) {
        key[keys.join(this.key, k)] = key[k];
        delete key[k];
      }
    }

    // Batch update
    this.dataStore.update(key, options);
  };

  /**
   * Retrieve an instance reference at 'key' to a subset of data
   * @param {String} key
   * @returns {DataStoreCursor}
   */


  DataStoreCursor.prototype.createCursor = function createCursor(key) {
    return new DataStoreCursor(keys.join(this.key, key), this.dataStore);
  };

  /**
   * Destroy instance
   */


  DataStoreCursor.prototype.destroy = function destroy() {
    this.dataStore = null;
  };

  return DataStoreCursor;
}();