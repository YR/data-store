/**
 * A clever data object
 * https://github.com/yr/data-store
 * @copyright Yr
 * @license MIT
 */

'use strict';

const assign = require('object-assign');
const clock = require('@yr/clock');
const Cursor = require('./lib/cursor');
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
const DEFAULT_HANDLED_METHODS = [
  'bootstrap',
  'destroy',
  'get',
  'set',
  'unset',
  'update'
];

let uid = 0;

/**
 * Instance factory
 * @param {String} [id]
 * @param {Object} [data]
 * @param {Object} [options]
 * @returns {DataStore}
 */
exports.create = function create (id, data, options) {
  return new DataStore(id, data, options);
};

class DataStore extends Emitter {
  /**
   * Constructor
   * @param {String} [id]
   * @param {Object} [data]
   * @param {Object} [options]
   *  - {Array} handlers
   *  - {Object} serialisable
   *  - {Boolean} writable
   */
  constructor (id, data, options = {}) {
    super();

    this.debug = Debug('yr:data' + (id ? ':' + id : ''));
    this.destroyed = false;
    this.id = id || `store${++uid}`;
    this.writable = 'writable' in options ? options.writable : true;

    this._cursors = {};
    this._data = {};
    this._handlers = {};
    this._serialisable = options.serialisable || {};

    DEFAULT_HANDLED_METHODS.forEach((methodName) => {
      this.registerHandledMethod(methodName);
    });
    if (options.handlers) {
      options.handlers.forEach(({ method, namespace, handler }) => {
        this.registerHandler(method, namespace, handler);
      });
    }

    this.bootstrap('', data || {});
  }

  /**
   * Register 'fn' as 'methodName'
   * @param {String} methodName
   * @param {Function} [fn]
   */
  registerHandledMethod (methodName, fn) {
    const privateMethodName = `_${methodName}`;

    fn = fn || this[privateMethodName];
    if (!fn) return;

    this[methodName] = this._route.bind(this, privateMethodName);
    this[privateMethodName] = fn.bind(this);
  }

  /**
   * Register 'handler' for 'methodName' and 'namespace'
   * @param {String} methodName
   * @param {String} namespace
   * @param {Function} handler
   */
  registerHandler (methodName, namespace, handler) {
    const privateMethodName = `_${methodName}`;

    if (!this._handlers[privateMethodName]) this._handlers[privateMethodName] = [];
    this._handlers[privateMethodName].push({ handler, namespace });
  }

  /**
   * Route 'privateMethodName' to appropriate handler
   * depending on passed 'key' (args[0])
   * @param {String} privateMethodName
   * @param {*} args
   * @returns {Object|null}
   */
  _route (privateMethodName, ...args) {
    let [key, ...rest] = args;

    if (key == null) return this[privateMethodName](key, ...rest);

    if ('string' == typeof key) {
      if (key.charAt(0) == '/') key = key.slice(1);

      // Defer to handlers
      if (this._handlers[privateMethodName] && this._handlers[privateMethodName].length) {
        return this._handlers[privateMethodName]
          .filter(({ namespace }) => {
            // Will match if handler.namespace == ''
            return key.indexOf(namespace) == 0;
          })
          // Execute handlers in sequence
          .reduce((value, { handler, namespace }) => {
            const namespaceLength = keys.length(namespace);

            // Pass new value to next handler
            if (value !== null) rest[0] = value;

            // handler(store, method, originalKey, key, ...rest)
            const handlerValue = handler(this, this[privateMethodName], key, keys.slice(key, namespaceLength), ...rest);

            return handlerValue !== undefined ? handlerValue : value;
          }, null);
      }

      return this[privateMethodName](key, ...rest);
    }

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
   * Bootstrap from 'data'
   * @param {String} key
   * @param {Object} data
   */
  _bootstrap (key, data) {
    this._set(key, data, { immutable: false });
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
    if (!this.writable) return;

    options = assign({}, DEFAULT_SET_OPTIONS, options);

    // Handle replacing underlying data
    if ((key == null || key == '') && isPlainObject(value)) {
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
        this.emit('unset:' + key, null, oldValue);
        this.emit('unset', key, null, oldValue);
      });
    }
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

    if (this.writable) {
      // Resolve reference keys (use reference key to write to original object)
      const parent = this.get(keys.slice(key, 0, -1));

      if (parent && parent.__ref) key = keys.join(parent.__ref, keys.last(key));

      this.debug('update %s', key);
      const oldValue = this.get(key);
      // TODO: bail if no oldValue?

      options.immutable = true;
      this.set(key, value, options);

      // Delay to prevent race condition
      clock.immediate(() => {
        this.emit('update:' + key, value, oldValue, options, ...args);
        this.emit('update', key, value, oldValue, options, ...args);
      });
    }
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
    this._serialisable = {};
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
  setSerialisable (key, value) {
    if (key.charAt(0) == '/') key = key.slice(1);

    // Handle batch
    if (isPlainObject(key)) {
      for (const k in key) {
        this.setSerialisable(k, value);
      }
      return;
    }

    this._serialisable[key] = value;
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
    if (key) return serialise(key, this._get(key), this._serialisable);
    return serialise(null, this._data, this._serialisable);
  }
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