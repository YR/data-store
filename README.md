[![NPM Version](https://img.shields.io/npm/v/@nrk/yr-data-store.svg?style=flat)](https://npmjs.org/package/@nrk/yr-data-store)
[![Build Status](https://img.shields.io/travis/nrkno/yr-data-store.svg?style=flat)](https://travis-ci.org/nrkno/yr-data-store?branch=master)

A data object that supports storing and retrieving data with namespaced keys (`'foo/bar/bat'`), immutability, data
fetching, and a flexible handler api for observation, side effects, computed values and more.

## Usage

```js
const dataStoreFactory = require("@nrk/yr-data-store").create;
const store = dataStoreFactory("fooStore", { foo: true, bar: false });

store.get("foo"); //=> true
store.set("foo/bar", { bat: true, boo: ["boo"] }, { immutable: true });
store.get("foo/bar/bat"); //=> true
```

## API

#### `create (id: String, data: Object, options: Object): DataStore|FetchableDataStore`

Instance factory. Options include:

- **`handlers: Array`** array of tuples (`[match: RegExp, handler: Function]`) for passing to `useHandler` [default:
  `null`]. See [handlers](#handlers)
- **`isFetchable: Boolean`** specify whether instance should be a `FetchableDataStore` that supports data fetching
  [default: `false`]. See [FetchableDataStore](#fetchabledatastore)
- **`isWritable: Boolean`** specify whether instance should be writable via `set()` [default: `true`]
- **`serialisableKeys: Object`** object listing keys and their serialisable state [default: `{}`]. See
  [`setSerialisabilityOfKey()`](#setserialisabilityofkey-key-stringobject-value-boolean)

### `DataStore`

#### `setWriteable (value: Boolean)`

Set the writeable state of a store. A read-only store will internally cache all calls to `get()`. Calling
`setWriteable()` to toggle read/write state will invalidate the internal cache.

#### `get (key: String, options: Object): *`

Retrieve value stored at `key`. Empty key will return all data:

```js
store.get("foo/bar/bat"); //=> true
```

#### `getAll (keys: Array): Array`

Batch version of `get()`. Accepts array of `keys`, and returns array of `values`:

```js
store.getAll(["foo/bar/bat", "bar"]); //=> [true, false]
```

#### `set (key: String, value: *, options: Object)`

Store `value` at `key`:

```js
store.set("bat", "bat");
```

`options` include:

- **`immutable: Boolean`** specify whether to mutate the underlying data object [default: `true` for browser, `false`
  for server]
- **`merge: Boolean`** specify whether to merge `value` into the underlying data object (`true`), or overwrite an
  existing key (`false`) [default: `true`]

#### `setAll (keys: Object, options: Object)`

Batch version of `set()`. Accepts hash of `key:value` pairs:

```js
store.set({ bat: "bat", "foo/bar/bat": false });
```

`options` are same as for `set()`.

#### `reset (data: Object)`

Reset/replace underlying data with `data`.

#### `destroy ()`

Destroy the instance.

#### `setSerialisabilityOfKey (key: String, value: Boolean)`

Specify serialisablity of `key`. Setting a `key` to `false` will exclude that key when stringifying:

```js
store.setSerialisabilityOfKey("foo", false);
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

#### `fetch (key: String, url: String, options: Object): Promise`

Retrieve value stored at `key`. If the stored value has not yet been set, or is set but expired (based on `expires`
header), load from `url`:

```js
store.fetch("beep", "http://localhost/beep").then(response => {
  console.log(response); //=> { duration: 1000, headers: {/* */}, body: { beep: 'foo' } }
  store.get("beep"); //=> { beep: 'foo' }
});
```

The returned Promise resolves with a `response` object:

- **`body: Object`** the response body
- **`duration: Number`** load time in ms
- **`headers: Object`** the parsed response headers
- **`key: String`** the key used to store the response data

`options` include:

- **`abort: Boolean`** abort existing (outstanding) request to same url [default: `false`]
- **`cacheControl: String`** default `cache-control` header to determine value expiry [default: `"public, max-age=120,
  stale-if-error=180"`]
- **`ignoreQuery: Boolean`** ignore query parameters of `url` when matching existing, oustanding requests for the same
  url [default: `false`]
- **`minExpiry: Number`** the minimum expiry (in ms) to use in cases of invalid `expires` [default: `60000`]
- **`retries: Number`** the number of times to retry load on error [default: `2`]
- **`rejectOnError: Boolean`** specify whether to reject on error or resolve with stale value [default: `true`]
- **`timeout: Number`** the timeout duration (in ms) before attempting retry [default: `5000`]

#### `fetchAll (keys: Array, options: Object): Promise`

Batch version of `fetch()`. Accepts an array of `[key, url, options]` tuples, returning a Promise resolving to an array
of results:

```js
store
  .fetchAll([
    ["beep", "http://localhost/beep"],
    ["foo", "http://localhost/foo"]
  ])
  .then(responses => {
    store.get("beep"); //=> { beep: 'foo' }
  });
```

#### `abort (key: String)`

Abort outstanding `load` operations. If `key` is omitted, all operations will be aborted:

```js
store.fetch("beep", "http://localhost/beep").then(response => {
  // Will never be called
});
store.abort("beep");
```
