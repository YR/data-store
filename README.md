[![NPM Version](https://img.shields.io/npm/v/@yr/data-store.svg?style=flat)](https://npmjs.org/package/@yr/data-store)
[![Build Status](https://img.shields.io/travis/YR/data-store.svg?style=flat)](https://travis-ci.org/YR/data-store?branch=master)

A data object that supports storing and retrieving data with namespaced keys (`'foo/bar/bat'`), cursors, immutability, data fetching, actions, and a flexible handler api for observation, side effects, computed values and more.

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

- **`actions: Array`** array of arrays (`[name: String, action: Function]`) for passing to `registerAction` [default: `null`]. See [actions](#actions)
- **`handlers: Array`** array of arrays (`[match: RegExp, handler: Function]`) for passing to `useHandler` [default: `null`]. See [handlers](#handlers)
- **`isFetchable: Boolean`** specify whether instance should be a `FetchableDataStore` that supports data fetching [default: `false`]. See [FetchableDataStore](#fetchabledatastore)
- **`isWritable: Boolean`** specify whether instance should be writable via `set()` [default: `true`]
- **`serialisableKeys: Object`** object listing keys and their serialisable state [default: `{}`]. See [`setSerialisabilityOfKey()`](#setserialisabilityofkey-key-stringobject-value-boolean)

### `DataStore`

#### `useHandler (match: String|RegExp|Array, handler: Function)`
Register a handler (see [handlers](#handlers)):

```js
// Match with regexp...
store.useHandler(/foo/, function (context) { /* */ });
// ...or string...
store.useHandler('bar', function (context) { /* */ });
// ...or no match to match all
store.useHandler(function (context) { /* */ });
```

Batch register handlers by passing an array of tuples:

```js
store.useHandler([
  [/foo/, function (context) { /* */ }],
  ['bar', function (context) { /* */ }],
  [function (context) { /* */ }]
]);
```

#### `unuseHandler (match: String|RegExp|Array, handler: Function)`
Unregister a previously registerd handler:

```js
store.unuseHandler(/foo/, function (context) { /* */ });
```

Batch unregister handlers by passing an array of arrays:

```js
store.unuseHandler([
  [/foo/, function (context) { /* */ }],
  ['bar', function (context) { /* */ }],
  [function (context) { /* */ }]
]);
```

#### `registerAction (name: String|Array, action: Function)`
Register an `action` to be executed on `trigger()` (see [actions](#actions)):

```js
store.registerAction('do foo', function (store) { /* */ });
```

Batch register actions by passing an array of tuples:

```js
store.registerAction([
  ['do foo', function (store) { /* */ }],
  ['do bar with id', function (store, id) { /* */ }]
]);
```

#### `trigger (name: String, ...args)`
Trigger action registered with `name` (see [actions](#actions)):

```js
store.trigger('do bar with id', id);
```

#### `get (key: String): *`
Retrieve value stored at `key`. Empty key will return all data:

```js
store.get(['foo/bar/bat', 'bar']); //=> [true, false]
```

#### `getAll (keys: Array): Array`
Batch version of `get()`. Accepts array of `keys`, and returns array of `values`:

```js
store.getAll(['foo/bar/bat', 'bar']); //=> [true, false]
```

#### `set (key: String, value: *, options: Object)`
Store `value` at `key`:

```js
store.set('bat', 'bat');
```

`options` include:
- **`immutable: Boolean`** specify whether to mutate the underlying data object [default: `true` for browser, `false` for server]
- **`merge: Boolean`** specify whether to merge `value` into the underlying data object (`true`), or overwrite an existing key (`false`) [default: `true`]

#### `setAll (keys: Object, options: Object)`
Batch version of `set()`. Accepts hash of `key:value` pairs:

```js
store.set({ bat: 'bat', 'foo/bar/bat': false });
```

`options` are same as for `set()`.

#### `reference (key: String): String`
Retrieve reference to value stored at `key`. Creates a link that is resolvable on `get()`:

```js
store.set('stuff', store.reference('foo/bar/bat'));
store.get('stuff'); //=> true
```

#### `referenceAll (keys: Array): Array`
Batch version of `reference()`. Accepts array of `keys`, and returns array of reference keys:

```js
store.set('stuff', store.referenceAll(['foo/bar/bat', 'bar']));
store.get('stuff/0'); //=> true
```

#### `unreference (key: String): String`
Inverse of `reference()`.

#### `unreferenceAll (keys: Array): Array`
Batch version of `unreference()`. Accepts array of referenced `keys`, and returns array of keys.

#### `reset (data: Object)`
Reset/replace underlying data with `data`.

#### `destroy ()`
Destroy the instance, including all existing cursors.

#### `createCursor (key: String): DataStoreCursor`
Create instance of [`DataStoreCursor`](#datastorecursor) at `key`:

```js
const cursor = store.createCursor('foo/bar');
cursor.get('bat'); //=> true
```

#### `setSerialisabilityOfKey (key: String, value: Boolean)`
Specify serialisablity of `key`. Setting a `key` to `false` will exclude that key when stringifying:

```js
store.setSerialisabilityOfKey('foo', false);
JSON.stringify(store); //=> { "bar": false, "bat": "bat"}
```

#### `setSerialisabilityOfKeys (keys: Object)`
Batch version of `setSerialisabilityOfKey()`. Accepts a hash of `key:value` pairs:

```js
store.setSerialisabilityOfKeys({ foo: false, bat: false });
JSON.stringify(store); //=> { "bar": false }
```

#### `dump (stringify: Boolean): Object|String`
Retrieve all data as `Object` or `String` (if `stringify` argument is `true`).

### `FetchableDataStore`

#### `fetch (key: String, url: String, options: Object): Promise`
Retrieve value stored at `key`. If the stored value has not yet been set, or is set but expired (based on `expires` header), load from `url`:

```js
store
  .fetch('beep', 'http://localhost/beep')
  .then((response) => {
    console.log(response); //=> { duration: 1000, headers: {/* */}, body: { beep: 'foo' } }
    store.get('beep'); //=> { beep: 'foo' }
  });
```

The returned Promise resolves with a `response` object:
- **`body: Object`** the response body
- **`duration: Number`** load time in ms
- **`headers: Object`** the parsed response headers
- **`key: String`** the key used to store the response data

`options` include:
- **`abort: Boolean`** abort existing (outstanding) request to same url [default: `false`]
- **`ignoreQuery: Boolean`** ignore query parameters of `url` when matching existing, oustanding requests for the same url [default: `false`]
- **`minExpiry: Number`** the minimum expiry (in ms) to use in cases of invalid `expires` [default: `60000`]
- **`retries: Number`** the number of times to retry load on error [default: `2`]
- **`staleWhileRevalidate: Boolean`** specify whether to resolve returned promise with stale value or wait for loaded [default: `false`]
- **`staleIfError: Boolean`** specify whether to resolve returned promise with stale value or reject after load error [default: `false`]
- **`timeout: Number`** the timeout duration (in ms) before attempting retry [default: `5000`]

#### `fetchAll (keys: Array, options: Object): Promise`
Batch version of `fetch()`. Accepts an array of `[key, url, options]` tuples, returning a Promise resolving to an array of results:

```js
store
  .fetchAll([
    ['beep', 'http://localhost/beep'],
    ['foo', 'http://localhost/foo']
  ])
  .then((responses) => {
    store.get('beep'); //=> { beep: 'foo' }
  });
```

#### `abort (key: String)`
Abort outstanding `load` operations. If `key` is omitted, all operations will be aborted:

```js
store
  .fetch('beep', 'http://localhost/beep')
  .then((response) => {
    // Will never be called
  });
store.abort('beep');
```

### `DataStoreCursor`
Cursors are lightweight objects that scope `read` operations, limiting the need to have full knowledge of deeply nested data structures:

```js
const cursor = store.createCursor('foo/bar');
// All get()/getAll() calls are now scoped to 'foo/bar'
```

#### `trigger (name: String, ...args)`
Trigger action registered on parent `DataStore` with `name` (see [actions](#actions)):

```js
store.trigger('do bar with id', id);
```

#### `get (key: String): *`
Retrieve value stored at `key`:

```js
const value = cursor.get('bat');
console.log(value === store.get('foo/bar/boo')); //=> true
```

#### `getAll (keys: Array): Array`
Batch version of `get()`. Accepts array of `keys`, and returns array of `values`:

```js
const values = cursor.get(['bat', 'boo']);
console.log(values[1] === store.get('foo/bar/boo')); //=> true
```

#### `createCursor (key: String): DataStoreCursor`
Instantiate a new `DataStoreCursor` at `key`, scoped to it's parent:

```js
const childCursor = cursor.createCursor('boo');
console.log(childCursor.get('0') === store.get('foo/bar/boo/0')); //=> true
```

## Handlers

In principle, the handlers API is similar to route matching in server frameworks, allowing you to match a key (url path) with a handler function. In practice, this enables observation, delegation, middleware, and side effects for the following methods:

**`DataStore`**
- `set/setAll`
- `reset`

**`FetchableDataStore`**
- `fetch/fetchAll`

Handlers are registered with `DataStore.useHandler(match: String|RegExp|Array, handler: Function)`, and will route an operation matching a key (`match`), to a handler function (`handler`). Handlers are executed synchronously, and in series.

Matching is based on an optional regular expression or string (`match`). If no `match` is specified (is `null` or `undefined`), or if the method does not accept a `key` (as is the case for `reset`), handlers are automatically matched and executed.

### `HandlerContext`

Handler functions are passed a `HandlerContext` instance with the following properties:
- **`method: String`** method type
- **`store: DataStrore`** reference to current `DataStore` instance
- **`signature: Array`** method arguments for handled method
- **`key, value, options, etc`** argument values passed to handled method

```js
store.useHandler(/foo/, function (context) {
  console.log(context.key); //=> 'foo/bar'
});
store.set('foo/bar', 'boo');
```

In addition, the following helper method is available:
- **`merge(propName: String, prop: Object)`** merge `prop` with `context[propName]`:
```js
store.useHandler('set', /foo/, function (context) {
  context.merge('options', { merge: false })
});
store.set('foo/bat', 'bat');
store.get('foo'); //=> { bat: 'bat' }
```

## Actions

Actions are a simple way to associate a change event with arbitrary data changes and other side effects. Registered action handlers will be executed when calling `trigger(name: String, ...args)`:

```js
const DO_FOO = 'do foo';
store.registerAction(DO_FOO, function (store, bar) {
  console.log(bar); //=> 'bat'
  // Update 'store'
});
store.trigger(DO_FOO, 'bat');
```