'use strict';

const DataStore = require('./lib/DataStore');

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

    this.registerHandledMethod('fetch');
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
   *  - {Boolean} staleIfError
   * @returns {Promise}
   */
  _fetch (key, url, options) {
  }
};