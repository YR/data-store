'use strict';

const { create: createStore } = require('../src/index');
const agent = require('@yr/agent');
const expect = require('expect.js');
const HandlerContext = require('../src/lib/HandlerContext');
const nock = require('nock');
let fake, store;

describe('DataStore', () => {
  beforeEach(() => {
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
  afterEach(() => {
    store.destroy();
  });

  describe('constructor', () => {
    it('should instantiate with passed data', () => {
      expect(store.get).to.be.a(Function);
      expect(store._data).to.have.property('bar', 'bat');
    });
    it('should instantiate with id', () => {
      store = createStore('foo');
      expect(store.id).to.equal('foo');
    });
  });

  describe('_resolveRefKey()', () => {
    it('should resolve key with no references', () => {
      expect(store._resolveRefKey('bar')).to.equal('bar');
      expect(store._resolveRefKey('zing/zoop')).to.equal('zing/zoop');
    });
    it('should resolve key with references', () => {
      expect(store._resolveRefKey('foo/boo')).to.equal('boo');
    });
    it('should resolve nested key with references', () => {
      expect(store._resolveRefKey('foo/boo/bat/foo')).to.equal('boo/bat/foo');
      expect(store._resolveRefKey('foo/boo/zing/zoop')).to.equal('boo/zing/zoop');
    });
  });

  describe('get()', () => {
    it('should return a value for a string key', () => {
      expect(store.get('bar')).to.equal('bat');
      expect(store.get('/bar')).to.equal('bat');
    });
    it('should return all data if no key specified', () => {
      expect(store.get().bar).to.equal('bat');
    });
    it('should return a referenced value', () => {
      expect(store.get('foo/boo')).to.eql({ bar: 'foo', bat: { foo: 'foo' } });
      expect(store.get('foo/boo/bat/foo')).to.eql('foo');
    });
    it('should return a referenced value when passed a reference key', () => {
      expect(store.get('__ref:boo')).to.eql({ bar: 'foo', bat: { foo: 'foo' } });
    });
    it('should return a resolved object of referenced values', () => {
      expect(store.get('foo')).to.eql({ bar: 'foo', boo: { bar: 'foo', bat: { foo: 'foo' } }, bat: 'bat' });
    });
    it('should return a resolved array of referenced values', () => {
      expect(store.get('boop')).to.eql(['bat', ['foo', 'bar']]);
    });
  });

  describe('getAll()', () => {
    it('should return an array of values for an array of string keys', () => {
      expect(store.getAll(['bar', 'bat'])).to.eql(['bat', ['foo', 'bar']]);
    });
  });

  describe('set()', () => {
    it('should do nothing if called with missing key', () => {
      const data = store._data;

      store.set('', 'bar');
      store.set(null, 'bar');
      expect(store._data).to.equal(data);
    });
    it('should do nothing if dataStore is not writable', () => {
      store.isWritable = false;
      store.set('foo', 'bar');
      expect(store._data.foo).to.not.equal('bar');
    });
    it('should store a value when called with simple key', () => {
      store.set('foo', 'bar');
      expect(store._data.foo).to.equal('bar');
    });
    it('should not update the original referenced value', () => {
      store.set('foo/boo/bar', 'bar');
      expect(store._data.foo.boo.bar).to.equal('bar');
    });
    it('should create new object when immutable', () => {
      const data = store._data;

      store.set('foo', 'bar', { immutable: true });
      expect(store._data.foo).to.equal('bar');
      expect(store._data).to.not.equal(data);
      expect(store.changed).to.equal(true);
    });
    it('should not create new object when immutable if no change', () => {
      const data = store._data;

      store.set('bar', 'bat', { immutable: true });
      expect(store._data).to.equal(data);
      expect(store.changed).to.equal(false);
    });
  });

  describe('setAll()', () => {
    it('should allow batch writes', () => {
      store.setAll({
        '/test': 'success',
        'boop/bar': 'foo'
      });
      expect(store._data.test).to.equal('success');
      expect(store._data.boop).to.have.property('bar', 'foo');
    });
  });

  describe('reference()', () => {
    it('should return a key reference', () => {
      expect(store.reference('bar')).to.equal('__ref:bar');
    });
    it('should return an already referenced key reference', () => {
      expect(store.reference('foo/boo')).to.equal('__ref:boo');
    });
  });

  describe('referenceAll()', () => {
    it('should return an array of key references', () => {
      expect(store.referenceAll(['bar', 'foo/bar'])).to.eql(['__ref:bar', '__ref:foo/bar']);
    });
  });

  describe('unreference()', () => {
    it('should return a regular key', () => {
      expect(store.unreference('bar')).to.equal('bar');
    });
    it('should return an unreferenced key', () => {
      expect(store.unreference('__ref:bar')).to.equal('bar');
    });
  });

  describe('unreferenceAll()', () => {
    it('should return an array of unreferenced keys', () => {
      expect(store.unreferenceAll(['__ref:bar', '__ref:foo/bar'])).to.eql(['bar', 'foo/bar']);
    });
  });

  describe('cursors', () => {
    describe('createCursor()', () => {
      it('should generate a cursor instance', () => {
        const cursor = store.createCursor();

        expect(store.get('bar')).to.equal('bat');
        expect(cursor.get('bar')).to.equal('bat');
      });
      it('should generate a cursor instance with a subset of data at "key"', () => {
        const cursor = store.createCursor('foo');

        expect(store.get('bar')).to.equal('bat');
        expect(cursor.get('bar')).to.equal('foo');
      });
      it('should generate a cursor instance with a subset of data at reference "key"', () => {
        const cursor = store.createCursor('foo/boo');

        expect(cursor.get('bar')).to.equal('foo');
        expect(cursor.key).to.equal('/boo');
      });
      it('should allow retrieving all cursor properties when no key specified', () => {
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
      it('should enable creating a cursor from an existing cursor', () => {
        const cursor1 = store.createCursor();
        const cursor2 = cursor1.createCursor('foo');

        expect(store.get('bar')).to.equal('bat');
        expect(cursor1.get('bar')).to.equal('bat');
        expect(cursor2.get('bar')).to.equal('foo');
      });
      it('should enable creating a cursor from an existing cursor at reference "key"', () => {
        const cursor1 = store.createCursor('foo');
        const cursor2 = cursor1.createCursor('boo');

        expect(cursor1.get('boo')).to.eql({ bar: 'foo', bat: { foo: 'foo' } });
        expect(cursor2.get()).to.eql({ bar: 'foo', bat: { foo: 'foo' } });
      });
      it('should allow access to root properties', () => {
        store.set('bat', 'zip');
        const cursor1 = store.createCursor('foo');
        const cursor2 = cursor1.createCursor('boo');

        expect(cursor2.get('/bat')).to.equal('zip');
      });
      it('should access updated data after update to store', () => {
        const cursor = store.createCursor('foo');

        expect(cursor.get()).to.eql(store.get('foo'));
        store.set('foo', 'bar');
        expect(cursor.get()).to.equal('bar');
      });
    });

    describe('getAll()', () => {
      it('should return an array of values', () => {
        const cursor = store.createCursor('foo');

        expect(cursor.getAll(['bar', 'bat'])).to.eql(['foo', 'bat']);
      });
    });

    describe('trigger()', () => {
      it('should defer to store.trigger()', () => {
        const cursor = store.createCursor();

        store.registerAction('foo', store => {
          store.set('foo', 'foo');
        });
        cursor.trigger('foo');
        expect(store.get('foo')).to.equal('foo');
      });
    });
  });

  describe('destroy()', () => {
    it('should destroy all data references', () => {
      store.destroy();
      expect(store.destroyed).to.eql(true);
      expect(store._data).to.eql({});
    });
  });

  describe('dump()', () => {
    it('should return a serialisable json object with no excluded properties', () => {
      store.setSerialisabilityOfKey('bar', false);
      const data = store.dump();

      expect(data.bar).to.equal('bat');
    });
    it('should return an object with resolved references', () => {
      const data = store.dump();

      expect(data.foo.boo.bar).to.equal('foo');
    });
    it('should optionally return a serialised string', () => {
      const json = store.dump(true);

      expect(json).to.be.a('string');
    });
  });

  describe('toJSON()', () => {
    it('should return a serialisable json object', () => {
      const json = store.toJSON();

      expect(json).to.be.an('object');
      expect(json.bar).to.equal('bat');
    });
    it('should return a serialisable json object with correctly handled array properties', () => {
      const json = JSON.stringify(store);

      expect(json).to.be.a('string');
      expect(json).to.match(/"bat":\["foo","bar"\]/);
      expect(JSON.parse(json)).to.have.property('bat');
      expect(JSON.parse(json).bat).to.eql(['foo', 'bar']);
    });
    it('should return a serialisable json object with excluded properties', () => {
      store.set('bing', 'bong');
      store.setSerialisabilityOfKeys({ bing: false, bat: false });
      const json = store.toJSON();

      expect(json).to.be.an('object');
      expect(json.bar).to.equal('bat');
      expect(json.bing).to.equal(undefined);
      expect(json.bat).to.equal(undefined);
    });
    it('should return a serialisable json object with excluded nested properties', () => {
      store.set('foo/bar', 'bong');
      store.setSerialisabilityOfKey('foo/bar', false);
      const json = store.toJSON();

      expect(json).to.be.an('object');
      expect(json.bar).to.equal('bat');
      expect(json.foo.bar).to.equal(undefined);
    });
    it('should return a serialised json object at specific key', () => {
      const json = store.toJSON('foo');

      expect(json).to.eql(store.get('foo'));
    });
    it('should return a serialised json object at specific key with excluded properties', () => {
      store.set('foo/bar', 'bong');
      store.setSerialisabilityOfKey('foo/bar', false);
      const json = store.toJSON('foo');

      expect(json.bar).to.equal(undefined);
    });
  });

  describe('handlers', () => {
    it('should ignore invalid handlers', () => {
      store.useHandler();
      store.useHandler(true);
      store.useHandler(false);
      store.useHandler(null);
      store.useHandler(undefined);
      store.useHandler('foo', true);
      store.useHandler('foo', false);
      store.useHandler('foo', null);
      store.useHandler('foo', undefined);
      expect(store._handlers).to.eql([]);
    });
    it('should allow middleware', () => {
      let run = 0;

      store.useHandler(context => {
        run++;
        expect(context.method).to.equal('reset');
      });
      store.reset({});
      expect(run).to.equal(1);
    });
    it('should allow delegation', () => {
      let run = 0;

      store.useHandler(/zing/, context => {
        run++;
        context.value = 'bar';
        expect(context.key).to.equal('zing');
        expect(context.method).to.equal('set');
      });
      store.set('zing', 'foo');
      expect(run).to.equal(1);
      expect(store._data.zing).to.equal('bar');
    });
    it('should allow delegation when using setAll', () => {
      let run = 0;

      store.useHandler(/zing/, context => {
        run++;
        context.value = 'bar';
        expect(context.key).to.equal('zing');
        expect(context.method).to.equal('set');
      });
      store.setAll({ zing: 'foo', zang: 'bar' });
      expect(run).to.equal(1);
      expect(store._data.zing).to.equal('bar');
      expect(store._data.zang).to.equal('bar');
    });
    it('should allow handling with option merging', () => {
      let run = 0;

      store.useHandler(/foo/, context => {
        run++;
        context.merge('options', { merge: false });
        expect(context.key).to.equal('foo');
      });
      store.set('foo', { bar: 'bar' });
      expect(store._data.foo).to.eql({ bar: 'bar' });
      expect(run).to.equal(1);
    });
    it('should allow multiple handlers', () => {
      let run = 0;

      store.useHandler(/zing/, context => {
        run++;
        context.value = 'bar';
      });
      store.useHandler(/zing/, context => {
        run++;
      });
      store.set('zing', 'foo');
      expect(store._data.zing).to.equal('bar');
      expect(run).to.equal(2);
    });
    it('should remove a single handler', () => {
      let run = 0;
      const fn = context => {
        run++;
      };

      store.useHandler(fn);
      store.set('bar', 'boo');
      expect(run).to.equal(1);
      store.unuseHandler(fn);
      store.set('bar', 'boop');
      expect(run).to.equal(1);
    });
    it('should remove batched handlers', () => {
      let run = 0;
      const handlers = [
        [
          context => {
            run++;
          }
        ],
        [
          context => {
            run++;
          }
        ]
      ];

      store.useHandler(handlers);
      store.set('bar', 'boo');
      expect(run).to.equal(2);
      store.unuseHandler(handlers);
      store.set('bar', 'boop');
      expect(run).to.equal(2);
    });
  });

  describe('actions', () => {
    it('should reject if no action registered', () => {
      return store.trigger('bar').catch(err => {
        expect(store.get('bar')).to.equal('bat');
        expect(err.message).to.equal('action bar not registered');
      });
    });
    it('should register an action', () => {
      store.registerAction('foo', store => {
        store.set('foo', 'foo');
      });
      return store.trigger('foo').then(() => {
        expect(store.get('foo')).to.equal('foo');
      });
    });
    it('should register an action with passed arguments', () => {
      store.registerAction('foo', (store, bar) => {
        store.set('foo', bar);
      });
      return store.trigger('foo', 'bar').then(() => {
        expect(store.get('foo')).to.equal('bar');
      });
    });
    it('should unregister an action', () => {
      store.registerAction('foo', store => {
        store.set('foo', 'foo');
      });
      expect(store._actions).to.have.property('foo');
      store.unregisterAction('foo');
      expect(store._actions).to.not.have.property('foo');
    });
  });
});

describe('FetchableDataStore', () => {
  beforeEach(() => {
    store = createStore(
      'store',
      {
        bar: 'bat',
        boo: 'foo',
        foo: {
          bar: 'boo',
          boo: {
            bar: 'foo'
          }
        },
        bat: ['foo', 'bar']
      },
      { isFetchable: true }
    );
  });
  afterEach(() => {
    store.destroy();
  });

  describe('constructor', () => {
    it('should register handlers', () => {
      store.destroy();
      store = createStore('store', {}, { isFetchable: true, handlers: [[/foo/, context => {}]] });
      expect(store._handledMethods).to.have.property('fetch');
    });
  });

  describe('fetch()', () => {
    beforeEach(() => {
      fake = nock('http://localhost');
    });
    afterEach(() => {
      nock.cleanAll();
    });

    it('should resolve with empty response if missing "key"', () => {
      return store.fetch(null, 'bar', {}).then(response => {
        expect(response.body).to.equal(undefined);
        expect(response.status).to.equal(400);
      });
    });
    it('should resolve with empty response if missing "url"', () => {
      return store.fetch('boop', null, {}).then(response => {
        expect(response.status).to.equal(400);
      });
    });
    it('should resolve with stale value', () => {
      store.set('foo/boo/__headers', { expires: Infinity, cacheControl: {} });
      return store.fetch('foo/boo', 'foo', {}).then(response => {
        expect(response.body).to.have.property('bar', 'foo');
      });
    });
    it('should resolve with stale value if "staleWhileRevalidate"', () => {
      store.set('foo/boo/__headers', {
        expires: Date.now() - 1000,
        cacheControl: { maxAge: 0, staleWhileRevalidate: 10 }
      });
      return store.fetch('foo/boo', 'foo', {}).then(response => {
        expect(response.body).to.have.property('bar', 'foo');
      });
    });
    it('should resolve with fresh value', () => {
      store.set('foo/__headers', { expires: 0, cacheControl: {} });
      fake
        .get('/foo')
        .reply(
          200,
          { foo: 'foo' },
          { 'cache-control': 'public, max-age=10', expires: new Date(Date.now() + 10000).toUTCString() }
        );
      return store.fetch('foo', 'http://localhost/foo').then(response => {
        expect(response.body).to.have.property('foo', 'foo');
        expect(response.headers['cache-control']).to.equal(
          'public, max-age=10, stale-while-revalidate=10, stale-if-error=10'
        );
      });
    });
    it('should reject when failure loading and "options.rejectOnError=true"', () => {
      fake.get('/beep').replyWithError('oops');
      return store
        .fetch('beep', 'http://localhost/beep', { rejectOnError: true, retry: 0, timeout: 100 })
        .then(response => {
          throw Error('expected an error');
        })
        .catch(err => {
          expect(err.body).to.equal(undefined);
          expect(err.status).to.equal(500);
        });
    });
    it('should resolve with stale value when failure loading and "options.rejectOnError=false"', () => {
      store.set('foo/__headers', {
        expires: Date.now(),
        cacheControl: { maxAge: 0, staleWhileRevalidate: 0, staleIfError: 60 }
      });
      fake.get('/foo').delay(10).replyWithError(500);
      return store.fetch('foo', 'http://localhost/foo', { rejectOnError: false }).then(response => {
        expect(response.body).to.have.property('bar', 'boo');
        expect(response.headers['cache-control']).to.equal(
          'public, max-age=60, stale-while-revalidate=90, stale-if-error=120'
        );
        expect(Number(new Date(response.headers.expires)) - Date.now()).to.be.greaterThan(59000).lessThan(61000);
        expect(response.status).to.equal(200);
      });
    });
    it('should resolve with no value when failure loading and "options.rejectOnError=false" and stale', () => {
      store.set('foo/__headers', {
        expires: Date.now(),
        cacheControl: { maxAge: 120, staleWhileRevalidate: 120, staleIfError: 120 }
      });
      fake.get('/foo').delay(10).replyWithError(500);
      return store.fetch('foo', 'http://localhost/foo', { rejectOnError: false }).then(response => {
        expect(response.body).to.equal(undefined);
        expect(response.headers['cache-control']).to.equal(
          'public, max-age=120, stale-while-revalidate=120, stale-if-error=120'
        );
        expect(Number(new Date(response.headers.expires)) - Date.now()).to.be.greaterThan(119000).lessThan(121000);
        expect(response.status).to.equal(500);
      });
    });
    it('should do nothing when loading aborted', done => {
      fake.get('/beep').delayConnection(50).reply(200, { beep: 'beep' });

      store
        .fetch('beep', 'http://localhost/beep', { retry: 0, timeout: 10 })
        .then(response => {
          throw Error('expected an error');
        })
        .catch(done);
      agent.abortAll();
      setTimeout(done, 100);
    });
    it('should allow handling', () => {
      fake
        .get('/foo')
        .reply(
          200,
          { foo: 'foo' },
          { 'cache-control': 'public, max-age=10', expires: new Date(Date.now() + 10000).toUTCString() }
        );

      let run = 0;

      store.useHandler(context => {
        if (context.method === 'fetch') {
          run++;
          expect(context.store).to.have.property('HEADERS_KEY', '__headers');
        }
      });

      return store.fetch('foo', 'http://localhost/foo', {}).then(response => {
        expect(run).to.equal(1);
      });
    });
  });

  describe('fetchAll()', () => {
    beforeEach(() => {
      fake = nock('http://localhost');
    });
    afterEach(() => {
      nock.cleanAll();
    });
    it('should resolve with array for batch fetching', () => {
      fake.get('/foo').reply(200, { foo: 'foo' }).get('/bar').reply(200, { bar: 'bar' });
      store.setAll({
        'foo/__headers': { expires: 0, cacheControl: {} },
        'bar/__headers': { expires: 0, cacheControl: {} }
      });

      return store
        .fetchAll([
          ['foo', 'http://localhost/foo', { staleWhileRevalidate: false }],
          ['bar', 'http://localhost/bar', { staleWhileRevalidate: false }]
        ])
        .then(responses => {
          expect(responses[0].body).to.have.property('foo', 'foo');
          expect(responses[1].body).to.have.property('bar', 'bar');
        });
    });
  });
});

describe('HandlerContext', () => {
  describe('constructor', () => {
    it('should assign passed args based on signature', () => {
      const context = new HandlerContext({}, 'set', ['key', 'value'], ['foo', 'bar']);

      expect(context.key).to.equal('foo');
      expect(context.value).to.equal('bar');
    });
    it('should assign passed args, including rest argument', () => {
      const context = new HandlerContext({}, 'set', ['key', 'value', '...args'], ['foo', 'bar', true]);

      expect(context.key).to.equal('foo');
      expect(context.value).to.equal('bar');
      expect(context.args).to.eql([true]);
    });
  });

  describe('merge', () => {
    it('should define missing options', () => {
      const context = new HandlerContext({}, 'set', ['key', 'value', 'options'], ['foo', 'bar']);

      context.merge('options', { merge: false });
      expect(context.options).to.eql({ merge: false });
    });
    it('should merge existing options', () => {
      const context = new HandlerContext({}, 'set', ['key', 'value', 'options'], ['foo', 'bar', { foo: true }]);

      context.merge('options', { merge: false });
      expect(context.options).to.eql({ foo: true, merge: false });
    });
  });

  describe('toArguments', () => {
    it('should return args based on signature', () => {
      const context = new HandlerContext({}, 'set', ['key', 'value'], ['foo', 'bar']);

      expect(context.toArguments()).to.eql(['foo', 'bar']);
    });
    it('should return args, including rest argument', () => {
      const context = new HandlerContext({}, 'set', ['key', 'value', '...args'], ['foo', 'bar', true]);

      expect(context.toArguments()).to.eql(['foo', 'bar', true]);
    });
  });
});
