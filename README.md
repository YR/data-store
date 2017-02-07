[![NPM Version](https://img.shields.io/npm/v/@yr/data-store.svg?style=flat)](https://npmjs.org/package/@yr/data-store)
[![Build Status](https://img.shields.io/travis/YR/data-store.svg?style=flat)](https://travis-ci.org/YR/data-store?branch=master)

A data object that supports storing and retrieving data with namespaced keys (`'foo/bar/bat'`), cursors, immutability, data fetching, and a flexible handler api for observation, side effects, computed values and more.

## Usage

```js
const dataStoreFactory = require('@yr/data-store').create;
const store = dataStoreFactory('fooStore', { foo: true, bar: false });

store.get('foo'); //=> true
store.set('foo/bar', { bat: true, boo: ['boo'] }, { immutable: true });
store.get('foo/bar/bat'); //=> true
```

## API

#### `create (id: String, data: Object, options: Object): DataStore|FetchableDataStore` 
Instance factory. Options include:

- **`handlers: Array`** array of arrays (`[match: RegExp, handler: Function]`) for passing to `use` [default: `null`]. See [handlers](#handlers)
- **`isFetchable: Boolean`** specify whether instance should be a `FetchableDataStore` that supports data fetching [default: `false`]. See [FetchableDataStore](#fetchabledatastore)
- **`isWritable: Boolean`** specify whether instance should be writable via `set()/update()` [default: `true`]
- **`serialisableKeys: Object`** object listing keys and their serialisable state [default: `{}`]. See [`setSerialisabilityOfKey()`](#setserialisabilityofkey-key-stringobject-value-boolean)

### `DataStore`

#### `use (match: RegExp|Array, handler: Function)`
Register a middleware handler (see [handlers](#handlers)):

```js
store.use(/foo/, function (context) { /* */ });
```

Batch register handlers by passing an array of arrays:

```js
store.use([
  [/foo/, function (context) { /* */ }],
  [/foo/, function (context) { /* */ }]
]);
```

#### `unuse (match: RegExp|Array, handler: Function)`
Unregister a previously registerd middleware handler:

```js
store.unuse(/foo/, function (context) { /* */ });
```

Batch unregister handlers by passing an array of arrays:

```js
store.unuse([
  [/foo/, function (context) { /* */ }],
  [/foo/, function (context) { /* */ }]
]);
```

#### `get (key: String|Array): *` 
Retrieve value stored at `key`. If `key` is an array of strings, returns an array of values:

```js
store.get(['foo/bar/bat', 'bar']); //=> [true, false]
```

#### `set (key: String|Object, value: *, options: Object)` 
Store `value` at `key`. If `key` is a hash of `key:value` pairs, batch sets values:

```js
store.set({bat: 'bat', 'foo/bar/bat': false });
```

Options include:
- **`immutable: Boolean`** specify whether to mutate the underlying data object [default: `true` for browser, `false` for server]
- **`merge: Boolean`** specify whether to merge `value` into the underlying data object (`true`), or overwrite an existing key (`false`) [default: `true`]

#### `update (key: String|Object, value: *, options: Object, ...args)`
Store `vaue` at `key`, batching all writes if `key` is a hash of `key:value` pairs, and notifying listeners of change. Any additional arguments will be passed to listeners:

```js
store.on('update', (key, value, oldValue, foo) => {
  console.log(value, oldValue, foo); //=> true, false, 'foo'
});
store.on('update:foo/bar/bat', (value, oldValue, foo) => {
  console.log(value, oldValue, foo); //=> true, false, 'foo'
});
store.update('foo/bar/bat', true, null, 'foo');
```

Options are the same as for [`set()`](#set-key-stringobject-value--options-object), with the exception that immutability is always enforced.

#### `reference (key: String|Array): String|Array`
Retrieve reference to value stored at `key`. If `key` is an array of strings, returns an array of reference keys:

```js
store.set('stuff', store.reference(['foo/bar/bat', 'bar']));
store.get('stuff/0'); //=> true
```

#### `reset (data: Object)`
Reset/replace underlying data with `data`.

#### `destroy ()`
Destroy the instance, including all existing cursors and event listeners.

#### `createCursor (key: String): DataStoreCursor`
Create instance of [`DataStoreCursor`](#datastorecursor) at `key`:

```js
const cursor = store.createCursor('foo/bar');
cursor.get('bat'); //=> true
```

#### `setSerialisabilityOfKey (key: String|Object, value: Boolean)`
Specify serialisablity of `key`. Batch set if `key` is a hash of `key:value` pairs. Setting a `key` to `false` will exclude that key when stringifying:

```js
store.setSerialisableKey('foo', false);
JSON.stringify(store); //=> { "bar": false, "bat": "bat"}
```

#### `dump (stringify: Boolean): Object|String`
Retrieve all data as `Object` or `String` (if `stringify` argument is `true`).

### `FetchableDataStore`

#### `fetch (key: String|Object, url: String, options: Object): Promise`
Retrieve value stored at `key`. If `key` is a hash of `key:url` pairs, batch fetch those values, returning a Promise resolving to an array of results. If the stored value has not yet been set, or is set but expired (based on `expires` header), load from `url`:

```js
store
  .fetch('beep', 'http://localhost/beep')
  .then((result) => {
    console.log(result); //=> { duration: 1000, headers: {/* */}, data: { beep: 'foo' } }
    store.get('beep'); //=> { beep: 'foo' }
  });
```

The returned Promise resolves with a `result` object:
- **`duration: Number`** load time in ms
- **`headers: Object`** the parsed response headers
- **`data: Object`** the parsed JSON body

Options include:
- **`abort: Boolean`** abort existing (outstanding) request to same url [default: `false`]
- **`ignoreQuery: Boolean`** ignore query parameters of `url` when matching existing, oustanding requests for the same url [default: `false`]
- **`minExpiry: Number`** the minimum expiry (in ms) to use in cases of invalid `expires` [default: `60000`]
- **`retries: Number`** the number of times to retry load on error [default: `2`]
- **`staleWhileRevalidate: Boolean`** specify whether to resolve returned promise with stale value or wait for loaded [default: `false`]
- **`staleIfError: Boolean`** specify whether to resolve returned promise with stale value or `null` after load error [default: `false`]
- **`timeout: Number`** the timeout duration (in ms) before attempting retry [default: `5000`]

#### `abort (key: String|Array)`
Abort outstanding `load` operations. If `key` is omitted, all operations will be aborted:

```js
store
  .fetch('beep', 'http://localhost/beep')
  .catch((err) => {
    console.log(err.error); //=> 'request aborted'
  });
store.abort('beep');
```

### `DataStoreCursor`
Cursors are lightweight objects that scope `read`/`update` operations, limiting the need to have full knowledge of deeply nested data structures:

```js
const cursor = store.createCursor('foo/bar');
// All get()/update() calls are now scoped to 'foo/bar'
```

#### `get (key: String|Array): *`
Retrieve value stored at `key`. If `key` is an array of strings, returns an array of values:

```js
const values = cursor.get(['bat', 'boo']);
console.log(values[1] === store.get('foo/bar/boo')); //=> true
```

#### `update (key: String|Object, value: *, options: Object, ...args)`
Store `vaue` at `key`, batching all writes if `key` is a hash of `key:value` pairs, and notifying listeners of change. Any additional arguments will be passed to listeners:

```js
store.on('update:foo/bar/bat', (value, oldValue, foo) => {
  console.log(value, oldValue, foo); //=> false, true, foo
});
cursor.update('bat', false, null, foo);
```

Options are the same as for [`DataStore.set()`](#set-key-stringobject-value--options-object), with the exception that immutability is always enforced.

#### `createCursor (key: String): DataStoreCursor`
Instantiate a new `DataStoreCursor` at `key`, scoped to it's parent:

```js
const childCursor = cursor.createCursor('boo');
console.log(childCursor.get('0') === store.get('foo/bar/boo/0')); //=> true
```

## Handlers

In principle, the handlers API is similar to route matching in server frameworks, allowing you to match a key (url path) with a handler function. In practice, this enables observation, delegation, middleware, and side effects for the following methods:

**`DataStore`**
- `set`
- `reset`

**`FetchableDataStore`**
- `fetch`

Handlers are registered with `DataStore.use(match: RegExp|Array, handler: Function)`, and will route an operation matching a key (`match`), to a handler function (`handler`). Handlers are executed synchronously, and in series.

Matching is based on an optional regular expression (`match`). If no `match` is specified (is `null` or `undefined`), or if the method does not accept a `key` (as is the case for `reset`), handlers are automatically matched and executed.

### `HandlerContext`

Handler functions are passed a `HandlerContext` instance with the following properties:
- **`method: String`** method type
- **`store: DataStrore`** reference to current `DataStore` instance
- **`signature: Array`** method arguments for handled method
- **`key, value, options, etc`** argument values passed to handled method

```js
store.use(/foo/, function (context) {
  console.log(context.key); //=> 'foo/bar'
});
store.set('foo/bar', 'boo');
```

In addition, the following helper methods are available:
- **`merge(propName: String, prop: Object)`** merge `prop` with `context[propName]`:
```js
store.use('set', /foo/, function (context) {
  context.merge('options', { merge: false })
});
store.set('foo/bat', 'bat');
store.get('foo'); //=> { bat: 'bat' }
```