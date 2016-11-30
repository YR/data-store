'use strict';

const agent = require('@yr/agent');
const assign = require('object-assign');
const clock = require('@yr/clock');
const DataStore = require('./DataStore');
const fetch = require('./methods/fetch');
const isPlainObject = require('is-plain-obj');
const runtime = require('@yr/runtime');

const DEFAULT_LOAD_OPTIONS = {
  minExpiry: 60000,
  retry: 2,
  timeout: 5000
};
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
    options.handledMethods = { fetch: [fetch, ['key', 'url', 'options']] };

    super(id, data, options);

    this.EXPIRES_KEY = EXPIRES_KEY;
    this._fetchedKeys = {};
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
   *  - {Boolean} reload
   *  - {Number} retries
   *  - {Boolean} staleWhileRevalidate
   *  - {Boolean} staleIfError
   *  - {Number} timeout
   * @returns {Promise}
   */
  fetch (key, url, options) {
    if (!key) return;

    options = assign({}, DEFAULT_LOAD_OPTIONS, options);

    if ('string' == typeof key) {
      if (!this._fetchedKeys[key]) this._fetchedKeys[key] = true;
      return this._handledMethods.fetch(key, url, options);
    }

    if (isPlainObject(key)) {
      return Promise.all(Object.keys(key)
        .map((k) => {
          if (!this._fetchedKeys[k]) this._fetchedKeys[k] = true;
          return this._handledMethods.fetch(k, key[k], options);
        })
      );
    }
  }

  /**
   * Abort all outstanding load/reload requests
   * @param {String|Array} [key]
   */
  abort (key) {
    // Abort all
    if (!key) {
      // Too dangerous to abort on server in case more than one outstanding request
      if (runtime.isBrowser) agent.abortAll((req) => this._fetchedKeys[req.__agentId]);
      for (const key in this._fetchedKeys) {
        clock.cancel(key);
      }
      this._fetchedKeys = {};
      return;
    }

    if ('string' == typeof key) key = [key];
    key.forEach((k) => {
      if (runtime.isBrowser) agent.abortAll(k);
      clock.cancel(k);
      delete this._fetchedKeys[k];
    });
  }

  /**
   * Destroy instance
   */
  destroy () {
    this.abort();
    super.destroy();
  }
};