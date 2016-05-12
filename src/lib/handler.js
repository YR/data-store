'use strict';

module.exports = {
  /**
   * Retrieve handler instance for 'namespace' and 'methods'
   * @param {String} namespace
   * @param {Object} methods
   * @returns {Object}
   */
  create (namespace, methods) {
    let handler = {};

    // Reformat for handler api
    for (const method in methods) {
      handler[method][namespace] = methods[method];
    }

    return handler;
  }
};