'use strict';

const urlUtils = require('@yr/url-utils');

/**
 * Handler factory for calling 'fetch' with templated url string
 * @param {String} key
 * @param {String} urlTemplate
 * @param {Object} options
 * @returns {Function}
 */
module.exports = function handlerFactory (key, urlTemplate, options) {
  return function fetchWithTemplatedURLHandler (store, fetch, rootKey, key, url, options) {
    if ('string' != typeof url) url = urlUtils.template(urlTemplate, url);
    return fetch(rootKey, url, options);
  };
};