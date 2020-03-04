/**
 * A smart data store
 * https://github.com/yr/data-store
 * @copyright Yr
 * @license MIT
 */

"use strict";

const DataStore = require("./lib/DataStore");

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
  create(id, data, options) {
    if (options && options.isFetchable) {
      console.warn(
        '[yr/data-store] "isFetchable" option is deprecated. All instances are now fetchable'
      );
    }
    return new DataStore(id, data, options);
  }
};
