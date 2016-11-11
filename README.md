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

- **`handlers: Object`** handler definitions, keyed by method name (default: `{}`)
- **`isFetchable: Boolean`** specify whether instance should be a `FetchableDataStore` that supports data fetching (default: `false`)
- **`isWritable: Boolean`** specify whether instance should be writable via `set()/update()` (default: `true`)
- **`serialisableKeys: Object`** object listing keys and their serialisable state (default: `{}`)

### `DataStore`

#### `registerHandledMethod (methodName: String, fn: Function, signature: Array)`

#### `registerMethodHandlers (handlers: Object)`

#### `registerMethodHandler (methodName: String, match: RegExp, handler: Function)`

#### `get (key: String|Array): *` 
Retrieve value stored at `key`. If `key` is an array of strings, returns an array of values:

```js
store.get(['foo/bar/bat', 'bar']); //=> [true, false]
```

#### `set (key: String|Object, value: *, options: Object)` 
Store `value` at `key`. Batches all writes if `key` is an object of `key:value` pairs:

```js
store.set({bat: 'bat', 'foo/bar/bat': false });
```

Options include:
- **`immutable: Boolean`** specify whether to mutate the underlying data object (default: `true` for browser, `false` for server)
- **`reference: Boolean`** specify whether to track and update all references to the `value` object for subsequent changes (default: `false`)
- **`merge: Boolean`** specify whether to merge `value` into the underlying data object (default: `true`)

#### `update (key: String, value: *, options: Object, ...args)`
Store `vaue` at `key`, batching all writes if `key` is an object of `key:value` pairs, and notifying listeners of change:

```js
store.on('update', (key, value, oldValue) => {
  console.log(value, oldValue); //=> true, false
});
store.on('update:foo/bar/bat', (value, oldValue) => {
  console.log(value, oldValue); //=> true, false
});
store.update('foo/bar/bat', true);
```

Options same as for `set()`

#### `remove (key: String)`
Remove `key`:

```js
store.remove('bar');
store.get('bar'); //=> undefined
```

#### `reset (data: Object)`
Reset/replace underlying `data`.

#### `destroy ()`
Destroy instance, including all cursors.

#### `createCursor (key: String): DataStoreCursor`
Create instance of `DataStoreCursor` at `key`:

```js
const cursor = store.createCursor('foo/bar');
cursor.get('bat'); //=> true
```

#### `setSerialisableKey (key: String|Object, value: Boolean)`
Store serialisablity of `key`. Batches changes if `key` is an object of `key:value` pairs. Setting a `key` to `false` will exclude that key when stringifying:

```js
store.setSerialisableKey('foo', false);
JSON.stringify(store); //=> { "bar": false, "bat": "bat"}
```

#### `dump (stringify: Boolean): Object|String`
Retrieve all data as `Object` or `String` (if `stringify` argument is `true`).

### `FetchableDataStore`

#### `fetch (key: String, url: String, options: Object): Promise`
Retrieve value stored at `key`. If not present, or expired (based on `expires` header), will fetch from `url`:

```js
store
  .fetch('foo', 'http://localhost/foo')
  .then((value) => {
    console.log(value); //=> { duration: 1000, headers: {/* */}, data: { bar: 'foo' } }
    store.get('foo'); //=> { bar: 'foo' }
  });
```

Options include:
- **`abort: Boolean`** abort existing (outstanding) request to same url (default `false`)
- **`ignoreQuery: Boolean`** ignore query parameters of `url` when matching existing, oustanding requests for the same url (default `false`)
- **`minExpiry: Number`** the minimum expiry (in ms) to use in cases of invalid `expires` (default: `60000`)
- **`reload: Boolean`** specify whether to automatically reload data on expiry (default: `false`)
- **`retry: Number`** the number of attempted retries on load error (default: `2`)
- **`staleWhileRevalidate: Boolean`** specify whether to resolve returned promise with stale value or wait for loaded (default: `false`)
- **`staleIfError: Boolean`** specify whether to resolve returned promise with stale value or `null` after load error (default: `false`)
- **`timeout: Number`** the timeout duration (in ms) before attempting retry (default: `5000`)

### `DataStoreCursor`

#### `get (key: String|Array): *`

#### `update (key: String, value: *, options: Object, ...args)`

#### `createCursor (key: String): DataStoreCursor`

#### `destroy ()`
