/**
 * A clever data object
 * https://github.com/yr/data-store
 * @copyright Yr
 * @license MIT
 */

'use strict';

const assign = require('object-assign');
const clock = require('@yr/clock');
const Cursor = require('./cursor');
const Debug = require('debug');
const Emitter = require('eventemitter3');
const isPlainObject = require('is-plain-obj');
const keys = require('@yr/keys');
const property = require('@yr/property');
const runtime = require('@yr/runtime');

const DEFAULT_SET_OPTIONS = {
  // Browser immutable by default
  immutable: runtime.isBrowser,
  serialisable: true,
  merge: true
};
const DEFAULT_HANDLED_METHODS = {
  // method:signature
  // In theory, this is possible to do dynamically with function.toString()
  // However, lot's of edge cases with es6 syntax, so do it manually
  destroy: [],
  get: ['key'],
  reset: ['data'],
  set: ['key', 'value', 'options'],
  unset: ['key'],
  update: ['key', 'value', 'options', '...args']
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

    this.debug = Debug('yr:data' + (id ? ':' + id : ''));
    this.destroyed = false;
    this.id = id || `store${++uid}`;
    this.isWritable = 'isWritable' in options ? options.isWritable : true;

    this._cursors = {};
    this._data = {};
    this._handlers = {};
    this._handledMethods = {};
    this._serialisableKeys = options.serialisableKeys || {};
    this._route = this._route.bind(this);

    for (const methodName in DEFAULT_HANDLED_METHODS) {
      this.registerHandledMethod(methodName, this[`_${methodName}`], DEFAULT_HANDLED_METHODS[methodName]);
    }
    if (options.handlers) this.registerHandlers(options.handlers);

    this.reset(data || {});
  }

  /**
   * Register 'fn' as 'methodName'
   * @param {String} methodName
   * @param {Function} fn
   * @param {Array} [signature]
   */
  registerHandledMethod (methodName, fn, signature = []) {
    if (this[methodName] || !fn) return;

    const privateMethodName = `_${methodName}`;

    this._handledMethods[privateMethodName] = signature;
    this[methodName] = this._route.bind(this, privateMethodName);
    this[privateMethodName] = fn.bind(this);
  }

  /**
   * Register 'handler' for 'methodName' and 'match'
   * @param {String} methodName
   * @param {String|RegExp} match
   * @param {Function} handler
   */
  registerHandler (methodName, match, handler) {
    const privateMethodName = `_${methodName}`;

    if (!this._handlers[privateMethodName]) this._handlers[privateMethodName] = [];
    this._handlers[privateMethodName].push({ handler, match });
  }

  /**
   * Bulk register 'handlers'
   * @param {Object} handlers
   */
  registerHandlers (handlers) {
    for (const methodName in handlers) {
      handlers[methodName].forEach(({ handler, match }) => {
        this.registerHandler(methodName, match, handler);
      });
    }
  }

  /**
   * Route 'privateMethodName' to appropriate handler, depending on passed 'key' (args[0])
   * @param {String} privateMethodName
   * @param {*} args
   * @returns {Object|null}
   */
  _route (privateMethodName, ...args) {
    const signature = this._handledMethods[privateMethodName];
    const isKeyedMethod = (signature[0] == 'key');
    let [key, ...rest] = args;

    if (!isKeyedMethod || !key || 'string' == typeof key) {
      if (isKeyedMethod && key && key.charAt(0) == '/') key = key.slice(1);

      // Defer to handlers
      if (this._handlers[privateMethodName] && this._handlers[privateMethodName].length) {
        const handlers = this._handlers[privateMethodName].filter(({ match }) => this.isMatchKey(key, match));
        let context = getHandlerContext(signature, args);

        for (let i = 0, n = handlers.length; i < n; i++) {
          const returnValue = handlers[i].handler(this, context);

          // Abort on first return value
          if (returnValue !== undefined) return returnValue;
          if (i == n - 1) {
            return handleBatchedCall(this[privateMethodName], isKeyedMethod, ...applyHandlerContext(signature, context));
          }
        }
      }

      return this[privateMethodName](key, ...rest);
    }

    handleBatchedCall(this._route, isKeyedMethod, args);

    // Object of key:value
    if (isPlainObject(key)) {
      for (const k in key) {
        this._route(privateMethodName, k, key[k], ...rest);
      }
      return;
    }

    // Array of keys
    if (Array.isArray(key)) {
      return key.map((k) => {
        return this._route(privateMethodName, k, ...rest);
      });
    }
  }

  /**
   * Retrieve property value with `key`
   * @param {String} [key]
   * @returns {Object}
   */
  _get (key) {
    // Return all if no key specified
    if (!key) return this._data;
    return property.get(this._data, key);
  }

  /**
   * Store prop 'key' with 'value'
   * @param {String} key
   * @param {*} value
   * @param {Object} [options]
   *  - {Boolean} immutable
   *  - {Boolean} reference
   *  - {Boolean} merge
   * @returns {*}
   */
  _set (key, value, options) {
    console.log(key, value, options)
    if (!this.isWritable || !key) return;

    options = assign({}, DEFAULT_SET_OPTIONS, options);

    // Write reference key
    if (options.reference && isPlainObject(value)) value[REFERENCE_KEY] = this.getRootKey(key);

    if (options.immutable) {
      // Returns same if no change
      const newData = property.set(this._data, key, value, options);

      if (newData !== this._data) {
        this._data = newData;
      } else {
        this.debug('WARNING no change after set "%s', key);
      }
    } else {
      property.set(this._data, key, value, options);
    }

    return value;
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
  _update (key, value, options, ...args) {
    options = options || {};

    if (this.isWritable) {
      // Resolve reference keys (use reference key to write to original object)
      const parent = this.get(keys.slice(key, 0, -1));

      if (parent && parent[REFERENCE_KEY]) key = keys.join(parent[REFERENCE_KEY], keys.last(key));

      this.debug('update %s', key);
      const oldValue = this.get(key);
      // TODO: bail if no oldValue?

      options.immutable = true;
      this.set(key, value, options);

      // Delay to prevent race condition
      clock.immediate(() => {
        this.emit(`update:${key}`, value, oldValue, options, ...args);
        this.emit('update', key, value, oldValue, options, ...args);
      });
    }
  }

  /**
   * Remove 'key'
   * @param {String} key
   */
  _unset (key) {
    // Remove prop from parent
    const length = keys.length(key);
    const k = (length == 1) ? key : keys.last(key);
    const data = (length == 1) ? this._data : this._get(keys.slice(key, 0, -1));

    // Only remove existing (prevent recursive trap)
    if (data && k in data) {
      const oldValue = data[k];

      this.debug('unset "%s"', key);
      delete data[k];

      // Delay to prevent race condition
      clock.immediate(() => {
        this.emit(`unset:${key}`, null, oldValue);
        this.emit('unset', key, null, oldValue);
      });
    }
  }

  /**
   * Reset underlying 'data'
   * @param {Object} data
   */
  _reset (data) {
    this.debug('reset');
    this._data = data;
  }

  /**
   * Destroy instance
   */
  _destroy () {
    // Destroy cursors
    for (const key in this._cursors) {
      this._cursors[key].destroy();
    }
    this.destroyed = true;
    this._cursors = {};
    this._data = {};
    this._handlers = {};
    this._serialisableKeys = {};
    this.removeAllListeners();
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
   * @param {String|RegExp} match
   * @returns {Boolean}
   */
  isMatchKey (key, match) {
    if (match instanceof RegExp) return match.test(key);
    if (key == null && !match) return true;
    // Will match if match == ''
    return key.indexOf(match) == 0;
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
    if (key) return serialise(key, this._get(key), this._serialisableKeys);
    return serialise(null, this._data, this._serialisableKeys);
  }
};

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