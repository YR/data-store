'use strict';

/**
 *
 */

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

const DEFAULT_EXPIRY = 600000;
const DEFAULT_LATENCY = 10000;
const DEFAULT_LOAD_RETRY = 3;
const DEFAULT_LOAD_TIMEOUT = 5000;
const DEFAULT_SET_OPTIONS = {
  // Browser immutable by default
  immutable: runtime.isBrowser,
  reference: false,
  reload: false,
  serialisable: true,
  merge: true
};
let uid = 0;

class DataStore extends Emitter {
  /**
   * Constructor
   * @param {String} [id]
   * @param {Object} [data]
   * @param {Object} [options]
   */
  constructor (id, data = {}, options = {}) {
    super();

    this.debug = Debug('yr:data' + (id ? ':' + id : ''));
    this.destroyed = false;
    this.id = id || `store${--uid}`;
    this.isWritable = 'isWritable' in options ? options.isWritable : true;
    this._cursors = {};
    this._data = data;
    this._delegates = {};
    this._loading = [];
    this._minExpiry = 'defaultExpiry' in options ? options.defaultExpiry : DEFAULT_EXPIRY;
    this._retry = 'retry' in options ? options.retry : DEFAULT_LOAD_RETRY;
    this._shouldReload = options.reload;
    this._serialisable = options.serialisable || {};
    this._storage = options.storage;
    this._timeout = 'timeout' in options ? options.timeout : DEFAULT_LOAD_TIMEOUT;
  }

/*
  bootstrap
  get
  set
  load
  reload
  upgradeStorage
*/

  /**
   * Bootstrap from storage
   */
  bootstrap () {
    if (this._storage) {
      const storageId = this.getStorageKey();
      let data = this._storage.get(storageId);
      let options = {
        immutable: false,
        persistent: false
      };

      // Invalidate on version mismatch
      if (this._storage.shouldUpgrade(storageId)) {
        data = this._upgradeStorage(data);
        options.persistent = true;
      }

      for (const key in data) {
        // Remove prefix
        const k = keys.slice(key, 1);

        // Treat as batch if no key
        this.set(!k ? null : k, data[key], options);
      }
    }
  }

  /**
   * Retrieve property value with `key`
   * @param {String} [key]
   * @returns {Object}
   */
  get (key) {
    // Return all if no key specified
    if (!key) return this._data;

    const value = property.get(key, this._data);

    // Check expiry
    if (value && value.expires && time.now() > value.expires) {
      value.expired = true;
      value.expires = 0;
      this.debug('WARNING data has expired "%s"', value.__ref || key);
    }

    return value;
  }

  /**
   * Store prop 'key' with 'value'
   * @param {String} key
   * @param {Object} value
   * @param {Object} [options]
   * @returns {Object}
   */
  set (key, value, options) {
    if (this.isWritable) {
      options = assign({}, DEFAULT_SET_OPTIONS, options);

      // Handle replacing underlying data store
      if (key == null && isPlainObject(value)) {
        this.debug('reset');
        this._data = value;
        return;
      }

      // Handle removal of key
      if ('string' == typeof key && value == null) return this._remove(key);

      // Store serialisability if not serialisable
      if (!options.serialisable) {
        this.setSerialisable(key, options.serialisable);
      }

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
      if (options.persistent) {
        // Store parent object if setting simple value
        if (keys.length(key) > 1) key = keys.first(key);
        this._persist(key);
      }
    }

    return value;
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
    if (!this.isRootKey(key)) {
      key = `/${key}`;
    }
    return key;
  }

  /**
   * Determine if 'key' refers to a global property
   * @param {String} key
   * @returns {Boolean}
   */
  isStorageKey (key) {
    const leading = (this.rootkey == '/')
      // Non-nested stores must have a key based on id
      ? keys.join(this.rootkey, this.id)
      : this.rootkey;

    return key ? (key.indexOf(leading.slice(1)) == 0) : false;
  }

  /**
   * Retrieve storage version of 'key',
   * taking account of nested status.
   * @param {String} key
   * @returns {String}
   */
  getStorageKey (key) {
    if (!this.isStorageKey(key)) {
      key = (this.rootkey == '/')
        // Make sure non-nested stores have a key based on id
        ? keys.join(this.rootkey, this.id, key)
        : keys.join(this.rootkey, key);
      // Remove leading '/'
      key = key.slice(1);
    }
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
    if (this.isRootKey(key)) key = key.slice(1);

    if (isPlainObject(key)) {
      for (const k in key) {
        this.setSerialisable(k, value);
      }
    }

    this._serialisable[key] = value;
  }

  /**
   * Remove 'key'
   * @param {String} key
   */
  _remove (key) {
    // Remove prop from parent
    const length = keys.length(key);
    const k = (length == 1) ? key : keys.last(key);
    const data = (length == 1) ? this._data : this.get(keys.slice(key, 0, -1));

    // Only remove existing props
    // Prevent recursive trap
    if (data && k in data) {
      const oldValue = data[k];

      this.debug('remove "%s"', key);
      delete data[k];
      this._unpersist(key);

      // Delay to prevent race condition (view render)
      clock.immediate(() => {
        this.emit('remove:' + key, null, oldValue);
        this.emit('remove', key, null, oldValue);
      });
    }
  }

