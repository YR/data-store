/**
 * A clever data object
 * https://github.com/yr/data-store
 * @copyright Yr
 * @license MIT
 */

'use strict';

var agent = require('@yr/agent');
var assign = require('object-assign');
var clock = require('@yr/clock');
var Cursor = require('./lib/cursor');
var Debug = require('debug');
var Emitter = require('eventemitter3');
var isPlainObject = require('is-plain-obj');
var keys = require('@yr/keys');
var property = require('@yr/property');
var runtime = require('@yr/runtime');
var time = require('@yr/time');

var DEFAULT_LATENCY = 10000;
var DEFAULT_LOAD_OPTIONS = {
  defaultExpiry: 600000,
  retry: 3,
  timeout: 5000
};
var DEFAULT_STORAGE_KEY_LENGTH = 2;
var DEFAULT_SET_OPTIONS = {
  // Browser immutable by default
  immutable: runtime.isBrowser,
  reload: false,
  serialisable: true,
  merge: true
};
var DELEGATED_METHODS = ['get', 'link', 'set', 'unset', 'update', 'load', 'reload', 'cancelReload', 'upgradeStorageData'];
var uid = 0;

/**
 * Instance factory
 * @param {String} [id]
 * @param {Object} [data]
 * @param {Object} [options]
 * @returns {DataStore}
 */
exports.create = function create(id, data, options) {
  return new DataStore(id, data, options);
};

