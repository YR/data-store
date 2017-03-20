'use strict';

var keys = require('@yr/keys');

module.exports = function () {
  /**
   * Constructor
   * @param {String} key
   * @param {DataStore} dataStore
   */
  function DataStoreCursor(key, dataStore) {
    babelHelpers.classCallCheck(this, DataStoreCursor);

    this.dataStore = dataStore;
    this.key = key;
    this.trigger = dataStore.trigger.bind(dataStore);
  }

  /**
   * Retrieve value stored at 'key'
   * Empty 'key' returns all data
   * Array of keys returns array of values
   * @param {String|Array} [key]
   * @returns {*}
   */


  DataStoreCursor.prototype.get = function get(key) {
    var _this = this;

    var fixKey = function fixKey(key) {
      // Prefix with cursor key if not root
      return !_this._isRootKey(key) ? keys.join(_this.key, key) : key;
    };

    // Handle empty key (set value at cursor root)
    if (!key) {
      key = this.key;
    }
    // Handle array of keys
    key = Array.isArray(key) ? key.map(fixKey) : fixKey(key);

    return this.dataStore.get(key);
  };

  /**
   * Retrieve an instance reference at 'key' to a subset of data
   * @param {String} key
   * @returns {DataStoreCursor}
   */


  DataStoreCursor.prototype.createCursor = function createCursor(key) {
    return this.dataStore.createCursor(keys.join(this.key, key));
  };

  /**
   * Destroy instance
   */


  DataStoreCursor.prototype.destroy = function destroy() {
    this.dataStore = null;
    this.trigger = null;
  };

  /**
   * Determine if 'key' is global
   * @param {String} key
   * @returns {Boolean}
   */


  DataStoreCursor.prototype._isRootKey = function _isRootKey(key) {
    return key ? key.charAt(0) == '/' : false;
  };

  return DataStoreCursor;
}();