'use strict';

const agent = require('@yr/agent');
const assign = require('object-assign');
const DataStore = require('./DataStore');
const fetch = require('./methods/fetch');
const runtime = require('@yr/runtime');

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
  constructor(id, data, options = {}) {
    options.handledMethods = {
      fetch: [fetch, ['key', 'url', 'options']]
    };

    super(id, data, options);

    this.EXPIRES_KEY = EXPIRES_KEY;
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
          const [key, url, opts = {}] = args;

          return this._routeHandledMethod('fetch', key, url, assign({}, options, opts));
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
   * Destroy instance
   */
  destroy() {
    this.abort();
    super.destroy();
  }
};
