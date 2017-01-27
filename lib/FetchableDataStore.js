'use strict';

var agent = require('@yr/agent');
var assign = require('object-assign');
var DataStore = require('./DataStore');
var fetch = require('./methods/fetch');
var isPlainObject = require('is-plain-obj');
var runtime = require('@yr/runtime');

var DEFAULT_LOAD_OPTIONS = {
  minExpiry: 60000,
  retry: 2,
  timeout: 5000
};
var GRACE = 10000;
var EXPIRES_KEY = '__expires';

module.exports = function (_DataStore) {
  babelHelpers.inherits(FetchableDataStore, _DataStore);

  /**
   * Constructor
   * @param {String} [id]
   * @param {Object} [data]
   * @param {Object} [options]
   *  - {Array} handlers
   *  - {Boolean} isWritable
   *  - {Object} serialisableKeys
   */
  function FetchableDataStore(id, data) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    babelHelpers.classCallCheck(this, FetchableDataStore);

    options.handledMethods = { fetch: [fetch, ['key', 'url', 'options']] };

    var _this = babelHelpers.possibleConstructorReturn(this, _DataStore.call(this, id, data, options));

    _this.GRACE = GRACE;
    _this.EXPIRES_KEY = EXPIRES_KEY;
    _this._fetchedKeys = {};
    return _this;
  }

  /**
   * Fetch data. If expired, load from 'url' and store at 'key'
   * Hash of 'key:url' pairs batches calls
   * @param {String|Object} key
   * @param {String} url
   * @param {Object} options
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   *  - {Number} minExpiry
   *  - {Number} retries
   *  - {Boolean} staleWhileRevalidate
   *  - {Boolean} staleIfError
   *  - {Number} timeout
   * @returns {Promise}
   */


  FetchableDataStore.prototype.fetch = function fetch(key, url, options) {
    var _this2 = this;

    if (!key) return;

    options = assign({}, DEFAULT_LOAD_OPTIONS, options);

    if ('string' == typeof key) {
      if (!this._fetchedKeys[key]) this._fetchedKeys[key] = true;
      return this._handledMethods.fetch(key, url, options);
    }

    if (isPlainObject(key)) {
      return Promise.all(Object.keys(key).map(function (k) {
        if (!_this2._fetchedKeys[k]) _this2._fetchedKeys[k] = true;
        return _this2._handledMethods.fetch(k, key[k], options);
      }));
    }
  };

  /**
   * Abort all outstanding load requests
   * @param {String|Array} [key]
   */


  FetchableDataStore.prototype.abort = function abort(key) {
    var _this3 = this;

    // Abort all
    if (!key) {
      // Too dangerous to abort on server in case more than one outstanding request
      if (runtime.isBrowser) agent.abortAll(function (req) {
        return _this3._fetchedKeys[req.__agentId];
      });
      this._fetchedKeys = {};
      return;
    }

    if ('string' == typeof key) key = [key];
    key.forEach(function (k) {
      if (runtime.isBrowser) agent.abortAll(k);
      delete _this3._fetchedKeys[k];
    });
  };

  /**
   * Destroy instance
   */


  FetchableDataStore.prototype.destroy = function destroy() {
    this.abort();
    _DataStore.prototype.destroy.call(this);
  };

  return FetchableDataStore;
}(DataStore);