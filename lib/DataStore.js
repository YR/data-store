'use strict';

var assign = require('object-assign');
var Cursor = require('./DataStoreCursor');
var Debug = require('debug');
var Emitter = require('eventemitter3');
var get = require('./methods/get');
var HandlerContext = require('./HandlerContext');
var isPlainObject = require('is-plain-obj');
var _reference = require('./methods/reference');
var remove = require('./methods/remove');
var set = require('./methods/set');
var _update = require('./methods/update');

var HANDLED_METHODS = {
  get: [get, ['key']],
  reset: [reset, ['data']],
  remove: [remove, ['key']],
  set: [set, ['key', 'value', 'options']]
};

var uid = 0;

module.exports = function (_Emitter) {
  babelHelpers.inherits(DataStore, _Emitter);

  /**
   * Constructor
   * @param {String} [id]
   * @param {Object} [data]
   * @param {Object} [options]
   *  - {Object} handlers
   *  - {Boolean} isWritable
   *  - {Object} serialisableKeys
   */
  function DataStore(id, data) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    babelHelpers.classCallCheck(this, DataStore);

    var _this = babelHelpers.possibleConstructorReturn(this, _Emitter.call(this));

    _this.debug = Debug('yr:data' + (id ? ':' + id : ''));
    _this.destroyed = false;
    _this.id = id || 'store' + ++uid;
    _this.isWritable = 'isWritable' in options ? options.isWritable : true;

    _this._cursors = {};
    _this._data = {};
    _this._handledMethods = {};
    _this._handlers = {};
    _this._serialisableKeys = options.serialisableKeys || {};

    // Allow sub classes to send in methods for registration
    var handledMethods = assign({}, HANDLED_METHODS, options.handledMethods || {});

    for (var methodName in handledMethods) {
      _this._registerHandledMethod.apply(_this, [methodName].concat(handledMethods[methodName]));
    }
    if (options.handlers) _this.registerMethodHandler(options.handlers);

    _this.reset(data || {});
    return _this;
  }

  /**
   * Register 'handler' for 'methodName' with 'match'
   * @param {String|Array} methodName
   * @param {RegExp} [match]
   * @param {Function} [handler]
   * @returns {null}
   */


  DataStore.prototype.registerMethodHandler = function registerMethodHandler(methodName, match, handler) {
    var _this2 = this;

    // Handle bulk
    if (Array.isArray(methodName)) {
      return methodName.forEach(function (item) {
        _this2.registerMethodHandler.apply(_this2, item);
      });
    }

    if (!this._handlers[methodName]) throw Error(methodName + ' is not a recognised method for handling');
    this._handlers[methodName].push({ handler: handler, match: match });
  };

  /**
   * Unregister 'handler' for 'methodName'
   * @param {String|Array} methodName
   * @param {RegExp} [match]
   * @param {Function} [handler]
   * @returns {null}
   */


  DataStore.prototype.unregisterMethodHandler = function unregisterMethodHandler(methodName, match, handler) {
    var _this3 = this;

    // Handle bulk
    if (Array.isArray(methodName)) {
      return methodName.forEach(function (item) {
        _this3.unregisterMethodHandler.apply(_this3, item);
      });
    }

    if (this._handlers[methodName]) {
      var i = this._handlers[methodName].length;

      while (--i >= 0) {
        if (this._handlers[methodName][i].handler === handler) {
          this._handlers[methodName].splice(i, 1);
        }
      }
    }
  };

  /**
   * Retrieve value stored at 'key'
   * Empty 'key' returns all data
   * Array of keys returns array of values
   * @param {String|Array} [key]
   * @returns {*}
   */


  DataStore.prototype.get = function get(key) {
    var _this4 = this;

    if (!key || 'string' == typeof key) return this._handledMethods.get(key);
    if (Array.isArray(key)) return key.map(function (k) {
      return _this4._handledMethods.get(k);
    });
  };

  /**
   * Store 'value' at 'key'
   * Hash of 'key:value' pairs batches changes
   * @param {String} key
   * @param {*} value
   * @param {Object} [options]
   *  - {Boolean} immutable
   *  - {Boolean} merge
   * @returns {null}
   */


  DataStore.prototype.set = function set(key, value, options) {
    if (!this.isWritable || !key) return;
    if ('string' == typeof key) return this._handledMethods.set(key, value, options);
    if (isPlainObject(key)) {
      for (var k in key) {
        this._handledMethods.set(k, key[k], options);
      }
    }
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


  DataStore.prototype.update = function update(key, value, options) {
    if (!this.isWritable || !key) return;

    for (var _len = arguments.length, args = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
      args[_key - 3] = arguments[_key];
    }

    _update.apply(undefined, [this, key, value, options].concat(args));
  };

  /**
   * Remove 'key'
   * Array of keys batch removes values
   * @param {String} key
   * @returns {null}
   */


  DataStore.prototype.remove = function remove(key) {
    var _this5 = this;

    if (!this.isWritable || !key) return;
    if ('string' == typeof key) return this._handledMethods.remove(key);
    if (Array.isArray(key)) return key.map(function (k) {
      return _this5._handledMethods.remove(k);
    });
  };

  /**
   * Retrieve reference to value stored at 'key'
   * Array of keys returns array of references
   * @param {String|Array} [key]
   * @returns {String|Array}
   */


  DataStore.prototype.reference = function reference(key) {
    var _this6 = this;

    if (!key || 'string' == typeof key) return _reference(this, key);
    if (Array.isArray(key)) return key.map(function (k) {
      return _reference(_this6, k);
    });
  };

  /**
   * Reset underlying 'data'
   * @param {Object} data
   */


  DataStore.prototype.reset = function reset(data) {
    this._handledMethods.reset(data);
  };

  /**
   * Destroy instance
   */


  DataStore.prototype.destroy = function destroy() {
    // Destroy cursors
    for (var key in this._cursors) {
      this._cursors[key].destroy();
    }
    this.destroyed = true;
    this._cursors = {};
    this._data = {};
    this._handlers = {};
    this._serialisableKeys = {};
    this.removeAllListeners();
  };

  /**
   * Retrieve an instance reference at 'key' to a subset of data
   * @param {String} key
   * @returns {DataStore}
   */


  DataStore.prototype.createCursor = function createCursor(key) {
    key = this._resolveKeyRef(key || '');
    // Prefix all keys with separator
    if (key && key.charAt(0) != '/') key = '/' + key;

    var cursor = this._cursors[key];

    // Create and store
    if (!cursor) {
      cursor = new Cursor(key, this);
      this._cursors[key] = cursor;
    }

    return cursor;
  };

  /**
   * Store serialisability of 'key'
   * @param {String|Object} key
   * @param {Boolean} value
   */


  DataStore.prototype.setSerialisabilityOfKey = function setSerialisabilityOfKey(key, value) {
    // Handle batch
    if (isPlainObject(key)) {
      for (var k in key) {
        this.setSerialisabilityOfKey(k, value);
      }
      return;
    }

    if (key.charAt(0) == '/') key = key.slice(1);

    this._serialisableKeys[key] = value;
  };

  /**
   * Dump all data, optionally stringified
   * @param {Boolean} stringify
   * @returns {Object|String}
   */


  DataStore.prototype.dump = function dump(stringify) {
    var data = explode(this, this._data);

    if (stringify) {
      try {
        // Pretty print
        return JSON.stringify(data, null, 2);
      } catch (err) {
        return '';
      }
    }

    return data;
  };

  /**
   * Prepare for serialisation
   * @param {String} [key]
   * @returns {Object}
   */


  DataStore.prototype.toJSON = function toJSON(key) {
    if (key) return serialise(key, get(this, key), this._serialisableKeys);
    return serialise(null, this._data, this._serialisableKeys);
  };

  /**
   * Determine if 'key' matches 'match'
   * @param {String} key
   * @param {RegExp} match
   * @returns {Boolean}
   */


  DataStore.prototype._isMatchKey = function _isMatchKey(key, match) {
    // Treat no match as match all
    if (!match) return true;
    if (match instanceof RegExp) return match.test(key);
    return false;
  };

  /**
   * Determine if 'value' is reference
   * @param {String} value
   * @returns {Boolean}
   */


  DataStore.prototype._isRefValue = function _isRefValue(value) {
    if (!value) return false;
    return 'string' == typeof value && value.indexOf('__ref:') == 0;
  };

  /**
   * Parse key from 'ref'
   * @param {String} ref
   * @returns {String}
   */


  DataStore.prototype._parseRefKey = function _parseRefKey(ref) {
    if ('string' != typeof ref) return ref;
    return ref.slice(6);
  };

  /**
   * Resolve 'key' to nearest __ref key
   * @param {String} key
   * @returns {String}
   */


  DataStore.prototype._resolveKeyRef = function _resolveKeyRef(key) {
    var segs = key.split('/');
    var n = segs.length;
    var value = this._data;
    var idx = 0;
    var ref = key;

    // Walk data tree from root looking for nearest __ref
    while (idx < n) {
      if (value[segs[idx]] == null) break;
      value = value[segs[idx]];
      if (this._isRefValue(value)) {
        ref = this._parseRefKey(value);
        break;
      }
      idx++;
    }

    // Append relative keys
    if (ref != key && idx < n - 1) {
      ref += '/' + segs.slice(idx + 1).join('/');
    }

    return ref;
  };

  /**
   * Register handled method with 'methodName'
   * @param {String} methodName
   * @param {Function} fn
   * @param {Array} signature
   */


  DataStore.prototype._registerHandledMethod = function _registerHandledMethod(methodName, fn, signature) {
    if (this._handledMethods[methodName]) return;

    if (!this._handlers[methodName]) this._handlers[methodName] = [];
    // Partially apply arguments for routing
    this._handledMethods[methodName] = this._routeHandledMethod.bind(this, fn.bind(this, this), signature, this._handlers[methodName]);
    // Expose method if it doesn't exist
    if (!this[methodName]) this[methodName] = this._handledMethods[methodName];
  };

  /**
   * Route 'fn' through 'handlers'
   * @param {Function} fn
   * @param {Array} signature
   * @param {Object} handlers
   * @param {*} args
   * @returns {Object|null}
   */


  DataStore.prototype._routeHandledMethod = function _routeHandledMethod(fn, signature, handlers) {
    var _this7 = this;

    var isKeyed = signature[0] == 'key';

    for (var _len2 = arguments.length, args = Array(_len2 > 3 ? _len2 - 3 : 0), _key2 = 3; _key2 < _len2; _key2++) {
      args[_key2 - 3] = arguments[_key2];
    }

    var key = args[0],
        rest = args.slice(1);


    if (isKeyed && key && key.charAt(0) == '/') key = key.slice(1);

    // Defer to handlers
    if (handlers && handlers.length) {
      var matchingHandlers = handlers.filter(function (_ref) {
        var match = _ref.match;
        return !isKeyed || _this7._isMatchKey(key, match);
      });
      var context = new HandlerContext(this, signature, args);
      var returnValue = void 0;

      for (var i = 0, n = matchingHandlers.length; i < n; i++) {
        returnValue = matchingHandlers[i].handler(context);

        // Exit on first return value
        if (returnValue !== undefined) return returnValue;
      }
      returnValue = fn.apply(undefined, context.toArguments());
      context.destroy();
      return returnValue;
    }

    return fn.apply(undefined, [key].concat(rest));
  };

  return DataStore;
}(Emitter);

