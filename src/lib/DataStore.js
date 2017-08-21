'use strict';

const assign = require('object-assign');
const debugFactory = require('debug');
const get = require('./methods/get');
const HandlerContext = require('./HandlerContext');
const isPlainObject = require('is-plain-obj');
const set = require('./methods/set');

const HANDLED_METHODS = {
  reset: [reset, ['data']],
  set: [set, ['key', 'value', 'options']]
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
    this.isWritable = 'isWritable' in options ? options.isWritable : true;

    this._actions = {};
    this._cache = {};
    this._data = {};
    // Allow sub classes to send in methods for registration
    this._handledMethods = assign({}, HANDLED_METHODS, options.handledMethods || {});
    this._handlers = [];
    this._serialisableKeys = options.serialisableKeys || {};

    this.debug('created');

    if (options.handlers) {
      this.useHandler(options.handlers);
    }
    if (options.actions) {
      this.registerAction(options.actions);
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
   * Register 'action' under 'name'
   * @param {String|Array} name
   * @param {Function} action
   */
  registerAction(name, action) {
    const names = !Array.isArray(name) ? [[name, action]] : name;
    let count = 0;

    names.forEach(([name, action]) => {
      if (typeof action === 'function') {
        this._actions[name] = action;
        count++;
      }
    });

    if (count) {
      this.debug(`registered ${count} new action${count > 1 ? 's' : ''}`);
    }
  }

  /**
   * Unregister 'name' action
   * @param {String|Array} name
   * @param {Function} action
   */
  unregisterAction(name, action) {
    const names = !Array.isArray(name) ? [[name, action]] : name;

    names.forEach(([name]) => {
      if (this._actions[name]) {
        delete this._actions[name];
      }
    });
  }

  /**
   * Trigger registered action with optional 'args
   * @param {String} name
   * @param {Array} [args]
   * @returns {Promise}
   */
  trigger(name, ...args) {
    const action = this._actions[name];

    if (!action) {
      const reason = `action ${name} not registered`;

      this.debug(reason);
      return Promise.reject(new Error(reason));
    }

    this.debug(`triggering ${name} action`);
    const promise = action(this, ...args);

    return promise || Promise.resolve();
  }

  /**
   * Retrieve value stored at 'key'
   * Empty/null/undefined 'key' returns all data
   * @param {String} [key]
   * @param {Object} [options]
   *  - {Boolean} resolveReferences
   * @returns {*}
   */
  get(key, options = {}) {
    if (!this.isWritable) {
      const { resolveReferences = true } = options;
      const cacheKey = `${key}:${resolveReferences}`;

      if (!(cacheKey in this._cache)) {
        this._cache[cacheKey] = get(this, key, options);
      }
      return this._cache[cacheKey];
    }

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
    if (!this.isWritable) {
      return;
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
    if (!this.isWritable) {
      return;
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
    this.destroyed = true;
    this._actions = {};
    this._cache = {};
    this._data = {};
    this._handlers = [];
    this._serialisableKeys = {};
    this.debug('destroyed');
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
    // Trim leading '/' (cursors)
    if (key.charAt(0) === '/') {
      key = key.slice(1);
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
