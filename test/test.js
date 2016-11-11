'use strict';

const { create: createStore, handlers } = require('../src/index');
const agent = require('@yr/agent');
const expect = require('expect.js');
const fetch = require('../src/lib/methods/fetch');
const get = require('../src/lib/methods/get');
const load = require('../src/lib/methods/load');
const nock = require('nock');
const reload = require('../src/lib/methods/reload');
const set = require('../src/lib/methods/set');
const storage = require('@yr/local-storage');
const remove = require('../src/lib/methods/remove');
const update = require('../src/lib/methods/update');

let fake, store;

describe('DataStore', function () {
  beforeEach(function () {
    store = createStore('store', {
      bar: 'bat',
      boo: 'foo',
      foo: {
        bar: 'boo',
        boo: {
          bar: 'foo'
        }
      },
      bat: ['foo', 'bar']
    });
  });
  afterEach(function () {
    store.destroy();
  });

  describe('get()', function () {
    it('should return the property\'s value', function () {
      expect(get(store, 'bar')).to.equal('bat');
    });
    it('should return all properties if no key specified', function () {
      expect(get(store).bar).to.equal('bat');
    });
  });

  describe('set()', function () {
    it('should modify a property\'s value when called with simple key', function () {
      set(store, 'foo', 'bar');
      expect(store._data.foo).to.equal('bar');
    });
  });

  describe('remove()', function () {
    it('should remove a key', function () {
      remove(store, 'bar');
      expect(get(store, 'bar')).to.eql(undefined);
    });
    it('should not remove a key that doesn\'t exist', function () {
      remove(store, 'zing');
      expect(get(store, 'zing')).to.eql(undefined);
    });
  });

  describe('update()', function () {
    it('should set a value for "key"', function () {
      update(store, 'bar', 'bar');
      expect(get(store, 'bar')).to.equal('bar');
    });
    it('should notify listeners', function (done) {
      store.on('update', (key, value, oldValue) => {
        expect(key).to.equal('bar');
        expect(get(store, key)).to.equal(value);
        expect(oldValue).to.equal('bat');
        done();
      });
      update(store, 'bar', 'bar');
    });
    it('should notify listeners of specific property', function (done) {
      store.on('update:foo/bar', (value, oldValue) => {
        expect(value).to.equal('bar');
        expect(oldValue).to.equal('boo');
        done();
      });
      update(store, 'foo/bar', 'bar');
    });
    it('should allow passing of additional arguments to listeners', function (done) {
      store.on('update', (key, value, oldValue, options, foo, bool) => {
        expect(oldValue).to.equal('bat');
        expect(foo).to.equal('foo');
        expect(bool).to.be(true);
        done();
      });
      update(store, 'bar', 'bar', undefined, 'foo', true);
    });
  });

  describe('instance', function () {
    describe('constructor', function () {
      it('should instantiate with passed data', function () {
        expect(store.get).to.be.a(Function);
        expect(store._data).to.have.property('bar', 'bat');
      });
      it('should instantiate with id', function () {
        store = createStore('foo');
        expect(store.id).to.equal('foo');
      });
    });

    describe('getRootKey()', function () {
      it('should not modify an existing global key', function () {
        expect(store.getRootKey('/foo')).to.equal('/foo');
      });
      it('should modify an existing local key', function () {
        expect(store.getRootKey('foo')).to.equal('/foo');
      });
    });

    describe('get()', function () {
      it('should return the property\'s value', function () {
        expect(store.get('bar')).to.equal('bat');
      });
      it('should return all properties if no key specified', function () {
        expect(store.get().bar).to.equal('bat');
      });
      it('should return a root property\'s value', function () {
        expect(store.get('/foo/bar')).to.equal('boo');
      });
      it('should return an array of values when passed an array of keys', function () {
        expect(store.get(['bar', 'boo'])).to.eql(['bat', 'foo']);
      });
    });

    describe('set()', function () {
      it('should modify a property\'s value when called with simple key', function () {
        store.set('foo', 'bar');
        expect(store._data.foo).to.equal('bar');
      });
      it('should modify a root property\'s value', function () {
        store.set('/foo/bar', 'bar');
        expect(store._data.foo.bar).to.equal('bar');
      });
      it('should allow batch writes', function () {
        store.set({
          test: 'success',
          'boop/bar': 'foo'
        });
        expect(store._data.test).to.equal('success');
        expect(store._data.boop).to.have.property('bar', 'foo');
      });
      it('should do nothing if dataStore is not writable', function () {
        store.isWritable = false;
        store.set('foo', 'bar');
        expect(store._data.foo).to.not.equal('bar');
      });
      it.skip('should allow replacing all data when no key specified', function () {
        const obj = { test: 'success' };

        store.set(null, obj);
        expect(store._data).to.eql(obj);
      });
      it.skip('should remove a key when null value specified', function () {
        store.set('foo/boo', null);
        expect(store.get('foo/boo')).to.eql(null);
        expect(store.get('foo')).to.not.have.property('boo');
        store.set('boo', null);
        expect(store.get('boo')).to.eql(undefined);
        expect(store.get()).to.not.have.property('boo');
        store.set('a', null);
        expect(store.get()).to.not.have.property('a');
      });
    });

    describe('remove()', function () {
      it('should remove a key', function (done) {
        store.on('remove:bar', (value, oldValue) => {
          expect(value).to.equal(null);
          expect(oldValue).to.equal('bat');
          expect(store.get('bar')).to.eql(undefined);
          done();
        });
        store.remove('bar');
      });
      it('should not remove a key that doesn\'t exist', function (done) {
        store.on('remove', (value, oldValue) => {
          throw new Error('nope');
        });
        setTimeout(() => {
          expect(store.get('zing')).to.eql(undefined);
          done();
        }, 40);
        store.remove('zing');
      });
    });

    describe('update()', function () {
      it('should set a value for "key"', function () {
        store.update('bar', 'bar');
        expect(store.get('bar')).to.equal('bar');
      });
      it('should allow batch writes', function () {
        store.update({ bar: 'bar', foo: 'bar' });
        expect(store.get('bar')).to.equal('bar');
        expect(store.get('foo')).to.equal('bar');
      });
      it('should notify listeners', function (done) {
        store.on('update', (key, value, oldValue) => {
          expect(key).to.equal('bar');
          expect(store.get(key)).to.equal(value);
          expect(oldValue).to.equal('bat');
          done();
        });
        store.update('bar', 'bar');
      });
      it('should notify listeners of specific property', function (done) {
        store.on('update:foo/bar', (value, oldValue) => {
          expect(value).to.equal('bar');
          expect(oldValue).to.equal('boo');
          done();
        });
        store.update('foo/bar', 'bar');
      });
      it('should allow passing of additional arguments to listeners', function (done) {
        store.on('update', (key, value, oldValue, options, foo, bool) => {
          expect(oldValue).to.equal('bat');
          expect(foo).to.equal('foo');
          expect(bool).to.be(true);
          done();
        });
        store.update('bar', 'bar', undefined, 'foo', true);
      });
      it('should allow passing of additional arguments to listeners for batch writes', function (done) {
        const obj = { bar: 'bar', boo: 'boo' };
        let i = 0;

        store.on('update', (key, value, oldValue, options, foo) => {
          expect(foo).to.equal('foo');
          if (++i == 2) done();
        });
        store.update(obj, undefined, 'foo');
      });
      it('should be ignored if dataStore is not "isWritable"', function () {
        store.isWritable = false;
        store.update('bar', 'bar');
        expect(store.get('bar')).to.not.equal('bar');
      });
    });

    describe('cursors', function () {
      describe('createCursor()', function () {
        it('should generate a cursor instance', function () {
          const cursor = store.createCursor();

          expect(store.get('bar')).to.equal('bat');
          expect(cursor.get('bar')).to.equal('bat');
        });
        it('should generate a cursor instance with a subset of data at "key"', function () {
          const cursor = store.createCursor('foo');

          expect(store.get('bar')).to.equal('bat');
          expect(cursor.get('bar')).to.equal('boo');
        });
        it('should allow retrieving all cursor properties when no key specified', function () {
          const cursor = store.createCursor('foo');

          expect(cursor.get()).to.eql({
            bar: 'boo',
            boo: {
              bar: 'foo'
            }
          });
          expect(cursor.get()).to.eql(store.get('foo'));
        });
        it('should enable creating a cursor from an existing cursor', function () {
          const cursor1 = store.createCursor();
          const cursor2 = cursor1.createCursor('foo');

          expect(store.get('bar')).to.equal('bat');
          expect(cursor1.get('bar')).to.equal('bat');
          expect(cursor2.get('bar')).to.equal('boo');
        });
        it('should allow access to root properties', function () {
          store.set('bat', 'zip');
          const cursor1 = store.createCursor('foo');
          const cursor2 = cursor1.createCursor('boo');

          expect(cursor2.get('/bat')).to.equal('zip');
        });
        it('should access updated data after update to store', function () {
          const cursor = store.createCursor('foo');

          expect(cursor.get()).to.equal(store.get('foo'));
          store.set('foo', 'bar');
          expect(cursor.get()).to.equal('bar');
        });
      });

      describe('update()', function () {
        it('should set a value for "key" of a cursor', function () {
          const cursor = store.createCursor('foo');

          cursor.update('bar', 'bar');
          expect(store.get('foo/bar')).to.equal('bar');
        });
        it('should set a root value for empty "key" of a cursor', function () {
          const cursor = store.createCursor('foo');

          cursor.update(null, { bar: 'bar' });
          expect(store.get('foo/bar')).to.equal('bar');
        });
        it('should remove a cursor key when null value specified', function () {
          const cursor = store.createCursor('foo');

          cursor.update();
          expect(store.get('foo/bar')).to.equal(null);
          expect(store._data).to.not.have.property('foo');
        });
        it('should allow batch writes', function () {
          const cursor = store.createCursor('foo/boo');
          const obj = {
            bar: 'bar',
            'boop/bar': [],
            '/boo': 'bar'
          };

          cursor.update(obj);
          expect(store.createCursor('foo/boo').get('bar')).to.equal('bar');
          expect(store.get('boo')).to.equal('bar');
        });
        it('should notify listeners on update of a cursor', function (done) {
          const cursor = store.createCursor('foo');

          store.on('update', (key, value, oldValue) => {
            expect(key).to.equal('foo/bar');
            expect(oldValue).to.equal('boo');
            expect(store.get(key)).to.equal(value);
            done();
          });
          cursor.update('bar', 'bar');
        });
      });
    });

    describe('destroy()', function () {
      it('should destroy all data references', function () {
        store.destroy();
        expect(store.destroyed).to.eql(true);
        expect(store._data).to.eql({});
      });
    });

    describe('dump()', function () {
      it('should return a serialisable json object with no excluded properties', function () {
        store.set('bing', 'bong', { serialisable: false });
        const obj = store.dump();

        expect(obj.bing).to.equal('bong');
      });
      it('should optionally return a serialised string', function () {
        const json = store.dump(true);

        expect(json).to.be.a.String;
      });
    });

    describe('toJSON()', function () {
      it('should return a serialisable json object', function () {
        const json = store.toJSON();

        expect(json).to.be.an.Object;
        expect(json.bar).to.equal('bat');
      });
      it('should return a serialisable json object with correctly handled array properties', function () {
        const json = JSON.stringify(store);

        expect(json).to.be.a.String;
        expect(json).to.match(/"bat":\["foo","bar"\]/);
        expect(JSON.parse(json)).to.have.property('bat');
        expect(JSON.parse(json).bat).to.eql(['foo', 'bar']);
      });
      it('should return a serialisable json object with excluded properties', function () {
        store.set('bing', 'bong', { serialisable: false });
        const json = store.toJSON();

        expect(json).to.be.an.Object;
        expect(json.bar).to.equal('bat');
        expect(json.bing).to.not.exist;
      });
      it('should return a serialisable json object with excluded nested properties', function () {
        store.set('foo/bar', 'bong', { serialisable: false });
        const json = store.toJSON();

        expect(json).to.be.an.Object;
        expect(json.bar).to.equal('bat');
        expect(json.foo.bar).to.not.exist;
      });
      it('should return a serialised json object at specific key', function () {
        const json = store.toJSON('foo');

        expect(json).to.eql(store.get('foo'));
      });
      it('should return a serialised json object at specific key with excluded properties', function () {
        store.set('foo/bar', 'bong', { serialisable: false });
        const json = store.toJSON('foo');

        expect(json.bar).to.not.exist;
      });
    });

    describe('handling', function () {
      describe('get()', function () {
        it('should allow handling', function () {
          let run = 0;

          store.registerMethodHandler('get', null, function (store, context) {
            run++;
          });
          expect(store.get('bar')).to.equal('bat');
          expect(run).to.equal(1);
        });
        it('should allow matched handling', function () {
          let run = 0;

          store.registerMethodHandler('get', /foo\/[a-z]ar/, function (store, context) {
            run++;
            expect(context.key).to.equal('foo/bar');
          });
          expect(store.get('foo/bar')).to.equal('boo');
          expect(run).to.equal(1);
        });
        it('should allow delegation for computed values', function () {
          let run = 0;

          store.registerMethodHandler('get', /foo\/[a-z]ar/, function (store, context) {
            run++;
            return `${store.get('bar')} ${store.get('boo')}`;
          });
          expect(store.get('foo/bar')).to.equal('bat foo');
          expect(run).to.equal(1);
        });
        it('should allow multiple delegates', function () {
          let run = 0;

          store.registerMethodHandler('get', /foo/, function (store, context) {
            run++;
          });
          store.registerMethodHandler('get', /foo/, function (store, context) {
            run++;
          });
          expect(store.get('foo/bar')).to.equal('boo');
          expect(run).to.equal(2);
        });
      });

      describe('set()', function () {
        it('should allow delegation', function () {
          let run = 0;

          store.registerMethodHandler('set', /zing/, function (store, context) {
            run++;
            context.value = 'bar';
            expect(context.key).to.equal('zing');
          });
          store.set('zing', 'foo');
          expect(store._data.zing).to.equal('bar');
          expect(run).to.equal(1);
        });
        it('should allow multiple delegates', function () {
          let run = 0;

          store.registerMethodHandler('set', /zing/, function (store, context) {
            run++;
            context.value = 'bar';
          });
          store.registerMethodHandler('set', /zing/, function (store, context) {
            run++;
            context.key = {
              [context.key]: context.value,
              zang: 'bar'
            };
            context.value = null;
          });
          store.set('zing', 'foo');
          expect(store._data.zing).to.equal('bar');
          expect(store._data.zang).to.equal('bar');
          expect(run).to.equal(2);
        });
      });
    });
  });

  describe('handlers', function () {
    describe('persistToStorage', function () {
      before(function () {
        storage.clear();
        storage.init({ version: { foo: 1 }, writeDelay: 0 });
      });
      beforeEach(function () {
        store.destroy();
      });
      afterEach(function () {
        storage.clear();
      });

      it('should instantiate store with storage data', function () {
        storage.set('foo/bar', { boo: 'bat' });
        store = createStore('store', null, { handlers: handlers.persistToStorage(/foo/, storage, 2) });
        expect(store._data).to.eql({ foo: { bar: { boo: 'bat' } } });
        expect(storage.get('foo')).to.eql({ 'foo/bar': { boo: 'bat' } });
      });
      it('should instantiate with storage data and passed data', function () {
        storage.set('foo/bar', { boo: 'bat' });
        store = createStore('store', { foo: { bat: 'boo' }, bar: 'bar' }, { handlers: handlers.persistToStorage(/foo/, storage, 2) });
        expect(store._data).to.eql({ foo: { bar: { boo: 'bat' }, bat: 'boo' }, bar: 'bar' });
        expect(storage.get('foo')).to.eql({ 'foo/bar': { boo: 'bat' } });
      });
      it('should instantiate with storage data, upgrading if necessary', function () {
        storage.set('foo/bar', { boo: 'bat' });
        storage.init({ version: { foo: 2 }, writeDelay: 0 });
        store = createStore('store', null, { handlers: handlers.persistToStorage(/foo/, storage, 2, (key, value) => 'foo') });
        expect(store._data).to.eql({ foo: { bar: 'foo' } });
        expect(storage.get('foo')).to.eql({ 'foo/bar': 'foo' });
      });
      it('should persist data to storage when set', function () {
        store = createStore('store', { foo: { bat: 'boo' }, bar: 'bar' }, { handlers: handlers.persistToStorage(/foo\/bar/, storage, 2) });
        store.set('foo/bar', { boo: 'foo' });
        expect(storage.get('foo')).to.eql({ 'foo/bar': { boo: 'foo' } });
      });
      it('should unpersist data to storage when removed', function () {
        store = createStore('store', { foo: { bat: 'boo' }, bar: 'bar' }, { handlers: handlers.persistToStorage(/foo\/bar/, storage, 2) });
        store.set('foo/bar', { boo: 'foo' });
        expect(storage.get('foo')).to.eql({ 'foo/bar': { boo: 'foo' } });
        store.remove('foo/bar');
        expect(storage.get('foo')).to.eql({ });
      });
    });
  });
});