/**
 * Reset underlying 'data'
 * @param {DataStore} store
 * @param {Object} data
 */
function reset(store, data) {
  store.debug('reset');
  store._data = data;
}

/**
 * Retrieve serialisable 'data'
 * @param {String} key
 * @param {Object} data
 * @param {Object} config
 * @returns {Object}
 */
function serialise(key, data, config) {
  if (isPlainObject(data)) {
    var obj = {};

    for (var prop in data) {
      var keyChain = key ? key + '/' + prop : prop;
      var value = data[prop];

      if (config[keyChain] !== false) {
        if (isPlainObject(value)) {
          obj[prop] = serialise(keyChain, value, config);
        } else if (value !== null && 'object' == typeof value && 'toJSON' in value) {
          obj[prop] = value.toJSON();
        } else {
          obj[prop] = value;
        }
      }
    }

    return obj;
  }

  return config[key] !== false ? data : null;
}

/**
 * Resolve all nested references for 'data'
 * @param {DataStore} store
 * @param {Object} data
 * @returns {Object}
 */
function explode(store, data) {
  if (isPlainObject(data)) {
    var obj = {};

    for (var prop in data) {
      obj[prop] = explode(store, data[prop]);
    }
    return obj;
  } else if (Array.isArray(data)) {
    return data.map(function (value) {
      return explode(store, value);
    });
  } else if (store._isRefValue(data)) {
    return explode(store, store.get(store._parseRefKey(data)));
  }

  return data;
}