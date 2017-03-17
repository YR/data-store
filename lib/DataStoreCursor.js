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
   * Store 'value' at 'key', notifying listeners of change
   * Allows passing of arbitrary additional args to listeners
   * Hash of 'key:value' pairs batches changes
   * @param {String|Object} key
   * @param {Object} value
   * @param {Object} [options]
   *  - {Boolean} merge
   */


  DataStoreCursor.prototype.update = function update(key, value, options) {
    var _dataStore;

    // Handle empty key (set value at cursor root)
    if (!key) {
      key = this.key;
    }

    // Convert to batch
    if (typeof key === 'string') {
      var _key2;

      key = (_key2 = {}, _key2[key] = value, _key2);
    }

    // Fix keys (prefix with cursor key if not root)
    for (var k in key) {
      if (!this._isRootKey(k)) {
        key[keys.join(this.key, k)] = key[k];
        delete key[k];
      }
    }

    // Batch update

    for (var _len = arguments.length, args = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
      args[_key - 3] = arguments[_key];
    }

    (_dataStore = this.dataStore).update.apply(_dataStore, [key, null, options].concat(args));
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