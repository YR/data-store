'use strict';

const { create: createStore } = require('../src/index');
const agent = require('@yr/agent');
const expect = require('expect.js');
const get = require('../src/lib/methods/get');
const HandlerContext = require('../src/lib/HandlerContext');
const nock = require('nock');
const reference = require('../src/lib/methods/reference');
const set = require('../src/lib/methods/set');
const update = require('../src/lib/methods/update');

let fake, store;

describe('DataStore', function () {
  beforeEach(function () {
    store = createStore('store', {
      bar: 'bat',
      boo: {
        bar: 'foo',
        bat: {
          foo: 'foo'
        }
      },
      foo: {
        bar: 'foo',
        boo: '__ref:boo',
        bat: '__ref:bar'
      },
      bat: ['foo', 'bar'],
      boop: ['__ref:bar', '__ref:bat']
    });
  });
  afterEach(function () {
    store.destroy();
  });

  describe('get()', function () {
    it('should return a value for a string key', function () {
      expect(get(store, 'bar')).to.equal('bat');
      expect(get(store, '/bar')).to.equal('bat');
    });
    it('should return all data if no key specified', function () {
      expect(get(store).bar).to.equal('bat');
    });
    it('should return a referenced value', function () {
      expect(get(store, 'foo/boo')).to.eql({ bar: 'foo', bat: { foo: 'foo' } });
      expect(get(store, 'foo/boo/bat/foo')).to.eql('foo');
    });
    it('should return a referenced value when passed a reference key', function () {
      expect(get(store, '__ref:boo')).to.eql({ bar: 'foo', bat: { foo: 'foo' } });
    });
    it('should return a resolved object of referenced values', function () {
      expect(get(store, 'foo')).to.eql({ bar: 'foo', boo: { bar: 'foo', bat: { foo: 'foo' } }, bat: 'bat' });
    });
    it('should return a resolved array of referenced values', function () {
      expect(get(store, 'boop')).to.eql(['bat', ['foo', 'bar']]);
    });
  });

  describe('set()', function () {
    it('should do nothing if called with missing key', function () {
      const data = store._data;

      set(store, '', 'bar');
      set(store, null, 'bar');
      expect(store._data).to.equal(data);
    });
    it('should store a value when called with simple key', function () {
      set(store, 'foo', 'bar');
      expect(store._data.foo).to.equal('bar');
    });
    it('should allow batch writes', function () {
      set(store, {
        '/test': 'success',
        'boop/bar': 'foo'
      });
      expect(store._data.test).to.equal('success');
      expect(store._data.boop).to.have.property('bar', 'foo');
    });
    it('should allow array batch writes', function () {
      set(store, [
        ['/test', 'success'],
        ['boop/bar', 'foo']
      ]);
      expect(store._data.test).to.equal('success');
      expect(store._data.boop).to.have.property('bar', 'foo');
    });
    it('should update the original referenced value', function () {
      set(store, 'foo/boo/bar', 'bar');
      expect(store._data.boo.bar).to.equal('bar');
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
        expect(oldValue).to.equal('foo');
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

  describe('reference()', function () {
    it('should return a key reference', function () {
      expect(reference(store, 'bar')).to.equal('__ref:bar');
    });
    it('should return an already referenced key reference', function () {
      expect(reference(store, 'foo/boo')).to.equal('__ref:boo');
    });
    it('should return an array of key references', function () {
      expect(reference(store, ['bar', 'foo/bar'])).to.eql(['__ref:bar', '__ref:foo/bar']);
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

    describe('_resolveRefKey()', function () {
      it('should resolve key with no references', function () {
        expect(store._resolveRefKey('bar')).to.equal('bar');
        expect(store._resolveRefKey('zing/zoop')).to.equal('zing/zoop');
      });
      it('should resolve key with references', function () {
        expect(store._resolveRefKey('foo/boo')).to.equal('boo');
      });
      it('should resolve nested key with references', function () {
        expect(store._resolveRefKey('foo/boo/bat/foo')).to.equal('boo/bat/foo');
        expect(store._resolveRefKey('foo/boo/zing/zoop')).to.equal('boo/zing/zoop');
      });
    });

    describe('get()', function () {
      it('should return a value for a string key', function () {
        expect(store.get('bar')).to.equal('bat');
        expect(store.get('/bar')).to.equal('bat');
      });
      it('should return an array of values for an array of string keys', function () {
        expect(store.get(['bar', 'bat'])).to.eql(['bat', ['foo', 'bar']]);
      });
      it('should return all data if no key specified', function () {
        expect(store.get().bar).to.equal('bat');
      });
    });

    describe('set()', function () {
      it('should do nothing if called with missing key', function () {
        const data = store._data;

        store.set('', 'bar');
        store.set(null, 'bar');
        expect(store._data).to.equal(data);
      });
      it('should store a value when called with simple key', function () {
        store.set('foo', 'bar');
        expect(store._data.foo).to.equal('bar');
      });
      it('should allow batch writes', function () {
        store.set({
          '/test': 'success',
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
      it('should allow array batch writes', function () {
        store.update([['bar', 'bar'], ['foo', 'bar']]);
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
          expect(oldValue).to.equal('foo');
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
        store.update('bar', 'bar', null, 'foo', true);
      });
      it('should allow passing of additional arguments to listeners for batch writes', function (done) {
        const obj = { bar: 'bar', boo: 'boo' };
        let i = 0;

        store.on('update', (key, value, oldValue, options, foo) => {
          expect(foo).to.equal('foo');
          if (++i == 2) done();
        });
        store.update(obj, null, null, 'foo');
      });
      it('should allow passing of additional arguments to listeners for array batch writes', function (done) {
        const arr = [['bar', 'bar', null, 'foo'], ['boo', 'boo', null, 'bar']];
        let i = 0;

        store.on('update', (key, value, oldValue, options, extra) => {
          if (key == 'bar') expect(extra).to.equal('foo');
          if (key == 'boo') expect(extra).to.equal('bar');
          if (++i == 2) done();
        });
        store.update(arr);
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
          expect(cursor.get('bar')).to.equal('foo');
        });
        it('should generate a cursor instance with a subset of data at reference "key"', function () {
          const cursor = store.createCursor('foo/boo');

          expect(cursor.get('bar')).to.equal('foo');
          expect(cursor.key).to.equal('/boo');
        });
        it('should allow retrieving all cursor properties when no key specified', function () {
          const cursor = store.createCursor('foo');

          expect(cursor.get()).to.eql({
            bar: 'foo',
            boo: {
              bar: 'foo',
              bat: {
                foo: 'foo'
              }
            },
            bat: 'bat'
          });
          expect(cursor.get()).to.eql(store.get('foo'));
        });
        it('should enable creating a cursor from an existing cursor', function () {
          const cursor1 = store.createCursor();
          const cursor2 = cursor1.createCursor('foo');

          expect(store.get('bar')).to.equal('bat');
          expect(cursor1.get('bar')).to.equal('bat');
          expect(cursor2.get('bar')).to.equal('foo');
        });
        it('should enable creating a cursor from an existing cursor at reference "key"', function () {
          const cursor1 = store.createCursor('foo');
          const cursor2 = cursor1.createCursor('boo');

          expect(cursor1.get('boo')).to.eql({ bar: 'foo', bat: { foo: 'foo' } });
          expect(cursor2.get()).to.eql({ bar: 'foo', bat: { foo: 'foo' } });
        });
        it('should allow access to root properties', function () {
          store.set('bat', 'zip');
          const cursor1 = store.createCursor('foo');
          const cursor2 = cursor1.createCursor('boo');

          expect(cursor2.get('/bat')).to.equal('zip');
        });
        it('should access updated data after update to store', function () {
          const cursor = store.createCursor('foo');

          expect(cursor.get()).to.eql(store.get('foo'));
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
          expect(store.get('foo/bar')).to.equal(undefined);
          expect(store._data).to.not.have.property('foo');
        });
        it('should allow batch writes', function () {
          const cursor = store.createCursor('foo/boo');
          const obj = {
            bar: 'bar',
            'boop/bar': [],
            '/bar': 'bar'
          };

          cursor.update(obj);
          expect(store.createCursor('foo/boo').get('bar')).to.equal('bar');
          expect(store.get('bar')).to.equal('bar');
        });
        it('should notify listeners on update of a cursor', function (done) {
          const cursor = store.createCursor('foo');

          store.on('update', (key, value, oldValue) => {
            expect(key).to.equal('foo/bar');
            expect(oldValue).to.equal('foo');
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
        store.setSerialisabilityOfKey('bar', false);
        const data = store.dump();

        expect(data.bar).to.equal('bat');
      });
      it('should return an object with resolved references', function () {
        const data = store.dump();

        expect(data.foo.boo.bar).to.equal('foo');
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
      it('should allow middleware', function () {
        let run = 0;

        store.use(function (context) {
          run++;
          expect(context.method).to.equal('reset');
        });
        store.reset({});
        expect(run).to.equal(1);
      });
      it('should allow delegation', function () {
        let run = 0;

        store.use(/zing/, function (context) {
          run++;
          context.value = 'bar';
          expect(context.key).to.equal('zing');
          expect(context.method).to.equal('set');
        });
        store.set('zing', 'foo');
        expect(store._data.zing).to.equal('bar');
        expect(run).to.equal(1);
      });
      it('should allow handling with option merging', function () {
        let run = 0;

        store.use(/foo/, function (context) {
          run++;
          context.merge('options', { merge: false });
          expect(context.key).to.equal('foo');
        });
        store.set('foo', { bar: 'bar' });
        expect(store._data.foo).to.eql({ bar: 'bar' });
        expect(run).to.equal(1);
      });
      it('should allow multiple handlers', function () {
        let run = 0;

        store.use(/zing/, function (context) {
          run++;
          context.value = 'bar';
        });
        store.use(/zing/, function (context) {
          run++;
        });
        store.set('zing', 'foo');
        expect(store._data.zing).to.equal('bar');
        expect(run).to.equal(2);
      });
    });

    describe('unhandling', function () {
      it('should remove a single handler', function () {
        let run = 0;
        const fn = function (context) {
          run++;
        };

        store.use(fn);
        store.set('bar', 'boo');
        expect(run).to.equal(1);
        store.unuse(fn);
        store.set('bar', 'boop');
        expect(run).to.equal(1);
      });
      it('should remove batched handlers', function () {
        let run = 0;
        const handlers = [
          [function (context) { run++; }],
          [function (context) { run++; }]
        ];

        store.use(handlers);
        store.set('bar', 'boo');
        expect(run).to.equal(2);
        store.unuse(handlers);
        store.set('bar', 'boop');
        expect(run).to.equal(2);
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

  describe('constructor', function () {
    it('should register handlers', function () {
      store.destroy();
      store = createStore('store', {}, { isFetchable: true, handlers: [[/foo/, function (context) {}]] });
      expect(store._handledMethods).to.have.property('fetch');
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
      return store.fetch('bar', null, {})
        .then((result) => {
          expect(result.body).to.equal('bat');
        });
    });
    it('should return a Promise with expired value when "options.staleWhileRevalidate = true"', function () {
      set(store, 'foo/__expires', 0);

      return store.fetch('foo', 'http://localhost/foo', { staleWhileRevalidate: true })
        .then((result) => {
          expect(result.body).to.not.have.property('foo');
        });
    });
    it('should return a Promise with fresh value when "options.staleWhileRevalidate = false"', function () {
      fake
        .get('/foo')
        .reply(200, { foo: 'foo' });
      set(store, 'foo/__expires', 0);

      return store.fetch('foo', 'http://localhost/foo', { staleWhileRevalidate: false })
        .then((result) => {
          expect(result.body).to.have.property('foo', 'foo');
        });
    });
    it('should return a Promise for batch fetching', function () {
      fake
        .get('/foo')
        .reply(200, { foo: 'foo' })
        .get('/bar')
        .reply(200, { bar: 'bar' });
      set(store, { 'foo/__expires': 0, 'bar/__expires': 0 });

      return store.fetch({ foo: 'http://localhost/foo', bar: 'http://localhost/bar' }, { staleWhileRevalidate: false })
        .then((results) => {
          expect(results[0].body).to.have.property('bar', 'bar');
          expect(results[1].body).to.have.property('foo', 'foo');
        });
    });
    it('should return a Promise for array batch fetching', function () {
      fake
        .get('/foo')
        .reply(200, { foo: 'foo' })
        .get('/bar')
        .reply(200, { bar: 'bar' });
      set(store, { 'foo/__expires': 0, 'bar/__expires': 0 });

      return store.fetch([
        ['foo', 'http://localhost/foo', { staleWhileRevalidate: false }],
        ['bar', 'http://localhost/bar', { staleWhileRevalidate: false }]
      ])
        .then((results) => {
          expect(results[0].body).to.have.property('foo', 'foo');
          expect(results[1].body).to.have.property('bar', 'bar');
        });
    });
    it('should return a Promise when failure loading', function () {
      fake
        .get('/beep')
        .replyWithError('oops');

      return store.fetch('beep', 'http://localhost/beep', { retries: 0, timeout: 100 })
        .then((results) => {
          throw Error('should be error');
        })
        .catch((err) => {
          expect(err.body).to.equal(undefined);
          expect(err.status).to.equal(500);
        });
    });
    it('should do nothing when loading aborted', function (done) {
      fake
        .get('/beep')
        .delayConnection(50)
        .reply(200, { beep: 'beep' });

      store.fetch('beep', 'http://localhost/beep', { retries: 0, timeout: 10 })
        .then(done)
        .catch(done);
      agent.abortAll();
      setTimeout(done, 100);
    });
  });
});

describe('HandlerContext', function () {
  describe('constructor', function () {
    it('should assign passed args based on signature', function () {
      const context = new HandlerContext({}, 'set', ['key', 'value'], ['foo', 'bar']);

      expect(context.key).to.equal('foo');
      expect(context.value).to.equal('bar');
    });
    it('should assign passed args, including rest argument', function () {
      const context = new HandlerContext({}, 'set', ['key', 'value', '...args'], ['foo', 'bar', true]);

      expect(context.key).to.equal('foo');
      expect(context.value).to.equal('bar');
      expect(context.args).to.eql([true]);
    });
  });

  describe('merge', function () {
    it('should define missing options', function () {
      const context = new HandlerContext({}, 'set', ['key', 'value', 'options'], ['foo', 'bar']);

      context.merge('options', { merge: false });
      expect(context.options).to.eql({ merge: false });
    });
    it('should merge existing options', function () {
      const context = new HandlerContext({}, 'set', ['key', 'value', 'options'], ['foo', 'bar', { foo: true }]);

      context.merge('options', { merge: false });
      expect(context.options).to.eql({ foo: true, merge: false });
    });
  });

  describe('toArguments', function () {
    it('should return args based on signature', function () {
      const context = new HandlerContext({}, 'set', ['key', 'value'], ['foo', 'bar']);

      expect(context.toArguments()).to.eql(['foo', 'bar']);
    });
    it('should return args, including rest argument', function () {
      const context = new HandlerContext({}, 'set', ['key', 'value', '...args'], ['foo', 'bar', true]);

      expect(context.toArguments()).to.eql(['foo', 'bar', true]);
    });
  });
});