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
var uuid = require('uuid');

var DEFAULT_LATENCY = 10000;
var DEFAULT_LOAD_OPTIONS = {
  expiry: 60000,
  retry: 2,
  timeout: 5000
};
var DEFAULT_SET_OPTIONS = {
  // Browser immutable by default
  immutable: runtime.isBrowser,
  reload: false,
  serialisable: true,
  merge: true
};
var DEFAULT_STORAGE_OPTIONS = {
  keyLength: 2
};
var DELEGATED_METHODS = ['fetch', 'get', 'load', 'persist', 'reload', 'set', 'unpersist', 'unset', 'update', 'upgradeStorageData'];

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
   *  - {Object} handlers method:key
   *  - {Object} loading
   *    - {Number} expiry
   *    - {Number} retry
   *    - {Number} timeout
   *  - {Object} serialisable key:Boolean
   *  - {Object} storage
   *    - {Number} keyLength
   *    - {Object} store
   *  - {Boolean} writable
   */
  function DataStore(id, data) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    babelHelpers.classCallCheck(this, DataStore);

    var _this = babelHelpers.possibleConstructorReturn(this, _Emitter.call(this));

    _this.debug = Debug('yr:data' + (id ? ':' + id : ''));
    _this.destroyed = false;
    _this.uid = uuid.v4();
    _this.id = id || 'store' + --_this.uid;
    _this.writable = 'writable' in options ? options.writable : true;

    _this._cursors = {};
    _this._data = {};
    _this._handlers = {};
    _this._loading = assign({}, DEFAULT_LOAD_OPTIONS, options.loading);
    _this._serialisable = options.serialisable || {};
    _this._storage = assign({}, DEFAULT_STORAGE_OPTIONS, options.storage);

    // Generate delegated methods
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
      // Setup handlers
      _this._handlers[privateMethod] = {};
      if (options.handlers && method in options.handlers) {
        for (var namespace in options.handlers[method]) {
          _this.registerHandler(method, namespace, options.handlers[method][namespace]);
        }
      }
    }

    _this.bootstrap(_this._storage, data || {});
    return _this;
  }

  /**
   * Bootstrap from 'storage' and/or 'data'
   * @param {Object} storage
   * @param {Object} data
   */


  DataStore.prototype.bootstrap = function bootstrap(storage, data) {
    var keyLength = storage.keyLength,
        store = storage.store;

    var options = { immutable: false };

    if (store) {
      var storageData = property.reshape(store.get('/'), 1);

      for (var namespace in storageData) {
        var value = storageData[namespace];

        // Handle version mismatch
        if (store.shouldUpgrade(namespace)) {
          // Clear all storage data for namespace
          for (var key in property.reshape(value, keyLength - 1)) {
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
   * Retrieve global version of 'key'
   * @param {String} key
   * @returns {String}
   */


  DataStore.prototype.getRootKey = function getRootKey() {
    var key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

    if (!this.isRootKey(key)) key = '/' + key;
    return key;
  };

  /**
   * Retrieve storage keys for 'key'
   * based on storage.keyLength
   * @param {String} key
   * @returns {Array}
   */


  DataStore.prototype.getStorageKeys = function getStorageKeys() {
    var key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    var keyLength = this._storage.keyLength;

    var length = keys.length(key);

    if (length < keyLength) {
      var parentData = property.reshape(this._get(keys.slice(key, 0, -1)), keyLength);

      return Object.keys(parentData).filter(function (k) {
        return k.indexOf(key) == 0;
      }).map(function (k) {
        return '/' + k;
      });
    }

    return ['/' + keys.slice(key, 0, this._storage.keyLength)];
  };

  /**
   * Register 'handler' for 'method' and 'namespace'
   * @param {String} method
   * @param {String} namespace
   * @param {Function} handler
   */


  DataStore.prototype.registerHandler = function registerHandler(method, namespace, handler) {
    var _this2 = this;

    var privateMethod = '_' + method;

    // Prevent overwriting
    if (!this._handlers[privateMethod][namespace]) {
      var scopedMethod = function scopedMethod(key) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        return _this2[privateMethod].apply(_this2, [keys.join(namespace, key)].concat(args));
      };

      this._handlers[privateMethod][namespace] = { handler: handler, scopedMethod: scopedMethod };
    }
  };

  /**
   * Route 'method' to appropriate handler
   * depending on passed 'key' (args[0])
   * @param {String} method
   * @param {*} args
   * @returns {Object|null}
   */


  DataStore.prototype._route = function _route(method) {
    var _this3 = this;

    for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      args[_key2 - 1] = arguments[_key2];
    }

    var _args$ = args[0],
        key = _args$ === undefined ? '' : _args$,
        rest = args.slice(1);


    if (!key) return this[method].apply(this, args);

    if ('string' == typeof key) {
      if (key.charAt(0) == '/') key = key.slice(1);

      var namespace = keys.first(key);

      // Route to handler if it exists
      if (namespace && namespace in this._handlers[method]) {
        var _handlers$method$name = this._handlers[method][namespace],
            handler = _handlers$method$name.handler,
            scopedMethod = _handlers$method$name.scopedMethod;


        return handler.apply(undefined, [this, scopedMethod, keys.slice(key, 1)].concat(rest));
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

    // Array of keys (get)
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

    var value = property.get(this._data, key);

    // Check expiry
    if (Array.isArray(value)) {
      value.forEach(checkExpiry);
    } else {
      checkExpiry(value);
    }

    return value;
  };

  /**
   * Store prop 'key' with 'value'
   * @param {String} key
   * @param {Object} value
   * @param {Object} [options]
   *  - {Boolean} immutable
   *  - {Boolean} reference
   *  - {Boolean} merge
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

      // Write reference key
      if (options.reference && isPlainObject(value)) value.__ref = this.getRootKey(key);

      if (options.immutable) {
        // Returns same if no change
        var newData = property.set(this._data, key, value, options);

        if (newData !== this._data) {
          this._data = newData;
        } else {
          this.debug('WARNING no change after set "%s', key);
        }
      } else {
        property.set(this._data, key, value, options);
      }

      // Handle persistence
      if ('persistent' in options && options.persistent) this._persist(key);
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

        // Prune from storage
        _this4._unpersist(key);

        // Delay to prevent race condition
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
   *  - {Boolean} reference
   *  - {Boolean} merge
   */


  DataStore.prototype._update = function _update(key, value, options) {
    for (var _len3 = arguments.length, args = Array(_len3 > 3 ? _len3 - 3 : 0), _key3 = 3; _key3 < _len3; _key3++) {
      args[_key3 - 3] = arguments[_key3];
    }

    var _this5 = this;

    options = options || {};

    if (this.writable) {
      (function () {
        // Resolve reference keys (use reference key to write to original object)
        var parent = _this5.get(keys.slice(key, 0, -1));

        if (parent && parent.__ref) key = keys.join(parent.__ref, keys.last(key));

        _this5.debug('update %s', key);
        var oldValue = _this5.get(key);
        // TODO: bail if no oldValue?

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
   * Load data from 'url' and store at 'key'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   * @returns {Response}
   */


  DataStore.prototype._load = function _load(key, url, options) {
    var _this6 = this;

    options = options || {};
    options.id = this.uid;

    this.debug('load %s from %s', key, url);

    return agent.get(url, options).timeout(this._loading.timeout).retry(this._loading.retry).then(function (res) {
      _this6.debug('loaded "%s" in %dms', key, res.duration);

      var value = void 0;

      // Guard against empty data
      if (res.body) {
        // TODO: make more generic with bodyParser option/handler
        // Handle locations results separately
        var data = 'totalResults' in res.body ? res.body._embedded && res.body._embedded.location || [] : res.body;

        // Add expires header
        if (res.headers && 'expires' in res.headers) {
          (function () {
            var expires = getExpiry(res.headers.expires, _this6._loading.expiry);

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
          })();
        }

        // Guard against parse errors during set()
        try {
          // Merge with existing
          options.merge = true;
          // All remote data stored with reference key
          options.reference = true;
          value = _this6.set(key, data, options);
        } catch (err) {
          _this6.debug('failed to store remote resource "%s" from %s', key, url);
          // TODO: update error message?
          err.status = 500;
          throw err;
        }
      }

      _this6.emit('load:' + key, value);
      _this6.emit('load', key, value);

      return res;
    }).catch(function (err) {
      _this6.debug('unable to load "%s" from %s', key, url);

      // Remove if not found or malformed (but not aborted)
      if (err.status < 499) _this6.remove(key);

      throw err;
    });
  };

  /**
   * Reload data from 'url'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   *  - {Boolean} reload
   */


  DataStore.prototype._reload = function _reload(key, url, options) {
    var _this7 = this;

    options = options || {};
    if (!options.reload) return;

    var reload = function reload() {
      _this7._load(key, url, options).then(function (res) {
        var value = _this7.get(key);

        _this7.emit('reload:' + key, value);
        _this7.emit('reload', key, value);
        _this7._reload(key, url, options);
      }).catch(function (err) {
        // TODO: error never logged
        _this7.debug('unable to reload "%s" from %s', key, url);
        _this7._reload(key, url, options);
      });
    };
    var value = this.get(key);
    // Guard against invalid duration
    var duration = Math.max((value && value.expires || 0) - Date.now(), this._loading.expiry);

    this.debug('reloading "%s" in %dms', key, duration);
    // Set custom id
    clock.timeout(duration, reload, url);
  };

  /**
   * Fetch data. If expired, load from 'url' and store at 'key'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   *  - {Boolean} reload
   *  - {Boolean} staleWhileRevalidate
   *  - {Boolean} staleWhileError
   * @returns {Promise}
   */


  DataStore.prototype._fetch = function _fetch(key, url, options) {
    var _this8 = this;

    options = options || {};

    this.debug('fetch %s from %s', key, url);

    // Set expired state
    var value = this.get(key);

    // Load if not found or expired
    if (!value || value.expired) {
      var load = new Promise(function (resolve, reject) {
        _this8._load(key, url, options).then(function (res) {
          // Schedule a reload
          _this8._reload(key, url, options);
          resolve({
            duration: res.duration,
            headers: res.headers,
            data: _this8.get(key)
          });
        }).catch(function (err) {
          // Schedule a reload if error
          if (err.status >= 500) _this8._reload(key, url, options);
          resolve({
            duration: 0,
            error: err,
            headers: { status: err.status },
            data: options.staleWhileError ? value : null
          });
        });
      });

      // Wait for load unless stale and staleWhileRevalidate
      if (!(value && options.staleWhileRevalidate)) return load;
    }

    // Schedule a reload
    this._reload(key, url, options);
    // Return data (possibly stale)
    return Promise.resolve({
      duration: 0,
      headers: { status: 200 },
      data: value
    });
  };

  /**
   * Save to local storage
   * @param {String} key
   */


  DataStore.prototype._persist = function _persist(key) {
    var _this9 = this;

    if (this._storage.store) {
      this.getStorageKeys(key).forEach(function (storageKey) {
        // Storage keys are global, so trim
        _this9._storage.store.set(storageKey, _this9._get(storageKey.slice(1)));
      });
    }
  };

  /**
   * Remove from local storage
   * @param {String} key
   */


  DataStore.prototype._unpersist = function _unpersist(key) {
    var _this10 = this;

    if (this._storage.store) {
      this.getStorageKeys(key).forEach(function (storageKey) {
        _this10._storage.store.remove(storageKey);
      });
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

    // Handle batch
    if (isPlainObject(key)) {
      for (var k in key) {
        this.setSerialisable(k, value);
      }
    }

    this._serialisable[key] = value;
  };

  /**
   * Abort all outstanding load/reload requests
   */


  DataStore.prototype.abort = function abort() {
    // TODO: return aborted urls and use in clock.cancel
    agent.abortAll(this.uid);
    // clock.cancelAll(this.id);
  };

  /**
   * Destroy instance
   */


  DataStore.prototype.destroy = function destroy() {
    this.abort();

    // Destroy cursors
    for (var key in this._cursors) {
      this._cursors[key].destroy();
    }
    this._cursors = {};
    this._data = {};
    this._handlers = {};
    this._loading = {};
    this._serialisable = {};
    this._storage = {};
    this.destroyed = true;
    this.removeAllListeners();
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
    if (key) return this._serialise(key, this._get(key));
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
 * Retrieve expiry from 'dateString'
 * @param {Number} dateString
 * @param {Number} minimum
 * @returns {Number}
 */


function getExpiry(dateString, minimum) {
  // Add latency overhead to compensate for transmission time
  var expires = +new Date(dateString) + DEFAULT_LATENCY;
  var now = Date.now();

  return expires > now ? expires
  // Local clock is set incorrectly
  : now + minimum;
}

/**
 * Check if 'value' is expired
 * @param {Object} value
 */
function checkExpiry(value) {
  if (value && isPlainObject(value) && value.expires && Date.now() > value.expires) {
    value.expired = true;
    value.expires = 0;
  }
}