  /**
   * Store prop 'key' with 'value', notifying listeners of change
   * Allows passing of arbitrary additional args to listeners
   * @param {String} key
   * @param {Object} value
   * @param {Object} options
   */
  _update (key, value, options = {}, ...args) {
    if (this.isWritable) {
      // Handle reference keys
      // Use reference key to write to original object
      const parent = this.get(keys.slice(key, 0, -1));

      if (parent && parent.__ref) key = keys.join(parent.__ref, keys.last(key));

      this.debug('update %s', key);
      const oldValue = this.get(key);

      options.immutable = true;
      this.set(key, value, options);

      // Delay to prevent race condition (view render)
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
   * @returns {Response}
   */
  _load (key, url, options = {}) {
    const req = agent.get(url, options);

    if (!~this._loading.indexOf(key)) {
      this.debug('load %s from %s', key, url);

      this._loading.push(key);

      req.timeout(this._timeout)
        .retry(this._retry)
        .end((err, res) => {
          this._loading.splice(this._loading.indexOf(key), 1);

          if (err) {
            this.debug('remote resource "%s" not found at %s', key, url);
            // Remove if no longer found
            if (err.status < 500) this.remove(key);
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
                expires = getExpiry(res.headers.expires, this._minExpiry);

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
              options.merge = true;
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
          if ('reload' in options ? options.reload : this._shouldReload) this._reload(key, url, options);
        });
    }

    return req;
  }

  /**
   * Reload data from 'url'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   * @returns {null}
   */
  _reload (key, url, options) {
    // Already expired
    if (this.get(`${key}/expired`)) return this.load(key, url, options);

    let duration = (this.get(`${key}/expires`) || 0) - time.now();

    // Guard against invalid duration (reload on error with old or missing expiry, etc)
    if (duration <= 0) duration = this._minExpiry;

    options = assign({}, options, { isReload: true });
    this.debug('reloading "%s" in %dms', key, duration);
    clock.timeout(duration, () => {
      this.load(key, url, options);
    // Set custom id
    // Only one key will be reloaded at a time,
    // and any outstanding timers will be cancelled
    }, this.id);
  }

  /**
   * Cancel any existing reload timeouts
   */
  _cancelReload () {
    clock.cancel(this.id);
  }

  /**
   * Save to local storage
   * @param {String} key
   */
  _persist (key) {
    if (this._storage) {
      this._storage.set(this.getStorageKey(key), this.toJSON(key));
    }
  }

  /**
   * Remove from local storage
   * @param {String} key
   */
  _unpersist (key) {
    if (this._storage) {
      this._storage.remove(this.getStorageKey(key));
    }
  }

  /**
   * Update storage when versions don't match
   * @param {Object} data
   * @param {Object} options
   * @returns {Object}
   */
  _upgradeStorage (data, options) {
    for (const key in data) {
      this._storage.remove(key);
    }
    return data;
  }

  /**
   * Retrieve store for 'key'
   * @param {String} key
   * @returns {DataStore}
   */
  _getStoreForKey (key) {
    let context = this;

    key = key || '';
    if (!key) return [context, key];

    if (key.charAt(0) == '/') {
      context = this._root;
      key = key.slice(1);
    }

    const first = keys.first(key);

    if (context._children[first]) return context._children[first]._getStoreForKey(keys.slice(key, 1));
    return [context, key];
  }

  /**
   * Delegate 'method' to appropriate store (root, current, or child)
   * depending on passed 'key' (args[0])
   * @param {String} method
   * @returns {Object|null}
   */
  _delegate (method, ...args) {
    const [key] = args;

    if (!key) return this[method](...args);

    if ('string' == typeof key) {
      const [target, targetKey] = this._getStoreForKey(key);

      // Delegate to target if no resolved key
      if (targetKey === '') {
        args = args.slice(1);
        return target._delegate(method, ...args);
      }

      // Overwrite key
      args[0] = targetKey;
      return target[method](...args);
    }

    // Handle batch (set, update, load, etc)
    if (isPlainObject(key)) {
      const add = args.slice(1);

      for (const k in key) {
        this._delegate.apply(this, add.length ? [method, k, key[k]].concat(add) : [method, k, key[k]]);
      }
      return;
    }

    // Handle array (get)
    if (Array.isArray(key)) {
      return key.map((k) => {
        // 'get' only accepts 1 arg, so no need to handle additional here
        return this._delegate.call(this, method, k);
      });
    }
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
    this._loading = [];
    this._serialisable = {};
    this._storage = null;
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

module.exports = DataStore;

/**
 * Instance factory
 * @param {String} [id]
 * @param {Object} [data]
 * @param {Object} [options]
 * @returns {DataStore}
 */
module.exports.create = function create (id, data, options) {
  return new DataStore(id, data, options);
};