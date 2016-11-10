'use strict';

const agent = require('@yr/agent');
const assign = require('object-assign');
const clock = require('@yr/clock');
const DataStore = require('./DataStore');
const isPlainObject = require('is-plain-obj');

const DEFAULT_LOAD_OPTIONS = {
  minExpiry: 60000,
  retry: 2,
  timeout: 5000
};
const EXPIRES_PROPERTY = '__expires';
const GRACE = 10000;

module.exports = class FetchableDataStore extends DataStore {
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
    super(id, data, options);

    this.registerHandledMethod('fetch', this._fetch, ['key', 'url', 'options']);
  }

  /**
   * Fetch data. If expired, load from 'url' and store at 'key'
   * @param {String} key
   * @param {String} url
   * @param {Object} options
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   *  - {Number} minExpiry
   *  - {Boolean} reload
   *  - {Number} retry
   *  - {Boolean} staleWhileRevalidate
   *  - {Boolean} staleIfError
   *  - {Number} timeout
   * @returns {Promise}
   */
  _fetch (key, url, options = {}) {
    const { reload, staleWhileRevalidate, staleIfError } = options;

    const value = this.get(key);
    const isMissingOrExpired = !value || hasExpired(value);

    // Load if missing or expired
    if (isMissingOrExpired) {
      this.debug('fetch %s from %s', key, url);

      const load = new Promise((resolve, reject) => {
        this._load(key, url, options)
          .then((res) => {
            // Schedule a reload
            if (reload) this._reload(key, url, options);
            resolve({
              duration: res.duration,
              headers: res.headers,
              data: this.get(key)
            });
          })
          .catch((err) => {
            // Schedule a reload if error
            if (err.status >= 500 && reload) this._reload(key, url, options);
            resolve({
              duration: 0,
              error: err,
              headers: { status: err.status },
              data: staleIfError ? value : null
            });
          });
      });

      // Wait for load unless stale and staleWhileRevalidate
      if (!(value && staleWhileRevalidate)) return load;
    }

    // Schedule a reload
    if (reload) this._reload(key, url, options);
    // Return data (possibly stale)
    return Promise.resolve({
      duration: 0,
      headers: { status: 200 },
      data: value
    });
  }

  /**
   * Load data from 'url' and store at 'key'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   *  - {Number} minExpiry
   *  - {Number} retry
   *  - {Number} timeout
   * @returns {Response}
   */
  _load (key, url, options) {
    options = assign({}, DEFAULT_LOAD_OPTIONS, options);
    // TODO: more granular id needed
    options.id = url;

    this.debug('load %s from %s', key, url);

    return agent
      .get(url, options)
      .timeout(options.timeout)
      .retry(options.retry)
      .then((res) => {
        this.debug('loaded "%s" in %dms', key, res.duration);

        let value;

        // Guard against empty data
        if (res.body) {
          let data = res.body;

          // Add expires header
          if (res.headers && 'expires' in res.headers) {
            data[EXPIRES_PROPERTY] = getExpiry(res.headers.expires, options.minExpiry);
          }

          value = this.set(key, data, options);
        }

        this.emit('load:' + key, value);
        this.emit('load', key, value);

        return res;
      })
      .catch((err) => {
        this.debug('unable to load "%s" from %s', key, url);

        // Remove if not found or malformed (but not aborted)
        if (err.status < 499) this.unset(key);

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
   *  - {Number} minExpiry
   *  - {Number} retry
   *  - {Number} timeout
   */
  _reload (key, url, options) {
    options = assign({}, DEFAULT_LOAD_OPTIONS, options);

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
    const duration = Math.max((value && value[EXPIRES_PROPERTY] || 0) - Date.now(), options.minExpiry);

    // TODO: set id
    clock.timeout(duration, reload, url);
  }
};

/**
 * Retrieve expiry from 'dateString'
 * @param {Number} dateString
 * @param {Number} minimum
 * @returns {Number}
 */
function getExpiry (dateString, minimum) {
  // Add latency overhead to compensate for transmission time
  const expires = +(new Date(dateString)) + GRACE;
  const now = Date.now();

  return (expires > now)
    ? expires
    // Local clock is set incorrectly
    : now + minimum;
}

/**
 * Check if 'obj' has expired
 * @param {Object} obj
 * @returns {Boolean}
 */
function hasExpired (obj) {
  return obj
    && isPlainObject(obj)
    && EXPIRES_PROPERTY in obj
    && Date.now() > obj[EXPIRES_PROPERTY];
}


/**
 * Abort all outstanding load/reload requests
 */
/*abort () {
  // TODO: return aborted urls and use in clock.cancel
  agent.abortAll(this.uid);
  // clock.cancelAll(this.id);
}
*/