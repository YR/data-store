'use strict';

var assign = require('object-assign');
var isPlainObject = require('is-plain-obj');

module.exports = function () {
  /**
   * Constructor
   * @param {DataStore} store
   * @param {String} methodName
   * @param {Array} signature
   * @param {Array} args
   */
  function HandlerContext(store, methodName, signature, args) {
    babelHelpers.classCallCheck(this, HandlerContext);

    this.method = methodName;
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
   * Merge 'prop' with existing
   * @param {String} propName
   * @param {Object} prop
   */


  HandlerContext.prototype.merge = function merge(propName, prop) {
    if (!isPlainObject(prop)) {
      return;
    }
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