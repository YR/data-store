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

const DEFAULT_LATENCY = 10000;
const DEFAULT_LOAD_OPTIONS = {
  defaultExpiry: 600000,
  retry: 3,
  timeout: 5000
};
const DEFAULT_STORAGE_KEY_LENGTH = 2;
const DEFAULT_SET_OPTIONS = {
  // Browser immutable by default
  immutable: runtime.isBrowser,
  reload: false,
  serialisable: true,
  merge: true
};
const DELEGATED_METHODS = ['get', 'link', 'set', 'unset', 'update', 'load', 'reload', 'cancelReload', 'upgradeStorageData'];
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
   *  - handlers {Object} method:key
   *  - loading {Object}
   *    - defaultExpiry {Number}
   *    - namespaces {Array}
   *    - retry {Number}
   *    - timeout {Number}
   *  - serialisable {Object} key:Boolean
   *  - storage {Object}
   *    - keyLength {Number}
   *    - namespaces {Array}
   *    - store {Object}
   *  - writable {Boolean}
   */
  constructor (id, data = {}, options = {}) {
    super();

    this.debug = Debug('yr:data' + (id ? ':' + id : ''));
    this.destroyed = false;
    this.id = id || `store${--uid}`;
    this.writable = 'writable' in options ? options.writable : true;

    this._cursors = {};
    this._data = {};
    this._handlers = options.handlers;
    this._links = {};
    this._loading = assign({
      active: {},
      namespaces: []
    }, DEFAULT_LOAD_OPTIONS, options.loading);
    this._serialisable = options.serialisable || {};
    this._storage = assign({
      keyLength: DEFAULT_STORAGE_KEY_LENGTH,
      namespaces: []
    }, options.storage);

    for (const method of DELEGATED_METHODS) {
      const privateMethod = `_${method}`;

      this[method] = this._route.bind(this, privateMethod);
      this[privateMethod] = this[privateMethod].bind(this);
    }

    this.bootstrap(this._storage, data);
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

      this.set(storageData, null, bootstrapOptions);
      // Flatten data to force key length
      data = property.flatten(data, this._storage.keyLength);
    }

    this.set(data, null, bootstrapOptions);
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
   * Retrieve global version of 'key',
   * taking account of nested status.
   * @param {String} key
   * @returns {String}
   */
  getStorageKey (key = '') {
    if (keys.length(key) > this._storage.keyLength) key = keys.slice(key, 0, this._storage.keyLength);
    return key;
  }

  /**
   * Route 'method' to appropriate handler
   * depending on passed 'key' (args[0])
   * @param {String} method
   * @returns {Object|null}
   */
  _route (method, ...args) {
    let [key = '', ...rest] = args;

    if (!key) return this[method](...args);

    if ('string' == typeof key) {
      if (key.charAt(0) == '/') key = key.slice(1);

      // Handle links
      if (key in this._links) key = this._links[key];

      const handler = keys.first(key);
      // Remove leading '_'
      const publicMethod = method.slice(1);

      // Route to handler if it exists
      if (handler && this._handlers && this._handlers[publicMethod] && handler in this._handlers[publicMethod]) {
        return this._handlers[publicMethod][handler](this, this[method], key, ...rest);
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

    // Array of keys (get, load)
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
      value.forEach(this._checkExpiry, this);
    } else {
      this._checkExpiry(value);
    }

    return value;
  }

  /**
   * Check if 'value' is expired
   * @param {Object} value
   */
  _checkExpiry (value) {
    if (value && value.expires && time.now() > value.expires) {
      value.expired = true;
      value.expires = 0;
    }
  }

  /**
   * Store prop 'key' with 'value'
   * @param {String} key
   * @param {Object} value
   * @param {Object} [options]
   *  - immutable {Boolean}
   *  - reload {Boolean}
   *  - serialisable {Boolean}
   *  - merge {Boolean}
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

      // Store serialisability
      if ('serialisable' in options) this.setSerialisable(key, options.serialisable);

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
      // Allow options to override global config
      if ('persistent' in options && options.persistent
        || ~this._storage.namespaces.indexOf(key)
        || ~this._storage.namespaces.indexOf(keys.first(key))) {
          this._persist(key);
      }
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
      // Prune dead links
      for (const toKey in this._links) {
        if (this._links[toKey] == key) {
          delete this._links[toKey];
        }
      }

      // Prune from storage
      if (~this._storage.namespaces.indexOf(key)
        || ~this._storage.namespaces.indexOf(keys.first(key))) {
          this._unpersist(key);
      }

      // Delay to prevent race condition (view render)
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
   *  - immutable {Boolean}
   *  - reference {Boolean}
   *  - reload {Boolean}
   *  - serialisable {Boolean}
   *  - merge {Boolean}
   */
  _update (key, value, options = {}, ...args) {
    if (this.writable) {
      this.debug('update %s', key);
      const oldValue = this.get(key);

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
   * Create link between 'fromKey' and 'toKey' keys
   * @param {String} fromKey
   * @param {String} toKey
   * @returns {Object}
   */
  _link (fromKey, toKey) {
    this._links[toKey] = fromKey;
    return this.get(fromKey);
  }

  /**
   * Load data from 'url' and store at 'key'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - abort {Boolean}
   *  - ignoreQuery {Boolean}
   *  - immutable {Boolean}
   *  - isReload {Boolean}
   *  - reference {Boolean}
   *  - reload {Boolean}
   *  - serialisable {Boolean}
   *  - merge {Boolean}
   * @returns {Response}
   */
  _load (key, url, options = {}) {
    const req = agent.get(url, options);

    if (!this._loading.active[key]) {
      this.debug('load %s from %s', key, url);

      this._loading.active[key] = true;

      req.timeout(this._loading.timeout)
        .retry(this._loading.retry)
        .end((err, res) => {
          delete this._loading.active[key];

          if (err) {
            this.debug('remote resource "%s" not found at %s', key, url);
            // Remove if no longer found
            if (err.status < 500) this.unset(key);
          } else {
            this.debug('loaded "%s" in %dms', key, res.duration);

            let expires = 0;
            let value;

            // Guard against empty data
            if (res.body) {
              // Handle locations results separately
              let data = ('totalResults' in res.body)
                ? (res.body._embedded && res.body._embedded.location) || []
                : res.body;

              // Add expires header
              if (res.headers && 'expires' in res.headers) {
                expires = getExpiry(res.headers.expires, this._loading.defaultExpiry);

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
              value = this.set(key, data, options);
            }

            this.emit('load:' + key, value);
            this.emit('load', key, value);
            if (options.isReload) {
              this.emit('reload:' + key, value);
              this.emit('reload', key, value);
            }
          }

          // Allow options to override global config
          if ('reload' in options && options.reload
            || ~this._loading.namespaces.indexOf(key)
            || ~this._loading.namespaces.indexOf(keys.first(key))) {
              this._reload(key, url, options);
          }
        });
    }

    return req;
  }

  /**
   * Reload data from 'url'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - abort {Boolean}
   *  - ignoreQuery {Boolean}
   *  - immutable {Boolean}
   *  - isReload {Boolean}
   *  - reference {Boolean}
   *  - reload {Boolean}
   *  - serialisable {Boolean}
   *  - merge {Boolean}
   * @returns {null}
   */
  _reload (key, url, options) {
    // Already expired
    if (this.get(`${key}/expired`)) return this.load(key, url, options);

    let duration = (this.get(`${key}/expires`) || 0) - time.now();

    // Guard against invalid duration (reload on error with old or missing expiry, etc)
    if (duration <= 0) duration = this._loading.defaultExpiry;

    options = assign({}, options, { isReload: true });
    this.debug('reloading "%s" in %dms', key, duration);
    clock.timeout(duration, () => {
      this.load(key, url, options);
    }, key);
  }

  /**
   * Cancel any existing reload timeouts
   * @param {String} key
   */
  _cancelReload (key) {
    clock.cancel(key);
  }

  /**
   * Save to local storage
   * @param {String} key
   */
  _persist (key) {
    if (this._storage.store) {
      key = this.getStorageKey(key);
      this._storage.store.set(key, this.toJSON(key));
    }
  }

  /**
   * Remove from local storage
   * @param {String} key
   */
  _unpersist (key) {
    if (this._storage.store) {
      this._storage.store.remove(this.getStorageKey(key));
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
    // Destroy cursors
    for (const key in this._cursors) {
      this._cursors[key].destroy();
    }
    this._cursors = {};
    this._data = {};
    this._handlers = {};
    this._links = {};
    this._loading = {};
    this._serialisable = {};
    this._storage = {};
    this.destroyed = true;
    this.removeAllListeners();
    clock.cancel(this.id);
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
    if (key) return this._serialise(key, this.get(key));
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
 * Retrieve expiry from 'timestamp'
 * @param {Number} timestamp
 * @param {Number} minimum
 * @returns {Number}
 */
function getExpiry (timestamp, minimum) {
  // Add latency overhead to compensate for transmition time
  const expires = timestamp + DEFAULT_LATENCY;
  const now = time.now();

  return (expires > now)
    ? expires
    // Local clock is set incorrectly
    : now + minimum;
}