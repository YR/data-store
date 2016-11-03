'use strict';

const agent = require('@yr/agent');

const DEFAULT_LATENCY = 10000;
const DEFAULT_LOAD_OPTIONS = {
  expiry: 60000,
  retry: 2,
  timeout: 5000
};

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
    const duration = Math.max((value && value.expires || 0) - Date.now(), this._loading.expiry);

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
   * Abort all outstanding load/reload requests
   */
  abort () {
    // TODO: return aborted urls and use in clock.cancel
    agent.abortAll(this.uid);
    // clock.cancelAll(this.id);
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
  const now = Date.now();

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
  if (value && isPlainObject(value) && value.expires && Date.now() > value.expires) {
    value.expired = true;
    value.expires = 0;
  }
}