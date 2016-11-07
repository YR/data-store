'use strict';

const assign = require('object-assign');
const urlUtils = require('@yr/url-utils');

/**
 * Handler factory for calling 'fetch' with templated url string
 * @param {DataStore} store
 * @param {String} key
 * @param {String} urlTemplate
 * @param {Object} memoizedOptions
 */
module.exports = function handlerFactory (store, key, urlTemplate, memoizedOptions) {
  store.registerHandler('fetch', key, function fetchWithTemplatedURLHandler (store, fetch, rootKey, key, url, options) {
    options = assign({}, memoizedOptions, options);
    if ('string' != typeof url) url = urlUtils.template(urlTemplate, url);
    return fetch(rootKey, url, options);
  });
};