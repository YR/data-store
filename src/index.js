/**
 * A clever data object
 * https://github.com/yr/data-store
 * @copyright Yr
 * @license MIT
 */

'use strict';

const agent = require('@yr/agent');
const assign = require('object-assign');
const clock = require('@yr/clock');
const Cursor = require('./lib/cursor');
const Debug = require('debug');
const Emitter = require('eventemitter3');
const isPlainObject = require('is-plain-obj');
const keys = require('@yr/keys');
const property = require('@yr/property');
const runtime = require('@yr/runtime');
const time = require('@yr/time');
const uuid = require('uuid');

const DEFAULT_LATENCY = 10000;
const DEFAULT_LOAD_OPTIONS = {
  expiry: 60000,
  retry: 2,
  timeout: 5000
};
const DEFAULT_SET_OPTIONS = {
  // Browser immutable by default
  immutable: runtime.isBrowser,
  reload: false,
  serialisable: true,
  merge: true
};
const DEFAULT_STORAGE_OPTIONS = {
  keyLength: 2
};
const DELEGATED_METHODS = [
  'fetch',
  'get',
  'load',
  'persist',
  'reload',
  'set',
  'unpersist',
  'unset',
  'update',
  'upgradeStorageData'
];

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
   *  - {Object} handlers method:key
   *  - {Object} loading
   *    - {Number} expiry
   *    - {Number} retry
   *    - {Number} timeout
   *  - {Object} serialisable key:Boolean
   *  - {Object} storage
   *    - {Number} keyLength
   *    - {Object} store
   *  - {Boolean} writable
   */
  constructor (id, data, options = {}) {
    super();

    this.debug = Debug('yr:data' + (id ? ':' + id : ''));
    this.destroyed = false;
    this.uid = uuid.v4();
    this.id = id || `store${--uid}`;
    this.writable = 'writable' in options ? options.writable : true;

    this._cursors = {};
    this._data = {};
    this._handlers = {};
    this._loadTimeout =
    this._loading = assign({}, DEFAULT_LOAD_OPTIONS, options.loading);
    this._serialisable = options.serialisable || {};
    this._storage = assign({}, DEFAULT_STORAGE_OPTIONS, options.storage);

    // Generate delegated methods
    for (const method of DELEGATED_METHODS) {
      const privateMethod = `_${method}`;

      this[method] = this._route.bind(this, privateMethod);
      this[privateMethod] = this[privateMethod].bind(this);
      // Setup handlers
      this._handlers[privateMethod] = {};
      if (options.handlers && method in options.handlers) {
        for (const namespace in options.handlers[method]) {
          this.registerHandler(method, namespace, options.handlers[method][namespace]);
        }
      }
    }

    this.bootstrap(this._storage, data || {});
  }

  /**
   * Bootstrap from 'storage' and/or 'data'
   * @param {Object} storage
   * @param {Object} data
   */
  bootstrap (storage, data) {
    // Bootstrap data
    const bootstrapOptions = { immutable: false };

    if (storage.store) {
      const { namespaces, store } = storage;
      const storageData = namespaces.reduce((accumulatedStorageData, namespace) => {
        let storageData = store.get(namespace);

        // Handle version mismatch
        if (store.shouldUpgrade(namespace)) {
          for (const key in storageData) {
            store.remove(key);
            // Allow handlers to override
            storageData[key] = this.upgradeStorageData(key, storageData[key]);
          }
        }

        return assign(accumulatedStorageData, storageData);
      }, {});

      this.set(storageData, bootstrapOptions);
    }

    this.set(data, bootstrapOptions);
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
   * Retrieve global version of 'key',
   * taking account of nested status.
   * @param {String} key
   * @returns {String}
   */
  getRootKey (key = '') {
    if (!this.isRootKey(key)) key = `/${key}`;
    return key;
  }

  /**
   * Retrieve storage keys for 'key'
   * based on storage.keyLength.
   * @param {String} key
   * @returns {Array}
   */
  getStorageKeys (key = '') {
    const { keyLength } = this._storage;
    const length = keys.length(key);

    if (length < keyLength) {
      const parentData = property.flatten(this._get(keys.slice(key, 0, -1)), keyLength - 1);

      return Object.keys(parentData).filter((k) => {
        return k.indexOf(key) == 0;
      });
    }

    return [keys.slice(key, 0, this._storage.keyLength)];
  }

  /**
   * Register 'handler' for 'method' and 'namespace'
   * @param {String} method
   * @param {String} namespace
   * @param {Function} handler
   */
  registerHandler (method, namespace, handler) {
    const privateMethod = `_${method}`;

    // Prevent overwriting
    if (!this._handlers[privateMethod][namespace]) {
      const scopedMethod = (key, ...args) => this[privateMethod](keys.join(namespace, key), ...args);

      this._handlers[privateMethod][namespace] = { handler, scopedMethod };
    }
  }

  /**
   * Route 'method' to appropriate handler
   * depending on passed 'key' (args[0])
   * @param {String} method
   * @param {*} args
   * @returns {Object|null}
   */
  _route (method, ...args) {
    let [key = '', ...rest] = args;

    if (!key) return this[method](...args);

    if ('string' == typeof key) {
      if (key.charAt(0) == '/') key = key.slice(1);

      const namespace = keys.first(key);
      // Remove leading '_'
      const publicMethod = method.slice(1);

      // Route to handler if it exists
      if (namespace && namespace in this._handlers[method]) {
        const { handler, scopedMethod } = this._handlers[method][namespace];

        return handler(this, scopedMethod, keys.slice(key, 1), ...rest);
      }
      return this[method](key, ...rest);
    }

    // Batch (set, update, load, etc)
    if (isPlainObject(key)) {
      for (const k in key) {
        this._route(method, k, key[k], ...rest);
      }
      return;
    }

    // Array of keys (get)
    if (Array.isArray(key)) {
      return key.map((k) => {
        return this._route(method, k, ...rest);
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

    const value = property.get(key, this._data);

    // Check expiry
    if (Array.isArray(value)) {
      value.forEach(checkExpiry);
    } else {
      checkExpiry(value);
    }

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
   * @returns {Object}
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
        // Returns null if no change
        const newData = property.set(key, value, this._data, options);

        if (newData !== null) {
          this._data = newData;
        } else {
          this.debug('WARNING no change after set "%s', key);
        }
      } else {
        property.set(key, value, this._data, options);
      }

      // Handle persistence
      if ('persistent' in options && options.persistent) this._persist(key);
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
   * Load data from 'url' and store at 'key'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   * @returns {Response}
   */
  _load (key, url, options) {
    options = options || {};
    options.id = this.uid;

    this.debug('load %s from %s', key, url);

    return agent
      .get(url, options)
      .timeout(this._loading.timeout)
      .retry(this._loading.retry)
      .then((res) => {
        this.debug('loaded "%s" in %dms', key, res.duration);

        let value;

        // Guard against empty data
        if (res.body) {
          // TODO: make more generic with bodyParser option/handler
          // Handle locations results separately
          let data = ('totalResults' in res.body)
            ? (res.body._embedded && res.body._embedded.location) || []
            : res.body;

          // Add expires header
          if (res.headers && 'expires' in res.headers) {
            const expires = getExpiry(res.headers.expires, this._loading.expiry);

            if (Array.isArray(data)) {
              data.forEach((d) => {
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

          // Guard against parse errors during set()
          try {
            // Merge with existing
            options.merge = true;
            // All remote data stored with reference key
            options.reference = true;
            value = this.set(key, data, options);
          } catch (err) {
            this.debug('failed to store remote resource "%s" from %s', key, url);
            // TODO: update error message?
            err.status = 500;
            throw err;
          }
        }

        this.emit('load:' + key, value);
        this.emit('load', key, value);

        return res;
      })
      .catch((err) => {
        this.debug('unable to load "%s" from %s', key, url);

        // Remove if not found or malformed (but not aborted)
        if (err.status < 499) this.remove(key);

        throw err;
      });
  }

  /**
   * Reload data from 'url'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   *  - {Boolean} reload
   */
  _reload (key, url, options) {
    options = options || {};
    if (!options.reload) return;

    const reload = () => {
      this._load(key, url, options)
        .then((res) => {
          const value = this.get(key);

          this.emit('reload:' + key, value);
          this.emit('reload', key, value);
          this._reload(key, url, options);
        })
        .catch((err) => {
          // TODO: error never logged
          this.debug('unable to reload "%s" from %s', key, url);
          this._reload(key, url, options);
        });
    };
    const value = this.get(key);
    // Guard against invalid duration
    const duration = Math.max((value && value.expires || 0) - time.now(), this._loading.expiry);

    this.debug('reloading "%s" in %dms', key, duration);
    // Set custom id
    clock.timeout(duration, reload, url);
  }

  /**
   * Fetch data. If expired, load from 'url' and store at 'key'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   *  - {Boolean} reload
   *  - {Boolean} staleWhileRevalidate
   *  - {Boolean} staleWhileError
   * @returns {Promise}
   */
  _fetch (key, url, options) {
    options = options || {};

    this.debug('fetch %s from %s', key, url);

    // Set expired state
    const value = this.get(key);

    // Load if not found or expired
    if (!value || value.expired) {
      const load = new Promise((resolve, reject) => {
        this._load(key, url, options)
          .then((res) => {
            // Schedule a reload
            this._reload(key, url, options);
            resolve({
              duration: res.duration,
              headers: res.headers,
              data: this.get(key)
            });
          })
          .catch((err) => {
            // Schedule a reload if error
            if (err.status >= 500) this._reload(key, url, options);
            resolve({
              duration: 0,
              error: err,
              headers: { status: err.status },
              data: options.staleWhileError ? value : null
            });
          });
      });

      // Wait for load unless stale and staleWhileRevalidate
      if (!(value && options.staleWhileRevalidate)) return load;
    }

    // Schedule a reload
    this._reload(key, url, options);
    // Return data (possibly stale)
    return Promise.resolve({
      duration: 0,
      headers: { status: 200 },
      data: value
    });
  }

  /**
   * Save to local storage
   * @param {String} key
   */
  _persist (key) {
    if (this._storage.store) {
      this.getStorageKeys(key).forEach((storageKey) => {
        this._storage.store.set(storageKey, this._get(storageKey));
      });
    }
  }

  /**
   * Remove from local storage
   * @param {String} key
   */
  _unpersist (key) {
    if (this._storage.store) {
      this.getStorageKeys(key).forEach((storageKey) => {
        this._storage.store.remove(storageKey);
      });
    }
  }

  /**
   * Update storage when versions don't match
   * @param {String} key
   * @param {Object} value
   * @returns {Object}
   */
  _upgradeStorageData (key, value) {
    // Delete as default
    return null;
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
   * Abort all outstanding load/reload requests
   */
  abort () {
    // TODO: return aborted urls and use in clock.cancel
    agent.abortAll(this.uid);
    // clock.cancelAll(this.id);
  }

  /**
   * Destroy instance
   */
  destroy () {
    this.abort();

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
          } else if (time.isTime(data[prop])) {
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

/**
 * Retrieve expiry from 'dateString'
 * @param {Number} dateString
 * @param {Number} minimum
 * @returns {Number}
 */
function getExpiry (dateString, minimum) {
  // Add latency overhead to compensate for transmission time
  const expires = +(new Date(dateString)) + DEFAULT_LATENCY;
  const now = time.now();

  return (expires > now)
    ? expires
    // Local clock is set incorrectly
    : now + minimum;
}

/**
 * Check if 'value' is expired
 * @param {Object} value
 */
function checkExpiry (value) {
  if (value && isPlainObject(value) && value.expires && time.now() > value.expires) {
    value.expired = true;
    value.expires = 0;
  }
}