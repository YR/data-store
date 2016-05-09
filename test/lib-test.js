'use strict';

const expect = require('expect.js');
const nock = require('nock');
const Store = require('../src/index');
const time = require('@yr/time');

const storage = {
  _storage: {},
  init () {
    this._storage = {};
  },
  get (key) {
    return this._storage[key];
  },
  set (key, value) {
    this._storage[key] = value;
  },
  remove (key) {
    delete this._storage[key];
  },
  clear () {
    this._storage = {};
  },
  shouldUpgrade (key) {
    return false;
  }
};
let fake, store;

describe('dataStore', function () {
  before(function () {
    storage.clear();
    storage.init();
  });
  beforeEach(function () {
    store = Store.create('store', {
      bar: 'bat',
      boo: 'foo',
      foo: {
        bar: 'boo',
        boo: {
          bar: 'foo'
        }
      },
      bat: ['foo', 'bar']
    }, {
      loading: {
        defaultExpiry: 1000
      },
      storage: {
        store: storage
      }
    });
  });
  afterEach(function () {
    storage.clear();
    store.destroy();
  });

  describe('constructor', function () {
    it('should instantiate with default values set', function () {
      expect(store._data).to.have.property('bar', 'bat');
      expect(store.get).to.be.a.Function;
    });
    it('should instantiate with id', function () {
      store = Store.create('foo');
      expect(store.id).to.equal('foo');
    });
    it.only('should instantiate with storage data', function (done) {
      storage.set('foo', { bar: 'bar' });
      setTimeout(() => {
        store = Store.create('foo', null, { bootstrap: true, persistent: { storage } });
        store._bootstrap();
        expect(store._data).to.eql({ bar: 'bar' });
        expect(storage.get('foo')).to.eql({ foo: { bar: 'bar' }});
        done();
      }, 100);
    });
    it.skip('should instantiate with complex storage data', function (done) {
      storage.set('foo/bar', 'bar');
      setTimeout(() => {
        store = Store.create('foo', null, { bootstrap: true, persistent: { storage }});
        store._bootstrap();
        expect(store._data).to.eql({ bar: 'bar' });
        expect(storage.get('foo')).to.eql({ 'foo/bar': 'bar' });
        done();
      }, 100);
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
    it('should flag expired objects', function () {
      const c = Store.create('zing', { bing: { expires: +time.create().subtract(1, 'day') } });

      expect(c.get('bing')).to.have.property('expired', true);
      expect(c.get('bing')).to.have.property('expires', 0);
    });
    it('should handle delegation', function () {
      store._handlers = {
        get: {
          foo: function (store, get, key) {
            return get('bar');
          }
        }
      };
      expect(store.get('foo/bar')).to.equal('bat');
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
    it('should allow batch writes with delegation', function () {
      store._handlers = {
        set: {
          zing: function (store, set, key, value, options) {
            return set(key, 'bar');
          }
        }
      };
      store.set({
        test: 'success',
        'zing/bing': 'foo'
      });
      expect(store._data.test).to.equal('success');
      expect(store._data.zing.bing).to.equal('bar');
    });
    it('should do nothing if dataStore is not writable', function () {
      store.writable = false;
      store.set('foo', 'bar');
      expect(store._data.foo).to.not.equal('bar');
    });
    it('should allow replacing all data when no key specified', function () {
      const obj = { test: 'success' };

      store.set(null, obj);
      expect(store._data).to.eql(obj);
    });
    it('should remove a key when null value specified', function () {
      store.set('foo/boo', null);
      expect(store.get('foo/boo')).to.eql(null);
      expect(store.get('foo')).to.not.have.property('boo');
      store.set('boo', null);
      expect(store.get('boo')).to.eql(undefined);
      expect(store.get()).to.not.have.property('boo');
      store.set('a', null);
      expect(store.get()).to.not.have.property('a');
    });
    it('should persist data to storage with "options.persistent"', function (done) {
      store.set('bar', 'foo', { persistent: true });
      setTimeout(() => {
        expect(storage.get('bar')).to.equal('foo');
        done();
      }, 100);
    });
    it('should persist data to storage with config "persistentKeys"', function (done) {
      store._storage.persistentKeys = ['foo'];
      store.set('foo/bar', { bat: 'boo' });
      setTimeout(() => {
        expect(storage.get('foo/bar')).to.have.property('bat', 'boo');
        done();
      }, 100);
    });
    it('should persist deeply nested data to storage', function (done) {
      store._storage.persistentKeys = ['foo'];
      store.set('foo/bing/bong/boop', 'boop');
      setTimeout(() => {
        expect(storage.get('foo/bing').bong).to.have.property('boop', 'boop');
        done();
      }, 100);
    });
  });

  describe('unset()', function () {
    it('should remove a key', function (done) {
      store.on('unset:bar', (value, oldValue) => {
        expect(value).to.equal(null);
        expect(oldValue).to.equal('bat');
        expect(store.get('bar')).to.eql(undefined);
        done();
      });
      store.unset('bar');
    });
    it('should not remove a key that doesn\'t exist', function (done) {
      store.on('unset', (value, oldValue) => {
        throw new Error('nope');
      });
      setTimeout(() => {
        expect(store.get('zing')).to.eql(undefined);
        done();
      }, 40);
      store.unset('zing');
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
    it('should be ignored if dataStore is not "writable"', function () {
      store.writable = false;
      store.update('bar', 'bar');
      expect(store.get('bar')).to.not.equal('bar');
    });
  });

  describe('link()', function () {
    it('should create a get()-able property', function () {
      const value = store.link('bar', 'beep');

      expect(value).to.equal('bat');
      expect(store.get('beep')).to.equal('bat');
    });
    it('should create a set()-able property', function () {
      const value = store.link('bar', 'beep');

      store.set('beep', 'foo');
      expect(value).to.equal('bat');
      expect(store._links.beep).to.equal('bar');
      expect(store._data.bar).to.equal('foo');
    });
    it('should create an unset()-able property', function () {
      const value = store.link('bar', 'beep');

      store.unset('beep');
      expect(value).to.equal('bat');
      expect(store._links.beep).to.equal(undefined);
      expect(store._data.bar).to.equal(undefined);
    });
    it('should create an update()-able property', function () {
      const value = store.link('bar', 'beep');

      store.update('beep', 'foo');
      expect(value).to.equal('bat');
      expect(store._links.beep).to.equal('bar');
      expect(store._data.bar).to.equal('foo');
    });
  });

  describe('emit()', function () {
    it('should notify listeners', function (done) {
      store.on('update', (key) => {
        expect(key).to.be('foo');
        done();
      });
      store.emit('update', 'foo');
    });
  });

  describe('load()', function () {
    beforeEach(function () {
      fake = nock('http://localhost');
    });
    afterEach(function () {
      nock.cleanAll();
    });

    it('should load and store data for "key"', function (done) {
      fake
        .get('/foo')
        .reply(200, { foo: 'foo' });
      store.load('foo', 'http://localhost/foo')
        .end((err, res) => {
          if (err) done(err);
          expect(store.get('foo')).to.have.property('foo', 'foo');
          done();
        });
    });
    it('should load and store data for "key" with "options"', function (done) {
      fake
        .get('/foo')
        .reply(200, { foo: 'foo' });
      store.load('foo', 'http://localhost/foo', { serialisable: false })
        .end((err, res) => {
          if (err) done(err);
          expect(store.get('foo').foo).to.eql('foo');
          expect(store._serialisable.foo).to.equal(false);
          done();
        });
    });
    it('should reload "key" after expiry with "options.reload = true"', function (done) {
      fake
        .get('/foo')
        .reply(200, { foo: 'foo' }, { expires: 0 })
        .get('/foo')
        .reply(200, { foo: 'bar' });
      store.load('foo', 'http://localhost/foo', { merge: false, reload: true })
        .end((err, res) => {
          if (err) done(err);
          expect(store.get('foo')).to.have.property('foo', 'foo');
          setTimeout(() => {
            expect(store.get('foo')).to.have.property('foo', 'bar');
            done();
          }, 1200);
        });
    });
    it('should reload "key" after expiry with config "reloadKeys"', function (done) {
      nock('http://localhost')
        .get('/foo')
        .reply(200, { foo: 'foo' }, { expires: 0 })
        .get('/foo')
        .reply(200, { foo: 'bar' });
      store._loading.reloadKeys = ['foo'];
      store.load('foo', 'http://localhost/foo', { merge: false })
        .end((err, res) => {
          if (err) done(err);
          expect(store.get('foo')).to.have.property('foo', 'foo');
          setTimeout(() => {
            expect(store.get('foo')).to.have.property('foo', 'bar');
            done();
          }, 1200);
        });
    });
    it('should reload "key" after load error or no expiry when config "reload = true"', function (done) {
      fake
        .get('/foo')
        .reply(500)
        .get('/foo')
        .reply(200, { foo: 'bar' });
      store._loading.reloadKeys = ['foo'];
      store.load('foo', 'http://localhost/foo', { merge: false })
        .end((err, res) => {
          expect(err.status).to.equal(500);
          setTimeout(() => {
            expect(store.get('foo')).to.have.property('foo', 'bar');
            done();
          }, 1200);
        });
    });
  });

  describe('reload()', () => {
    it('should load "key" if already expired', function (done) {
      nock('http://localhost')
        .get('/foo')
        .reply(200, { foo: 'bar' });
      expect(store.get('foo')).to.eql({ bar: 'boo', boo: { bar: 'foo' } });
      store.set('foo/expired', true);
      store.reload('foo', 'http://localhost/foo');
      setTimeout(() => {
        expect(store.get('foo')).to.have.property('foo', 'bar');
        done();
      }, 100);
    });
    it('should load "key" with default duration if invalid "expires"', function (done) {
      nock('http://localhost')
        .get('/foo')
        .reply(200, { foo: 'bar' });
      expect(store.get('foo')).to.eql({ bar: 'boo', boo: { bar: 'foo' } });
      store.set('foo/expires', 1000);
      store.reload('foo', 'http://localhost/foo');
      setTimeout(() => {
        expect(store.get('foo')).to.have.property('foo', 'bar');
        done();
      }, 1200);
    });
  });

  describe.skip('cursors', function () {
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
      it('should allow access to root properties from a cursor of a child store', function () {
        const c = Store.create('zing', { foo: 'bar' });

        store.addStore(c);
        store.set('bat', 'zip');
        const cursor1 = c.createCursor('foo');

        expect(cursor1.get('/bat')).to.equal('zip');
      });
      it('should access updated data after update to store', function () {
        const cursor = store.createCursor('foo');

        expect(cursor.get()).to.equal(store.get('foo'));
        store.set('foo', 'bar');
        expect(cursor.get()).to.equal(store.get('foo'));
      });
    });

    describe('update()', function () {
      it('should set a value for "key" of a cursor', function () {
        const cursor = store.createCursor('foo');

        cursor.update('bar', 'bar');
        expect(store.get('foo/bar')).to.equal('bar');
      });
      it('should write to originally referenced objects if "__ref"', function () {
        store.set('zing', { zang: 'zang' }, { reference: true });
        store.set('zung', store.get('zing'));
        const cursor = store.createCursor('zung');

        cursor.update('bar', 'bar');
        expect(store.get('zing')).to.have.property('bar', 'bar');
      });
      it('should set a root value for empty "key" of a cursor', function () {
        const cursor = store.createCursor('foo');

        cursor.update(null, { bar: 'bar' });
        expect(store.get('foo/bar')).to.equal('bar');
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
});