var DataStore = function (_Emitter) {
  babelHelpers.inherits(DataStore, _Emitter);

  /**
   * Constructor
   * @param {String} [id]
   * @param {Object} [data]
   * @param {Object} [options]
   *  - handlers {Object} method:key
   *  - loading {Object}
   *    - defaultExpiry {Number}
   *    - namespaces {Array}
   *    - retry {Number}
   *    - timeout {Number}
   *  - serialisable {Object} key:Boolean
   *  - storage {Object}
   *    - keyLength {Number}
   *    - namespaces {Array}
   *    - store {Object}
   *  - writable {Boolean}
   */

  function DataStore(id) {
    var data = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
    babelHelpers.classCallCheck(this, DataStore);

    var _this = babelHelpers.possibleConstructorReturn(this, _Emitter.call(this));

    _this.debug = Debug('yr:data' + (id ? ':' + id : ''));
    _this.destroyed = false;
    _this.id = id || 'store' + --uid;
    _this.writable = 'writable' in options ? options.writable : true;

    _this._cursors = {};
    _this._data = {};
    _this._handlers = options.handlers;
    _this._links = {};
    _this._loading = assign({
      active: {},
      namespaces: []
    }, DEFAULT_LOAD_OPTIONS, options.loading);
    _this._serialisable = options.serialisable || {};
    _this._storage = assign({
      keyLength: DEFAULT_STORAGE_KEY_LENGTH,
      namespaces: []
    }, options.storage);

    for (var _iterator = DELEGATED_METHODS, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var method = _ref;

      var privateMethod = '_' + method;

      _this[method] = _this._route.bind(_this, privateMethod);
      _this[privateMethod] = _this[privateMethod].bind(_this);
    }

    _this.bootstrap(_this._storage, data);
    return _this;
  }

  /**
   * Bootstrap from 'storage' and/or 'data'
   * @param {Object} storage
   * @param {Object} data
   */


  DataStore.prototype.bootstrap = function bootstrap(storage, data) {
    var _this2 = this;

    // Bootstrap data
    var bootstrapOptions = { immutable: false };

    if (storage.store) {
      (function () {
        var namespaces = storage.namespaces;
        var store = storage.store;

        var storageData = namespaces.reduce(function (accumulatedStorageData, namespace) {
          var storageData = store.get(namespace);

          // Handle version mismatch
          if (store.shouldUpgrade(namespace)) {
            for (var key in storageData) {
              store.remove(key);
              // Allow handlers to override
              storageData[key] = _this2.upgradeStorageData(key, storageData[key]);
            }
          }

          return assign(accumulatedStorageData, storageData);
        }, {});

        _this2.set(storageData, null, bootstrapOptions);
        // Flatten data to force key length
        data = property.flatten(data, _this2._storage.keyLength);
      })();
    }

    this.set(data, null, bootstrapOptions);
  };

  /**
   * Determine if 'key' refers to a global property
   * @param {String} key
   * @returns {Boolean}
   */


  DataStore.prototype.isRootKey = function isRootKey(key) {
    return key ? key.charAt(0) == '/' : false;
  };

  /**
   * Retrieve global version of 'key',
   * taking account of nested status.
   * @param {String} key
   * @returns {String}
   */


  DataStore.prototype.getRootKey = function getRootKey() {
    var key = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

    if (!this.isRootKey(key)) key = '/' + key;
    return key;
  };

  /**
   * Retrieve global version of 'key',
   * taking account of nested status.
   * @param {String} key
   * @returns {String}
   */


  DataStore.prototype.getStorageKey = function getStorageKey() {
    var key = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

    if (keys.length(key) > this._storage.keyLength) key = keys.slice(key, 0, this._storage.keyLength);
    return key;
  };

  /**
   * Route 'method' to appropriate handler
   * depending on passed 'key' (args[0])
   * @param {String} method
   * @returns {Object|null}
   */


  DataStore.prototype._route = function _route(method) {
    var _this3 = this;

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    var _args$ = args[0];
    var key = _args$ === undefined ? '' : _args$;
    var rest = args.slice(1);


    if (!key) return this[method].apply(this, args);

    if ('string' == typeof key) {
      if (key.charAt(0) == '/') key = key.slice(1);

      // Handle links
      if (key in this._links) key = this._links[key];

      var handler = keys.first(key);
      // Remove leading '_'
      var publicMethod = method.slice(1);

      // Route to handler if it exists
      if (handler && this._handlers && this._handlers[publicMethod] && handler in this._handlers[publicMethod]) {
        var _handlers$publicMetho;

        return (_handlers$publicMetho = this._handlers[publicMethod])[handler].apply(_handlers$publicMetho, [this, this[method], key].concat(rest));
      }
      return this[method].apply(this, [key].concat(rest));
    }

    // Batch (set, update, load, etc)
    if (isPlainObject(key)) {
      for (var k in key) {
        this._route.apply(this, [method, k, key[k]].concat(rest));
      }
      return;
    }

    // Array of keys (get, load)
    if (Array.isArray(key)) {
      return key.map(function (k) {
        return _this3._route.apply(_this3, [method, k].concat(rest));
      });
    }
  };

  /**
   * Retrieve property value with `key`
   * @param {String} [key]
   * @returns {Object}
   */


  DataStore.prototype._get = function _get(key) {
    // Return all if no key specified
    if (!key) return this._data;

    var value = property.get(key, this._data);

    // Check expiry
    if (Array.isArray(value)) {
      value.forEach(this._checkExpiry, this);
    } else {
      this._checkExpiry(value);
    }

    return value;
  };

  /**
   * Check if 'value' is expired
   * @param {Object} value
   */


  DataStore.prototype._checkExpiry = function _checkExpiry(value) {
    if (value && value.expires && time.now() > value.expires) {
      value.expired = true;
      value.expires = 0;
    }
  };

  /**
   * Store prop 'key' with 'value'
   * @param {String} key
   * @param {Object} value
   * @param {Object} [options]
   *  - immutable {Boolean}
   *  - reload {Boolean}
   *  - serialisable {Boolean}
   *  - merge {Boolean}
   * @returns {Object}
   */


  DataStore.prototype._set = function _set(key, value, options) {
    if (this.writable) {
      options = assign({}, DEFAULT_SET_OPTIONS, options);

      // Handle replacing underlying data
      if (key == null && isPlainObject(value)) {
        this.debug('reset');
        this._data = value;
        return;
      }
      // Handle removal of key
      if ('string' == typeof key && value == null) return this._unset(key);

      // Store serialisability
      if ('serialisable' in options) this.setSerialisable(key, options.serialisable);

      if (options.immutable) {
        // Returns null if no change
        var newData = property.set(key, value, this._data, options);

        if (newData !== null) {
          this._data = newData;
        } else {
          this.debug('WARNING no change after set "%s', key);
        }
      } else {
        property.set(key, value, this._data, options);
      }

      // Handle persistence
      // Allow options to override global config
      if ('persistent' in options && options.persistent || ~this._storage.namespaces.indexOf(key) || ~this._storage.namespaces.indexOf(keys.first(key))) {
        this._persist(key);
      }
    }

    return value;
  };

  /**
   * Remove 'key'
   * @param {String} key
   */


  DataStore.prototype._unset = function _unset(key) {
    var _this4 = this;

    // Remove prop from parent
    var length = keys.length(key);
    var k = length == 1 ? key : keys.last(key);
    var data = length == 1 ? this._data : this._get(keys.slice(key, 0, -1));

    // Only remove existing (prevent recursive trap)
    if (data && k in data) {
      (function () {
        var oldValue = data[k];

        _this4.debug('unset "%s"', key);
        delete data[k];
        // Prune dead links
        for (var toKey in _this4._links) {
          if (_this4._links[toKey] == key) {
            delete _this4._links[toKey];
          }
        }

        // Prune from storage
        if (~_this4._storage.namespaces.indexOf(key) || ~_this4._storage.namespaces.indexOf(keys.first(key))) {
          _this4._unpersist(key);
        }

        // Delay to prevent race condition (view render)
        clock.immediate(function () {
          _this4.emit('unset:' + key, null, oldValue);
          _this4.emit('unset', key, null, oldValue);
        });
      })();
    }
  };

  /**
   * Store prop 'key' with 'value', notifying listeners of change
   * Allows passing of arbitrary additional args to listeners
   * @param {String} key
   * @param {Object} value
   * @param {Object} options
   *  - immutable {Boolean}
   *  - reference {Boolean}
   *  - reload {Boolean}
   *  - serialisable {Boolean}
   *  - merge {Boolean}
   */


  DataStore.prototype._update = function _update(key, value) {
    for (var _len2 = arguments.length, args = Array(_len2 > 3 ? _len2 - 3 : 0), _key2 = 3; _key2 < _len2; _key2++) {
      args[_key2 - 3] = arguments[_key2];
    }

    var _this5 = this;

    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    if (this.writable) {
      (function () {
        _this5.debug('update %s', key);
        var oldValue = _this5.get(key);

        options.immutable = true;
        _this5.set(key, value, options);

        // Delay to prevent race condition
        clock.immediate(function () {
          _this5.emit.apply(_this5, ['update:' + key, value, oldValue, options].concat(args));
          _this5.emit.apply(_this5, ['update', key, value, oldValue, options].concat(args));
        });
      })();
    }
  };

  /**
   * Create link between 'fromKey' and 'toKey' keys
   * @param {String} fromKey
   * @param {String} toKey
   * @returns {Object}
   */


  DataStore.prototype._link = function _link(fromKey, toKey) {
    this._links[toKey] = fromKey;
    return this.get(fromKey);
  };

  /**
   * Load data from 'url' and store at 'key'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - abort {Boolean}
   *  - ignoreQuery {Boolean}
   *  - immutable {Boolean}
   *  - isReload {Boolean}
   *  - reference {Boolean}
   *  - reload {Boolean}
   *  - serialisable {Boolean}
   *  - merge {Boolean}
   * @returns {Response}
   */


  DataStore.prototype._load = function _load(key, url) {
    var _this6 = this;

    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var req = agent.get(url, options);

    if (!this._loading.active[key]) {
      this.debug('load %s from %s', key, url);

      this._loading.active[key] = true;

      req.timeout(this._loading.timeout).retry(this._loading.retry).end(function (err, res) {
        delete _this6._loading.active[key];

        if (err) {
          _this6.debug('remote resource "%s" not found at %s', key, url);
          // Remove if no longer found
          if (err.status < 500) _this6.unset(key);
        } else {
          (function () {
            _this6.debug('loaded "%s" in %dms', key, res.duration);

            var expires = 0;
            var value = void 0;

            // Guard against empty data
            if (res.body) {
              // Handle locations results separately
              var data = 'totalResults' in res.body ? res.body._embedded && res.body._embedded.location || [] : res.body;

              // Add expires header
              if (res.headers && 'expires' in res.headers) {
                expires = getExpiry(res.headers.expires, _this6._loading.defaultExpiry);

                if (Array.isArray(data)) {
                  data.forEach(function (d) {
                    if (isPlainObject(d)) {
                      d.expires = expires;
                      d.expired = false;
                    }
                  });
                } else {
                  data.expires = expires;
                  data.expired = false;
                }
              }
              value = _this6.set(key, data, options);
            }

            _this6.emit('load:' + key, value);
            _this6.emit('load', key, value);
            if (options.isReload) {
              _this6.emit('reload:' + key, value);
              _this6.emit('reload', key, value);
            }
          })();
        }

        // Allow options to override global config
        if ('reload' in options && options.reload || ~_this6._loading.namespaces.indexOf(key) || ~_this6._loading.namespaces.indexOf(keys.first(key))) {
          _this6._reload(key, url, options);
        }
      });
    }

    return req;
  };

  /**
   * Reload data from 'url'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - abort {Boolean}
   *  - ignoreQuery {Boolean}
   *  - immutable {Boolean}
   *  - isReload {Boolean}
   *  - reference {Boolean}
   *  - reload {Boolean}
   *  - serialisable {Boolean}
   *  - merge {Boolean}
   * @returns {null}
   */


  DataStore.prototype._reload = function _reload(key, url, options) {
    var _this7 = this;

    // Already expired
    if (this.get(key + '/expired')) return this.load(key, url, options);

    var duration = (this.get(key + '/expires') || 0) - time.now();

    // Guard against invalid duration (reload on error with old or missing expiry, etc)
    if (duration <= 0) duration = this._loading.defaultExpiry;

    options = assign({}, options, { isReload: true });
    this.debug('reloading "%s" in %dms', key, duration);
    clock.timeout(duration, function () {
      _this7.load(key, url, options);
    }, key);
  };

  /**
   * Cancel any existing reload timeouts
   * @param {String} key
   */


  DataStore.prototype._cancelReload = function _cancelReload(key) {
    clock.cancel(key);
  };

  /**
   * Save to local storage
   * @param {String} key
   */


  DataStore.prototype._persist = function _persist(key) {
    if (this._storage.store) {
      key = this.getStorageKey(key);
      this._storage.store.set(key, this.toJSON(key));
    }
  };

  /**
   * Remove from local storage
   * @param {String} key
   */


  DataStore.prototype._unpersist = function _unpersist(key) {
    if (this._storage.store) {
      this._storage.store.remove(this.getStorageKey(key));
    }
  };

  /**
   * Update storage when versions don't match
   * @param {String} key
   * @param {Object} value
   * @returns {Object}
   */


  DataStore.prototype._upgradeStorageData = function _upgradeStorageData(key, value) {
    // Delete as default
    return null;
  };

  /**
   * Retrieve an instance reference at 'key' to a subset of data
   * @param {String} key
   * @returns {DataStore}
   */


  DataStore.prototype.createCursor = function createCursor(key) {
    key = this.getRootKey(key);

    var cursor = this._cursors[key];

    // Create and store
    if (!cursor) {
      cursor = Cursor.create(key, this);
      this._cursors[key] = cursor;
    }

    return cursor;
  };

  /**
   * Store serialisability of 'key'
   * @param {String} key
   * @param {Boolean} value
   */


  DataStore.prototype.setSerialisable = function setSerialisable(key, value) {
    if (this.isRootKey(key)) key = key.slice(1);

    if (isPlainObject(key)) {
      for (var k in key) {
        this.setSerialisable(k, value);
      }
    }

    this._serialisable[key] = value;
  };

  /**
   * Destroy instance
   */


  DataStore.prototype.destroy = function destroy() {
    // Destroy cursors
    for (var key in this._cursors) {
      this._cursors[key].destroy();
    }
    this._cursors = {};
    this._data = {};
    this._handlers = {};
    this._links = {};
    this._loading = {};
    this._serialisable = {};
    this._storage = {};
    this.destroyed = true;
    this.removeAllListeners();
    clock.cancel(this.id);
  };

  /**
   * Dump all data, optionally stringified
   * @param {Boolean} stringify
   * @returns {Object|String}
   */


  DataStore.prototype.dump = function dump(stringify) {
    var obj = {};

    for (var prop in this._data) {
      obj[prop] = this._data[prop];
    }

    if (stringify) {
      try {
        return JSON.stringify(obj);
      } catch (err) {
        return '';
      }
    }

    return obj;
  };

  /**
   * Prepare for serialisation
   * @param {String} [key]
   * @returns {Object}
   */


  DataStore.prototype.toJSON = function toJSON(key) {
    if (key) return this._serialise(key, this.get(key));
    return this._serialise(null, this._data);
  };

  /**
   * Retrieve serialisable 'data'
   * @param {String} key
   * @param {Object} data
   * @returns {Object}
   */


  DataStore.prototype._serialise = function _serialise(key, data) {
    // Add data props
    if (isPlainObject(data)) {
      var obj = {};
      var keyChain = void 0;

      for (var prop in data) {
        keyChain = key ? key + '/' + prop : prop;

        if (this._serialisable[keyChain] !== false) {
          if (isPlainObject(data[prop])) {
            obj[prop] = this._serialise(keyChain, data[prop]);
          } else if (time.isTime(data[prop])) {
            obj[prop] = data[prop].toJSON();
          } else {
            obj[prop] = data[prop];
          }
        }
      }

      return obj;
    }

    return this._serialisable[key] !== false ? data : null;
  };

  return DataStore;
}(Emitter);

/**
 * Retrieve expiry from 'timestamp'
 * @param {Number} timestamp
 * @param {Number} minimum
 * @returns {Number}
 */


function getExpiry(timestamp, minimum) {
  // Add latency overhead to compensate for transmition time
  var expires = timestamp + DEFAULT_LATENCY;
  var now = time.now();

  return expires > now ? expires
  // Local clock is set incorrectly
  : now + minimum;
}