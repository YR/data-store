'use strict';

const assign = require('object-assign');
const urlUtils = require('@yr/url-utils');

/**
 * Handler factory for calling 'fetch' with templated url string
 * @param {String} match
 * @param {String} urlTemplate
 * @param {Object} defaultOptions
 * @returns {Object}
 */
module.exports = function handlerFactory (match, urlTemplate, defaultOptions) {
  return {
    fetch: [{
      match,
      handler: function fetchWithTemplatedURLHandler (store, context) {
        context.options = assign({}, defaultOptions, context.options);
        if ('string' != typeof context.url) context.url = urlUtils.template(urlTemplate, context.url);
      }
    }]
  };
};