'use strict';

const agent = require('@yr/agent');
const DataStore = require('./DataStore');
const fetch = require('./methods/fetch');
const isPlainObject = require('is-plain-obj');
const runtime = require('@yr/runtime');

const GRACE = 10000;
const EXPIRES_KEY = '__expires';

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
    options.handledMethods = {
      fetch: [fetch, ['key', 'url', 'options']]
    };

    super(id, data, options);

    this.GRACE = GRACE;
    this.EXPIRES_KEY = EXPIRES_KEY;
  }

  /**
   * Fetch data. If expired, load from 'url' and store at 'key'
   * Hash of 'key:url' pairs batches calls
   * @param {String|Object} key
   * @param {String} url
   * @param {Object} options
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   *  - {Number} minExpiry
   *  - {Number} retries
   *  - {Boolean} staleWhileRevalidate
   *  - {Boolean} staleIfError
   *  - {Number} timeout
   * @returns {Promise}
   */
  fetch (key, url, options) {
    if (!key) {
      return Promise.resolve({
        body: undefined,
        duration: 0,
        headers: { status: 500 },
        key
      });
    }

    if ('string' == typeof key) return this._handledMethods.fetch(key, url, options);
    if (isPlainObject(key)) {
      return Promise.all(
        Object.keys(key)
          .sort()
          .map((k) => this._handledMethods.fetch(k, key[k], options))
      );
    }
    if (Array.isArray(key)) {
      return Promise.all(key.map((args) => this._handledMethods.fetch(...args)));
    }
  }

  /**
   * Abort all outstanding load requests
   * @param {String} [key]
   */
  abort (key) {
    // Too dangerous to abort on server in case more than one outstanding request
    if (runtime.isBrowser) agent.abortAll(key);
  }

  /**
   * Destroy instance
   */
  destroy () {
    this.abort();
    super.destroy();
  }
};