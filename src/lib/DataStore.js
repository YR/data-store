/**
 * A clever data object
 * https://github.com/yr/data-store
 * @copyright Yr
 * @license MIT
 */

'use strict';

const Cursor = require('./cursor');
const Debug = require('debug');
const Emitter = require('eventemitter3');
const get = require('./methods/get');
const isPlainObject = require('is-plain-obj');
const remove = require('./methods/remove');
const set = require('./methods/set');
const update = require('./methods/update');

const HANDLED_METHODS = {
  destroy: [destroy, []],
  get: [get, ['key']],
  reset: [reset, ['data']],
  remove: [remove, ['key']],
  set: [set, ['key', 'value', 'options']],
  update: [update, ['key', 'value', 'options', '...args']]
};
const REFERENCE_KEY = '__ref';

let uid = 0;

module.exports = class DataStore extends Emitter {
  /**
   * Constructor
   * @param {String} [id]
   * @param {Object} [data]
   * @param {Object} [options]
   *  - {Array} handlers
   *  - {Boolean} isWritable
   *  - {Object} serialisableKeys
   */
  constructor (id, data, options = {}) {
    super();

    this.REFERENCE_KEY = REFERENCE_KEY;

    this.debug = Debug('yr:data' + (id ? ':' + id : ''));
    this.destroyed = false;
    this.id = id || `store${++uid}`;
    this.isWritable = 'isWritable' in options ? options.isWritable : true;

    this._cursors = {};
    this._data = {};
    this._handledMethods = {};
    this._handlers = {};
    this._serialisableKeys = options.serialisableKeys || {};

    for (const methodName in HANDLED_METHODS) {
      this.registerHandledMethod(methodName, ...HANDLED_METHODS[methodName]);
    }
    if (options.handlers) this.registerMethodHandlers(options.handlers);

    this.reset(data || {});
  }

  /**
   * Register handled method with 'methodName'
   * @param {String} methodName
   * @param {Function} fn
   * @param {Array} signature
   */
  registerHandledMethod (methodName, fn, signature) {
    if (this._handledMethods[methodName]) return;

    if (!this._handlers[methodName]) this._handlers[methodName] = [];
    // Partially apply arguments for routing
    this._handledMethods[methodName] = this._routeHandledMethod.bind(this, fn.bind(this, this), signature, this._handlers[methodName]);
  }

  /**
   * Bulk register 'handlers'
   * @param {Object} handlers
   */
  registerMethodHandlers (handlers) {
    for (const methodName in handlers) {
      handlers[methodName].forEach(({ handler, match }) => {
        this.registerMethodHandler(methodName, match, handler);
      });
    }
  }

  /**
   * Register 'handler' for 'methodName' with 'match'
   * @param {String} methodName
   * @param {RegExp} match
   * @param {Function} handler
   */
  registerMethodHandler (methodName, match, handler) {
    this._handlers[methodName].push({ handler, match });
  }

  /**
   * Route 'fn' through 'handlers'
   * @param {Function} fn
   * @param {Array} signature
   * @param {Object} handlers
   * @param {*} args
   * @returns {Object|null}
   */
  _routeHandledMethod (fn, signature, handlers, ...args) {
    const isKeyed = signature[0] == 'key';
    let [key, ...rest] = args;

    if (isKeyed && key && key.charAt(0) == '/') key = key.slice(1);

    // Defer to handlers
    if (handlers && handlers.length) {
      const matchingHandlers = handlers.filter(({ match }) => !isKeyed || this.isMatchKey(key, match));
      let context = getHandlerContext(signature, args);

      for (let i = 0, n = matchingHandlers.length; i < n; i++) {
        const returnValue = matchingHandlers[i].handler(this, context);

        // Abort on first return value
        if (returnValue !== undefined) return returnValue;
        if (i == n - 1) {
          // Handlers can potentially re-batch keys, so unbatch
          return unbatchKeyedFunctionCall(fn, ...applyHandlerContext(signature, context));
        }
      }
    }

    return fn(key, ...rest);
  }

  /**
   * Retrieve property value with `key`
   * @param {String} [key]
   * @returns {Object}
   */
  get (key) {
    return unbatchKeyedFunctionCall(this._handledMethods.get, key);
  }

  /**
   * Store prop 'key' with 'value'
   * Returns stored value
   * @param {String} key
   * @param {*} value
   * @param {Object} [options]
   *  - {Boolean} immutable
   *  - {Boolean} reference
   *  - {Boolean} merge
   * @returns {*}
   */
  set (key, value, options) {
    if (!this.isWritable || !key) return;
    return unbatchKeyedFunctionCall(this._handledMethods.set, key, value, options);
  }

  /**
   * Store prop 'key' with 'value', notifying listeners of change
   * Allows passing of arbitrary additional args to listeners
   * @param {String} key
   * @param {Object} value
   * @param {Object} options
   *  - {Boolean} reference
   *  - {Boolean} merge
   */
  update (key, value, options, ...args) {
    if (!this.isWritable || !key) return;
    unbatchKeyedFunctionCall(this._handledMethods.update, key, value, options, ...args);
  }

  /**
   * Remove 'key'
   * @param {String} key
   */
  remove (key) {
    unbatchKeyedFunctionCall(this._handledMethods.remove, key);
  }

  /**
   * Reset underlying 'data'
   * @param {Object} data
   */
  reset (data) {
    this._handledMethods.reset(data);
  }

  /**
   * Destroy instance
   */
  destroy () {
    this._handledMethods.destroy();
  }

  /**
   * Determine if 'key' refers to a global property
   * @param {String} key
   * @returns {Boolean}
   */
  isRootKey (key) {
    return key ? (key.charAt(0) == '/') : false;
  }

  /**
   * Determine if 'key' matches 'match'
   * @param {String} key
   * @param {RegExp} match
   * @returns {Boolean}
   */
  isMatchKey (key, match) {
    // Treat no match as match all
    if (!match) return true;
    if (match instanceof RegExp) return match.test(key);
    return false;
  }

  /**
   * Retrieve global version of 'key'
   * @param {String} key
   * @returns {String}
   */
  getRootKey (key = '') {
    if (!this.isRootKey(key)) key = `/${key}`;
    return key;
  }

  /**
   * Retrieve an instance reference at 'key' to a subset of data
   * @param {String} key
   * @returns {DataStore}
   */
  createCursor (key) {
    key = this.getRootKey(key);

    let cursor = this._cursors[key];

    // Create and store
    if (!cursor) {
      cursor = Cursor.create(key, this);
      this._cursors[key] = cursor;
    }

    return cursor;
  }

  /**
   * Store serialisability of 'key'
   * @param {String} key
   * @param {Boolean} value
   */
  setSerialisableKey (key, value) {
    if (key.charAt(0) == '/') key = key.slice(1);

    // Handle batch
    if (isPlainObject(key)) {
      for (const k in key) {
        this.setSerialisableKey(k, value);
      }
      return;
    }

    this._serialisableKeys[key] = value;
  }

  /**
   * Dump all data, optionally stringified
   * @param {Boolean} stringify
   * @returns {Object|String}
   */
  dump (stringify) {
    let obj = {};

    for (const prop in this._data) {
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
  }

  /**
   * Prepare for serialisation
   * @param {String} [key]
   * @returns {Object}
   */
  toJSON (key) {
    if (key) return serialise(key, get(this, key), this._serialisableKeys);
    return serialise(null, this._data, this._serialisableKeys);
  }
};

/**
 * Unbatch potentially batched 'key'
 * @param {Function} fn
 * @param {String|Array|Object} [key]
 * @param {*} [args]
 * @returns {*}
 */
function unbatchKeyedFunctionCall (fn, key, ...args) {
  if (!key || 'string' == typeof key) return fn(key, ...args);
  // Array of keys
  if (Array.isArray(key)) return key.map((k) => fn(k, ...args));
  // Object of key:value
  if (isPlainObject(key)) {
    for (const k in key) {
      fn(k, key[k], ...args);
    }
    return;
  }
}

/**
 * Retrieve context object for 'signature' and 'args'
 * @param {Array} signature
 * @param {Array} args
 * @returns {Object}
 */
function getHandlerContext (signature, args) {
  let context = {};

  for (let i = 0, n = signature.length; i < n; i++) {
    const prop = signature[i];

    if (prop.indexOf('...') == 0) {
      prop = prop.slice(3);
      context[prop] = args.slice(i);
    } else {
      context[prop] = args[i];
    }
  }

  return context;
}

/**
 * Convert 'context' for 'signature' to array of args
 * @param {Array} signature
 * @param {Object} context
 * @returns {Array}
 */
function applyHandlerContext (signature, context) {
  let args = [];

  for (let i = 0, n = signature.length; i < n; i++) {
    const prop = signature[i];

    if (prop.indexOf('...') == 0) {
      prop = prop.slice(3);
      args.push(...context[prop]);
    } else {
      args.push(context[prop]);
    }
  }

  return args;
}

/**
 * Reset underlying 'data'
 * @param {DataStore} store
 * @param {Object} data
 */
function reset (store, data) {
  store.debug('reset');
  store._data = data;
}

/**
 * Destroy instance
 * @param {DataStore} store
 */
function destroy (store) {
  // Destroy cursors
  for (const key in store._cursors) {
    store._cursors[key].destroy();
  }
  store.destroyed = true;
  store._cursors = {};
  store._data = {};
  store._handlers = {};
  store._serialisableKeys = {};
  store.removeAllListeners();
}

/**
 * Retrieve serialisable 'data'
 * @param {String} key
 * @param {Object} data
 * @param {Object} config
 * @returns {Object}
 */
function serialise (key, data, config) {
  if (isPlainObject(data)) {
    let obj = {};
    let keyChain;

    for (const prop in data) {
      keyChain = key
        ? `${key}/${prop}`
        : prop;

      if (config[keyChain] !== false) {
        if (isPlainObject(data[prop])) {
          obj[prop] = serialise(keyChain, data[prop], config);
        } else if ('object' == typeof data[prop] && 'toJSON' in data[prop]) {
          obj[prop] = data[prop].toJSON();
        } else {
          obj[prop] = data[prop];
        }
      }
    }

    return obj;
  }

  return (config[key] !== false)
    ? data
    : null;
}