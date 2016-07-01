'use strict';

module.exports = {
  /**
   * Retrieve handler instance for 'namespace' and 'methods'
   * @param {String} namespace
   * @param {Object} methods
   * @returns {Object}
   */

  create: function create(namespace, methods) {
    var handler = {};

    // Reformat for handler api
    for (var method in methods) {
      handler[method][namespace] = methods[method];
    }

    return handler;
  }
};