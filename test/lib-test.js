'use strict';

const expect = require('expect.js');
const nock = require('nock');
const Store = require('./dataStore');
const storage = require('./storage');
const time = require('@yr/time');
let fake, s;

describe('dataStore', function () {
  before(function () {
    storage.clear();
    storage.init({ writeDelay: 1 });
  });
  beforeEach(function () {
    s = Store.create('store', {
      bar: 'bat',
      boo: 'foo',
      foo: {
        bar: 'boo',
        boo: {
          bar: 'foo'
        }
      },
      bat: ['foo', 'bar']
    }, { defaultExpiry: 1000 });
  });
  afterEach(function () {
    storage.clear();
    s.destroy();
  });

  describe('constructor', function () {
    it('should instantiate with default values set', function () {
      expect(s._data).to.have.property('bar', 'bat');
      expect(s.get).to.be.a.Function;
    });
    it('should instantiate with id', function () {
      s = Store.create('foo');
      expect(s.id).to.equal('foo');
    });
    it('should instantiate with storage data', function (done) {
      storage.set('foo', { bar: 'bar' });
      setTimeout(() => {
        s = Store.create('foo', null, { bootstrap: true, persistent: { storage }});
        s._bootstrap();
        expect(s._data).to.eql({ bar: 'bar' });
        expect(storage.get('foo')).to.eql({ foo: { bar: 'bar' }});
        done();
      }, 100);
    });
    it('should instantiate with complex storage data', function (done) {
      storage.set('foo/bar', 'bar');
      setTimeout(() => {
        s = Store.create('foo', null, { bootstrap: true, persistent: { storage }});
        s._bootstrap();
        expect(s._data).to.eql({ bar: 'bar' });
        expect(storage.get('foo')).to.eql({ 'foo/bar': 'bar' });
        done();
      }, 100);
    });
  });

  describe('addStore()', function () {
    it('should instantiate a dependant child instance when passed an instance factory', function () {
      const child = s.addStore(Store);

      expect(s._children).to.have.property(child.id);
      expect(child).to.have.property('_parent', s);
      expect(child).to.have.property('_root', s);
      expect(child).to.have.property('_isDependant', true);
    });
    it('should store an dependant child instance when passed a DataStore instance', function () {
      const c = Store.create('child');
      const d = Store.create('grandchild');

      c.addStore(d);
      s.addStore(c);
      expect(s._children).to.have.property('child');
      expect(c).to.have.property('_isDependant', true);
      expect(c).to.have.property('_parent', s);
      expect(c).to.have.property('_root', s);
      expect(d).to.have.property('rootkey', '/child/grandchild');
      expect(d).to.have.property('_parent', c);
      expect(d).to.have.property('_root', s);
    });
    it('should store an independant child instance', function () {
      const c = Store.create('child');

      s.addStore(c, { isDependant: false });
      expect(s._children).to.have.property('child');
      expect(c).to.have.property('_isDependant', false);
    });
  });

  describe('_getStoreForKey()', function () {
    let r, c;

    beforeEach(function () {
      r = Store.create('root');
      c = Store.create('child');
      r.addStore(s);
      s.addStore(c);
    });
    afterEach(function () {
      c.destroy();
      r.destroy();
    });

    it('should return current store if passed no key', function () {
      expect(s._getStoreForKey()[0]).to.equal(s);
    });
    it('should return root store if passed a root key', function () {
      expect(s._getStoreForKey('/')[0]).to.equal(r);
      expect(s._getStoreForKey('/foo/bar')[1]).to.equal('foo/bar');
    });
    it('should return child store if passed a child key', function () {
      expect(s._getStoreForKey('child/foo')[0]).to.equal(c);
      expect(r._getStoreForKey('store/child/foo')[0]).to.equal(c);
      expect(r._getStoreForKey('store/child/foo')[1]).to.equal('foo');
    });
    it('should return child store if passed a root child key', function () {
      expect(c._getStoreForKey('/store/child/foo')[0]).to.equal(c);
      expect(c._getStoreForKey('/store/child/foo')[1]).to.equal('foo');
    });
  });

  describe('getRootKey()', function () {
    it('should not modify an existing global key', function () {
      expect(s.getRootKey('/foo')).to.equal('/foo');
    });
    it('should modify an existing local key', function () {
      expect(s.getRootKey('foo')).to.equal('/foo');
    });
    it('should modify an existing local key of a child store', function () {
      const c = Store.create('zing', { bing: 'bong' });

      s.addStore(c);
      expect(c.getRootKey('bing')).to.equal('/zing/bing');
    });
  });

  describe('isStorageKey()', function () {
    it('should return "true" for key with leading id', function () {
      expect(s.isStorageKey('store/foo')).to.be(true);
    });
    it('should return "false" for key without leading id', function () {
      expect(s.isRootKey('foo')).to.be(false);
    });
    it('should return "true" for key of a child store', function () {
      const c = Store.create('zing', { bing: 'bong' });

      s.addStore(c);
      expect(c.isStorageKey('zing/bing')).to.be(true);
    });
  });

  describe('getStorageKey()', function () {
    it('should not modify a valid key', function () {
      expect(s.getStorageKey('store/foo')).to.equal('store/foo');
    });
    it('should modify an existing local key', function () {
      expect(s.getStorageKey('foo')).to.equal('store/foo');
    });
    it('should modify an existing local key of a child store', function () {
      const c = Store.create('zing', { bing: 'bong' });

      s.addStore(c);
      expect(c.getStorageKey('bing')).to.equal('zing/bing');
    });
  });

  describe('get()', function () {
    it('should return the property\'s value', function () {
      expect(s.get('bar')).to.equal('bat');
    });
    it('should return all properties if no key specified', function () {
      expect(s.get().bar).to.equal('bat');
    });
    it('should return a root property\'s value', function () {
      expect(s.get('/foo/bar')).to.equal('boo');
    });
    it('should return a root property\'s value from a child store', function () {
      const c = Store.create('zing', { bing: 'bong' });

      s.addStore(c);
      expect(c.get('/foo/bar')).to.equal('boo');
      expect(c.get('/zing/bing')).to.equal('bong');
    });
    it('should return all properties of a child store if no key specified', function () {
      const c = Store.create('zing', { bing: 'bong' });

      s.addStore(c);
      expect(s.get('zing')).to.have.property('bing', 'bong');
    });
    it('should return a nested property\'s value from a child store', function () {
      const c = Store.create('zing', { bing: 'bong' });

      s.addStore(c);
      expect(s.get('zing/bing')).to.equal('bong');
    });
    it('should return an array of values when passed an array of keys', function () {
      expect(s.get(['bar', 'boo'])).to.eql(['bat', 'foo']);
    });
    it('should flag expired objects', function () {
      const c = Store.create('zing', { bing: { expires: +time.create().subtract(1, 'day') }});

      expect(c.get('bing')).to.have.property('expired', true);
      expect(c.get('bing')).to.have.property('expires', 0);
    });
  });

  describe('set()', function () {
    it('should modify a property\'s value when called with simple key', function () {
      s.set('foo', 'bar');
      expect(s._data.foo).to.equal('bar');
    });
    it('should modify a root property\'s value', function () {
      s.set('/foo/bar', 'bar');
      expect(s._data.foo.bar).to.equal('bar');
    });
    it('should modify a root property\'s value from a child store', function () {
      const c = Store.create('zing');

      s.addStore(c);
      c.set('/foo/bar', 'bar');
      expect(s._data.foo.bar).to.equal('bar');
      c.set('/zing/bar', 'bar');
      expect(c._data.bar).to.equal('bar');
    });
    it('should modify a deeply nested property\'s value for a child store', function () {
      const c = Store.create('zing', { bing: 'bong' });
      const d = Store.create('bung', { bing: 'bong' });

      s.addStore(c);
      c.addStore(d);
      s.set('zing/bung/bing', 'bung');
      expect(d._data.bing).to.equal('bung');
    });
    it('should allow batch writes', function () {
      s.set({
        test: 'success',
        'boop/bar': 'foo'
      });
      expect(s._data.test).to.equal('success');
      expect(s._data.boop).to.have.property('bar', 'foo');
    });
    it('should allow batch writes with nested keys', function () {
      const c = Store.create('zing', { bing: 'bong' });

      s.addStore(c);
      s.set({
        test: 'success',
        'zing/bing': 'foo'
      });
      expect(s._data.test).to.equal('success');
      expect(c._data.bing).to.equal('foo');
    });
    it('should allow batch writes with mixed root/nested keys', function () {
      const c = Store.create('zing', { bing: 'bong' });

      s.addStore(c);
      c.set({
        '/test': 'success',
        bing: 'foo',
        '/zing/boo': 'boo'
      });
      expect(s._data.test).to.equal('success');
      expect(c._data.bing).to.equal('foo');
      expect(c._data.boo).to.equal('boo');
    });
    it('should allow batch writes with mixed root/deeply nested keys', function () {
      const c = Store.create('zing', { bing: 'bong' });
      const d = Store.create('bung', { bing: 'bong' });

      s.addStore(c);
      c.addStore(d);
      s.set({
        '/test': 'success',
        bing: 'foo',
        zing: {
          bung: {
            foo: 'boo'
          }
        }
      });
      expect(s._data.test).to.equal('success');
      expect(s._data.bing).to.equal('foo');
      expect(d._data.foo).to.equal('boo');
    });
    it('should do nothing if dataStore is not writable', function () {
      s.isWritable = false;
      s.set('foo', 'bar');
      expect(s._data.foo).to.not.equal('bar');
    });
    it('should allow replacing all data when no key specified', function () {
      const obj = { test: 'success' };

      s.set(null, obj);
      expect(s._data).to.eql(obj);
    });
    it('should return an object with "__ref" property when called with "options.reference"', function () {
      s.set('boo', { bar: 'bar' }, { reference: true });
      expect(s._data.boo).to.have.property('__ref', '/boo');
    });
    it('should return an object with "__ref" property when called with "options.reference" from a child store', function () {
      const c = Store.create('zing', { bing: 'bong' });

      s.addStore(c);
      c.set('boo', { bar: 'bar' }, { reference: true });
      expect(c._data.boo).to.have.property('__ref', '/zing/boo');
    });
    it('should remove a key when null value specified', function () {
      s.set('foo/boo', null);
      expect(s.get('foo/boo')).to.eql(null);
      expect(s.get('foo')).to.not.have.property('boo');
      s.set('boo', null);
      expect(s.get('boo')).to.eql(undefined);
      expect(s.get()).to.not.have.property('boo');
      s.set('a', null);
      expect(s.get()).to.not.have.property('a');
    });
    it('should persist data to storage', function (done) {
      s._storage = storage;
      s.set('bar', 'foo', { persistent: true });
      s.set('foo/bar', { bat: 'boo' }, { persistent: true });
      setTimeout(() => {
        expect(storage.get('store/bar')).to.have.property('store/bar', 'foo');
        expect(storage.get('store/foo')).to.have.property('store/foo').eql({
          bar: { bat: 'boo' },
          boo: { bar: 'foo' }
        });
        done();
      }, 100);
    });
  });

  describe('remove()', function () {
    it('should remove a key', function (done) {
      s.on('remove:bar', (value, oldValue) => {
        expect(value).to.equal(null);
        expect(oldValue).to.equal('bat');
        expect(s.get('bar')).to.eql(undefined);
        done();
      });
      s.remove('bar');
    });
    it('should not remove a key that doesn\'t exist', function (done) {
      s.on('remove', (value, oldValue) => {
        throw new Error('nope');
      });
      setTimeout(() => {
        expect(s.get('zing')).to.eql(undefined);
        done();
      }, 40);
      s.remove('zing');
    });
    it('should bubble notification for a nested child store', function (done) {
      const c = Store.create('zing', { bing: 'bong' });
      const d = Store.create('bung', { bing: 'bong' });

      s.addStore(c);
      c.addStore(d);
      s.on('remove', (key, value, oldValue) => {
        expect(key).to.equal('zing/bung/bing');
        expect(value).to.equal(null);
        expect(oldValue).to.equal('bong');
        done();
      });
      d.remove('bing');
    });
  });

  describe('emit()', function () {
    it('should notify listeners', function (done) {
      s.on('update', (key) => {
        expect(key).to.be('foo');
        done();
      });
      s.emit('update', 'foo');
    });
    it('should bubble events to parent when notifing listeners', function (done) {
      const c = Store.create('zing');
      let i = 0;

      s.addStore(c);
      c.on('update:foo', (value) => {
        expect(value).to.be('bar');
        ++i;
      });
      s.on('update:zing/foo', (value) => {
        expect(value).to.be('bar');
        expect(++i).to.eql(2);
        done();
      });
      c.emit('update:foo', 'bar');
    });
  });

  describe('update()', function () {
    it('should set a value for "key"', function () {
      s.update('bar', 'bar');
      expect(s.get('bar')).to.equal('bar');
    });
    it('should set a value for a root "key"', function () {
      const c = Store.create('zing');

      s.addStore(c);
      c.update('/bar', 'bar');
      expect(s.get('bar')).to.equal('bar');
    });
    it('should write to originally referenced objects if "__ref"', function () {
      s.set('a', { aa: 'aa' }, { reference: true });
      s.set('b', s.get('a'));
      s.update('b/bb', 'bb');
      expect(s.get('a')).to.have.property('bb', 'bb');
      expect(s.get('b')).to.not.have.property('bb');
    });
    it('should allow batch writes', function () {
      s.update({ bar: 'bar', foo: 'bar' });
      expect(s.get('bar')).to.equal('bar');
      expect(s.get('foo')).to.equal('bar');
    });
    it('should notify listeners', function (done) {
      s.on('update', (key, value, oldValue) => {
        expect(key).to.equal('bar');
        expect(s.get(key)).to.equal(value);
        expect(oldValue).to.equal('bat');
        done();
      });
      s.update('bar', 'bar');
    });
    it('should notify listeners of specific property', function (done) {
      s.on('update:foo/bar', (value, oldValue) => {
        expect(value).to.equal('bar');
        expect(oldValue).to.equal('boo');
        done();
      });
      s.update('foo/bar', 'bar');
    });
    it('should allow passing of additional arguments to listeners', function (done) {
      s.on('update', (key, value, oldValue, options, foo, bool) => {
        expect(oldValue).to.equal('bat');
        expect(foo).to.equal('foo');
        expect(bool).to.be(true);
        done();
      });
      s.update('bar', 'bar', undefined, 'foo', true);
    });
    it('should allow passing of additional arguments to listeners for batch writes', function (done) {
      const obj = { bar: 'bar', boo: 'boo' };
      let i = 0;

      s.on('update', (key, value, oldValue, options, foo) => {
        expect(foo).to.equal('foo');
        if (++i == 2) done();
      });
      s.update(obj, undefined, 'foo');
    });
    it('should be ignored if dataStore is not "isWritable"', function () {
      s.isWritable = false;
      s.update('bar', 'bar');
      expect(s.get('bar')).to.not.equal('bar');
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
      s.load('foo', 'http://localhost/foo')
        .end((err, res) => {
          if (err) done(err);
          expect(s.get('foo')).to.have.property('foo', 'foo');
          done();
        });
    });
    it('should load and store data for "key" with "options"', function (done) {
      fake
        .get('/foo')
        .reply(200, { foo: 'foo' });
      s.load('foo', 'http://localhost/foo', { reference: true })
        .end((err, res) => {
          if (err) done(err);
          expect(s.get('foo').__ref).to.eql('/foo');
          done();
        });
    });
    it('should load and store data for "key" of a nested child store', function (done) {
      const c = Store.create('zing', { bing: 'bong' });
      const d = Store.create('bung', { bing: 'bong' });

      s.addStore(c);
      c.addStore(d);
      fake
        .get('/foo')
        .reply(200, { foo: 'foo' });
      s.load('zing/bung/bing', 'http://localhost/foo', { merge: false })
        .end((err, res) => {
          if (err) done(err);
          expect(s.get('zing/bung/bing')).to.eql({ foo: 'foo' });
          done();
        });
    });
    it('should load and notify for "key" of a nested child store', function (done) {
      const c = Store.create('zing', { bing: 'bong' });
      const d = Store.create('bung', { bing: 'bong' });
      let test = false;

      s.addStore(c);
      c.addStore(d);
      fake
        .get('/foo')
        .reply(200, { foo: 'foo' });
      s.on('load:zing/bung/bing', (value, oldValue) => {
        expect(s.get('zing/bung/bing')).to.eql({ foo: 'foo' });
        test = true;
      });
      c.on('load', (key, value, oldValue) => {
        expect(test).to.be(true);
        expect(key).to.eql('bung/bing');
        expect(value).to.eql({ foo: 'foo' });
        done();
      });
      s.load('zing/bung/bing', 'http://localhost/foo');
    });
    it('should reload "key" after expiry with "options.reload = true"', function (done) {
      fake
        .get('/foo')
        .reply(200, { foo: 'foo' }, { expires: 0 })
        .get('/foo')
        .reply(200, { foo: 'bar' });
      s.load('foo', 'http://localhost/foo', { merge: false, reload: true })
        .end((err, res) => {
          if (err) done(err);
          expect(s.get('foo')).to.have.property('foo', 'foo');
          setTimeout(() => {
            expect(s.get('foo')).to.have.property('foo', 'bar');
            done();
          }, 1200);
        });
    });
    it('should reload "key" after expiry with config "reload = true"', function (done) {
      nock('http://localhost')
        .get('/foo')
        .reply(200, { foo: 'foo' }, { expires: 0 })
        .get('/foo')
        .reply(200, { foo: 'bar' });
      s._shouldReload = true;
      s.load('foo', 'http://localhost/foo', { merge: false })
        .end((err, res) => {
          if (err) done(err);
          expect(s.get('foo')).to.have.property('foo', 'foo');
          setTimeout(() => {
            expect(s.get('foo')).to.have.property('foo', 'bar');
            done();
          }, 1200);
        });
    });
    it('should cancel existing reload of "key" when loading new "key"', function (done) {
      fake
        .get('/foo')
        .reply(200, { foo: 'foo' }, { expires: 0 })
        .get('/foo')
        .reply(200, { foo: 'bar' })
        .get('/bar')
        .reply(200, { bar: 'bar' }, { expires: 0 });
      s._shouldReload = true;
      s.load('foo', 'http://localhost/foo', { merge: false })
        .end((err, res) => {
          if (err) done(err);
          expect(s.get('foo')).to.have.property('foo', 'foo');

          setTimeout(() => {
            s.load('bar', 'http://localhost/bar', { merge: false })
              .end((err, res) => {
                if (err) done(err);
                expect(s.get('foo')).to.have.property('foo', 'foo');
                expect(s.get('bar')).to.have.property('bar', 'bar');

                setTimeout(() => {
                  expect(s.get('foo')).to.have.property('foo', 'foo');
                  done();
                }, 1200);
              });
          }, 10);
        });
    });
    it('should reload "key" after load error or no expiry when config "reload = true"', function (done) {
      fake
        .get('/foo')
        .reply(500)
        .get('/foo')
        .reply(200, { foo: 'bar' });
      s._shouldReload = true;
      s.load('foo', 'http://localhost/foo', { merge: false })
        .end((err, res) => {
          expect(err.status).to.equal(500);
          setTimeout(() => {
            expect(s.get('foo')).to.have.property('foo', 'bar');
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
      expect(s.get('foo')).to.eql({ bar: 'boo', boo: { bar: 'foo' }});
      s.set('foo/expired', true);
      s.reload('foo', 'http://localhost/foo');
      setTimeout(() => {
        expect(s.get('foo')).to.have.property('foo', 'bar');
        done();
      }, 100);
    });
    it('should load "key" with default duration if invalid "expires"', function (done) {
      nock('http://localhost')
        .get('/foo')
        .reply(200, { foo: 'bar' });
      expect(s.get('foo')).to.eql({ bar: 'boo', boo: { bar: 'foo' }});
      s.set('foo/expires', 1000);
      s.reload('foo', 'http://localhost/foo');
      setTimeout(() => {
        expect(s.get('foo')).to.have.property('foo', 'bar');
        done();
      }, 1200);
    });
  });

  describe('cursors', function () {
    describe('createCursor()', function () {
      it('should generate a cursor instance', function () {
        const cursor = s.createCursor();

        expect(s.get('bar')).to.equal('bat');
        expect(cursor.get('bar')).to.equal('bat');
      });
      it('should generate a cursor instance with a subset of data at "key"', function () {
        const cursor = s.createCursor('foo');

        expect(s.get('bar')).to.equal('bat');
        expect(cursor.get('bar')).to.equal('boo');
      });
      it('should allow retrieving all cursor properties when no key specified', function () {
        const cursor = s.createCursor('foo');

        expect(cursor.get()).to.eql({
          bar: 'boo',
          boo: {
            bar: 'foo'
          }
        });
        expect(cursor.get()).to.eql(s.get('foo'));
      });
      it('should enable creating a cursor from an existing cursor', function () {
        const cursor1 = s.createCursor();
        const cursor2 = cursor1.createCursor('foo');

        expect(s.get('bar')).to.equal('bat');
        expect(cursor1.get('bar')).to.equal('bat');
        expect(cursor2.get('bar')).to.equal('boo');
      });
      it('should allow access to root properties', function () {
        s.set('bat', 'zip');
        const cursor1 = s.createCursor('foo');
        const cursor2 = cursor1.createCursor('boo');

        expect(cursor2.get('/bat')).to.equal('zip');
      });
      it('should allow access to root properties from a cursor of a child store', function () {
        const c = Store.create('zing', { foo: 'bar' });

        s.addStore(c);
        s.set('bat', 'zip');
        const cursor1 = c.createCursor('foo');

        expect(cursor1.get('/bat')).to.equal('zip');
      });
      it('should access updated data after update to store', function () {
        const cursor = s.createCursor('foo');

        expect(cursor.get()).to.equal(s.get('foo'));
        s.set('foo', 'bar');
        expect(cursor.get()).to.equal(s.get('foo'));
      });
    });

    describe('update()', function () {
      it('should set a value for "key" of a cursor', function () {
        const cursor = s.createCursor('foo');

        cursor.update('bar', 'bar');
        expect(s.get('foo/bar')).to.equal('bar');
      });
      it('should write to originally referenced objects if "__ref"', function () {
        s.set('zing', { zang: 'zang' }, { reference: true });
        s.set('zung', s.get('zing'));
        const cursor = s.createCursor('zung');

        cursor.update('bar', 'bar');
        expect(s.get('zing')).to.have.property('bar', 'bar');
      });
      it('should set a root value for empty "key" of a cursor', function () {
        const cursor = s.createCursor('foo');

        cursor.update(null, { bar: 'bar' });
        expect(s.get('foo/bar')).to.equal('bar');
      });
      it('should allow batch writes', function () {
        const cursor = s.createCursor('foo/boo');
        const obj = {
          bar: 'bar',
          'boop/bar': [],
          '/boo': 'bar'
        };

        cursor.update(obj);
        expect(s.createCursor('foo/boo').get('bar')).to.equal('bar');
        expect(s.get('boo')).to.equal('bar');
      });
      it('should notify listeners on update of a cursor', function (done) {
        const cursor = s.createCursor('foo');

        s.on('update', (key, value, oldValue) => {
          expect(key).to.equal('foo/bar');
          expect(oldValue).to.equal('boo');
          expect(s.get(key)).to.equal(value);
          done();
        });
        cursor.update('bar', 'bar');
      });
    });
  });

  describe('destroy()', function () {
    it('should destroy all data references', function () {
      s.destroy();
      expect(s.destroyed).to.eql(true);
      expect(s._data).to.eql({});
    });
    it('should destroy all dependant children', function () {
      const c = Store.create('zing', { foo: 'bar' });

      s.addStore(c);
      s.destroy();
      expect(c.destroyed).to.eql(true);
      expect(c._data).to.eql({});
    });
    it('should not destroy independant children', function () {
      const c = Store.create('zing', { foo: 'bar' });

      s.addStore(c, { isDependant: false });
      s.destroy();
      expect(c.destroyed).to.eql(false);
      expect(c._data).to.eql({ foo: 'bar' });
      expect(c._root).to.eql(c);
      expect(c._parent).to.eql(null);
      expect(c.rootkey).to.eql('/');
    });
  });

  describe('dump()', function () {
    it('should return a serialisable json object with no excluded properties', function () {
      s.set('bing', 'bong', { serialisable: false });
      const obj = s.dump();

      expect(obj.bing).to.equal('bong');
    });
    it('should optionally return a serialised string', function () {
      const json = s.dump(true);

      expect(json).to.be.a.String;
    });
  });

  describe('toJSON()', function () {
    it('should return a serialisable json object', function () {
      const json = s.toJSON();

      expect(json).to.be.an.Object;
      expect(json.bar).to.equal('bat');
    });
    it('should return a serialisable json object for nested stores', function () {
      const c = Store.create('zing', { bing: 'bong' });
      const d = Store.create('bung', { bing: 'bong' });

      c.addStore(d);
      s.addStore(c);
      const json = s.toJSON();

      expect(json).to.be.an.Object;
      expect(json.zing.bung.bing).to.equal('bong');
    });
    it('should return a serialisable json object with correctly handled array properties', function () {
      const json = JSON.stringify(s);

      expect(json).to.be.a.String;
      expect(json).to.match(/"bat":\["foo","bar"\]/);
      expect(JSON.parse(json)).to.have.property('bat');
      expect(JSON.parse(json).bat).to.eql(['foo', 'bar']);
    });
    it('should return a serialisable json object with excluded properties', function () {
      s.set('bing', 'bong', { serialisable: false });
      const json = s.toJSON();

      expect(json).to.be.an.Object;
      expect(json.bar).to.equal('bat');
      expect(json.bing).to.not.exist;
    });
    it('should return a serialisable json object with excluded nested properties', function () {
      s.set('foo/bar', 'bong', { serialisable: false });
      const json = s.toJSON();

      expect(json).to.be.an.Object;
      expect(json.bar).to.equal('bat');
      expect(json.foo.bar).to.not.exist;
    });
    it('should return a serialised json object at specific key', function () {
      const json = s.toJSON('foo');

      expect(json).to.eql(s.get('foo'));
    });
    it('should return a serialised json object at specific key with excluded properties', function () {
      s.set('foo/bar', 'bong', { serialisable: false });
      const json = s.toJSON('foo');

      expect(json.bar).to.not.exist;
    });
  });
});