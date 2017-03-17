'use strict';

var assign = require('object-assign');
var Cursor = require('./DataStoreCursor');
var debugFactory = require('debug');
var Emitter = require('eventemitter3');
var _get = require('./methods/get');
var HandlerContext = require('./HandlerContext');
var isPlainObject = require('is-plain-obj');
var _reference = require('./methods/reference');
var set = require('./methods/set');
var _update = require('./methods/update');

var HANDLED_METHODS = {
  reset: [reset, ['data']],
  set: [set, ['key', 'value', 'options']]
};
var REF_KEY = '__ref:';

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

    _this.REF_KEY = REF_KEY;

    _this.debug = debugFactory('yr:data' + (id ? ':' + id : ''));
    _this.destroyed = false;
    _this.id = id || 'store' + ++uid;
    _this.isWritable = 'isWritable' in options ? options.isWritable : true;

    _this._cursors = {};
    _this._data = {};
    _this._handledMethods = {};
    _this._handlers = [];
    _this._serialisableKeys = options.serialisableKeys || {};

    _this.debug('created');

    // Allow sub classes to send in methods for registration
    var handledMethods = assign({}, HANDLED_METHODS, options.handledMethods || {});

    for (var methodName in handledMethods) {
      _this._registerHandledMethod.apply(_this, [methodName].concat(handledMethods[methodName]));
    }
    if (options.handlers) {
      _this.use(options.handlers);
    }

    _this.reset(data || {});
    return _this;
  }

  /**
   * Register 'handler' with optional key 'match'
   * Will handle every transaction if no 'match'
   * @param {RegExp|String|Array} [match]
   * @param {Function} handler
   */


  DataStore.prototype.use = function use(match, handler) {
    var _this2 = this;

    var matches = !Array.isArray(match) ? [[match, handler]] : match;

    var handlers = this._handlers.map(function (_ref) {
      var handler = _ref.handler;
      return handler;
    });

    matches.forEach(function (_ref2) {
      var match = _ref2[0],
          handler = _ref2[1];

      if (typeof match === 'function') {
        handler = match;
        match = '';
      }
      if (typeof handler === 'function') {
        _this2._handlers.push({ handler: handler, match: match });
      }
    });
  };

  /**
   * Unregister 'handler'
   * @param {RegExp|String|Array} [match]
   * @param {Function} handler
   */


  DataStore.prototype.unuse = function unuse(match, handler) {
    var matches = !Array.isArray(match) ? [[match, handler]] : match;

    for (var i = 0, n = matches.length; i < n; i++) {
      var _matches$i = matches[i],
          _match = _matches$i[0],
          _handler = _matches$i[1];

      var j = this._handlers.length;

      if (typeof _match === 'function') {
        _handler = _match;
      }

      while (--j >= 0) {
        if (this._handlers[j].handler === _handler) {
          this._handlers.splice(j, 1);
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
    var _this3 = this;

    if (!key || typeof key === 'string') {
      return _get(this, key);
    }
    if (Array.isArray(key)) {
      return key.map(function (k) {
        return _get(_this3, k);
      });
    }
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
    if (!this.isWritable || !key) {
      return;
    }
    if (typeof key === 'string') {
      return this._handledMethods.set(key, value, options);
    }
    if (isPlainObject(key)) {
      for (var k in key) {
        this._handledMethods.set(k, key[k], options);
      }
    }
    if (Array.isArray(key)) {
      for (var i = 0, n = key.length; i < n; i++) {
        var _handledMethods;

        (_handledMethods = this._handledMethods).set.apply(_handledMethods, key[i]);
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
    if (!this.isWritable || !key) {
      return;
    }

    for (var _len = arguments.length, args = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
      args[_key - 3] = arguments[_key];
    }

    _update.apply(undefined, [this, key, value, options].concat(args));
  };

  /**
   * Retrieve reference to value stored at 'key'
   * Array of keys returns array of references
   * @param {String|Array} [key]
   * @returns {String|Array}
   */


  DataStore.prototype.reference = function reference(key) {
    var _this4 = this;

    if (!key || typeof key === 'string') {
      return _reference(this, key);
    }
    if (Array.isArray(key)) {
      return key.map(function (k) {
        return _reference(_this4, k);
      });
    }
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
    this._handlers = [];
    this._serialisableKeys = {};
    this.removeAllListeners();
    this.debug('destroyed');
  };

  /**
   * Retrieve an instance reference at 'key' to a subset of data
   * @param {String} key
   * @returns {DataStore}
   */


  DataStore.prototype.createCursor = function createCursor(key) {
    key = this._resolveRefKey(key || '');
    // Prefix all keys with separator
    if (key && key.charAt(0) !== '/') {
      key = '/' + key;
    }

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
        this.setSerialisabilityOfKey(k, key[k]);
      }
      return;
    }

    if (key.charAt(0) === '/') {
      key = key.slice(1);
    }

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
    if (key) {
      return serialise(key, _get(this, key), this._serialisableKeys);
    }
    return serialise(null, this._data, this._serialisableKeys);
  };

  /**
   * Determine if 'key' matches 'match'
   * @param {String} key
   * @param {RegExp|String} match
   * @returns {Boolean}
   */


  DataStore.prototype._isMatchKey = function _isMatchKey(key, match) {
    // Treat no match as match all
    if (!match) {
      return true;
    }
    if (match instanceof RegExp) {
      return match.test(key);
    }
    if (typeof match === 'string') {
      return key.indexOf(match) === 0;
    }
    return false;
  };

  /**
   * Determine if 'value' is reference
   * @param {String} value
   * @returns {Boolean}
   */


  DataStore.prototype._isRefValue = function _isRefValue(value) {
    if (!value) {
      return false;
    }
    return typeof value === 'string' && value.indexOf(REF_KEY) === 0;
  };

  /**
   * Parse key from 'ref'
   * @param {String} ref
   * @returns {String}
   */


  DataStore.prototype._parseRefKey = function _parseRefKey(ref) {
    if (typeof ref !== 'string') {
      return ref;
    }
    return ref.slice(REF_KEY.length);
  };

  /**
   * Resolve 'key' to nearest __ref key
   * @param {String} key
   * @returns {String}
   */


  DataStore.prototype._resolveRefKey = function _resolveRefKey(key) {
    // Handle passing of __ref key
    if (this._isRefValue(key)) {
      return this._parseRefKey(key);
    }
    // Trim leading '/' (cursors)
    if (key.charAt(0) === '/') {
      key = key.slice(1);
    }

    var segs = key.split('/');
    var n = segs.length;
    var value = this._data;
    var idx = 0;
    var ref = key;

    // Walk data tree from root looking for nearest __ref
    while (idx < n) {
      if (value[segs[idx]] == null) {
        break;
      }
      value = value[segs[idx]];
      if (this._isRefValue(value)) {
        ref = this._parseRefKey(value);
        break;
      }
      idx++;
    }

    // Append relative keys
    if (ref !== key && idx < n - 1) {
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
    if (this._handledMethods[methodName]) {
      return;
    }

    // Partially apply arguments for routing
    this._handledMethods[methodName] = this._routeHandledMethod.bind(this, methodName, fn, signature);
    // Expose method if it doesn't exist
    if (!this[methodName]) {
      this[methodName] = this._handledMethods[methodName];
    }
  };

  /**
   * Route 'fn' through handlers
   * @param {String} methodName
   * @param {Function} fn
   * @param {Array} signature
   * @param {*} args
   * @returns {Object|null}
   */


  DataStore.prototype._routeHandledMethod = function _routeHandledMethod(methodName, fn, signature) {
    var isKeyed = signature[0] === 'key';

    for (var _len2 = arguments.length, args = Array(_len2 > 3 ? _len2 - 3 : 0), _key2 = 3; _key2 < _len2; _key2++) {
      args[_key2 - 3] = arguments[_key2];
    }

    var _args$ = args[0],
        key = _args$ === undefined ? '' : _args$,
        rest = args.slice(1);


    if (isKeyed && key && key.charAt(0) === '/') {
      key = key.slice(1);
    }

    // Defer to handlers
    if (this._handlers.length) {
      var context = new HandlerContext(this, methodName, signature, args);

      for (var i = 0, n = this._handlers.length; i < n; i++) {
        if (this._isMatchKey(key, this._handlers[i].match)) {
          this._handlers[i].handler(context);
        }
      }

      var value = fn.apply(undefined, [this].concat(context.toArguments()));

      context.destroy();
      return value;
    }

    return fn.apply(undefined, [this, key].concat(rest));
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
        } else if (value !== null && typeof value === 'object' && 'toJSON' in value) {
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