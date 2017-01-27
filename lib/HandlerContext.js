'use strict';

var assign = require('object-assign');
var isPlainObject = require('is-plain-obj');

module.exports = function () {
  /**
   * Constructor
   * @param {DataStore} store
   * @param {Array} signature
   * @param {Array} args
   */
  function HandlerContext(store, signature, args) {
    babelHelpers.classCallCheck(this, HandlerContext);

    this.signature = signature;
    this.store = store;

    // Use signature to copy relevant arguments to this instance
    for (var i = 0, n = signature.length; i < n; i++) {
      var prop = signature[i];

      if (prop.indexOf('...') == 0) {
        prop = prop.slice(3);
        this[prop] = args.slice(i);
      } else {
        this[prop] = args[i];
      }
    }
  }

  /**
   * Batch 'key' with existing
   * @param {String|Object} key
   * @param {*} [value]
   */


  HandlerContext.prototype.batch = function batch(key, value) {
    if (!this.key) this.key = '';

    var asArray = value === undefined;
    var isString = 'string' == typeof key;
    var valueName = this.signature[1];

    // Convert existing to hash/array
    if ('string' == typeof this.key) {
      var _ref;

      this.key = asArray ? [this.key] : (_ref = {}, _ref[this.key] = this[valueName], _ref);
      if (valueName in this) this[valueName] = null;
    }

    if (asArray) {
      if (isString) {
        this.key.push(key);
      } else {
        var _key;

        (_key = this.key).push.apply(_key, key);
      }
      return;
    }

    if (isString) {
      this.key[key] = value;
    } else {
      this.key = assign(this.key, key);
    }
  };

  /**
   * Merge 'prop' with existing
   * @param {String} propName
   * @param {Object} prop
   */


  HandlerContext.prototype.merge = function merge(propName, prop) {
    if (!isPlainObject(prop)) return;
    this[propName] = assign({}, this[propName], prop);
  };

  /**
   * Convert instance to arguments
   * @returns {Array}
   */


  HandlerContext.prototype.toArguments = function toArguments() {
    var args = [];

    for (var i = 0, n = this.signature.length; i < n; i++) {
      var prop = this.signature[i];

      if (prop.indexOf('...') == 0) {
        prop = prop.slice(3);
        args.push.apply(args, this[prop]);
      } else {
        args.push(this[prop]);
      }
    }

    return args;
  };

  /**
   * Destroy
   */


  HandlerContext.prototype.destroy = function destroy() {
    for (var prop in this) {
      this[prop] = null;
    }
  };

  return HandlerContext;
}();