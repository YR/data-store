'use strict';

var agent = require('@yr/agent');
var DataStore = require('./DataStore');
var fetch = require('./methods/fetch');
var isPlainObject = require('is-plain-obj');
var runtime = require('@yr/runtime');

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

    options.handledMethods = {
      fetch: [fetch, ['key', 'url', 'options']]
    };

    var _this = babelHelpers.possibleConstructorReturn(this, _DataStore.call(this, id, data, options));

    _this.GRACE = GRACE;
    _this.EXPIRES_KEY = EXPIRES_KEY;
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

    if (!key) {
      return Promise.resolve({
        body: undefined,
        duration: 0,
        headers: { status: 500 },
        key: key
      });
    }

    if (typeof key === 'string') {
      return this._handledMethods.fetch(key, url, options);
    }
    if (isPlainObject(key)) {
      return Promise.all(Object.keys(key).sort().map(function (k) {
        return _this2._handledMethods.fetch(k, key[k], options);
      }));
    }
    if (Array.isArray(key)) {
      return Promise.all(key.map(function (args) {
        var _handledMethods;

        return (_handledMethods = _this2._handledMethods).fetch.apply(_handledMethods, args);
      }));
    }
  };

  /**
   * Abort all outstanding load requests
   * @param {String} [key]
   */


  FetchableDataStore.prototype.abort = function abort(key) {
    // Too dangerous to abort on server in case more than one outstanding request
    if (runtime.isBrowser) {
      agent.abortAll(key);
    }
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