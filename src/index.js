/**
 * A smart data store
 * https://github.com/yr/data-store
 * @copyright Yr
 * @license MIT
 */

'use strict';

const DataStore = require('./lib/DataStore');
const FetchableDataStore = require('./lib/FetchableDataStore');

module.exports = {
  /**
   * Instance factory
   * @param {String} [id]
   * @param {Object} [data]
   * @param {Object} [options]
   *  - {Array} handlers
   *  - {Boolean} isFetchable
   *  - {Boolean} isWritable
   *  - {Object} serialisableKeys
   * @returns {DataStore}
   */
  create (id, data, options) {
    if (options && options.isFetchable) {
      return new FetchableDataStore(id, data, options);
    }
    return new DataStore(id, data, options);
  }
};