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

- **`handlers: Object`** handler definitions, keyed by method name [default: `{}`]. See [handlers](#handlers)
- **`isFetchable: Boolean`** specify whether instance should be a `FetchableDataStore` that supports data fetching [default: `false`]. See [FetchableDataStore](#fetchabledatastore)
- **`isWritable: Boolean`** specify whether instance should be writable via `set()/update()` [default: `true`]
- **`serialisableKeys: Object`** object listing keys and their serialisable state [default: `{}`]. See [`setSerialisabilityOfKey()`](#setserialisabilityofkey-key-stringobject-value-boolean)

### `DataStore`

#### `registerMethodHandlers (handlers: Object)`
Bulk register method handlers:

```js
store.registerMethodHandlers({
  get: [{
    match: /foo/,
    handler: function (store, context) { /* */ }
  }],
  set: [{
    match: /foo/,
    handler: function (store, context) { /* */ }
  }]
});
```

#### `registerMethodHandler (methodName: String, match: RegExp, handler: Function)`
Register a method handler for `methodName`:

```js
store.registerMethodHandler('get', /foo/, function (store, context) { /* */ });
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

#### `remove (key: String|Array)`
Remove value stored at `key`. If `key` is an array of keys, batch removes values:

```js
store.remove(['foo', 'bar']);
store.get('foo'); //=> undefined
store.get('bar'); //=> undefined
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
Retrieve value stored at `key`. If `key` is a hash of `key:url` pairs, batch fetch those values, returning a Promise resolving to an array of results. If the stored value has not yet been set, or is set but expired (based on `expires` header), will load from `url`:

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
- **`reload: Boolean`** specify whether to automatically reload data on expiry [default: `false`]
- **`retries: Number`** the number of times to retry load on error [default: `2`]
- **`staleWhileRevalidate: Boolean`** specify whether to resolve returned promise with stale value or wait for loaded [default: `false`]
- **`staleIfError: Boolean`** specify whether to resolve returned promise with stale value or `null` after load error [default: `false`]
- **`timeout: Number`** the timeout duration (in ms) before attempting retry [default: `5000`]

### `DataStoreCursor`
Cursors are lightweight objects that scope `read`/`update` operations, limiting the necessity to have full knowledge of deeply nested data structures:

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

