'use strict';

const assign = require('object-assign');
const urlUtils = require('@yr/url-utils');

/**
 * Handler factory for calling 'fetch' with templated url string
 * @param {DataStore} store
 * @param {String} key
 * @param {String} urlTemplate
 * @param {Object} defaultOptions
 */
module.exports = function handlerFactory (store, key, urlTemplate, defaultOptions) {
  store.registerHandler('fetch', key, function fetchWithTemplatedURLHandler (store, fetch, rootKey, key, url, options) {
    options = assign({}, defaultOptions, options);
    if ('string' != typeof url) url = urlUtils.template(urlTemplate, url);
    return fetch(rootKey, url, options);
  });
};