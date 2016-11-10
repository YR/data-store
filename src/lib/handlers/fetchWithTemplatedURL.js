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
      handler: function fetchWithTemplatedURLHandler (store, fetch, rootKey, key, url, options) {
        options = assign({}, defaultOptions, options);
        if ('string' != typeof url) url = urlUtils.template(urlTemplate, url);
        return fetch(rootKey, url, options);
      }
    }]
  };
};