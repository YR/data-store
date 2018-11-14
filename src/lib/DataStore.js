'use strict';

const debugFactory = require('debug');
const get = require('./methods/get');

const isPlainObject = require('is-plain-obj');

const set = require('./methods/set');

const HANDLED_METHODS = {
  reset: [reset, ['data']],
  set: [set, ['key', 'value', 'options']]
};

let uid = 0;

module.exports = class DataStore {
  /**
   * Constructor
   * @param {String} [id]
   * @param {Object} [data]
   * @param {Object} [options]
   *  - {Object} handlers
   *  - {Boolean} isWritable
   *  - {Object} serialisableKeys
   */
  constructor(id, data, options = {}) {


    this.changed = false;
    this.debug = debugFactory('yr:data' + (id ? ':' + id : ''));
    this.destroyed = false;
    this.id = id || `store${++uid}`;

    this._data = {};
    this._getCache = {};
    // Allow sub classes to send in methods for registration
    this._handledMethods = Object.assign({}, HANDLED_METHODS, options.handledMethods || {});
    this._handlers = [];
    this._isWritable = 'isWritable' in options ? options.isWritable : true;
    this._serialisableKeys = options.serialisableKeys || {};

    this.debug('created');

    if (options.handlers) {
      this.useHandler(options.handlers);
    }

    this.reset(data || {});
  }


  /**
   * Set writeable state
   * @param {Boolean} value
   */
  setWriteable(value) {
    if (value !== this._isWritable) {
      this._isWritable = value;
      // Clear cache when toggling.
      // It would be more efficient to selectively invalidate keys,
      // but dangerous due to immutability and refs.
      this._getCache = {};
    }
  }

  /**
   * Retrieve value stored at 'key'
   * Empty/null/undefined 'key' returns all data
   * @param {String} [key]
   * @param {Object} [options]
   *  - {Boolean} resolveReferences
   * @returns {*}
   */
  get(key, options) {
    return get(this, key, options);
  }

  /**
   * Batch version of 'get()'
   * Accepts array of 'keys'
   * @param {Array} keys
   * @param {Object} [options]
   *  - {Boolean} resolveReferences
   * @returns {Array}
   */
  getAll(keys, options) {
    return keys.map(key => get(this, key, options));
  }

  /**
   * Store 'value' at 'key'
   * @param {String} key
   * @param {*} value
   * @param {Object} [options]
   *  - {Boolean} immutable
   *  - {Boolean} merge
   * @returns {void}
   */
  set(key, value, options) {
    if (!this._isWritable) {
      throw Error(`DataStore ${this.id} is not writeable`);
    }

    this.changed = this._routeHandledMethod('set', key, value, options);
  }

  /**
   * Batch version of 'set()'
   * Accepts hash of key/value pairs
   * @param {Object} keys
   * @param {Object} [options]
   *  - {Boolean} immutable
   *  - {Boolean} merge
   * @returns {void}
   */
  setAll(keys, options) {
    if (!this._isWritable) {
      throw Error(`DataStore ${this.id} is not writeable`);
    }

    let changed = false;

    if (isPlainObject(keys)) {
      for (const key in keys) {
        if (this._routeHandledMethod('set', key, keys[key], options)) {
          changed = true;
        }
      }
    }

    this.changed = changed;
  }

  /**
   * Reset underlying 'data'
   * @param {Object} data
   */
  reset(data) {
    this._routeHandledMethod('reset', data);
  }

  /**
   * Destroy instance
   */
  destroy() {
    if (!this.destroyed) {
      this.destroyed = true;
      this._data = {};
      this._getCache = {};
      this._handledMethods = {};

      this._serialisableKeys = {};
      this.debug('destroyed');
      this.debug.destroy();
    }
  }

  /**
   * Store serialisability of 'key'
   * @param {String} key
   * @param {Boolean} value
   */
  setSerialisabilityOfKey(key, value) {
    if (key.charAt(0) === '/') {
      key = key.slice(1);
    }
    this._serialisableKeys[key] = value;
  }

  /**
   * Batch version of 'setSerialisabilityOfKey()'
   * Accepts hash of key/value pairs
   * @param {Object} keys
   */
  setSerialisabilityOfKeys(keys) {
    if (isPlainObject(keys)) {
      for (const key in keys) {
        this.setSerialisabilityOfKey(key, keys[key]);
      }
    }
  }


  /**
   * Prepare for serialisation
   * @param {String} [key]
   * @returns {Object}
   */
  toJSON(key) {
    if (key) {
      return serialise(key, get(this, key), this._serialisableKeys);
    }
    return serialise(null, this._data, this._serialisableKeys);
  }



  /**
   * Route 'fn' through handlers
   * @param {String} methodName
   * @param {*} args
   * @returns {Object|null}
   */
  _routeHandledMethod(methodName, ...args) {
    const [fn, signature] = this._handledMethods[methodName];
    const isKeyed = signature[0] === 'key';
    let [key = '', ...rest] = args;

    if (isKeyed && key && key.charAt(0) === '/') {
      key = key.slice(1);
    }

    return fn(this, key, ...rest);
  }
};

/**
 * Reset underlying 'data'
 * @param {DataStore} store
 * @param {Object} data
 */
function reset(store, data) {
  store.debug('reset');
  store._data = data;
  store.changed = true;
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
    const obj = {};

    for (const prop in data) {
      const keyChain = key ? `${key}/${prop}` : prop;
      const value = data[prop];

      if (config[keyChain] !== false) {
        if (isPlainObject(value)) {
          obj[prop] = serialise(keyChain, value, config);
        } else if (value != null && typeof value === 'object' && 'toJSON' in value) {
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

