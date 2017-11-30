'use strict';

const agent = require('@yr/agent');
const debugFactory = require('debug');
const fetch = require('./methods/fetch');
const get = require('./methods/get');
const HandlerContext = require('./HandlerContext');
const isPlainObject = require('is-plain-obj');
const runtime = require('@yr/runtime');
const set = require('./methods/set');

const HANDLED_METHODS = {
  reset: [reset, ['data']],
  set: [set, ['key', 'value', 'options']],
  fetch: [fetch, ['key', 'url', 'options']]
};
const EXPIRY_KEY = '__expiry';
const REF_KEY = '__ref:';

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
    this.EXPIRY_KEY = EXPIRY_KEY;
    this.REF_KEY = REF_KEY;

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
   * Register 'handler' with optional key 'match'
   * Will handle every transaction if no 'match'
   * @param {RegExp|String|Array} [match]
   * @param {Function} handler
   */
  useHandler(match, handler) {
    const handlers = !Array.isArray(match) ? [[match, handler]] : match;
    let count = 0;

    handlers.forEach(([match, handler]) => {
      if (typeof match === 'function') {
        handler = match;
        match = '';
      }
      if (typeof handler === 'function') {
        this._handlers.push({ handler, match });
        count++;
      }
    });

    if (count) {
      this.debug(`using ${count} new handler${count > 1 ? 's' : ''}`);
    }
  }

  /**
   * Unregister 'handler'
   * @param {RegExp|String|Array} [match]
   * @param {Function} handler
   */
  unuseHandler(match, handler) {
    const matches = !Array.isArray(match) ? [[match, handler]] : match;

    for (let i = 0, n = matches.length; i < n; i++) {
      let [match, handler] = matches[i];
      let j = this._handlers.length;

      if (typeof match === 'function') {
        handler = match;
      }

      while (--j >= 0) {
        if (this._handlers[j].handler === handler) {
          this._handlers.splice(j, 1);
        }
      }
    }
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
   * Retrieve reference to value stored at 'key'
   * @param {String} [key]
   * @returns {String}
   */
  reference(key) {
    if (!key) {
      return this.REF_KEY;
    }
    // Resolve back to original key if referenced
    key = this._resolveRefKey(key);
    return `${this.REF_KEY}${key}`;
  }

  /**
   * Batch version of 'reference()'
   * Accepts array of 'keys'
   * @param {Array<String>} keys
   * @returns {Array<String>}
   */
  referenceAll(keys) {
    return keys.map(key => this.reference(key));
  }

  /**
   * Retrieve unreferenced 'key'
   * @param {String} [key]
   * @returns {String}
   */
  unreference(key) {
    if (!key) {
      return '';
    }
    return this._isRefValue(key) ? this._parseRefKey(key) : key;
  }

  /**
   * Batch version of 'unreference()'
   * Accepts array of 'keys'
   * @param {Array<String>} keys
   * @returns {Array<String>}
   */
  unreferenceAll(keys) {
    return keys.map(key => this.unreference(key));
  }

  /**
   * Fetch data. If expired, load from 'url' and store at 'key'
   * @param {String|Object} key
   * @param {String} url
   * @param {Object} [options]
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   *  - {Number} minExpiry
   *  - {Number} retries
   *  - {Boolean} staleWhileRevalidate
   *  - {Boolean} staleIfError
   *  - {Number} timeout
   * @returns {Promise}
   */
  fetch(key, url, options) {
    // Handle passing existing response
    if (key != null && typeof key !== 'string' && 'body' in key && 'status' in key) {
      return Promise.resolve(key);
    }
    return this._routeHandledMethod('fetch', key, url, options);
  }

  /**
   * Batch version of 'fetch()'
   * Accepts an array of tuples [[key: String, url: String, options: Object]]
   * @param {Array<Array>} keys
   * @param {Object} [options]
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   *  - {Number} minExpiry
   *  - {Number} retry
   *  - {Boolean} staleWhileRevalidate
   *  - {Boolean} staleIfError
   *  - {Number} timeout
   * @returns {Promise<Array>}
   */
  fetchAll(keys, options) {
    if (Array.isArray(keys)) {
      return Promise.all(
        keys.map(args => {
          // Handle passing existing response
          if (args != null && !Array.isArray(args) && 'body' in args && 'status' in args) {
            return args;
          }

          const [key, url, opts = {}] = args;

          return this._routeHandledMethod('fetch', key, url, Object.assign({}, options, opts));
        })
      );
    }

    return Promise.resolve([]);
  }

  /**
   * Abort all outstanding load requests
   * @param {String} [key]
   */
  abort(key) {
    // Too dangerous to abort on server in case more than one outstanding request
    if (runtime.isBrowser) {
      agent.abortAll(key);
    }
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
      this.abort();
      this.destroyed = true;
      this._data = {};
      this._getCache = {};
      this._handledMethods = {};
      this._handlers = [];
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
   * Dump all data, optionally stringified
   * @param {Boolean} stringify
   * @returns {Object|String}
   */
  dump(stringify) {
    const data = explode(this, this._data);

    if (stringify) {
      try {
        // Pretty print
        return JSON.stringify(data, null, 2);
      } catch (err) {
        return '';
      }
    }

    return data;
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
   * Determine if 'key' matches 'match'
   * @param {String} key
   * @param {RegExp|String} match
   * @returns {Boolean}
   */
  _isMatchKey(key, match) {
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
  }

  /**
   * Determine if 'value' is reference
   * @param {String} value
   * @returns {Boolean}
   */
  _isRefValue(value) {
    if (!value) {
      return false;
    }
    return typeof value === 'string' && value.indexOf(REF_KEY) === 0;
  }

  /**
   * Parse key from 'ref'
   * @param {String} ref
   * @returns {String}
   */
  _parseRefKey(ref) {
    if (typeof ref !== 'string') {
      return ref;
    }
    return ref.slice(REF_KEY.length);
  }

  /**
   * Resolve 'key' to nearest __ref key
   * @param {String} key
   * @returns {String}
   */
  _resolveRefKey(key) {
    // Handle passing of __ref key
    if (this._isRefValue(key)) {
      return this._parseRefKey(key);
    }

    const segs = key.split('/');
    const n = segs.length;
    let value = this._data;
    let idx = 0;
    let ref = key;

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
      ref += `/${segs.slice(idx + 1).join('/')}`;
    }

    return ref;
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

    // Defer to handlers
    if (this._handlers.length) {
      const context = new HandlerContext(this, methodName, signature, args);

      for (let i = 0, n = this._handlers.length; i < n; i++) {
        if (this._isMatchKey(key, this._handlers[i].match)) {
          this._handlers[i].handler(context);
        }
      }

      const value = fn(this, ...context.toArguments());

      context.destroy();
      return value;
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

/**
 * Resolve all nested references for 'data'
 * @param {DataStore} store
 * @param {Object} data
 * @returns {Object}
 */
function explode(store, data) {
  if (isPlainObject(data)) {
    const obj = {};

    for (const prop in data) {
      obj[prop] = explode(store, data[prop]);
    }
    return obj;
  } else if (Array.isArray(data)) {
    return data.map(value => explode(store, value));
  } else if (store._isRefValue(data)) {
    return explode(store, store.get(store._parseRefKey(data)));
  }

  return data;
}
