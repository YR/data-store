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
   *  - {Object} handlers
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

    DEFAULT_HANDLED_METHODS.forEach(this.registerHandledMethod, this);
    if (options.handlers) this.registerHandlers(options.handlers);

    this.bootstrap(data || {});
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

    // const scopedMethod = (key, ...args) => this[privateMethodName](keys.join(namespace, key), ...args);

    // this._handlers[privateMethodName][namespace] = { handler, scopedMethod };
  }

  /**
   * Route 'privateMethodName' to appropriate handler
   * depending on passed 'key' (args[0])
   * @param {String} privateMethodName
   * @param {*} args
   * @returns {Object|null}
   */
  _route (privateMethodName, ...args) {
    let [key = '', ...rest] = args;

    if (!key) return this[privateMethodName](...args);

    if ('string' == typeof key) {
      if (key.charAt(0) == '/') key = key.slice(1);

      if (this._handlers[privateMethodName].length) {
        const handlers = this._handlers[privateMethodName].filter(({ handler, namespace }) => {
          // Will match if handler.namespace == ''
          return key.indexOf(namespace) == 0;
        });

        handlers.reduce((sequence, { handler, namespace }) => {
          return sequence.then(() => handler());
        }, Promise.resolve([]));
      }

      const namespace = keys.first(key);

      // Route to handler if it exists
      if (namespace && namespace in this._handlers[privateMethodName]) {
        const { handler, scopedMethod } = this._handlers[privateMethodName][namespace];

        return handler(this, scopedMethod, keys.slice(key, 1), ...rest);
      }
      return this[privateMethodName](key, ...rest);
    }

    // Batch (set, update, load, etc)
    if (isPlainObject(key)) {
      for (const k in key) {
        this._route(privateMethodName, k, key[k], ...rest);
      }
      return;
    }

    // Array of keys (get)
    if (Array.isArray(key)) {
      return key.map((k) => {
        return this._route(privateMethodName, k, ...rest);
      });
    }
  }

  /**
   * Bootstrap from 'data'
   * @param {Object} data
   */
  bootstrap (data) {
    const options = { immutable: false };

    this.set(data, options);
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
   * Retrieve property value with `key`
   * @param {String} [key]
   * @returns {Object}
   */
  _get (key) {
    // Return all if no key specified
    if (!key) return this._data;

    const value = property.get(this._data, key);

    // Check expiry
    // if (Array.isArray(value)) {
    //   value.forEach(checkExpiry);
    // } else {
    //   checkExpiry(value);
    // }

    return value;
  }

  /**
   * Store prop 'key' with 'value'
   * @param {String} key
   * @param {Object} value
   * @param {Object} [options]
   *  - {Boolean} immutable
   *  - {Boolean} reference
   *  - {Boolean} merge
   * @returns {null}
   */
  _set (key, value, options) {
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
        const newData = property.set(this._data, key, value, options);

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

      // Prune from storage
      this._unpersist(key);

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
    if (this.isRootKey(key)) key = key.slice(1);

    // Handle batch
    if (isPlainObject(key)) {
      for (const k in key) {
        this.setSerialisable(k, value);
      }
    }

    this._serialisable[key] = value;
  }

  /**
   * Destroy instance
   */
  destroy () {
    // this.abort();

    // Destroy cursors
    for (const key in this._cursors) {
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
    if (key) return this._serialise(key, this._get(key));
    return this._serialise(null, this._data);
  }

  /**
   * Retrieve serialisable 'data'
   * @param {String} key
   * @param {Object} data
   * @returns {Object}
   */
  _serialise (key, data) {
    // Add data props
    if (isPlainObject(data)) {
      let obj = {};
      let keyChain;

      for (const prop in data) {
        keyChain = key
          ? `${key}/${prop}`
          : prop;

        if (this._serialisable[keyChain] !== false) {
          if (isPlainObject(data[prop])) {
            obj[prop] = this._serialise(keyChain, data[prop]);
          } else if ('object' == typeof data[prop] && 'toJSON' in data[prop]) {
            obj[prop] = data[prop].toJSON();
          } else {
            obj[prop] = data[prop];
          }
        }
      }

      return obj;
    }

    return (this._serialisable[key] !== false)
      ? data
      : null;
  }
}