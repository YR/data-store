'use strict';

/**
 *
 */

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

var DEFAULT_EXPIRY = 600000;
var DEFAULT_LATENCY = 10000;
var DEFAULT_LOAD_RETRY = 3;
var DEFAULT_LOAD_TIMEOUT = 5000;
var DEFAULT_SET_OPTIONS = {
  // Browser immutable by default
  immutable: runtime.isBrowser,
  reference: false,
  reload: false,
  serialisable: true,
  merge: true
};
var uid = 0;

var DataStore = function (_Emitter) {
  babelHelpers.inherits(DataStore, _Emitter);

  /**
   * Constructor
   * @param {String} [id]
   * @param {Object} [data]
   * @param {Object} [options]
   */

  function DataStore(id) {
    var data = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
    babelHelpers.classCallCheck(this, DataStore);

    var _this = babelHelpers.possibleConstructorReturn(this, _Emitter.call(this));

    _this.debug = Debug('yr:data' + (id ? ':' + id : ''));
    _this.destroyed = false;
    _this.id = id || 'store' + --uid;
    _this.isWritable = 'isWritable' in options ? options.isWritable : true;

    _this._cursors = {};
    _this._data = data;
    _this._delegates = options.delegates;
    _this._loading = [];
    _this._minExpiry = 'defaultExpiry' in options ? options.defaultExpiry : DEFAULT_EXPIRY;
    _this._retry = 'retry' in options ? options.retry : DEFAULT_LOAD_RETRY;
    _this._shouldReload = options.reload;
    _this._serialisable = options.serialisable || {};
    _this._storage = options.storage;
    _this._timeout = 'timeout' in options ? options.timeout : DEFAULT_LOAD_TIMEOUT;

    if (_this._delegates) {
      for (var method in _this._delegates) {
        _this[method] = _this._delegate.bind(_this, method);
      }
    }
    return _this;
  }

  DataStore.prototype._delegate = function _delegate(method) {};

  /*
    get
    set
    load
    reload
  
    bootstrap
    upgradeStorage
  */

  /**
   * Bootstrap from storage
   */


  DataStore.prototype.bootstrap = function bootstrap() {
    if (this._storage) {
      var storageId = this.getStorageKey();
      var data = this._storage.get(storageId);
      var options = {
        immutable: false,
        persistent: false
      };

      // Invalidate on version mismatch
      if (this._storage.shouldUpgrade(storageId)) {
        data = this._upgradeStorage(data);
        options.persistent = true;
      }

      for (var key in data) {
        // Remove prefix
        var k = keys.slice(key, 1);

        // Treat as batch if no key
        this.set(!k ? null : k, data[key], options);
      }
    }
  };

  /**
   * Retrieve property value with `key`
   * @param {String} [key]
   * @returns {Object}
   */


  DataStore.prototype.get = function get(key) {
    // Return all if no key specified
    if (!key) return this._data;

    var value = property.get(key, this._data);

    // Check expiry
    if (value && value.expires && time.now() > value.expires) {
      value.expired = true;
      value.expires = 0;
      this.debug('WARNING data has expired "%s"', value.__ref || key);
    }

    return value;
  };

  /**
   * Store prop 'key' with 'value'
   * @param {String} key
   * @param {Object} value
   * @param {Object} [options]
   * @returns {Object}
   */


  DataStore.prototype.set = function set(key, value, options) {
    if (this.isWritable) {
      options = assign({}, DEFAULT_SET_OPTIONS, options);

      // Handle replacing underlying data store
      if (key == null && isPlainObject(value)) {
        this.debug('reset');
        this._data = value;
        return;
      }

      // Handle removal of key
      if ('string' == typeof key && value == null) return this._remove(key);

      // Store serialisability if not serialisable
      if (!options.serialisable) {
        this.setSerialisable(key, options.serialisable);
      }

      // Write reference key
      if (options.reference && isPlainObject(value)) value.__ref = this.getRootKey(key);
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
      if (options.persistent) {
        // Store parent object if setting simple value
        if (keys.length(key) > 1) key = keys.first(key);
        this._persist(key);
      }
    }

    return value;
  };

  /**
   * Remove 'key'
   * @param {String} key
   */


  DataStore.prototype.unset = function unset(key) {
    var _this2 = this;

    // Remove prop from parent
    var length = keys.length(key);
    var k = length == 1 ? key : keys.last(key);
    var data = length == 1 ? this._data : this.get(keys.slice(key, 0, -1));

    // Only remove existing props
    // Prevent recursive trap
    if (data && k in data) {
      (function () {
        var oldValue = data[k];

        _this2.debug('remove "%s"', key);
        delete data[k];
        _this2._unpersist(key);

        // Delay to prevent race condition (view render)
        clock.immediate(function () {
          _this2.emit('remove:' + key, null, oldValue);
          _this2.emit('remove', key, null, oldValue);
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
   */


  DataStore.prototype.update = function update(key, value) {
    for (var _len = arguments.length, args = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
      args[_key - 3] = arguments[_key];
    }

    var _this3 = this;

    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    if (this.isWritable) {
      (function () {
        // Handle reference keys
        // Use reference key to write to original object
        var parent = _this3.get(keys.slice(key, 0, -1));

        if (parent && parent.__ref) key = keys.join(parent.__ref, keys.last(key));

        _this3.debug('update %s', key);
        var oldValue = _this3.get(key);

        options.immutable = true;
        _this3.set(key, value, options);

        // Delay to prevent race condition (view render)
        clock.immediate(function () {
          _this3.emit.apply(_this3, ['update:' + key, value, oldValue, options].concat(args));
          _this3.emit.apply(_this3, ['update', key, value, oldValue, options].concat(args));
        });
      })();
    }
  };

  /**
   * Load data from 'url' and store at 'key'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   * @returns {Response}
   */


  DataStore.prototype.load = function load(key, url) {
    var _this4 = this;

    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var req = agent.get(url, options);

    if (! ~this._loading.indexOf(key)) {
      this.debug('load %s from %s', key, url);

      this._loading.push(key);

      req.timeout(this._timeout).retry(this._retry).end(function (err, res) {
        _this4._loading.splice(_this4._loading.indexOf(key), 1);

        if (err) {
          _this4.debug('remote resource "%s" not found at %s', key, url);
          // Remove if no longer found
          if (err.status < 500) _this4.remove(key);
        } else {
          (function () {
            _this4.debug('loaded "%s" in %dms', key, res.duration);

            var expires = 0;
            var value = void 0;

            // Guard against empty data
            if (res.body) {
              // Handle locations results separately
              var data = 'totalResults' in res.body ? res.body._embedded && res.body._embedded.location || [] : res.body;

              // Add expires header
              if (res.headers && 'expires' in res.headers) {
                expires = getExpiry(res.headers.expires, _this4._minExpiry);

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
              options.merge = true;
              value = _this4.set(key, data, options);
            }

            _this4.emit('load:' + key, value);
            _this4.emit('load', key, value);
            if (options.isReload) {
              _this4.emit('reload:' + key, value);
              _this4.emit('reload', key, value);
            }
          })();
        }

        // Allow options to override global config
        if ('reload' in options ? options.reload : _this4._shouldReload) _this4._reload(key, url, options);
      });
    }

    return req;
  };

  /**
   * Reload data from 'url'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   * @returns {null}
   */


  DataStore.prototype.reload = function reload(key, url, options) {
    var _this5 = this;

    // Already expired
    if (this.get(key + '/expired')) return this.load(key, url, options);

    var duration = (this.get(key + '/expires') || 0) - time.now();

    // Guard against invalid duration (reload on error with old or missing expiry, etc)
    if (duration <= 0) duration = this._minExpiry;

    options = assign({}, options, { isReload: true });
    this.debug('reloading "%s" in %dms', key, duration);
    clock.timeout(duration, function () {
      _this5.load(key, url, options);
      // Set custom id
      // Only one key will be reloaded at a time,
      // and any outstanding timers will be cancelled
    }, this.id);
  };

  /**
   * Cancel any existing reload timeouts
   */


  DataStore.prototype.cancelReload = function cancelReload() {
    clock.cancel(this.id);
  };

  /**
   * Save to local storage
   * @param {String} key
   */


  DataStore.prototype.persist = function persist(key) {
    if (this._storage) {
      this._storage.set(this.getStorageKey(key), this.toJSON(key));
    }
  };

  /**
   * Remove from local storage
   * @param {String} key
   */


  DataStore.prototype.unpersist = function unpersist(key) {
    if (this._storage) {
      this._storage.remove(this.getStorageKey(key));
    }
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

    if (!this.isRootKey(key)) {
      key = '/' + key;
    }
    return key;
  };

  /**
   * Determine if 'key' refers to a global property
   * @param {String} key
   * @returns {Boolean}
   */


  DataStore.prototype.isStorageKey = function isStorageKey(key) {
    var leading = this.rootkey == '/' ?
    // Non-nested stores must have a key based on id
    keys.join(this.rootkey, this.id) : this.rootkey;

    return key ? key.indexOf(leading.slice(1)) == 0 : false;
  };

  /**
   * Retrieve storage version of 'key',
   * taking account of nested status.
   * @param {String} key
   * @returns {String}
   */


  DataStore.prototype.getStorageKey = function getStorageKey(key) {
    if (!this.isStorageKey(key)) {
      key = this.rootkey == '/' ?
      // Make sure non-nested stores have a key based on id
      keys.join(this.rootkey, this.id, key) : keys.join(this.rootkey, key);
      // Remove leading '/'
      key = key.slice(1);
    }
    return key;
  };

  /**
   * Update storage when versions don't match
   * @param {Object} data
   * @param {Object} options
   * @returns {Object}
   */


  DataStore.prototype._upgradeStorage = function _upgradeStorage(data, options) {
    for (var key in data) {
      this._storage.remove(key);
    }
    return data;
  };

  /**
   * Retrieve store for 'key'
   * @param {String} key
   * @returns {DataStore}
   */


  DataStore.prototype._getStoreForKey = function _getStoreForKey(key) {
    var context = this;

    key = key || '';
    if (!key) return [context, key];

    if (key.charAt(0) == '/') {
      context = this._root;
      key = key.slice(1);
    }

    var first = keys.first(key);

    if (context._children[first]) return context._children[first]._getStoreForKey(keys.slice(key, 1));
    return [context, key];
  };

  /**
   * Delegate 'method' to appropriate store (root, current, or child)
   * depending on passed 'key' (args[0])
   * @param {String} method
   * @returns {Object|null}
   */
  // _delegate (method, ...args) {
  //   const [key] = args;

  //   if (!key) return this[method](...args);

  //   if ('string' == typeof key) {
  //     const [target, targetKey] = this._getStoreForKey(key);

  //     // Delegate to target if no resolved key
  //     if (targetKey === '') {
  //       args = args.slice(1);
  //       return target._delegate(method, ...args);
  //     }

  //     // Overwrite key
  //     args[0] = targetKey;
  //     return target[method](...args);
  //   }

  //   // Handle batch (set, update, load, etc)
  //   if (isPlainObject(key)) {
  //     const add = args.slice(1);

  //     for (const k in key) {
  //       this._delegate.apply(this, add.length ? [method, k, key[k]].concat(add) : [method, k, key[k]]);
  //     }
  //     return;
  //   }

  //   // Handle array (get)
  //   if (Array.isArray(key)) {
  //     return key.map((k) => {
  //       // 'get' only accepts 1 arg, so no need to handle additional here
  //       return this._delegate.call(this, method, k);
  //     });
  //   }
  // }

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
    this._loading = [];
    this._serialisable = {};
    this._storage = null;
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

module.exports = DataStore;

/**
 * Instance factory
 * @param {String} [id]
 * @param {Object} [data]
 * @param {Object} [options]
 * @returns {DataStore}
 */
module.exports.create = function create(id, data, options) {
  return new DataStore(id, data, options);
};