describe('FetchableDataStore', function () {
  beforeEach(function () {
    store = createStore('store', {
      bar: 'bat',
      boo: 'foo',
      foo: {
        bar: 'boo',
        boo: {
          bar: 'foo'
        }
      },
      bat: ['foo', 'bar']
    }, { isFetchable: true });
  });
  afterEach(function () {
    store.destroy();
  });

  describe('load()', function () {
    beforeEach(function () {
      fake = nock('http://localhost');
    });
    afterEach(function () {
      nock.cleanAll();
    });

    it('should load and store data for "key"', function () {
      fake
        .get('/foo')
        .reply(200, { foo: 'foo' });

      return load(store, 'foo', 'http://localhost/foo', {})
        .then((res) => {
          expect(get(store, 'foo')).to.have.property('foo', 'foo');
        });
    });
    it('should load and store data for "key" with expires header value', function () {
      const d = new Date();

      fake
        .get('/foo')
        .reply(200, { foo: 'foo' }, { expires: d.toUTCString() });

      return load(store, 'foo', 'http://localhost/foo', {})
        .then((res) => {
          expect(get(store, 'foo')).to.have.property('__expires');
        });
    });
  });

  describe('reload()', function () {
    beforeEach(function () {
      fake = nock('http://localhost');
    });
    afterEach(function () {
      nock.cleanAll();
    });

    it('should load "key" if already expired', function (done) {
      fake
        .get('/foo')
        .times(2)
        .reply(200, { foo: 'bar' });
      expect(get(store, 'foo')).to.eql({ bar: 'boo', boo: { bar: 'foo' } });
      set(store, 'foo/__expires', Date.now() + 50);
      reload(store, 'foo', 'http://localhost/foo', { minExpiry: 40 });
      setTimeout(() => {
        expect(get(store, 'foo')).to.have.property('foo', 'bar');
        done();
      }, 100);
    });
    it('should load "key" with default duration if invalid "expires"', function (done) {
      fake
        .get('/foo')
        .times(2)
        .reply(200, { foo: 'bar' });
      expect(get(store, 'foo')).to.eql({ bar: 'boo', boo: { bar: 'foo' } });
      set(store, 'foo/__expires', 0);
      reload(store, 'foo', 'http://localhost/foo', { minExpiry: 75 });
      setTimeout(() => {
        expect(get(store, 'foo')).to.have.property('foo', 'bar');
        done();
      }, 100);
    });
  });

  describe('fetch()', function () {
    beforeEach(function () {
      fake = nock('http://localhost');
    });
    afterEach(function () {
      nock.cleanAll();
    });

    it('should return a Promise with the value', function () {
      return fetch(store, 'bar', {})
        .then((value) => {
          expect(value.data).to.equal('bat');
        });
    });
    it('should return a Promise with expired value when "options.staleWhileRevalidate = true"', function () {
      set(store, 'foo/__expires', 0);

      return fetch(store, 'foo', 'http://localhost/foo', { staleWhileRevalidate: true })
        .then((value) => {
          expect(value.data).to.not.have.property('foo');
        });
    });
    it('should return a Promise with fresh value when "options.staleWhileRevalidate = false"', function () {
      fake
        .get('/foo')
        .reply(200, { foo: 'foo' });
      set(store, 'foo/__expires', 0);

      return fetch(store, 'foo', 'http://localhost/foo', { staleWhileRevalidate: false })
        .then((value) => {
          expect(value.data).to.have.property('foo', 'foo');
        });
    });
    it('should return a Promise when failure loading', function () {
      fake
        .get('/beep')
        .reply(500);

      return fetch(store, 'beep', 'http://localhost/beep', { retry: 0, timeout: 10 })
        .then((value) => {
          expect(value.data).to.equal(null);
          expect(value.headers.status).to.equal(500);
        });
    });
    it('should return a Promise when loading aborted', function (done) {
      fake
        .get('/beep')
        .delayConnection(100)
        .reply(200, { beep: 'beep' });

      fetch(store, 'beep', 'http://localhost/beep', { retry: 0, timeout: 10 })
        .then((value) => {
          expect(value.data).to.equal(null);
          expect(value.headers.status).to.equal(499);
          done();
        }).catch((err) => {
          done(err);
        });
      agent.abortAll();
    });
    it('should reload "key" after expiry with "options.reload = true"', function (done) {
      fake
        .get('/beep')
        .reply(200, { beep: 'foo' }, { expires: 0 })
        .get('/beep')
        .reply(200, { beep: 'bar' });

      fetch(store, 'beep', 'http://localhost/beep', { reload: true, retry: 0, timeout: 10, minExpiry: 75 })
        .then((value) => {
          expect(get(store, 'beep')).to.have.property('beep', 'foo');
          setTimeout(() => {
            expect(get(store, 'beep')).to.have.property('beep', 'bar');
            done();
          }, 100);
        })
        .catch((err) => {
          done(err);
        });
    });
    it('should reload "key" after error', function (done) {
      fake
        .get('/beep')
        .reply(500)
        .get('/beep')
        .reply(200, { beep: 'bar' });

      fetch(store, 'beep', 'http://localhost/beep', { reload: true, retry: 0, timeout: 10, minExpiry: 75 })
        .then((value) => {
          expect(value.data).to.equal(null);
          setTimeout(() => {
            expect(get(store, 'beep')).to.have.property('beep', 'bar');
            done();
          }, 100);
        })
        .catch((err) => {
          done(err);
        });
    });
    it.skip('should cancel existing reload of "key" when loading new "key"', function (done) {
      fake
        .get('/beep')
        .reply(200, { foo: 'foo' }, { expires: 0 })
        .get('/beep')
        .reply(200, { foo: 'bar' })
        .get('/bop')
        .reply(200, { bar: 'bar' }, { expires: 0 });

      fetch(store, 'beep', 'http://localhost/beep', { merge: false, reload: true })
        .then((value) => {
          expect(get(store, 'beep')).to.have.property('foo', 'foo');
          setTimeout(() => {
            fetch(store, 'bop', 'http://localhost/bop', { merge: false, reload: true })
              .then((value) => {
                expect(get(store, 'beep')).to.have.property('foo', 'foo');
                expect(get(store, 'bop')).to.have.property('bar', 'bar');
                setTimeout(() => {
                  expect(get(store, 'beep')).to.have.property('foo', 'foo');
                  done();
                }, 600);
              })
              .catch((err) => {
                done(err);
              });
          }, 10);
        })
        .catch((err) => {
          done(err);
        });
    });
  });

  describe('handlers', function () {
    describe('fetchWithTemplatedURL', function () {
      beforeEach(function () {
        fake = nock('http://localhost');
      });
      afterEach(function () {
        nock.cleanAll();
      });

      it('should handle fetching with url template values', function () {
        fake
          .get('/foo')
          .reply(200, { foo: 'foo' });
        store.set('foo/__expires', 0);
        store.registerMethodHandlers(handlers.fetchWithTemplatedURL(/foo/, 'http://localhost/{page}', {}));

        return store
          .fetch('foo', { page: 'foo' })
          .then((value) => {
            expect(value.data).to.have.property('foo', 'foo');
          });
      });
      it('should handle fetching with default options', function () {
        fake
          .get('/foo')
          .reply(200, { foo: 'foo' });
        store.set('foo/__expires', 0);
        store.registerMethodHandlers(handlers.fetchWithTemplatedURL(/foo/, 'http://localhost/{page}', { staleWhileRevalidate: true }));

        return store
          .fetch('foo', { page: 'foo' })
          .then((value) => {
            expect(value.data).to.have.property('bar', 'boo');
          });
      });
    });
  });
});