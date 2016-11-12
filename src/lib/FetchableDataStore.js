'use strict';

const assign = require('object-assign');
const DataStore = require('./DataStore');
const fetch = require('./methods/fetch');
const isPlainObject = require('is-plain-obj');

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
    super(id, data, options);

    this.EXPIRES_KEY = EXPIRES_KEY;

    this._registerHandledMethod('fetch', fetch, ['key', 'url', 'options']);
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
    if ('string' == typeof key) return this._handledMethods.fetch(key, url, options);
    if (isPlainObject(key)) {
      return Promise.all(Object.keys(key).map((k) => this._handledMethods.fetch(k, key[k], options)));
    }
  }
};

/**
 * Abort all outstanding load/reload requests
 */
/*abort () {
  // TODO: return aborted urls and use in clock.cancel
  agent.abortAll(this.uid);
  // clock.cancelAll(this.id);
}
*/