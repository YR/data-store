'use strict';

/** BUDDY BUILT **/
if ('undefined' === typeof self) var self = this;
if ('undefined' === typeof global) var global = self;
if ('undefined' === typeof process) var process = { env: {} };
var $m = self.$m = self.$m || {};
var require = self.require || function require (id) {
  if ($m[id]) {
    if ('function' == typeof $m[id]) $m[id]();
    return $m[id].exports;
  }

  if (process.env.NODE_ENV == 'development') {
    console.warn('module ' + id + ' not found');
  }
};

(function (global) {
  var babelHelpers = global.babelHelpers = {};

  babelHelpers.classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
})(typeof global === "undefined" ? self : global);

(function () {
/*== node_modules/eventemitter3/index.js ==*/
$m['eventemitter3'] = { exports: {} };

var eventemitter3__has = Object.prototype.hasOwnProperty,
    eventemitter3__prefix = '~';

/**
 * Constructor to create a storage for our `EE` objects.
 * An `Events` instance is a plain object whose properties are event names.
 *
 * @constructor
 * @api private
 */
function eventemitter3__Events() {}

//
// We try to not inherit from `Object.prototype`. In some engines creating an
// instance in this way is faster than calling `Object.create(null)` directly.
// If `Object.create(null)` is not supported we prefix the event names with a
// character to make sure that the built-in object properties are not
// overridden or used as an attack vector.
//
if (Object.create) {
  eventemitter3__Events.prototype = Object.create(null);

  //
  // This hack is needed because the `__proto__` property is still inherited in
  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
  //
  if (!new eventemitter3__Events().__proto__) eventemitter3__prefix = false;
}

/**
 * Representation of a single event listener.
 *
 * @param {Function} fn The listener function.
 * @param {Mixed} context The context to invoke the listener with.
 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
 * @constructor
 * @api private
 */
function eventemitter3__EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 *
 * @constructor
 * @api public
 */
function eventemitter3__EventEmitter() {
  this._events = new eventemitter3__Events();
  this._eventsCount = 0;
}

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @api public
 */
eventemitter3__EventEmitter.prototype.eventNames = function eventNames() {
  var names = [],
      events,
      name;

  if (this._eventsCount === 0) return names;

  for (name in events = this._events) {
    if (eventemitter3__has.call(events, name)) names.push(eventemitter3__prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return the listeners registered for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Boolean} exists Only check if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
eventemitter3__EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = eventemitter3__prefix ? eventemitter3__prefix + event : event,
      available = this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Calls each of the listeners registered for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @returns {Boolean} `true` if the event had listeners, else `false`.
 * @api public
 */
eventemitter3__EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = eventemitter3__prefix ? eventemitter3__prefix + event : event;

  if (!this._events[evt]) return false;

  var listeners = this._events[evt],
      len = arguments.length,
      args,
      i;

  if (listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1:
        return listeners.fn.call(listeners.context), true;
      case 2:
        return listeners.fn.call(listeners.context, a1), true;
      case 3:
        return listeners.fn.call(listeners.context, a1, a2), true;
      case 4:
        return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5:
        return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6:
        return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len - 1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length,
        j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1:
          listeners[i].fn.call(listeners[i].context);break;
        case 2:
          listeners[i].fn.call(listeners[i].context, a1);break;
        case 3:
          listeners[i].fn.call(listeners[i].context, a1, a2);break;
        case 4:
          listeners[i].fn.call(listeners[i].context, a1, a2, a3);break;
        default:
          if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Add a listener for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {Mixed} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @api public
 */
eventemitter3__EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new eventemitter3__EE(fn, context || this),
      evt = eventemitter3__prefix ? eventemitter3__prefix + event : event;

  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;else if (!this._events[evt].fn) this._events[evt].push(listener);else this._events[evt] = [this._events[evt], listener];

  return this;
};

/**
 * Add a one-time listener for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {Mixed} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @api public
 */
eventemitter3__EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new eventemitter3__EE(fn, context || this, true),
      evt = eventemitter3__prefix ? eventemitter3__prefix + event : event;

  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;else if (!this._events[evt].fn) this._events[evt].push(listener);else this._events[evt] = [this._events[evt], listener];

  return this;
};

/**
 * Remove the listeners of a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn Only remove the listeners that match this function.
 * @param {Mixed} context Only remove the listeners that have this context.
 * @param {Boolean} once Only remove one-time listeners.
 * @returns {EventEmitter} `this`.
 * @api public
 */
eventemitter3__EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = eventemitter3__prefix ? eventemitter3__prefix + event : event;

  if (!this._events[evt]) return this;
  if (!fn) {
    if (--this._eventsCount === 0) this._events = new eventemitter3__Events();else delete this._events[evt];
    return this;
  }

  var listeners = this._events[evt];

  if (listeners.fn) {
    if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
      if (--this._eventsCount === 0) this._events = new eventemitter3__Events();else delete this._events[evt];
    }
  } else {
    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
      if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) {
        events.push(listeners[i]);
      }
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;else if (--this._eventsCount === 0) this._events = new eventemitter3__Events();else delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners, or those of the specified event.
 *
 * @param {String|Symbol} [event] The event name.
 * @returns {EventEmitter} `this`.
 * @api public
 */
eventemitter3__EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;

  if (event) {
    evt = eventemitter3__prefix ? eventemitter3__prefix + event : event;
    if (this._events[evt]) {
      if (--this._eventsCount === 0) this._events = new eventemitter3__Events();else delete this._events[evt];
    }
  } else {
    this._events = new eventemitter3__Events();
    this._eventsCount = 0;
  }

  return this;
};

//
// Alias methods names because people roll like that.
//
eventemitter3__EventEmitter.prototype.off = eventemitter3__EventEmitter.prototype.removeListener;
eventemitter3__EventEmitter.prototype.addListener = eventemitter3__EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
eventemitter3__EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
eventemitter3__EventEmitter.prefixed = eventemitter3__prefix;

//
// Allow `EventEmitter` to be imported as module namespace.
//
eventemitter3__EventEmitter.EventEmitter = eventemitter3__EventEmitter;

//
// Expose the module.
//
if ('undefined' !== typeof $m['eventemitter3']) {
  $m['eventemitter3'].exports = eventemitter3__EventEmitter;
}
/*≠≠ node_modules/eventemitter3/index.js ≠≠*/

/*== node_modules/uuid/rng-browser.js ==*/
$m['uuid/rng-browser'] = { exports: {} };

var uuidrngbrowser__rng;

if (global.crypto && crypto.getRandomValues) {
  // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
  // Moderately fast, high quality
  var uuidrngbrowser___rnds8 = new Uint8Array(16);
  uuidrngbrowser__rng = function whatwgRNG() {
    crypto.getRandomValues(uuidrngbrowser___rnds8);
    return uuidrngbrowser___rnds8;
  };
}

if (!uuidrngbrowser__rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var uuidrngbrowser___rnds = new Array(16);
  uuidrngbrowser__rng = function () {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      uuidrngbrowser___rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return uuidrngbrowser___rnds;
  };
}

$m['uuid/rng-browser'].exports = uuidrngbrowser__rng;
/*≠≠ node_modules/uuid/rng-browser.js ≠≠*/

/*== node_modules/superagent/lib/request.js ==*/
$m['superagent/lib/request'] = { exports: {} };

// The node and browser modules expose versions of this with the
// appropriate constructor function bound as first argument
/**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */

function superagentlibrequest__request(RequestConstructor, method, url) {
  // callback
  if ('function' == typeof url) {
    return new RequestConstructor('GET', method).end(url);
  }

  // url first
  if (2 == arguments.length) {
    return new RequestConstructor('GET', method);
  }

  return new RequestConstructor(method, url);
}

$m['superagent/lib/request'].exports = superagentlibrequest__request;
/*≠≠ node_modules/superagent/lib/request.js ≠≠*/

/*== node_modules/@yr/runtime/index.js ==*/
$m['@yr/runtime'] = { exports: {} };

/**
 * Determine if the current runtime is server or browser
 * https://github.com/yr/runtime
 * @copyright Yr
 * @license MIT
 */

var yrruntime__isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

$m['@yr/runtime'].exports.isServer = yrruntime__isNode;
$m['@yr/runtime'].exports.isBrowser = !yrruntime__isNode;
/*≠≠ node_modules/@yr/runtime/index.js ≠≠*/

/*== node_modules/object-assign/index.js ==*/
$m['object-assign'] = { exports: {} };
/* eslint-disable no-unused-vars */

var objectassign__hasOwnProperty = Object.prototype.hasOwnProperty;
var objectassign__propIsEnumerable = Object.prototype.propertyIsEnumerable;

function objectassign__toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function objectassign__shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc'); // eslint-disable-line
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !== 'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (e) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

$m['object-assign'].exports = objectassign__shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = objectassign__toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (objectassign__hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (objectassign__propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};
/*≠≠ node_modules/object-assign/index.js ≠≠*/

/*== node_modules/reduce-component/index.js ==*/
$m['reduce-component'] = { exports: {} };
"use strict";

/**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */

$m['reduce-component'].exports = function (arr, fn, initial) {
  var idx = 0;
  var len = arr.length;
  var curr = arguments.length == 3 ? initial : arr[idx++];

  while (idx < len) {
    curr = fn.call(null, curr, arr[idx], ++idx, arr);
  }

  return curr;
};
/*≠≠ node_modules/reduce-component/index.js ≠≠*/

/*== node_modules/component-emitter/index.js ==*/
$m['component-emitter'] = { exports: {} };

/**
 * Expose `Emitter`.
 */

if (typeof $m['component-emitter'] !== 'undefined') {
  $m['component-emitter'].exports = componentemitter__Emitter;
}

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function componentemitter__Emitter(obj) {
  if (obj) return componentemitter__mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function componentemitter__mixin(obj) {
  for (var key in componentemitter__Emitter.prototype) {
    obj[key] = componentemitter__Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

componentemitter__Emitter.prototype.on = componentemitter__Emitter.prototype.addEventListener = function (event, fn) {
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || []).push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

componentemitter__Emitter.prototype.once = function (event, fn) {
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

componentemitter__Emitter.prototype.off = componentemitter__Emitter.prototype.removeListener = componentemitter__Emitter.prototype.removeAllListeners = componentemitter__Emitter.prototype.removeEventListener = function (event, fn) {
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

componentemitter__Emitter.prototype.emit = function (event) {
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1),
      callbacks = this._callbacks['$' + event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

componentemitter__Emitter.prototype.listeners = function (event) {
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

componentemitter__Emitter.prototype.hasListeners = function (event) {
  return !!this.listeners(event).length;
};
/*≠≠ node_modules/component-emitter/index.js ≠≠*/

/*== node_modules/deep-freeze/index.js ==*/
$m['deep-freeze'] = { exports: {} };
"use strict";

$m['deep-freeze'].exports = function deepFreeze(o) {
  Object.freeze(o);

  Object.getOwnPropertyNames(o).forEach(function (prop) {
    if (o.hasOwnProperty(prop) && o[prop] !== null && (typeof o[prop] === "object" || typeof o[prop] === "function") && !Object.isFrozen(o[prop])) {
      deepFreeze(o[prop]);
    }
  });

  return o;
};
/*≠≠ node_modules/deep-freeze/index.js ≠≠*/

/*== node_modules/performance-now/lib/performance-now.js ==*/
$m['performance-now'] = { exports: {} };
"use strict";

// Generated by CoffeeScript 1.7.1
(function () {
  var getNanoSeconds, hrtime, loadTime;

  if (typeof performance !== "undefined" && performance !== null && performance.now) {
    $m['performance-now'].exports = function () {
      return performance.now();
    };
  } else if (typeof process !== "undefined" && process !== null && process.hrtime) {
    $m['performance-now'].exports = function () {
      return (getNanoSeconds() - loadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function () {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    loadTime = getNanoSeconds();
  } else if (Date.now) {
    $m['performance-now'].exports = function () {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    $m['performance-now'].exports = function () {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }
}).call(undefined);
/*≠≠ node_modules/performance-now/lib/performance-now.js ≠≠*/

/*== node_modules/@yr/keys/index.js ==*/
$m['@yr/keys'] = { exports: {} };

/**
 * String/keys utilities
 * https://github.com/yr/keys
 * @copyright Yr
 * @license MIT
 */

$m['@yr/keys'].exports.separator = '/';

/**
 * Retrieve segments of 'key' based on slice indexes 'begin' and 'end'
 * @param {String} key
 * @param {Number} begin
 * @param {Number} [end]
 * @returns {String}
 */
$m['@yr/keys'].exports.slice = function slice(key, begin, end) {
  if (!key || 'string' != typeof key) return key;

  var leading = '';

  if (key.charAt(0) == $m['@yr/keys'].exports.separator) {
    key = key.slice(1);
    // Store if slicing from beginning
    leading = begin == 0 ? $m['@yr/keys'].exports.separator : '';
  }

  var segs = key.split($m['@yr/keys'].exports.separator);

  return leading + segs.slice(begin, end).join($m['@yr/keys'].exports.separator);
};

/**
 * Retrieve first segment of 'key'
 * @param {String} key
 * @returns {String}
 */
$m['@yr/keys'].exports.first = function first(key) {
  return $m['@yr/keys'].exports.slice(key, 0, 1);
};

/**
 * Retrieve last segment of 'key'
 * @param {String} key
 * @returns {String}
 */
$m['@yr/keys'].exports.last = function last(key) {
  return $m['@yr/keys'].exports.slice(key, -1);
};

/**
 * Retrieve number of key segments
 * @param {String} key
 * @returns {Number}
 */
$m['@yr/keys'].exports.length = function length(key) {
  if ('string' != typeof key) return 0;

  // Trim leading '/'
  if (key.charAt(0) == $m['@yr/keys'].exports.separator) key = key.slice(1);

  if (!key) return 0;

  return key.split($m['@yr/keys'].exports.separator).length;
};

/**
 * Join '...keys' with exports.separator
 * @returns {String}
 */
$m['@yr/keys'].exports.join = function join() {
  for (var _len = arguments.length, keys = Array(_len), _key = 0; _key < _len; _key++) {
    keys[_key] = arguments[_key];
  }

  var key = keys[0];

  for (var i = 1, n = keys.length; i < n; i++) {
    var k = keys[i];
    if (k !== null && k !== undefined && k !== '' && k !== $m['@yr/keys'].exports.separator) {
      // Handle numbers
      k = String(k);
      // Add leading slash for subsequent keys
      if (key.charAt(key.length - 1) != $m['@yr/keys'].exports.separator && k.charAt(0) != $m['@yr/keys'].exports.separator) {
        key += $m['@yr/keys'].exports.separator;
      }
      key += k;
    }
  }

  return key;
};

/**
 * Merge '...keys' with exports.separator
 * taking care of overlaps
 * @returns {String}
 */
$m['@yr/keys'].exports.merge = function merge() {
  var _exports;

  var keySegments = [];
  var k = void 0,
      idx = void 0,
      len = void 0,
      segs = void 0;

  for (var _len2 = arguments.length, keys = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    keys[_key2] = arguments[_key2];
  }

  for (var i = 0, n = keys.length; i < n; i++) {
    if (k = keys[i]) {
      len = keySegments.length;

      // Strip leading '/'
      if (k.charAt(0) == $m['@yr/keys'].exports.separator) {
        k = k.slice(1);
        // Store if first key
        if (!len) {
          keySegments.push($m['@yr/keys'].exports.separator);
          len++;
        }
      }

      segs = k.split($m['@yr/keys'].exports.separator);
      idx = len ? segs.indexOf(keySegments[len - 1]) : -1;
      // No overlap
      if (!len || idx > len || idx == -1) {
        keySegments = keySegments.concat(segs);
        // Overlap
      } else {
        for (var j = idx; j >= 0; j--) {
          // No match
          if (segs[j] != keySegments[len - 1 - (idx - j)]) break;
          // Matched up to beginning, so slice
          if (j == 0) segs = segs.slice(idx + 1);
        }
        keySegments = keySegments.concat(segs);
      }
    }
  }

  return (_exports = $m['@yr/keys'].exports).join.apply(_exports, keySegments);
};

/**
 * Escape 'key' segment separators
 * @param {String} key
 * @returns {String}
 */
$m['@yr/keys'].exports.escape = function escape(key) {
  return key.replace(/\//g, '___');
};

/**
 * Unescape escaped 'key' segment separators
 * @param {String} key
 * @returns {String}
 */
$m['@yr/keys'].exports.unescape = function unescape(key) {
  return key.replace(/___/g, $m['@yr/keys'].exports.separator);
};
/*≠≠ node_modules/@yr/keys/index.js ≠≠*/

/*== node_modules/is-plain-obj/index.js ==*/
$m['is-plain-obj'] = { exports: {} };

var isplainobj__toString = Object.prototype.toString;

$m['is-plain-obj'].exports = function (x) {
	var prototype;
	return isplainobj__toString.call(x) === '[object Object]' && (prototype = Object.getPrototypeOf(x), prototype === null || prototype === Object.getPrototypeOf({}));
};
/*≠≠ node_modules/is-plain-obj/index.js ≠≠*/

/*== node_modules/ms/index.js ==*/
$m['ms'] = { exports: {} };

/**
 * Helpers.
 */

var ms__s = 1000;
var ms__m = ms__s * 60;
var ms__h = ms__m * 60;
var ms__d = ms__h * 24;
var ms__y = ms__d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

$m['ms'].exports = function (val, options) {
  options = options || {};
  if ('string' == typeof val) return ms__parse(val);
  return options.long ? ms__long(val) : ms__short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function ms__parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * ms__y;
    case 'days':
    case 'day':
    case 'd':
      return n * ms__d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * ms__h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * ms__m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * ms__s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function ms__short(ms) {
  if (ms >= ms__d) return Math.round(ms / ms__d) + 'd';
  if (ms >= ms__h) return Math.round(ms / ms__h) + 'h';
  if (ms >= ms__m) return Math.round(ms / ms__m) + 'm';
  if (ms >= ms__s) return Math.round(ms / ms__s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function ms__long(ms) {
  return ms__plural(ms, ms__d, 'day') || ms__plural(ms, ms__h, 'hour') || ms__plural(ms, ms__m, 'minute') || ms__plural(ms, ms__s, 'second') || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function ms__plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}
/*≠≠ node_modules/ms/index.js ≠≠*/

/*== node_modules/superagent-retry/lib/retries.js ==*/
$m['superagent-retry/lib/retries'] = { exports: {} };

/**
 * Common retry conditions
 */

$m['superagent-retry/lib/retries'].exports = [superagentretrylibretries__econnreset, superagentretrylibretries__etimedout, superagentretrylibretries__eaddrinfo, superagentretrylibretries__esockettimedout, superagentretrylibretries__gateway, superagentretrylibretries__timeout, superagentretrylibretries__internal];

/**
 * Connection reset detection
 */

function superagentretrylibretries__econnreset(err, res) {
  return err && err.code === 'ECONNRESET';
}

/**
 * Timeout detection
 */

function superagentretrylibretries__etimedout(err, res) {
  return err && err.code === 'ETIMEDOUT';
}

/**
 * Can't get address info
 */

function superagentretrylibretries__eaddrinfo(err, res) {
  return err && err.code === 'EADDRINFO';
}

/**
 * Socket timeout detection
 */

function superagentretrylibretries__esockettimedout(err, res) {
  return err && err.code === 'ESOCKETTIMEDOUT';
}

/**
 * Internal server error
 */

function superagentretrylibretries__internal(err, res) {
  return res && res.status === 500;
}

/**
 * Bad gateway error detection
 */

function superagentretrylibretries__gateway(err, res) {
  return res && [502, 503, 504].indexOf(res.status) !== -1;
}

/**
 * Superagent timeout errors
 */

function superagentretrylibretries__timeout(err, res) {
  return err && /^timeout of \d+ms exceeded$/.test(err.message);
}
/*≠≠ node_modules/superagent-retry/lib/retries.js ≠≠*/

/*== node_modules/superagent/lib/is-object.js ==*/
$m['superagent/lib/is-object'] = { exports: {} };

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function superagentlibisobject__isObject(obj) {
  return null !== obj && 'object' === typeof obj;
}

$m['superagent/lib/is-object'].exports = superagentlibisobject__isObject;
/*≠≠ node_modules/superagent/lib/is-object.js ≠≠*/

/*== node_modules/uuid/uuid.js ==*/
$m['uuid'] = { exports: {} };
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var uuid___rng = $m['uuid/rng-browser'].exports;

// Maps for number <-> hex string conversion
var uuid___byteToHex = [];
var uuid___hexToByte = {};
for (var uuid__i = 0; uuid__i < 256; uuid__i++) {
  uuid___byteToHex[uuid__i] = (uuid__i + 0x100).toString(16).substr(1);
  uuid___hexToByte[uuid___byteToHex[uuid__i]] = uuid__i;
}

// **`parse()` - Parse a UUID into it's component bytes**
function uuid__parse(s, buf, offset) {
  var i = buf && offset || 0,
      ii = 0;

  buf = buf || [];
  s.toLowerCase().replace(/[0-9a-f]{2}/g, function (oct) {
    if (ii < 16) {
      // Don't overflow!
      buf[i + ii++] = uuid___hexToByte[oct];
    }
  });

  // Zero out remaining bytes if string was short
  while (ii < 16) {
    buf[i + ii++] = 0;
  }

  return buf;
}

// **`unparse()` - Convert UUID byte array (ala parse()) into a string**
function uuid__unparse(buf, offset) {
  var i = offset || 0,
      bth = uuid___byteToHex;
  return bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + '-' + bth[buf[i++]] + bth[buf[i++]] + '-' + bth[buf[i++]] + bth[buf[i++]] + '-' + bth[buf[i++]] + bth[buf[i++]] + '-' + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]];
}

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var uuid___seedBytes = uuid___rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var uuid___nodeId = [uuid___seedBytes[0] | 0x01, uuid___seedBytes[1], uuid___seedBytes[2], uuid___seedBytes[3], uuid___seedBytes[4], uuid___seedBytes[5]];

// Per 4.2.2, randomize (14 bit) clockseq
var uuid___clockseq = (uuid___seedBytes[6] << 8 | uuid___seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var uuid___lastMSecs = 0,
    uuid___lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function uuid__v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : uuid___clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : uuid___lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = msecs - uuid___lastMSecs + (nsecs - uuid___lastNSecs) / 10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > uuid___lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  uuid___lastMSecs = msecs;
  uuid___lastNSecs = nsecs;
  uuid___clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = msecs / 0x100000000 * 10000 & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || uuid___nodeId;
  for (var n = 0; n < 6; n++) {
    b[i + n] = node[n];
  }

  return buf ? buf : uuid__unparse(b);
}

// **`v4()` - Generate random UUID**

// See https://github.com/broofa/node-uuid for API details
function uuid__v4(options, buf, offset) {
  // Deprecated - 'format' argument, as supported in v1.2
  var i = buf && offset || 0;

  if (typeof options == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || uuid___rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = rnds[6] & 0x0f | 0x40;
  rnds[8] = rnds[8] & 0x3f | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ii++) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || uuid__unparse(rnds);
}

// Export public API
var uuid__uuid = uuid__v4;
uuid__uuid.v1 = uuid__v1;
uuid__uuid.v4 = uuid__v4;
uuid__uuid.parse = uuid__parse;
uuid__uuid.unparse = uuid__unparse;

$m['uuid'].exports = uuid__uuid;
/*≠≠ node_modules/uuid/uuid.js ≠≠*/

/*== node_modules/@yr/time/index.js ==*/
$m['@yr/time'] = { exports: {} };

/**
 * Time utilities
 * https://github.com/yr/time
 * @copyright Yr
 * @license MIT
 */

var yrtime__isPlainObject = $m['is-plain-obj'].exports;

var yrtime__DEFAULT_DATE = 'Invalid Date';
var yrtime__DEFAULT_DAY_STARTS_AT = 0;
var yrtime__DEFAULT_NIGHT_STARTS_AT = 18;
var yrtime__DEFAULT_OFFSET = '+00:00';
var yrtime__DEFAULT_PARSE_KEYS = ['created', 'end', 'from', 'rise', 'set', 'start', 'times', 'to', 'update'];
var yrtime__FLAGS = {
  Y: 1,
  M: 2,
  D: 4,
  H: 8,
  m: 16,
  s: 32,
  S: 64
};
var yrtime__FLAGS_START_OF = {
  Y: yrtime__FLAGS.S | yrtime__FLAGS.s | yrtime__FLAGS.m | yrtime__FLAGS.H | yrtime__FLAGS.D | yrtime__FLAGS.M,
  M: yrtime__FLAGS.S | yrtime__FLAGS.s | yrtime__FLAGS.m | yrtime__FLAGS.H | yrtime__FLAGS.D,
  D: yrtime__FLAGS.S | yrtime__FLAGS.s | yrtime__FLAGS.m | yrtime__FLAGS.H,
  H: yrtime__FLAGS.S | yrtime__FLAGS.s | yrtime__FLAGS.m,
  m: yrtime__FLAGS.S | yrtime__FLAGS.s,
  s: yrtime__FLAGS.S
};
// YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ss.SSSZ or YYYY-MM-DDTHH:mm:ss+00:00
var yrtime__RE_PARSE = /^(\d{2,4})-?(\d{1,2})?-?(\d{1,2})?T?(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?\.?(\d{3})?(?:Z|(([+-])(\d{2}):?(\d{2})))?$/;
var yrtime__RE_TOKEN = /(LTS?|L{1,4}|Y{4}|Y{2}|M{1,4}|D{1,2}|d{3}r|d{2}r|d{1,4}|H{1,2}|m{1,2}|s{1,2}|S{1,3}|ZZ)/g;
var yrtime__RE_TOKEN_ESCAPE = /(\[[^\]]+\])/g;
var yrtime__RE_TOKEN_ESCAPED = /(\$\d\d?)/g;
var yrtime__dayStartsAt = yrtime__DEFAULT_DAY_STARTS_AT;
var yrtime__nightStartsAt = yrtime__DEFAULT_NIGHT_STARTS_AT;
var yrtime__parseKeys = yrtime__DEFAULT_PARSE_KEYS;

$m['@yr/time'].exports = {
  isTime: yrtime__isTime,

  /**
   * Initialize with defaults
   * @param {Object} [options]
   *  - {Number} dayStartsAt
   *  - {Number} nightStartsAt
   *  - {Array} parseKeys
   */
  init: function init() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    yrtime__dayStartsAt = options.dayStartsAt || yrtime__DEFAULT_DAY_STARTS_AT;
    yrtime__nightStartsAt = options.nightStartsAt || yrtime__DEFAULT_NIGHT_STARTS_AT;
    yrtime__parseKeys = options.parseKeys || yrtime__DEFAULT_PARSE_KEYS;
  },

  /**
   * Instance factory
   * @param {String} timeString
   * @returns {Time}
   */
  create: function create(timeString) {
    // Return if passed Time instance
    if (timeString && 'string' != typeof timeString && yrtime__isTime(timeString)) return timeString;
    return new yrtime__Time(timeString);
  },

  /**
   * Retrieve instance at current client time
   * @returns {Time}
   */
  now: function now() {
    return this.create().utc();
  },

  /**
   * Parse time strings into Time instances
   * @param {Object} obj
   * @returns {Object}
   */
  parse: function parse(obj) {
    function parseValue(value) {
      if (Array.isArray(value)) {
        return value.map(function (value) {
          return 'string' == typeof value ? new yrtime__Time(value) : traverse(value);
        });
      } else if ('string' == typeof value) {
        return new yrtime__Time(value);
      }
      return value;
    }

    function traverse(o) {
      // Abort if not object or array
      if (!(Array.isArray(o) || yrtime__isPlainObject(o))) return o;

      for (var prop in o) {
        // Only parse whitelisted keys
        o[prop] = ~yrtime__parseKeys.indexOf(prop) ? parseValue(o[prop]) : traverse(o[prop]);
      }

      return o;
    }

    return traverse(obj);
  }
};

var yrtime__Time = function () {
  /**
   * Constructor
   * @param {String} timeString
   */
  function Time(timeString) {
    babelHelpers.classCallCheck(this, Time);

    // Return if timeString not a string
    if (timeString && 'string' != typeof timeString) return timeString;

    this._date = yrtime__DEFAULT_DATE;
    this._locale = null;
    this._offset = 0;
    this._offsetString = yrtime__DEFAULT_OFFSET;
    this.isValid = false;
    this.timeString = yrtime__DEFAULT_DATE;

    // Local "now"
    if (timeString == null) timeString = yrtime__clientNow();
    // Prevent regex denial of service
    if (timeString.length > 30) return;

    var match = timeString.match(yrtime__RE_PARSE);

    if (!match) return;

    var year = +match[1];
    var month = +match[2] || 1;
    var day = +match[3] || 1;
    var hour = +match[4] || 0;
    var minute = +match[5] || 0;
    var second = +match[6] || 0;
    var millisecond = +match[7] || 0;
    var offset = match[8] || '';

    // Handle TZ offset
    if (offset && offset != yrtime__DEFAULT_OFFSET) {
      var dir = match[9] == '+' ? 1 : -1;

      this._offset = dir * (+match[10] * 60 + +match[11]);
      this._offsetString = offset;
    }

    // Create UTC date based on local time so we can always use UTC methods
    this._date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
    this.isValid = yrtime__isValid(this._date);
    this.timeString = this.toString();
  }

  /**
   * Modify TimeZone offset with new 'value' in minutes
   * @param {Number} value
   * @returns {Time}
   */

  Time.prototype.offset = function offset(value) {
    if (value == this._offset) return this;

    var instance = this.utc()._manipulate(value, 'minutes');

    instance._offset = value;
    instance._offsetString = yrtime__minutesToOffsetString(value);
    yrtime__update(instance);
    return instance;
  };

  /**
   * Add 'value' of 'unit' (years|months|days|hours|minutes|seconds|milliseconds)
   * Returns new instance
   * @param {Number} value
   * @param {String} unit
   * @returns {Time}
   */

  Time.prototype.add = function add(value, unit) {
    return this._manipulate(value, unit);
  };

  /**
   * Subtract 'value' of 'unit' (years|months|days|hours|minutes|seconds|milliseconds)
   * Returns new instance
   * @param {Number} value
   * @param {String} unit
   * @returns {Time}
   */

  Time.prototype.subtract = function subtract(value, unit) {
    return this._manipulate(value * -1, unit);
  };

  /**
   * Compute difference between 'time' of 'unit'
   * (from Moment.js)
   * @param {Time} time
   * @param {String} unit
   * @param {Boolean} [asFloat]
   * @returns {Number}
   */

  Time.prototype.diff = function diff(time, unit, asFloat) {
    if (!this.isValid) return NaN;
    if (!time.isValid) return NaN;

    unit = yrtime__normalizeUnit(unit);

    var diff = 0;
    var t1 = this;
    var t2 = time;

    if (unit == 'Y' || unit == 'M') {
      diff = t1._monthDiff(t2);
      if (unit == 'Y') diff /= 12;
    } else {
      // Correct for custom day start
      if (unit == 'D' && !asFloat) {
        t1 = t1.startOf('D');
        t2 = t2.startOf('D');
      }

      var delta = t1._date - t2._date;

      switch (unit) {
        case 'D':
          diff = delta / 864e5;
          break;
        case 'H':
          diff = delta / 36e5;
          break;
        case 'm':
          diff = delta / 6e4;
          break;
        case 's':
          diff = delta / 1e3;
          break;
        default:
          diff = delta;
      }
    }

    return asFloat ? diff : yrtime__round(diff);
  };

  /**
   * Reset to start of 'unit'
   * Returns new instance
   * @param {String} unit
   * @returns {Time}
   */

  Time.prototype.startOf = function startOf(unit) {
    if (this.isValid) {
      unit = yrtime__normalizeUnit(unit);

      var flags = yrtime__FLAGS_START_OF[unit];
      var instance = this.clone();
      var d = instance._date;

      for (var dim in yrtime__FLAGS) {
        if (flags & yrtime__FLAGS[dim]) {
          switch (dim) {
            case 'M':
              d.setUTCMonth(0);
              break;
            case 'D':
              d.setUTCDate(1);
              break;
            case 'H':
              // Adjust day if less than day start hour
              if (unit == 'D' && yrtime__dayStartsAt > d.getUTCHours()) d.setUTCDate(d.getUTCDate() - 1);
              d.setUTCHours(yrtime__dayStartsAt);
              break;
            case 'm':
              d.setUTCMinutes(0);
              break;
            case 's':
              d.setUTCSeconds(0);
              break;
            case 'S':
              d.setUTCMilliseconds(0);
              break;
          }
        }
      }

      return yrtime__update(instance);
    }

    return this;
  };

  /**
   * Get/set full year
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */

  Time.prototype.year = function year(value) {
    if (value != null) return this._set(value, 'setUTCFullYear');
    return this._date.getUTCFullYear();
  };

  /**
   * Get/set month (0-11)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */

  Time.prototype.month = function month(value) {
    if (value != null) return this._set(value, 'setUTCMonth');
    return this._date.getUTCMonth();
  };

  /**
   * Get/set date (1-31)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */

  Time.prototype.date = function date(value) {
    if (value != null) return this._set(value, 'setUTCDate');
    return this._date.getUTCDate();
  };

  /**
   * Retrieve day of week (0-6)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */

  Time.prototype.day = function day(value) {
    var day = this._date.getUTCDay();

    if (value != null) return this._set(this.date() + value - day, 'setUTCDate');
    return day;
  };

  /**
   * Get/set hour (0-23)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */

  Time.prototype.hour = function hour(value) {
    if (value != null) return this._set(value, 'setUTCHours');
    return this._date.getUTCHours();
  };

  /**
   * Get/set minute (0-59)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */

  Time.prototype.minute = function minute(value) {
    if (value != null) return this._set(value, 'setUTCMinutes');
    return this._date.getUTCMinutes();
  };

  /**
   * Get/set second (0-59)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */

  Time.prototype.second = function second(value) {
    if (value != null) return this._set(value, 'setUTCSeconds');
    return this._date.getUTCSeconds();
  };

  /**
   * Get/set millisecond (0-999)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */

  Time.prototype.millisecond = function millisecond(value) {
    if (value != null) return this._set(value, 'setUTCMilliseconds');
    return this._date.getUTCMilliseconds();
  };

  /**
   * Compare 'time', limited by 'unit', and determine if is similar
   * @param {Time} time
   * @param {String} [unit]
   * @returns {Boolean}
   */

  Time.prototype.isSame = function isSame(time, unit) {
    if (!this.isValid || !time.isValid) return false;

    unit = yrtime__normalizeUnit(unit);

    if (!unit || unit == 'S') return +this._date === +time._date;

    var t1 = this;
    var t2 = time;

    // Correct for custom day start
    if (unit == 'D') {
      t1 = t1.startOf(unit);
      t2 = t2.startOf(unit);
    }

    switch (unit) {
      case 'Y':
        return t1.year() == t2.year();
      case 'M':
        return t1.year() == t2.year() && t1.month() == t2.month();
      case 'D':
        return t1.year() == t2.year() && t1.month() == t2.month() && t1.date() == t2.date();
      case 'H':
        return t1.year() == t2.year() && t1.month() == t2.month() && t1.date() == t2.date() && t1.hour() == t2.hour();
      case 'm':
        return t1.year() == t2.year() && t1.month() == t2.month() && t1.date() == t2.date() && t1.hour() == t2.hour() && t1.minute() == t2.minute();
      case 's':
        return t1.year() == t2.year() && t1.month() == t2.month() && t1.date() == t2.date() && t1.hour() == t2.hour() && t1.minute() == t2.minute() && t1.second() == t2.second();
    }
  };

  /**
   * Compare 'time', limited by 'unit', and determine if is before
   * @param {Time} time
   * @param {String} [unit]
   * @returns {Boolean}
   */

  Time.prototype.isBefore = function isBefore(time, unit) {
    if (!this.isValid || !time.isValid) return false;

    unit = yrtime__normalizeUnit(unit);

    if (!unit || unit == 'S') return +this._date < +time._date;

    var Y1 = this.year();
    var Y2 = time.year();
    var M1 = this.month();
    var M2 = time.month();
    var D1 = this.date();
    var D2 = time.date();
    var H1 = this.hour();
    var H2 = time.hour();
    var m1 = this.minute();
    var m2 = time.minute();
    var s1 = this.second();
    var s2 = time.second();
    var test = false;

    test = Y1 > Y2;
    if (unit == 'Y') return test;
    test = test || Y1 == Y2 && M1 > M2;
    if (unit == 'M') return test;
    test = test || M1 == M2 && D1 > D2;
    if (unit == 'D') return test;
    test = test || D1 == D2 && H1 > H2;
    if (unit == 'H') return test;
    test = test || H1 == H2 && m1 > m2;
    if (unit == 'm') return test;
    test = test || m1 == m2 && s1 > s2;

    return test;
  };

  /**
   * Set 'locale'
   * @param {Object} locale
   * @returns {Time}
   */

  Time.prototype.locale = function locale(_locale) {
    var instance = this.clone();

    instance._locale = _locale;
    return instance;
  };

  /**
   * Format into string based on 'mask'
   * @param {String} mask
   * @param {Number} [daysFromNow]
   * @returns {String}
   */

  Time.prototype.format = function format(mask, daysFromNow) {
    var _this = this;

    if (!mask) return this.timeString;
    // Prevent regex denial of service
    if (mask.length > 100) return '';

    var relativeDay = daysFromNow != null ? this._getRelativeDay(daysFromNow) : '';
    var escaped = [];
    var idx = 0;

    // Remove all escaped text (in [xxx])
    mask = mask.replace(yrtime__RE_TOKEN_ESCAPE, function (match) {
      escaped.push(match.slice(1, -1));
      return '$' + idx++;
    });

    mask = mask.replace(yrtime__RE_TOKEN, function (match) {
      switch (match) {
        case 'LT':
        case 'LTS':
        case 'L':
        case 'LL':
        case 'LLL':
        case 'LLLL':
          return _this._locale && _this._locale.format && _this._locale.format[match] ? _this.format(_this._locale.format[match], daysFromNow) : '[missing locale]';
        case 'YY':
          return String(_this.year()).slice(-2);
        case 'YYYY':
          return _this.year();
        case 'M':
          return _this.month() + 1;
        case 'MM':
          return yrtime__pad(_this.month() + 1);
        case 'MMM':
          return _this._locale && _this._locale.monthsShort ? _this._locale.monthsShort[_this.month()] : '[missing locale]';
        case 'MMMM':
          return _this._locale && _this._locale.months ? _this._locale.months[_this.month()] : '[missing locale]';
        case 'D':
          return _this.date();
        case 'DD':
          return yrtime__pad(_this.date());
        case 'ddr':
          if (relativeDay) return _this._locale && _this._locale[relativeDay] ? _this._locale[relativeDay] : '[missing locale]';
          return _this._locale && _this._locale.daysShort ? _this._locale.daysShort[_this.day()] : '[missing locale]';
        case 'dddr':
          if (relativeDay) return _this._locale && _this._locale[relativeDay] ? _this._locale[relativeDay] : '[missing locale]';
          return _this._locale && _this._locale.days ? _this._locale.days[_this.day()] : '[missing locale]';
        case 'd':
          return _this.day();
        case 'ddd':
          return _this._locale && _this._locale.daysShort ? _this._locale.daysShort[_this.day()] : '[missing locale]';
        case 'dddd':
          return _this._locale && _this._locale.days ? _this._locale.days[_this.day()] : '[missing locale]';
        case 'H':
          return _this.hour();
        case 'HH':
          return yrtime__pad(_this.hour());
        case 'm':
          return _this.minute();
        case 'mm':
          return yrtime__pad(_this.minute());
        case 's':
          return _this.second();
        case 'ss':
          return yrtime__pad(_this.second());
        case 'S':
          return Math.floor(_this.millisecond() / 100);
        case 'SS':
          return Math.floor(_this.millisecond() / 10);
        case 'SSS':
          return _this.millisecond();
        case 'ZZ':
          return _this._offsetString;
        default:
          return '';
      }
    });

    // Replace all escaped text
    if (escaped.length) {
      mask = mask.replace(yrtime__RE_TOKEN_ESCAPED, function (match) {
        return escaped[match.slice(1)];
      });
    }

    return mask;
  };

  /**
   * Retrieve instance of current time
   * @returns {Time}
   */

  Time.prototype.now = function now() {
    var instance = new Time().offset(this._offset);

    instance._locale = this._locale;
    return instance;
  };

  /**
   * Retrieve instance at UTC time
   * @returns {Time}
   */

  Time.prototype.utc = function utc() {
    if (!this._offset) return this.clone();

    var t = this.subtract(this._offset, 'minutes');

    t._offset = 0;
    t._offsetString = yrtime__DEFAULT_OFFSET;
    return yrtime__update(t);
  };

  /**
   * Clone instance
   * @returns {Time}
   */

  Time.prototype.clone = function clone() {
    var instance = new Time(this.timeString);

    instance._locale = this._locale;
    return instance;
  };

  /**
   * Set 'value' using 'method'
   * Returns new instance
   * @param {Number} value
   * @param {String} method
   * @returns {Time}
   */

  Time.prototype._set = function _set(value, method) {
    var instance = this.clone();
    var d = instance._date;

    d[method](value);
    return yrtime__update(instance);
  };

  /**
   * Retrieve relative day type based on number of days from "now"
   * @param {Number} daysFromNow
   * @returns {String}
   */

  Time.prototype._getRelativeDay = function _getRelativeDay(daysFromNow) {
    if (daysFromNow != null && daysFromNow < 2) {
      var hour = this.hour();

      return daysFromNow == 1 ? 'tomorrow' : hour >= yrtime__nightStartsAt || hour < yrtime__dayStartsAt ? 'tonight' : 'today';
    }
    return '';
  };

  /**
   * Add/subtract 'value' in 'unit'
   * Returns new instance
   * @param {Number} value
   * @param {String} unit
   * @returns {Time}
   */

  Time.prototype._manipulate = function _manipulate(value, unit) {
    if (this.isValid) {
      var instance = this.clone();
      var d = instance._date;

      switch (yrtime__normalizeUnit(unit)) {
        case 'Y':
          d.setUTCFullYear(d.getUTCFullYear() + value);
          break;
        case 'M':
          d.setUTCMonth(d.getUTCMonth() + value);
          break;
        case 'D':
        case 'd':
          d.setUTCDate(d.getUTCDate() + value);
          break;
        case 'H':
          d.setUTCHours(d.getUTCHours() + value);
          break;
        case 'm':
          d.setUTCMinutes(d.getUTCMinutes() + value);
          break;
        case 's':
          d.setUTCSeconds(d.getUTCSeconds() + value);
          break;
        case 'S':
          d.setUTCMilliseconds(d.getUTCMilliseconds() + value);
          break;
      }

      return yrtime__update(instance);
    }

    return this;
  };

  /**
   * Compute difference between 'time' in months
   * (from Moment.js)
   * @param {Time} time
   * @returns {Number}
   */

  Time.prototype._monthDiff = function _monthDiff(time) {
    var wholeMonthDiff = (time._date.getUTCFullYear() - this._date.getUTCFullYear()) * 12 + (time._date.getUTCMonth() - this._date.getUTCMonth());
    var anchor = this._manipulate(wholeMonthDiff, 'M');
    var adjust = void 0;

    if (time._date - anchor._date < 0) {
      var anchor2 = this._manipulate(wholeMonthDiff - 1, 'M');

      adjust = (time._date - anchor._date) / (anchor._date - anchor2._date);
    } else {
      var _anchor = this._manipulate(wholeMonthDiff + 1, 'M');

      adjust = (time._date - anchor._date) / (_anchor._date - anchor._date);
    }

    return -(wholeMonthDiff + adjust);
  };

  /**
   * Retrieve stringified
   * @returns {String}
   */

  Time.prototype.toString = function toString() {
    if (!this.isValid) return 'Invalid Date';
    return this._date.toISOString().replace('Z', this._offsetString);
  };

  /**
   * Convert to JSON format
   * @returns {String}
   */

  Time.prototype.toJSON = function toJSON() {
    return this.timeString;
  };

  /**
   * Retrieve number of milliseconds UTC
   * @returns {Number}
   */

  Time.prototype.valueOf = function valueOf() {
    if (!this.isValid) return NaN;
    return +this._date;
  };

  return Time;
}();

/**
 * Retrieve timestring for client "now"
 * @returns {String}
 */

function yrtime__clientNow() {
  var d = new Date();
  var offset = -1 * d.getTimezoneOffset();

  d.setUTCMinutes(d.getUTCMinutes() + offset);
  return d.toISOString().replace('Z', yrtime__minutesToOffsetString(offset));
}

/**
 * Update 'instance' state
 * @param {Time} instance
 * @returns {Time}
 */
function yrtime__update(instance) {
  instance.isValid = yrtime__isValid(instance._date);
  instance.timeString = instance.toString();
  return instance;
}

/**
 * Normalize 'unit'
 * @param {Strong} unit
 * @returns {String}
 */
function yrtime__normalizeUnit(unit) {
  switch (unit) {
    case 'year':
    case 'years':
    case 'Y':
    case 'y':
      return 'Y';
    case 'month':
    case 'months':
    case 'M':
      return 'M';
    case 'day':
    case 'days':
    case 'date':
    case 'dates':
    case 'D':
    case 'd':
      return 'D';
    case 'hour':
    case 'hours':
    case 'H':
    case 'h':
      return 'H';
    case 'minute':
    case 'minutes':
    case 'm':
      return 'm';
    case 'second':
    case 'seconds':
    case 's':
      return 's';
    case 'millisecond':
    case 'milliseconds':
    case 'ms':
    case 'S':
      return 'S';
  }
  return unit;
}

/**
 * Validate 'date' object
 * @param {Date} date
 * @returns {Boolean}
 */
function yrtime__isValid(date) {
  return Object.prototype.toString.call(date) == '[object Date]' && !isNaN(date.getTime());
}

/**
 * Determine if 'time' is a Time instance
 * @param {Time} time
 * @returns {Boolean}
 */
function yrtime__isTime(time) {
  return time != null && time._manipulate != null && time._date != null;
}

/**
 * Round 'value' towards 0
 * @param {Number} value
 * @returns {Number}
 */
function yrtime__round(value) {
  if (value < 0) return Math.ceil(value);
  return Math.floor(value);
}

/**
 * Pad 'value' with zeros up to desired 'length'
 * @param {String|Number} value
 * @param {Number} length
 * @returns {String}
 */
function yrtime__pad(value, length) {
  value = String(value);
  length = length || 2;

  while (value.length < length) {
    value = '0' + value;
  }

  return value;
}

/**
 * Convert 'minutes' to offset string
 * @param {Number} minutes
 * @returns {String}
 */
function yrtime__minutesToOffsetString(minutes) {
  var t = String(Math.abs(minutes / 60)).split('.');
  var H = yrtime__pad(t[0]);
  var m = t[1] ? parseInt(t[1], 10) * 0.6 : 0;
  var sign = minutes < 0 ? '-' : '+';

  return '' + sign + H + ':' + yrtime__pad(m);
}
/*≠≠ node_modules/@yr/time/index.js ≠≠*/

/*== node_modules/@yr/property/lib/needsMerge.js ==*/
$m['@yr/property/lib/needsMerge'] = { exports: {} };

var yrpropertylibneedsMerge__isPlainObject = $m['is-plain-obj'].exports;

/**
 * Test if 'value' should be merged into 'obj' at 'key'
 * @param {Object} obj
 * @param {String} key
 * @param {Object} value
 * @returns {Boolean}
 */
$m['@yr/property/lib/needsMerge'].exports = function needsMerge(obj, key, value) {
  return key in obj && yrpropertylibneedsMerge__isPlainObject(obj[key]) && yrpropertylibneedsMerge__isPlainObject(value);
};
/*≠≠ node_modules/@yr/property/lib/needsMerge.js ≠≠*/

/*== node_modules/@yr/property/lib/clone.js ==*/
$m['@yr/property/lib/clone'] = { exports: {} };

var yrpropertylibclone__isPlainObject = $m['is-plain-obj'].exports;

/**
 * Shallow clone 'value' if it's an array or plain object
 * @param {Object|Array|Number|String} value
 * @returns {Object|Array|Number|String}
 */
$m['@yr/property/lib/clone'].exports = function clone(value) {
  if (value != null) {
    if (Array.isArray(value)) return value.slice();

    if (yrpropertylibclone__isPlainObject(value)) {
      var obj = {};

      for (var prop in value) {
        // Copy own properties
        if (value.hasOwnProperty(prop)) {
          obj[prop] = value[prop];
        }
      }

      return obj;
    }
  }

  return value;
};
/*≠≠ node_modules/@yr/property/lib/clone.js ≠≠*/

/*== node_modules/@yr/property/lib/write.js ==*/
$m['@yr/property/lib/write'] = { exports: {} };

var yrpropertylibwrite__clone = $m['@yr/property/lib/clone'].exports;
var yrpropertylibwrite__needsMerge = $m['@yr/property/lib/needsMerge'].exports;

/**
 * Write 'value' at 'key' of 'obj'
 * Handles merging of object properties if necessary
 * @param {Object} obj
 * @param {String} key
 * @param {Object} value
 * @param {Boolean} merge
 * @returns {Boolean}
 */
$m['@yr/property/lib/write'].exports = function write(obj, key, value, merge) {
  var mutated = false;

  // Don't write if values are the same
  if (obj[key] !== value) {
    // Merge with existing if both objects (not array)
    if (merge && yrpropertylibwrite__needsMerge(obj, key, value)) {
      // Merged object must be unique, regardless of immutability
      obj[key] = yrpropertylibwrite__clone(obj[key]);
      for (var k in value) {
        // Only write if not equal
        if (obj[key][k] !== value[k]) {
          obj[key][k] = value[k];
          mutated = true;
        }
      }

      // Overwrite
    } else if (obj[key] !== value) {
      obj[key] = value;
      mutated = true;
    }
  }

  return mutated;
};
/*≠≠ node_modules/@yr/property/lib/write.js ≠≠*/

/*== node_modules/@yr/property/index.js ==*/
$m['@yr/property'] = { exports: {} };

/**
 * Generic utility for getting/setting properties of an object
 * https://github.com/yr/property
 * @copyright Yr
 * @license MIT
 */

var yrproperty__clone = $m['@yr/property/lib/clone'].exports;
var yrproperty__deepFreeze = $m['deep-freeze'].exports;
var yrproperty__isPlainObject = $m['is-plain-obj'].exports;
var yrproperty__needsMerge = $m['@yr/property/lib/needsMerge'].exports;
var yrproperty__write = $m['@yr/property/lib/write'].exports;

var yrproperty__DEAULT_OPTIONS = {
  immutable: false,
  merge: true
};

var yrproperty__isProduction = process.env.NODE_ENV == 'production';

$m['@yr/property'].exports.separator = '/';

/**
 * Retrieve value for 'key' of 'obj'
 * @param {Object} obj
 * @param {String} key
 * @returns {Object}
 */
$m['@yr/property'].exports.get = function get(obj, key) {
  if ('string' != typeof key) return null;

  // Return all if empty key
  if (key == '') return obj;

  var _exports = $m['@yr/property'].exports;
  var separator = _exports.separator;

  // Not nested

  if (!~key.indexOf(separator)) return obj[key];

  var keys = key.split(separator);
  var idx = 0;

  // Walk property chain
  while (idx < keys.length) {
    if (obj[keys[idx]] == null) return null;
    obj = obj[keys[idx]];
    idx++;
  }

  return obj;
};

/**
 * Store 'value' at 'key' of 'obj'
 * Returns new object if 'immutable', or original if not
 * @param {Object} obj
 * @param {String} key
 * @param {Object} value
 * @param {Object} options
 *  - {Boolean} immutable
 *  - {Boolean} merge
 * @returns {Object}
 */
$m['@yr/property'].exports.set = function set(obj, key, value, options) {
  options = options || yrproperty__DEAULT_OPTIONS;

  var _exports2 = $m['@yr/property'].exports;
  var separator = _exports2.separator;
  var _options = options;
  var immutable = _options.immutable;
  var _options$merge = _options.merge;
  var merge = _options$merge === undefined ? true : _options$merge;

  var handleFrozen = !yrproperty__isProduction;
  var mutated = false;
  var originalObj = obj;

  if (key && 'string' == typeof key) {
    // Clone root when immutable, or frozen if mutable
    if (immutable || handleFrozen && Object.isFrozen(obj)) obj = yrproperty__clone(obj);
    // Not nested
    if (!~key.indexOf(separator)) {
      // Create new copy if we are merging props
      if (immutable && yrproperty__needsMerge(obj, key, value)) obj[key] = yrproperty__clone(obj[key]);
      mutated = yrproperty__write(obj, key, value, merge);
    } else {
      var keys = key.split(separator);
      var idx = 0;
      var o = obj;

      // Walk parent tree, creating nodes if necessary
      while (idx < keys.length - 1) {
        var prop = keys[idx];
        var isObject = yrproperty__isPlainObject(o[prop]);

        // Clone each parent object if immutable, or unfreeze if mutable
        if (immutable || handleFrozen && isObject && Object.isFrozen(o[prop])) o[prop] = yrproperty__clone(o[prop]);
        // Create object if it doesn't exist, or overwrite if it does
        if (o[prop] == null || !isObject) o[prop] = {};
        o = o[prop];
        idx++;
      }

      if (immutable) value = yrproperty__freeze(value);
      mutated = yrproperty__write(o, keys[idx], value, merge);
    }

    if (immutable) obj = yrproperty__freeze(obj);

    return mutated ? obj : originalObj;
  }

  return originalObj;
};

/**
 * Reshape 'obj' so that property keys are of length 'depth'
 * @param {Object} obj
 * @param {Number} depth
 * @returns {Object}
 */
$m['@yr/property'].exports.reshape = function reshape(obj, depth) {
  if (depth == null || depth <= 0) return obj;

  var _exports3 = $m['@yr/property'].exports;
  var separator = _exports3.separator;
  var set = _exports3.set;

  var options = { immutable: false };

  function parse(obj, key, n) {
    var o = {};

    for (var prop in obj) {
      var leading = prop.indexOf(separator) == 0 ? separator : '';
      var p = leading ? prop.slice(1) : prop;
      var keys = p.split(separator);
      var value = obj[prop];

      if (keys.length == n) {
        o['' + key + prop] = value;

        // Inflate already flattened
      } else if (keys.length > n) {
        var key1 = '' + leading + keys.slice(0, n).join(separator);
        var key2 = keys.slice(n).join(separator);

        if (!o['' + key + key1]) o['' + key + key1] = {};
        set(o['' + key + key1], key2, value, options);

        // Flatten already inflated
      } else {
        if (!yrproperty__isPlainObject(value)) {
          o['' + key + prop] = value;
        } else {
          value = parse(value, '' + prop + separator, n - 1);
          // Merge
          for (var _p in value) {
            o['' + key + _p] = value[_p];
          }
        }
      }
    }

    return o;
  }

  return parse(obj, '', depth);
};

/**
 * Freeze 'obj'
 * @param {Object} obj
 * @returns {Object}
 */
function yrproperty__freeze(obj) {
  if (!yrproperty__isProduction && yrproperty__isPlainObject(obj)) return yrproperty__deepFreeze(obj);
  return obj;
}
/*≠≠ node_modules/@yr/property/index.js ≠≠*/

/*== node_modules/debug/debug.js ==*/
$m['debug/debug'] = { exports: {} };

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

$m['debug/debug'].exports = $m['debug/debug'].exports = debugdebug__debug;
$m['debug/debug'].exports.coerce = debugdebug__coerce;
$m['debug/debug'].exports.disable = debugdebug__disable;
$m['debug/debug'].exports.enable = debugdebug__enable;
$m['debug/debug'].exports.enabled = debugdebug__enabled;
$m['debug/debug'].exports.humanize = $m['ms'].exports;

/**
 * The currently active debug mode names, and names to skip.
 */

$m['debug/debug'].exports.names = [];
$m['debug/debug'].exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

$m['debug/debug'].exports.formatters = {};

/**
 * Previously assigned color.
 */

var debugdebug__prevColor = 0;

/**
 * Previous log timestamp.
 */

var debugdebug__prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function debugdebug__selectColor() {
  return $m['debug/debug'].exports.colors[debugdebug__prevColor++ % $m['debug/debug'].exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debugdebug__debug(namespace) {

  // define the `disabled` version
  function disabled() {}
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (debugdebug__prevTime || curr);
    self.diff = ms;
    self.prev = debugdebug__prevTime;
    self.curr = curr;
    debugdebug__prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = $m['debug/debug'].exports.useColors();
    if (null == self.color && self.useColors) self.color = debugdebug__selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = $m['debug/debug'].exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function (match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = $m['debug/debug'].exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof $m['debug/debug'].exports.formatArgs) {
      args = $m['debug/debug'].exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || $m['debug/debug'].exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = $m['debug/debug'].exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function debugdebug__enable(namespaces) {
  $m['debug/debug'].exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      $m['debug/debug'].exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      $m['debug/debug'].exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function debugdebug__disable() {
  $m['debug/debug'].exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function debugdebug__enabled(name) {
  var i, len;
  for (i = 0, len = $m['debug/debug'].exports.skips.length; i < len; i++) {
    if ($m['debug/debug'].exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = $m['debug/debug'].exports.names.length; i < len; i++) {
    if ($m['debug/debug'].exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function debugdebug__coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}
/*≠≠ node_modules/debug/debug.js ≠≠*/

/*== node_modules/debug/browser.js ==*/
$m['debug'] = { exports: {} };

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

$m['debug'].exports = $m['debug'].exports = $m['debug/debug'].exports;
$m['debug'].exports.log = debug__log;
$m['debug'].exports.formatArgs = debug__formatArgs;
$m['debug'].exports.save = debug__save;
$m['debug'].exports.load = debug__load;
$m['debug'].exports.useColors = debug__useColors;
$m['debug'].exports.storage = 'undefined' != typeof chrome && 'undefined' != typeof chrome.storage ? chrome.storage.local : debug__localstorage();

/**
 * Colors.
 */

$m['debug'].exports.colors = ['lightseagreen', 'forestgreen', 'goldenrod', 'dodgerblue', 'darkorchid', 'crimson'];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function debug__useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return 'WebkitAppearance' in document.documentElement.style ||
  // is firebug? http://stackoverflow.com/a/398120/376773
  window.console && (console.firebug || console.exception && console.table) ||
  // is firefox >= v31?
  // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
  navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31;
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

$m['debug'].exports.formatters.j = function (v) {
  return JSON.stringify(v);
};

/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function debug__formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '') + this.namespace + (useColors ? ' %c' : ' ') + args[0] + (useColors ? '%c ' : ' ') + '+' + $m['debug'].exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function (match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function debug__log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console && console.log && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function debug__save(namespaces) {
  try {
    if (null == namespaces) {
      $m['debug'].exports.storage.removeItem('debug');
    } else {
      $m['debug'].exports.storage.debug = namespaces;
    }
  } catch (e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function debug__load() {
  var r;
  try {
    r = $m['debug'].exports.storage.debug;
  } catch (e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

$m['debug'].exports.enable(debug__load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function debug__localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}
/*≠≠ node_modules/debug/browser.js ≠≠*/

/*== src/lib/cursor.js ==*/
$m['src/lib/cursor'] = { exports: {} };

const srclibcursor__keys = $m['@yr/keys'].exports;

/**
 * Instance factory
 * @param {String} key
 * @param {DataStore} dataStore
 * @returns {DataStoreCursor}
 */
$m['src/lib/cursor'].exports.create = function create(key, dataStore) {
  return new DataStoreCursor(key, dataStore);
};

class DataStoreCursor {
  /**
   * Constructor
   * @param {String} key
   * @param {DataStore} dataStore
   */
  constructor(key, dataStore) {
    this.dataStore = dataStore;
    this.key = key;
  }

  /**
   * Retrieve prop value with `key`
   * @param {String} [key]
   * @returns {Object}
   */
  get(key) {
    const fixKey = key => {
      // Prefix with cursor key if not root
      return !this.dataStore.isRootKey(key) ? srclibcursor__keys.join(this.key, key) : key;
    };

    // Handle empty key (set value at cursor root)
    if (!key) key = this.key;
    // Handle array of keys
    key = Array.isArray(key) ? key.map(fixKey) : fixKey(key);

    return this.dataStore.get(key);
  }

  /**
   * Store prop 'key' with 'value', notifying listeners of change
   * @param {String} key
   * @param {Object} value
   * @param {Object} [options]
   */
  update(key, value, options) {
    // Handle empty key (set value at cursor root)
    if (!key) key = this.key;

    // Convert to batch
    if ('string' == typeof key) key = { [key]: value };

    // Fix keys (prefix with cursor key if not root)
    for (const k in key) {
      if (!this.dataStore.isRootKey(k)) {
        key[srclibcursor__keys.join(this.key, k)] = key[k];
        delete key[k];
      }
    }

    // Batch update
    this.dataStore.update(key, options);
  }

  /**
   * Retrieve an instance reference at 'key' to a subset of data
   * @param {String} key
   * @returns {DataStoreCursor}
   */
  createCursor(key) {
    return new DataStoreCursor(srclibcursor__keys.join(this.key, key), this.dataStore);
  }

  /**
   * Destroy instance
   */
  destroy() {
    this.dataStore = null;
  }
}
/*≠≠ src/lib/cursor.js ≠≠*/

/*== node_modules/raf/index.js ==*/
$m['raf'] = { exports: {} };

var raf__now = $m['performance-now'].exports,
    raf__root = typeof window === 'undefined' ? global : window,
    raf__vendors = ['moz', 'webkit'],
    raf__suffix = 'AnimationFrame',
    raf__raf = raf__root['request' + raf__suffix],
    raf__caf = raf__root['cancel' + raf__suffix] || raf__root['cancelRequest' + raf__suffix];

for (var raf__i = 0; !raf__raf && raf__i < raf__vendors.length; raf__i++) {
  raf__raf = raf__root[raf__vendors[raf__i] + 'Request' + raf__suffix];
  raf__caf = raf__root[raf__vendors[raf__i] + 'Cancel' + raf__suffix] || raf__root[raf__vendors[raf__i] + 'CancelRequest' + raf__suffix];
}

// Some versions of FF have rAF but not cAF
if (!raf__raf || !raf__caf) {
  var raf__last = 0,
      raf__id = 0,
      raf__queue = [],
      raf__frameDuration = 1000 / 60;

  raf__raf = function (callback) {
    if (raf__queue.length === 0) {
      var _now = raf__now(),
          next = Math.max(0, raf__frameDuration - (_now - raf__last));
      raf__last = next + _now;
      setTimeout(function () {
        var cp = raf__queue.slice(0);
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        raf__queue.length = 0;
        for (var i = 0; i < cp.length; i++) {
          if (!cp[i].cancelled) {
            try {
              cp[i].callback(raf__last);
            } catch (e) {
              setTimeout(function () {
                throw e;
              }, 0);
            }
          }
        }
      }, Math.round(next));
    }
    raf__queue.push({
      handle: ++raf__id,
      callback: callback,
      cancelled: false
    });
    return raf__id;
  };

  raf__caf = function (handle) {
    for (var i = 0; i < raf__queue.length; i++) {
      if (raf__queue[i].handle === handle) {
        raf__queue[i].cancelled = true;
      }
    }
  };
}

$m['raf'].exports = function (fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  return raf__raf.call(raf__root, fn);
};
$m['raf'].exports.cancel = function () {
  raf__caf.apply(raf__root, arguments);
};
$m['raf'].exports.polyfill = function () {
  raf__root.requestAnimationFrame = raf__raf;
  raf__root.cancelAnimationFrame = raf__caf;
};
/*≠≠ node_modules/raf/index.js ≠≠*/

/*== node_modules/@yr/clock/index.js ==*/
$m['@yr/clock'] = { exports: {} };

/**
 * A global timer utility for managing immediate/timeout intervals
 * https://github.com/yr/clock
 * @copyright Yr
 * @license MIT
 */

var yrclock__Debug = $m['debug'].exports;
var yrclock__raf = $m['raf'].exports;
var yrclock__now = $m['performance-now'].exports;

var yrclock__INTERVAL_CUTOFF = 1000;
var yrclock__INTERVAL_MAX = 600000;

var yrclock__debug = yrclock__Debug('yr:clock');
var yrclock__isDev = process.env.NODE_ENV == 'development';
var yrclock__hasImmediate = 'setImmediate' in (typeof global !== 'undefined' ? global : window);
var yrclock__queue = {};
var yrclock__rafHandle = 0;
var yrclock__stHandle = 0;
var yrclock__uid = 0;

// Add polyfills
yrclock__raf.polyfill();

$m['@yr/clock'].exports = {
  /**
   * Initialize with visibility api "features"
   * @param {Object} features
   */

  initialize: function initialize(features) {
    var hidden = features.hidden;
    var visibilityChange = features.visibilityChange;

    if (hidden) {
      document.addEventListener(visibilityChange, function (evt) {
        if (document[hidden]) {
          yrclock__debug('disable while hidden');
          yrclock__stop();
        } else {
          yrclock__debug('enable while visible');
          if (process.env.NODE_ENV == 'development') {
            var current = yrclock__now();

            for (var id in yrclock__queue) {
              var item = yrclock__queue[id];

              if (item.time <= current) {
                yrclock__debug('timeout should trigger for "%s"', id);
              } else {
                var date = new Date();

                date.setMilliseconds(date.getMilliseconds() + item.time - current);
                yrclock__debug('timeout for "%s" expected at %s', id, date.toLocaleTimeString());
              }
            }
          }
          yrclock__run();
        }
      }, false);
    }
  },

  /**
   * Call 'fn' on next loop turn
   * @param {Function} fn
   * @returns {Number}
   */
  immediate: function immediate(fn) {
    return yrclock__hasImmediate ? setImmediate(fn) : yrclock__raf(fn);
  },

  /**
   * Call 'fn' on next animation frame
   * @param {Function} fn
   * @returns {Number}
   */
  frame: function frame(fn) {
    return yrclock__raf(fn);
  },

  /**
   * Call 'fn' after 'duration'
   * @param {Number} duration - ms
   * @param {Function} fn
   * @param {String} [id]
   * @returns {String|Number|Object}
   */
  timeout: function timeout(duration, fn, id) {
    if (duration <= 0) return this.immediate(fn);

    var time = yrclock__now() + duration;

    id = id || 'c::' + ++yrclock__uid;
    // Existing ids will be overwritten/cancelled
    yrclock__queue[id] = { fn: fn, time: time };

    if (yrclock__debug.enabled) {
      var date = new Date();

      date.setMilliseconds(date.getMilliseconds() + duration);
      yrclock__debug('timeout scheduled for "%s" at %s', id, date.toLocaleTimeString());
    }

    yrclock__run();

    return id;
  },

  /**
   * Cancel immediate/timeout with 'id'
   * @param {String|Number} id
   * @returns {String|Number}
   */
  cancel: function cancel(id) {
    switch (typeof id) {
      // Timeout
      case 'string':
        if (id in yrclock__queue) {
          yrclock__debug('timeout canceled for "%s"', id);
          delete yrclock__queue[id];
        }
        return '';
      // Immediate raf
      case 'number':
        yrclock__raf.cancel(id);
        return 0;
      // Immediate setImmediate
      case 'object':
        clearImmediate(id);
        return null;
    }
  }
};

/**
 * Process outstanding queue items
 */
function yrclock__run() {
  var current = yrclock__now();
  var interval = yrclock__INTERVAL_MAX;
  var running = false;

  // Reset
  if (yrclock__rafHandle || yrclock__stHandle) yrclock__stop();

  for (var id in yrclock__queue) {
    var item = yrclock__queue[id];

    if (item != null && item.time != null) {
      var duration = item.time - current;

      if (duration <= 0) {
        if (yrclock__isDev) yrclock__debug('timeout triggered for "%s" at %s', id, new Date().toLocaleTimeString());
        delete yrclock__queue[id];
        item.fn();
      } else {
        // Store smallest duration
        if (duration < interval) interval = duration;
        running = true;
      }
    } else {
      delete yrclock__queue[id];
    }
  }

  // Loop
  if (running) {
    // Use raf if requested interval is less than cutoff
    if (interval < yrclock__INTERVAL_CUTOFF) {
      yrclock__rafHandle = yrclock__raf(yrclock__run);
    } else {
      yrclock__stHandle = setTimeout(yrclock__run, interval);
    }
  }
}

/**
 * Stop running
 */
function yrclock__stop() {
  if (yrclock__rafHandle) yrclock__raf.cancel(yrclock__rafHandle);
  if (yrclock__stHandle) clearTimeout(yrclock__stHandle);
  yrclock__rafHandle = 0;
  yrclock__stHandle = 0;
}
/*≠≠ node_modules/@yr/clock/index.js ≠≠*/

/*== node_modules/superagent/lib/request-base.js ==*/
$m['superagent/lib/request-base'] = { exports: {} };

/**
 * Module of mixed-in functions shared between node and client code
 */
var superagentlibrequestbase__isObject = $m['superagent/lib/is-object'].exports;

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

$m['superagent/lib/request-base'].exports.clearTimeout = function _clearTimeout() {
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Override default response body parser
 *
 * This function will be called to convert incoming data into request.body
 *
 * @param {Function}
 * @api public
 */

$m['superagent/lib/request-base'].exports.parse = function parse(fn) {
  this._parser = fn;
  return this;
};

/**
 * Override default request body serializer
 *
 * This function will be called to convert data set via .send or .attach into payload to send
 *
 * @param {Function}
 * @api public
 */

$m['superagent/lib/request-base'].exports.serialize = function serialize(fn) {
  this._serializer = fn;
  return this;
};

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

$m['superagent/lib/request-base'].exports.timeout = function timeout(ms) {
  this._timeout = ms;
  return this;
};

/**
 * Promise support
 *
 * @param {Function} resolve
 * @param {Function} reject
 * @return {Request}
 */

$m['superagent/lib/request-base'].exports.then = function then(resolve, reject) {
  if (!this._fullfilledPromise) {
    var self = this;
    this._fullfilledPromise = new Promise(function (innerResolve, innerReject) {
      self.end(function (err, res) {
        if (err) innerReject(err);else innerResolve(res);
      });
    });
  }
  return this._fullfilledPromise.then(resolve, reject);
};

/**
 * Allow for extension
 */

$m['superagent/lib/request-base'].exports.use = function use(fn) {
  fn(this);
  return this;
};

/**
 * Get request header `field`.
 * Case-insensitive.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

$m['superagent/lib/request-base'].exports.get = function (field) {
  return this._header[field.toLowerCase()];
};

/**
 * Get case-insensitive header `field` value.
 * This is a deprecated internal API. Use `.get(field)` instead.
 *
 * (getHeader is no longer used internally by the superagent code base)
 *
 * @param {String} field
 * @return {String}
 * @api private
 * @deprecated
 */

$m['superagent/lib/request-base'].exports.getHeader = $m['superagent/lib/request-base'].exports.get;

/**
 * Set header `field` to `val`, or multiple fields with one object.
 * Case-insensitive.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

$m['superagent/lib/request-base'].exports.set = function (field, val) {
  if (superagentlibrequestbase__isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Remove header `field`.
 * Case-insensitive.
 *
 * Example:
 *
 *      req.get('/')
 *        .unset('User-Agent')
 *        .end(callback);
 *
 * @param {String} field
 */
$m['superagent/lib/request-base'].exports.unset = function (field) {
  delete this._header[field.toLowerCase()];
  delete this.header[field];
  return this;
};

/**
 * Write the field `name` and `val` for "multipart/form-data"
 * request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 * ```
 *
 * @param {String} name
 * @param {String|Blob|File|Buffer|fs.ReadStream} val
 * @return {Request} for chaining
 * @api public
 */
$m['superagent/lib/request-base'].exports.field = function (name, val) {
  this._getFormData().append(name, val);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */
$m['superagent/lib/request-base'].exports.abort = function () {
  if (this._aborted) {
    return this;
  }
  this._aborted = true;
  this.xhr && this.xhr.abort(); // browser
  this.req && this.req.abort(); // node
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

$m['superagent/lib/request-base'].exports.withCredentials = function () {
  // This is browser-only functionality. Node side is no-op.
  this._withCredentials = true;
  return this;
};

/**
 * Set the max redirects to `n`. Does noting in browser XHR implementation.
 *
 * @param {Number} n
 * @return {Request} for chaining
 * @api public
 */

$m['superagent/lib/request-base'].exports.redirects = function (n) {
  this._maxRedirects = n;
  return this;
};

/**
 * Convert to a plain javascript object (not JSON string) of scalar properties.
 * Note as this method is designed to return a useful non-this value,
 * it cannot be chained.
 *
 * @return {Object} describing method, url, and data of this request
 * @api public
 */

$m['superagent/lib/request-base'].exports.toJSON = function () {
  return {
    method: this.method,
    url: this.url,
    data: this._data
  };
};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

$m['superagent/lib/request-base'].exports._isHost = function _isHost(obj) {
  var str = {}.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
};

/**
 * Send `data` as the request body, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"}')
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
 *      request.post('/user')
 *        .send('name=tobi')
 *        .send('species=ferret')
 *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

$m['superagent/lib/request-base'].exports.send = function (data) {
  var obj = superagentlibrequestbase__isObject(data);
  var type = this._header['content-type'];

  // merge
  if (obj && superagentlibrequestbase__isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    // default to x-www-form-urlencoded
    if (!type) this.type('form');
    type = this._header['content-type'];
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data ? this._data + '&' + data : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!obj || this._isHost(data)) return this;

  // default to json
  if (!type) this.type('json');
  return this;
};
/*≠≠ node_modules/superagent/lib/request-base.js ≠≠*/

/*== node_modules/superagent/lib/client.js ==*/
$m['superagent'] = { exports: {} };

/**
 * Module dependencies.
 */

var superagent__Emitter = $m['component-emitter'].exports;
var superagent__reduce = $m['reduce-component'].exports;
var superagent__requestBase = $m['superagent/lib/request-base'].exports;
var superagent__isObject = $m['superagent/lib/is-object'].exports;

/**
 * Root reference for iframes.
 */

var superagent__root;
if (typeof window !== 'undefined') {
  // Browser window
  superagent__root = window;
} else if (typeof self !== 'undefined') {
  // Web Worker
  superagent__root = self;
} else {
  // Other environments
  superagent__root = undefined;
}

/**
 * Noop.
 */

function superagent__noop() {};

/**
 * Expose `request`.
 */

var superagent__request = $m['superagent'].exports = $m['superagent/lib/request'].exports.bind(null, superagent__Request);

/**
 * Determine XHR.
 */

superagent__request.getXHR = function () {
  if (superagent__root.XMLHttpRequest && (!superagent__root.location || 'file:' != superagent__root.location.protocol || !superagent__root.ActiveXObject)) {
    return new XMLHttpRequest();
  } else {
    try {
      return new ActiveXObject('Microsoft.XMLHTTP');
    } catch (e) {}
    try {
      return new ActiveXObject('Msxml2.XMLHTTP.6.0');
    } catch (e) {}
    try {
      return new ActiveXObject('Msxml2.XMLHTTP.3.0');
    } catch (e) {}
    try {
      return new ActiveXObject('Msxml2.XMLHTTP');
    } catch (e) {}
  }
  return false;
};

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var superagent__trim = ''.trim ? function (s) {
  return s.trim();
} : function (s) {
  return s.replace(/(^\s*|\s*$)/g, '');
};

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function superagent__serialize(obj) {
  if (!superagent__isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    if (null != obj[key]) {
      superagent__pushEncodedKeyValuePair(pairs, key, obj[key]);
    }
  }
  return pairs.join('&');
}

/**
 * Helps 'serialize' with serializing arrays.
 * Mutates the pairs array.
 *
 * @param {Array} pairs
 * @param {String} key
 * @param {Mixed} val
 */

function superagent__pushEncodedKeyValuePair(pairs, key, val) {
  if (Array.isArray(val)) {
    return val.forEach(function (v) {
      superagent__pushEncodedKeyValuePair(pairs, key, v);
    });
  } else if (superagent__isObject(val)) {
    for (var subkey in val) {
      superagent__pushEncodedKeyValuePair(pairs, key + '[' + subkey + ']', val[subkey]);
    }
    return;
  }
  pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
}

/**
 * Expose serialization method.
 */

superagent__request.serializeObject = superagent__serialize;

/**
 * Parse the given x-www-form-urlencoded `str`.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function superagent__parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var pair;
  var pos;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    pos = pair.indexOf('=');
    if (pos == -1) {
      obj[decodeURIComponent(pair)] = '';
    } else {
      obj[decodeURIComponent(pair.slice(0, pos))] = decodeURIComponent(pair.slice(pos + 1));
    }
  }

  return obj;
}

/**
 * Expose parser.
 */

superagent__request.parseString = superagent__parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

superagent__request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

superagent__request.serialize = {
  'application/x-www-form-urlencoded': superagent__serialize,
  'application/json': JSON.stringify
};

/**
 * Default parsers.
 *
 *     superagent.parse['application/xml'] = function(str){
 *       return { object parsed from str };
 *     };
 *
 */

superagent__request.parse = {
  'application/x-www-form-urlencoded': superagent__parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function superagent__parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = superagent__trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Check if `mime` is json or has +json structured syntax suffix.
 *
 * @param {String} mime
 * @return {Boolean}
 * @api private
 */

function superagent__isJSON(mime) {
  return (/[\/+]json\b/.test(mime)
  );
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function superagent__type(str) {
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function superagent__params(str) {
  return superagent__reduce(str.split(/ *; */), function (obj, str) {
    var parts = str.split(/ *= */),
        key = parts.shift(),
        val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function superagent__Response(req, options) {
  options = options || {};
  this.req = req;
  this.xhr = this.req.xhr;
  // responseText is accessible only if responseType is '' or 'text' and on older browsers
  this.text = this.req.method != 'HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text') || typeof this.xhr.responseType === 'undefined' ? this.xhr.responseText : null;
  this.statusText = this.req.xhr.statusText;
  this._setStatusProperties(this.xhr.status);
  this.header = this.headers = superagent__parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this._setHeaderProperties(this.header);
  this.body = this.req.method != 'HEAD' ? this._parseBody(this.text ? this.text : this.xhr.response) : null;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

superagent__Response.prototype.get = function (field) {
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

superagent__Response.prototype._setHeaderProperties = function (header) {
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = superagent__type(ct);

  // params
  var obj = superagent__params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

superagent__Response.prototype._parseBody = function (str) {
  var parse = superagent__request.parse[this.type];
  if (!parse && superagent__isJSON(this.type)) {
    parse = superagent__request.parse['application/json'];
  }
  return parse && str && (str.length || str instanceof Object) ? parse(str) : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

superagent__Response.prototype._setStatusProperties = function (status) {
  // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
  if (status === 1223) {
    status = 204;
  }

  var type = status / 100 | 0;

  // status / class
  this.status = this.statusCode = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = 4 == type || 5 == type ? this.toError() : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

superagent__Response.prototype.toError = function () {
  var req = this.req;
  var method = req.method;
  var url = req.url;

  var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.url = url;

  return err;
};

/**
 * Expose `Response`.
 */

superagent__request.Response = superagent__Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function superagent__Request(method, url) {
  var self = this;
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {}; // preserves header name case
  this._header = {}; // coerces header names to lowercase
  this.on('end', function () {
    var err = null;
    var res = null;

    try {
      res = new superagent__Response(self);
    } catch (e) {
      err = new Error('Parser is unable to parse the response');
      err.parse = true;
      err.original = e;
      // issue #675: return the raw response if the response parsing fails
      err.rawResponse = self.xhr && self.xhr.responseText ? self.xhr.responseText : null;
      // issue #876: return the http status code if the response parsing fails
      err.statusCode = self.xhr && self.xhr.status ? self.xhr.status : null;
      return self.callback(err);
    }

    self.emit('response', res);

    if (err) {
      return self.callback(err, res);
    }

    try {
      if (res.status >= 200 && res.status < 300) {
        return self.callback(err, res);
      }

      var new_err = new Error(res.statusText || 'Unsuccessful HTTP response');
      new_err.original = err;
      new_err.response = res;
      new_err.status = res.status;

      self.callback(new_err, res);
    } catch (e) {
      self.callback(e); // #985 touching res may cause INVALID_STATE_ERR on old Android
    }
  });
}

/**
 * Mixin `Emitter` and `requestBase`.
 */

superagent__Emitter(superagent__Request.prototype);
for (var superagent__key in superagent__requestBase) {
  superagent__Request.prototype[superagent__key] = superagent__requestBase[superagent__key];
}

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

superagent__Request.prototype.type = function (superagent__type) {
  this.set('Content-Type', superagent__request.types[superagent__type] || superagent__type);
  return this;
};

/**
 * Set responseType to `val`. Presently valid responseTypes are 'blob' and
 * 'arraybuffer'.
 *
 * Examples:
 *
 *      req.get('/')
 *        .responseType('blob')
 *        .end(callback);
 *
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

superagent__Request.prototype.responseType = function (val) {
  this._responseType = val;
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

superagent__Request.prototype.accept = function (superagent__type) {
  this.set('Accept', superagent__request.types[superagent__type] || superagent__type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @param {Object} options with 'type' property 'auto' or 'basic' (default 'basic')
 * @return {Request} for chaining
 * @api public
 */

superagent__Request.prototype.auth = function (user, pass, options) {
  if (!options) {
    options = {
      type: 'basic'
    };
  }

  switch (options.type) {
    case 'basic':
      var str = btoa(user + ':' + pass);
      this.set('Authorization', 'Basic ' + str);
      break;

    case 'auto':
      this.username = user;
      this.password = pass;
      break;
  }
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

superagent__Request.prototype.query = function (val) {
  if ('string' != typeof val) val = superagent__serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `filename`.
 *
 * ``` js
 * request.post('/upload')
 *   .attach('content', new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String} filename
 * @return {Request} for chaining
 * @api public
 */

superagent__Request.prototype.attach = function (field, file, filename) {
  this._getFormData().append(field, file, filename || file.name);
  return this;
};

superagent__Request.prototype._getFormData = function () {
  if (!this._formData) {
    this._formData = new superagent__root.FormData();
  }
  return this._formData;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

superagent__Request.prototype.callback = function (err, res) {
  var fn = this._callback;
  this.clearTimeout();
  fn(err, res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

superagent__Request.prototype.crossDomainError = function () {
  var err = new Error('Request has been terminated\nPossible causes: the network is offline, Origin is not allowed by Access-Control-Allow-Origin, the page is being unloaded, etc.');
  err.crossDomain = true;

  err.status = this.status;
  err.method = this.method;
  err.url = this.url;

  this.callback(err);
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

superagent__Request.prototype._timeoutError = function () {
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Compose querystring to append to req.url
 *
 * @api private
 */

superagent__Request.prototype._appendQueryString = function () {
  var query = this._query.join('&');
  if (query) {
    this.url += ~this.url.indexOf('?') ? '&' + query : '?' + query;
  }
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

superagent__Request.prototype.end = function (fn) {
  var self = this;
  var xhr = this.xhr = superagent__request.getXHR();
  var timeout = this._timeout;
  var data = this._formData || this._data;

  // store callback
  this._callback = fn || superagent__noop;

  // state change
  xhr.onreadystatechange = function () {
    if (4 != xhr.readyState) return;

    // In IE9, reads to any property (e.g. status) off of an aborted XHR will
    // result in the error "Could not complete the operation due to error c00c023f"
    var status;
    try {
      status = xhr.status;
    } catch (e) {
      status = 0;
    }

    if (0 == status) {
      if (self.timedout) return self._timeoutError();
      if (self._aborted) return;
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  var handleProgress = function (e) {
    if (e.total > 0) {
      e.percent = e.loaded / e.total * 100;
    }
    e.direction = 'download';
    self.emit('progress', e);
  };
  if (this.hasListeners('progress')) {
    xhr.onprogress = handleProgress;
  }
  try {
    if (xhr.upload && this.hasListeners('progress')) {
      xhr.upload.onprogress = handleProgress;
    }
  } catch (e) {}
  // Accessing xhr.upload fails in IE from a web worker, so just pretend it doesn't exist.
  // Reported here:
  // https://connect.microsoft.com/IE/feedback/details/837245/xmlhttprequest-upload-throws-invalid-argument-when-used-from-web-worker-context


  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function () {
      self.timedout = true;
      self.abort();
    }, timeout);
  }

  // querystring
  this._appendQueryString();

  // initiate request
  if (this.username && this.password) {
    xhr.open(this.method, this.url, true, this.username, this.password);
  } else {
    xhr.open(this.method, this.url, true);
  }

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !this._isHost(data)) {
    // serialize stuff
    var contentType = this._header['content-type'];
    var serialize = this._serializer || superagent__request.serialize[contentType ? contentType.split(';')[0] : ''];
    if (!serialize && superagent__isJSON(contentType)) serialize = superagent__request.serialize['application/json'];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  if (this._responseType) {
    xhr.responseType = this._responseType;
  }

  // send stuff
  this.emit('request', this);

  // IE11 xhr.send(undefined) sends 'undefined' string as POST payload (instead of nothing)
  // We need null here if data is undefined
  xhr.send(typeof data !== 'undefined' ? data : null);
  return this;
};

/**
 * Expose `Request`.
 */

superagent__request.Request = superagent__Request;

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

superagent__request.get = function (url, data, fn) {
  var req = superagent__request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

superagent__request.head = function (url, data, fn) {
  var req = superagent__request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * OPTIONS query to `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

superagent__request.options = function (url, data, fn) {
  var req = superagent__request('OPTIONS', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

function superagent__del(url, fn) {
  var req = superagent__request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

superagent__request['del'] = superagent__del;
superagent__request['delete'] = superagent__del;

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

superagent__request.patch = function (url, data, fn) {
  var req = superagent__request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

superagent__request.post = function (url, data, fn) {
  var req = superagent__request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

superagent__request.put = function (url, data, fn) {
  var req = superagent__request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};
/*≠≠ node_modules/superagent/lib/client.js ≠≠*/

/*== node_modules/@yr/agent/index.js ==*/
$m['@yr/agent'] = { exports: {} };
/**
 * Superagent powered request
 * https://github.com/yr/agent
 * @copyright Yr
 * @license MIT
 */


var yragent__Debug = $m['debug'].exports;
var yragent__retryList = $m['superagent-retry/lib/retries'].exports;
var yragent__superagent = $m['superagent'].exports;

var yragent__STATUS_ABORT = 499;
var yragent__STATUS_TIMEOUT = 504;

var yragent__debug = yragent__Debug('yr:agent');
var yragent__Request = yragent__superagent.Request;
var yragent__oldEnd = yragent__Request.prototype.end;
var yragent__oldGet = yragent__superagent.get;
var yragent__cache = {};

$m['@yr/agent'].exports = yragent__superagent;

/**
 * GET request for 'url'
 * @param {String} url
 * @param {Object} [options]
 *  - {Boolean} abort
 *  - {String} id
 *  - {Boolean} ignoreQuery
 * @returns {Request}
 */
$m['@yr/agent'].exports.get = function get(url, options) {
  options = options || {};

  var key = options.ignoreQuery ? url.split('?')[0] : url;
  var req = yragent__cache[key];

  if (req) {
    // Return cached
    if (!options.abort) return req;
    // Abort/clean up existing
    req.abort();
  }

  req = yragent__oldGet(url);
  req.__agentCacheKey = key;
  if (options.id) req.__agentId = options.id;

  yragent__cache[key] = req;

  return req;
};

/**
 * Abort all outstanding requests
 * @param {String|Function} filter
 */
$m['@yr/agent'].exports.abortAll = function abortAll(filter) {
  var filterById = filter && 'string' == typeof filter;

  for (var key in yragent__cache) {
    var req = yragent__cache[key];
    var shouldAbort = filter ? filterById ? filter == req.__agentId : filter(req) : true;

    if (shouldAbort) {
      req._retries = 0;
      req.abort();
      // 'end' not called yet, so clean up manually
      if (!req._callback) delete yragent__cache[req.__agentCacheKey];
    }
  }
};

/**
 * Initiate request, invoking callback 'fn' on complete.
 * Overrides Superagent Request.end()
 * @param {Function} fn(err, res)
 * @returns {Request}
 */
yragent__Request.prototype.end = function end(fn) {
  var _this = this;

  var start = Date.now();
  var abortTimeout = 0;

  // Inner end
  var end = function end() {
    yragent__oldEnd.call(_this, onEnd);
  };

  // Handle abort
  var onAbort = function onAbort(evt) {
    _this.removeListener('abort', onAbort);
    clearTimeout(abortTimeout);

    // Request aborted before end on timeout, so wait to check
    abortTimeout = setTimeout(function () {
      if (!_this.timedout || !_this._retries) {
        var err = Error();

        err.aborted = true;
        onEnd(err);
      }
    }, 0);
  };

  // Handle end
  var onEnd = function onEnd(err, res) {
    _this.removeListener('abort', onAbort);

    if (err || res.error) {
      if (_this._retries && _this._retries-- && yragent__shouldRetry(err, res)) {
        clearTimeout(abortTimeout);
        yragent__resetRequest(_this, err.timeout);
        return end();
      }

      var status = void 0,
          msg = void 0;

      // Error or response 4xx/5xx
      if (res && res.error) {
        status = res.status;
        msg = res.error.message;
      } else if (err) {
        // Handle timeout
        if (err.timeout) {
          clearTimeout(abortTimeout);
          status = yragent__STATUS_TIMEOUT;
          msg = 'request timed out';
          // Prevent abort when retrying
          _this.timedout = !!_this._retries;
        } else if (err.aborted || err.crossDomain) {
          status = yragent__STATUS_ABORT;
          msg = 'request aborted';
          _this.aborted = true;
        }
        status = status || err.statusCode || 500;
        msg = msg || err.message || 'request errored';
      }

      err = Error(msg);
      err.status = status;
    }

    if (res) {
      res.duration = Date.now() - start;
      yragent__debug('request to %s completed in %dms', _this.url, res.duration);
    }

    delete yragent__cache[_this.__agentCacheKey];

    fn(err, res);
  };

  this.on('abort', onAbort);
  end();

  return this;
};

/**
 * Initialize retry behaviour with 'count' count.
 * @param {Number} count
 * @returns {Request}
 */
yragent__Request.prototype.retry = function retry(count) {
  this._retries = count != null ? count : 1;

  return this;
};

/**
 * Reset 'req'
 * @param {Object} req
 * @param {Number} timeout
 */
function yragent__resetRequest(req, timeout) {
  // Server only
  if (req.req) {
    var headers = req.req._headers;

    req.req.abort();
    delete req.req;

    req.set(headers);
  }

  req.clearTimeout();
  req.called = false;

  req._timeout = timeout || 0;
  delete req._timer;
}

/*
 * Check if request should retry based on 'err' and 'res'
 * @param {Object} err
 * @param {Object} res
 * @returns {Boolean}
 */
function yragent__shouldRetry(err, res) {
  return yragent__retryList.some(function (check) {
    return check(err, res);
  });
}
/*≠≠ node_modules/@yr/agent/index.js ≠≠*/

/*== src/index.js ==*/
$m['src/index'] = { exports: {} };
/**
 * A clever data object
 * https://github.com/yr/data-store
 * @copyright Yr
 * @license MIT
 */


const srcindex__agent = $m['@yr/agent'].exports;
const srcindex__assign = $m['object-assign'].exports;
const srcindex__clock = $m['@yr/clock'].exports;
const srcindex__Cursor = $m['src/lib/cursor'].exports;
const srcindex__Debug = $m['debug'].exports;
const srcindex__Emitter = $m['eventemitter3'].exports;
const srcindex__isPlainObject = $m['is-plain-obj'].exports;
const srcindex__keys = $m['@yr/keys'].exports;
const srcindex__property = $m['@yr/property'].exports;
const srcindex__runtime = $m['@yr/runtime'].exports;
const srcindex__time = $m['@yr/time'].exports;
const srcindex__uuid = $m['uuid'].exports;

const srcindex__DEFAULT_LATENCY = 10000;
const srcindex__DEFAULT_LOAD_OPTIONS = {
  expiry: 60000,
  retry: 2,
  timeout: 5000
};
const srcindex__DEFAULT_SET_OPTIONS = {
  // Browser immutable by default
  immutable: srcindex__runtime.isBrowser,
  reload: false,
  serialisable: true,
  merge: true
};
const srcindex__DEFAULT_STORAGE_OPTIONS = {
  keyLength: 2
};
const srcindex__DELEGATED_METHODS = ['fetch', 'get', 'load', 'persist', 'reload', 'set', 'unpersist', 'unset', 'update', 'upgradeStorageData'];

/**
 * Instance factory
 * @param {String} [id]
 * @param {Object} [data]
 * @param {Object} [options]
 * @returns {DataStore}
 */
$m['src/index'].exports.create = function create(id, data, options) {
  return new DataStore(id, data, options);
};

class DataStore extends srcindex__Emitter {
  /**
   * Constructor
   * @param {String} [id]
   * @param {Object} [data]
   * @param {Object} [options]
   *  - {Object} handlers method:key
   *  - {Object} loading
   *    - {Number} expiry
   *    - {Number} retry
   *    - {Number} timeout
   *  - {Object} serialisable key:Boolean
   *  - {Object} storage
   *    - {Number} keyLength
   *    - {Object} store
   *  - {Boolean} writable
   */
  constructor(id, data, options = {}) {
    super();

    this.debug = srcindex__Debug('yr:data' + (id ? ':' + id : ''));
    this.destroyed = false;
    this.uid = srcindex__uuid.v4();
    this.id = id || `store${ --this.uid }`;
    this.writable = 'writable' in options ? options.writable : true;

    this._cursors = {};
    this._data = {};
    this._handlers = {};
    this._loading = srcindex__assign({}, srcindex__DEFAULT_LOAD_OPTIONS, options.loading);
    this._serialisable = options.serialisable || {};
    this._storage = srcindex__assign({}, srcindex__DEFAULT_STORAGE_OPTIONS, options.storage);

    // Generate delegated methods
    for (const method of srcindex__DELEGATED_METHODS) {
      const privateMethod = `_${ method }`;

      this[method] = this._route.bind(this, privateMethod);
      this[privateMethod] = this[privateMethod].bind(this);
      // Setup handlers
      this._handlers[privateMethod] = {};
      if (options.handlers && method in options.handlers) {
        for (const namespace in options.handlers[method]) {
          this.registerHandler(method, namespace, options.handlers[method][namespace]);
        }
      }
    }

    this.bootstrap(this._storage, data || {});
  }

  /**
   * Bootstrap from 'storage' and/or 'data'
   * @param {Object} storage
   * @param {Object} data
   */
  bootstrap(storage, data) {
    const { keyLength, store } = storage;
    const options = { immutable: false };

    if (store) {
      let storageData = srcindex__property.reshape(store.get('/'), 1);

      for (const namespace in storageData) {
        const value = storageData[namespace];

        // Handle version mismatch
        if (store.shouldUpgrade(namespace)) {
          // Clear all storage data for namespace
          for (const key in srcindex__property.reshape(value, keyLength - 1)) {
            store.remove(srcindex__keys.join(namespace, key));
          }
          // Allow handlers to override
          storageData[namespace] = this.upgradeStorageData(namespace, value);
        }
      }
      // TODO: persist
      this.set(storageData, options);
    }

    this.set(data, options);
  }

  /**
   * Determine if 'key' refers to a global property
   * @param {String} key
   * @returns {Boolean}
   */
  isRootKey(key) {
    return key ? key.charAt(0) == '/' : false;
  }

  /**
   * Retrieve global version of 'key'
   * @param {String} key
   * @returns {String}
   */
  getRootKey(key = '') {
    if (!this.isRootKey(key)) key = `/${ key }`;
    return key;
  }

  /**
   * Retrieve storage keys for 'key'
   * based on storage.keyLength
   * @param {String} key
   * @returns {Array}
   */
  getStorageKeys(key = '') {
    const { keyLength } = this._storage;
    const length = srcindex__keys.length(key);

    if (length < keyLength) {
      const parentData = srcindex__property.reshape(this._get(srcindex__keys.slice(key, 0, -1)), keyLength);

      return Object.keys(parentData).filter(k => k.indexOf(key) == 0).map(k => `/${ k }`);
    }

    return [`/${ srcindex__keys.slice(key, 0, this._storage.keyLength) }`];
  }

  /**
   * Register 'handler' for 'method' and 'namespace'
   * @param {String} method
   * @param {String} namespace
   * @param {Function} handler
   */
  registerHandler(method, namespace, handler) {
    const privateMethod = `_${ method }`;

    // Prevent overwriting
    if (!this._handlers[privateMethod][namespace]) {
      const scopedMethod = (key, ...args) => this[privateMethod](srcindex__keys.join(namespace, key), ...args);

      this._handlers[privateMethod][namespace] = { handler, scopedMethod };
    }
  }

  /**
   * Route 'method' to appropriate handler
   * depending on passed 'key' (args[0])
   * @param {String} method
   * @param {*} args
   * @returns {Object|null}
   */
  _route(method, ...args) {
    let [key = '', ...rest] = args;

    if (!key) return this[method](...args);

    if ('string' == typeof key) {
      if (key.charAt(0) == '/') key = key.slice(1);

      const namespace = srcindex__keys.first(key);

      // Route to handler if it exists
      if (namespace && namespace in this._handlers[method]) {
        const { handler, scopedMethod } = this._handlers[method][namespace];

        return handler(this, scopedMethod, srcindex__keys.slice(key, 1), ...rest);
      }
      return this[method](key, ...rest);
    }

    // Batch (set, update, load, etc)
    if (srcindex__isPlainObject(key)) {
      for (const k in key) {
        this._route(method, k, key[k], ...rest);
      }
      return;
    }

    // Array of keys (get)
    if (Array.isArray(key)) {
      return key.map(k => {
        return this._route(method, k, ...rest);
      });
    }
  }

  /**
   * Retrieve property value with `key`
   * @param {String} [key]
   * @returns {Object}
   */
  _get(key) {
    // Return all if no key specified
    if (!key) return this._data;

    const value = srcindex__property.get(this._data, key);

    // Check expiry
    if (Array.isArray(value)) {
      value.forEach(srcindex__checkExpiry);
    } else {
      srcindex__checkExpiry(value);
    }

    return value;
  }

  /**
   * Store prop 'key' with 'value'
   * @param {String} key
   * @param {Object} value
   * @param {Object} [options]
   *  - {Boolean} immutable
   *  - {Boolean} reference
   *  - {Boolean} merge
   * @returns {Object}
   */
  _set(key, value, options) {
    if (this.writable) {
      options = srcindex__assign({}, srcindex__DEFAULT_SET_OPTIONS, options);

      // Handle replacing underlying data
      if (key == null && srcindex__isPlainObject(value)) {
        this.debug('reset');
        this._data = value;
        return;
      }
      // Handle removal of key
      if ('string' == typeof key && value == null) return this._unset(key);

      // Write reference key
      if (options.reference && srcindex__isPlainObject(value)) value.__ref = this.getRootKey(key);

      if (options.immutable) {
        // Returns same if no change
        const newData = srcindex__property.set(this._data, key, value, options);

        if (newData !== this._data) {
          this._data = newData;
        } else {
          this.debug('WARNING no change after set "%s', key);
        }
      } else {
        srcindex__property.set(this._data, key, value, options);
      }

      // Handle persistence
      if ('persistent' in options && options.persistent) this._persist(key);
    }

    return value;
  }

  /**
   * Remove 'key'
   * @param {String} key
   */
  _unset(key) {
    // Remove prop from parent
    const length = srcindex__keys.length(key);
    const k = length == 1 ? key : srcindex__keys.last(key);
    const data = length == 1 ? this._data : this._get(srcindex__keys.slice(key, 0, -1));

    // Only remove existing (prevent recursive trap)
    if (data && k in data) {
      const oldValue = data[k];

      this.debug('unset "%s"', key);
      delete data[k];

      // Prune from storage
      this._unpersist(key);

      // Delay to prevent race condition
      srcindex__clock.immediate(() => {
        this.emit('unset:' + key, null, oldValue);
        this.emit('unset', key, null, oldValue);
      });
    }
  }

  /**
   * Store prop 'key' with 'value', notifying listeners of change
   * Allows passing of arbitrary additional args to listeners
   * @param {String} key
   * @param {Object} value
   * @param {Object} options
   *  - {Boolean} reference
   *  - {Boolean} merge
   */
  _update(key, value, options, ...args) {
    options = options || {};

    if (this.writable) {
      // Resolve reference keys (use reference key to write to original object)
      const parent = this.get(srcindex__keys.slice(key, 0, -1));

      if (parent && parent.__ref) key = srcindex__keys.join(parent.__ref, srcindex__keys.last(key));

      this.debug('update %s', key);
      const oldValue = this.get(key);
      // TODO: bail if no oldValue?

      options.immutable = true;
      this.set(key, value, options);

      // Delay to prevent race condition
      srcindex__clock.immediate(() => {
        this.emit('update:' + key, value, oldValue, options, ...args);
        this.emit('update', key, value, oldValue, options, ...args);
      });
    }
  }

  /**
   * Load data from 'url' and store at 'key'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   * @returns {Response}
   */
  _load(key, url, options) {
    options = options || {};
    options.id = this.uid;

    this.debug('load %s from %s', key, url);

    return srcindex__agent.get(url, options).timeout(this._loading.timeout).retry(this._loading.retry).then(res => {
      this.debug('loaded "%s" in %dms', key, res.duration);

      let value;

      // Guard against empty data
      if (res.body) {
        // TODO: make more generic with bodyParser option/handler
        // Handle locations results separately
        let data = 'totalResults' in res.body ? res.body._embedded && res.body._embedded.location || [] : res.body;

        // Add expires header
        if (res.headers && 'expires' in res.headers) {
          const expires = srcindex__getExpiry(res.headers.expires, this._loading.expiry);

          if (Array.isArray(data)) {
            data.forEach(d => {
              if (srcindex__isPlainObject(d)) {
                d.expires = expires;
                d.expired = false;
              }
            });
          } else {
            data.expires = expires;
            data.expired = false;
          }
        }

        // Guard against parse errors during set()
        try {
          // Merge with existing
          options.merge = true;
          // All remote data stored with reference key
          options.reference = true;
          value = this.set(key, data, options);
        } catch (err) {
          this.debug('failed to store remote resource "%s" from %s', key, url);
          // TODO: update error message?
          err.status = 500;
          throw err;
        }
      }

      this.emit('load:' + key, value);
      this.emit('load', key, value);

      return res;
    }).catch(err => {
      this.debug('unable to load "%s" from %s', key, url);

      // Remove if not found or malformed (but not aborted)
      if (err.status < 499) this.remove(key);

      throw err;
    });
  }

  /**
   * Reload data from 'url'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   *  - {Boolean} reload
   */
  _reload(key, url, options) {
    options = options || {};
    if (!options.reload) return;

    const reload = () => {
      this._load(key, url, options).then(res => {
        const value = this.get(key);

        this.emit('reload:' + key, value);
        this.emit('reload', key, value);
        this._reload(key, url, options);
      }).catch(err => {
        // TODO: error never logged
        this.debug('unable to reload "%s" from %s', key, url);
        this._reload(key, url, options);
      });
    };
    const value = this.get(key);
    // Guard against invalid duration
    const duration = Math.max((value && value.expires || 0) - Date.now(), this._loading.expiry);

    this.debug('reloading "%s" in %dms', key, duration);
    // Set custom id
    srcindex__clock.timeout(duration, reload, url);
  }

  /**
   * Fetch data. If expired, load from 'url' and store at 'key'
   * @param {String} key
   * @param {String} url
   * @param {Object} [options]
   *  - {Boolean} abort
   *  - {Boolean} ignoreQuery
   *  - {Boolean} reload
   *  - {Boolean} staleWhileRevalidate
   *  - {Boolean} staleWhileError
   * @returns {Promise}
   */
  _fetch(key, url, options) {
    options = options || {};

    this.debug('fetch %s from %s', key, url);

    // Set expired state
    const value = this.get(key);

    // Load if not found or expired
    if (!value || value.expired) {
      const load = new Promise((resolve, reject) => {
        this._load(key, url, options).then(res => {
          // Schedule a reload
          this._reload(key, url, options);
          resolve({
            duration: res.duration,
            headers: res.headers,
            data: this.get(key)
          });
        }).catch(err => {
          // Schedule a reload if error
          if (err.status >= 500) this._reload(key, url, options);
          resolve({
            duration: 0,
            error: err,
            headers: { status: err.status },
            data: options.staleWhileError ? value : null
          });
        });
      });

      // Wait for load unless stale and staleWhileRevalidate
      if (!(value && options.staleWhileRevalidate)) return load;
    }

    // Schedule a reload
    this._reload(key, url, options);
    // Return data (possibly stale)
    return Promise.resolve({
      duration: 0,
      headers: { status: 200 },
      data: value
    });
  }

  /**
   * Save to local storage
   * @param {String} key
   */
  _persist(key) {
    if (this._storage.store) {
      this.getStorageKeys(key).forEach(storageKey => {
        // Storage keys are global, so trim
        this._storage.store.set(storageKey, this._get(storageKey.slice(1)));
      });
    }
  }

  /**
   * Remove from local storage
   * @param {String} key
   */
  _unpersist(key) {
    if (this._storage.store) {
      this.getStorageKeys(key).forEach(storageKey => {
        this._storage.store.remove(storageKey);
      });
    }
  }

  /**
   * Update storage when versions don't match
   * @param {String} key
   * @param {Object} value
   * @returns {Object}
   */
  _upgradeStorageData(key, value) {
    // Delete as default
    return null;
  }

  /**
   * Retrieve an instance reference at 'key' to a subset of data
   * @param {String} key
   * @returns {DataStore}
   */
  createCursor(key) {
    key = this.getRootKey(key);

    let cursor = this._cursors[key];

    // Create and store
    if (!cursor) {
      cursor = srcindex__Cursor.create(key, this);
      this._cursors[key] = cursor;
    }

    return cursor;
  }

  /**
   * Store serialisability of 'key'
   * @param {String} key
   * @param {Boolean} value
   */
  setSerialisable(key, value) {
    if (this.isRootKey(key)) key = key.slice(1);

    // Handle batch
    if (srcindex__isPlainObject(key)) {
      for (const k in key) {
        this.setSerialisable(k, value);
      }
    }

    this._serialisable[key] = value;
  }

  /**
   * Abort all outstanding load/reload requests
   */
  abort() {
    // TODO: return aborted urls and use in clock.cancel
    srcindex__agent.abortAll(this.uid);
    // clock.cancelAll(this.id);
  }

  /**
   * Destroy instance
   */
  destroy() {
    this.abort();

    // Destroy cursors
    for (const key in this._cursors) {
      this._cursors[key].destroy();
    }
    this._cursors = {};
    this._data = {};
    this._handlers = {};
    this._loading = {};
    this._serialisable = {};
    this._storage = {};
    this.destroyed = true;
    this.removeAllListeners();
  }

  /**
   * Dump all data, optionally stringified
   * @param {Boolean} stringify
   * @returns {Object|String}
   */
  dump(stringify) {
    let obj = {};

    for (const prop in this._data) {
      obj[prop] = this._data[prop];
    }

    if (stringify) {
      try {
        return JSON.stringify(obj);
      } catch (err) {
        return '';
      }
    }

    return obj;
  }

  /**
   * Prepare for serialisation
   * @param {String} [key]
   * @returns {Object}
   */
  toJSON(key) {
    if (key) return this._serialise(key, this._get(key));
    return this._serialise(null, this._data);
  }

  /**
   * Retrieve serialisable 'data'
   * @param {String} key
   * @param {Object} data
   * @returns {Object}
   */
  _serialise(key, data) {
    // Add data props
    if (srcindex__isPlainObject(data)) {
      let obj = {};
      let keyChain;

      for (const prop in data) {
        keyChain = key ? `${ key }/${ prop }` : prop;

        if (this._serialisable[keyChain] !== false) {
          if (srcindex__isPlainObject(data[prop])) {
            obj[prop] = this._serialise(keyChain, data[prop]);
          } else if (srcindex__time.isTime(data[prop])) {
            obj[prop] = data[prop].toJSON();
          } else {
            obj[prop] = data[prop];
          }
        }
      }

      return obj;
    }

    return this._serialisable[key] !== false ? data : null;
  }
}

/**
 * Retrieve expiry from 'dateString'
 * @param {Number} dateString
 * @param {Number} minimum
 * @returns {Number}
 */
function srcindex__getExpiry(dateString, minimum) {
  // Add latency overhead to compensate for transmission time
  const expires = +new Date(dateString) + srcindex__DEFAULT_LATENCY;
  const now = Date.now();

  return expires > now ? expires
  // Local clock is set incorrectly
  : now + minimum;
}

/**
 * Check if 'value' is expired
 * @param {Object} value
 */
function srcindex__checkExpiry(value) {
  if (value && srcindex__isPlainObject(value) && value.expires && Date.now() > value.expires) {
    value.expired = true;
    value.expires = 0;
  }
}
/*≠≠ src/index.js ≠≠*/
})()