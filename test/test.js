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
    it('should update the original referenced value', () => {
      store.set('foo/boo/bar', 'bar');
      expect(store._data.boo.bar).to.equal('bar');
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

  describe('update()', () => {
    it('should set a value for "key"', () => {
      store.update('bar', 'bar');
      expect(store.get('bar')).to.equal('bar');
    });
    it('should allow batch writes', () => {
      store.update({ bar: 'bar', foo: 'bar' });
      expect(store.get('bar')).to.equal('bar');
      expect(store.get('foo')).to.equal('bar');
    });
    it('should allow array batch writes', () => {
      store.update([['bar', 'bar'], ['foo', 'bar']]);
      expect(store.get('bar')).to.equal('bar');
      expect(store.get('foo')).to.equal('bar');
    });
    it('should notify listeners', done => {
      store.on('update', (key, value, oldValue) => {
        expect(key).to.equal('bar');
        expect(store.get(key)).to.equal(value);
        expect(oldValue).to.equal('bat');
        done();
      });
      store.update('bar', 'bar');
    });
    it('should notify listeners of specific property', done => {
      store.on('update:foo/bar', (value, oldValue) => {
        expect(value).to.equal('bar');
        expect(oldValue).to.equal('foo');
        done();
      });
      store.update('foo/bar', 'bar');
    });
    it('should allow passing of additional arguments to listeners', done => {
      store.on('update', (key, value, oldValue, options, foo, bool) => {
        expect(oldValue).to.equal('bat');
        expect(foo).to.equal('foo');
        expect(bool).to.be(true);
        done();
      });
      store.update('bar', 'bar', null, 'foo', true);
    });
    it('should allow passing of additional arguments to listeners for batch writes', done => {
      const obj = { bar: 'bar', boo: 'boo' };
      let i = 0;

      store.on('update', (key, value, oldValue, options, foo) => {
        expect(foo).to.equal('foo');
        if (++i == 2) {
          done();
        }
      });
      store.update(obj, null, null, 'foo');
    });
    it('should allow passing of additional arguments to listeners for array batch writes', done => {
      const arr = [['bar', 'bar', null, 'foo'], ['boo', 'boo', null, 'bar']];
      let i = 0;

      store.on('update', (key, value, oldValue, options, extra) => {
        if (key == 'bar') {
          expect(extra).to.equal('foo');
        }
        if (key == 'boo') {
          expect(extra).to.equal('bar');
        }
        if (++i == 2) {
          done();
        }
      });
      store.update(arr);
    });
    it('should be ignored if dataStore is not "isWritable"', () => {
      store.isWritable = false;
      store.update('bar', 'bar');
      expect(store.get('bar')).to.not.equal('bar');
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

    describe('update()', () => {
      it('should set a value for "key" of a cursor', () => {
        const cursor = store.createCursor('foo');

        cursor.update('bar', 'bar');
        expect(store.get('foo/bar')).to.equal('bar');
      });
      it('should set a root value for empty "key" of a cursor', () => {
        const cursor = store.createCursor('foo');

        cursor.update(null, { bar: 'bar' });
        expect(store.get('foo/bar')).to.equal('bar');
      });
      it('should remove a cursor key when null value specified', () => {
        const cursor = store.createCursor('foo');

        cursor.update();
        expect(store.get('foo/bar')).to.equal(undefined);
        expect(store._data).to.not.have.property('foo');
      });
      it('should allow batch writes', () => {
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
      it('should notify listeners on update of a cursor', done => {
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

  describe('handling', () => {
    it('should ignore invalid handlers', () => {
      store.use();
      store.use(true);
      store.use(false);
      store.use(null);
      store.use(undefined);
      store.use('foo', true);
      store.use('foo', false);
      store.use('foo', null);
      store.use('foo', undefined);
      expect(store._handlers).to.eql([]);
    });
    it('should allow middleware', () => {
      let run = 0;

      store.use(context => {
        run++;
        expect(context.method).to.equal('reset');
      });
      store.reset({});
      expect(run).to.equal(1);
    });
    it('should allow delegation', () => {
      let run = 0;

      store.use(/zing/, context => {
        run++;
        context.value = 'bar';
        expect(context.key).to.equal('zing');
        expect(context.method).to.equal('set');
      });
      store.set('zing', 'foo');
      expect(run).to.equal(1);
      expect(store._data.zing).to.equal('bar');
    });
    it('should allow handling with option merging', () => {
      let run = 0;

      store.use(/foo/, context => {
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

      store.use(/zing/, context => {
        run++;
        context.value = 'bar';
      });
      store.use(/zing/, context => {
        run++;
      });
      store.set('zing', 'foo');
      expect(store._data.zing).to.equal('bar');
      expect(run).to.equal(2);
    });
  });

  describe('unhandling', () => {
    it('should remove a single handler', () => {
      let run = 0;
      const fn = context => {
        run++;
      };

      store.use(fn);
      store.set('bar', 'boo');
      expect(run).to.equal(1);
      store.unuse(fn);
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

      store.use(handlers);
      store.set('bar', 'boo');
      expect(run).to.equal(2);
      store.unuse(handlers);
      store.set('bar', 'boop');
      expect(run).to.equal(2);
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

    it('should return a Promise without the value if missing "key"', () => {
      return store.fetch(null, 'bar', {}).then(result => {
        expect(result.body).to.equal(undefined);
      });
    });
    it('should return a Promise with the value', () => {
      return store.fetch('bar', 'bar', {}).then(result => {
        expect(result.body).to.equal('bat');
      });
    });
    it('should return a Promise with expired value when "options.staleWhileRevalidate = true"', () => {
      store.set('foo/__expires', 0);

      return store.fetch('foo', 'http://localhost/foo', { staleWhileRevalidate: true }).then(result => {
        expect(result.body).to.not.have.property('foo');
      });
    });
    it('should return a Promise with fresh value when "options.staleWhileRevalidate = false"', () => {
      fake.get('/foo').reply(200, { foo: 'foo' });
      store.set('foo/__expires', 0);

      return store.fetch('foo', 'http://localhost/foo', { staleWhileRevalidate: false }).then(result => {
        expect(result.body).to.have.property('foo', 'foo');
      });
    });
    it('should return a Promise with expired value when "options.staleIfError = true" and value', () => {
      fake.get('/foo').replyWithError(500);
      store.set('foo/__expires', 0);

      return store.fetch('foo', 'http://localhost/foo', { staleIfError: true }).then(result => {
        expect(store.get('foo')).to.eql({ bar: 'boo', boo: { bar: 'foo' }, __expires: 0 });
        expect(result.body).to.have.property('bar', 'boo');
      });
    });
    it('should return a rejected Promise when failure loading', () => {
      fake.get('/beep').replyWithError('oops');

      return store
        .fetch('beep', 'http://localhost/beep', { retry: 0, timeout: 100 })
        .then(results => {
          throw Error('expected an error');
        })
        .catch(err => {
          expect(err.body).to.equal(undefined);
          expect(err.status).to.equal(500);
        });
    });
    it('should return a rejected Promise when "options.staleIfError = false" and existing value', () => {
      fake.get('/foo').replyWithError(500);
      store.set('foo/__expires', 0);

      return store
        .fetch('foo', 'http://localhost/foo', { staleIfError: false })
        .then(result => {
          throw Error('expected an error');
        })
        .catch(err => {
          expect(store.get('foo')).to.equal(undefined);
          expect(err).to.have.property('status', 500);
        });
    });
    it('should return a rejected Promise when "options.staleIfError = false" and no existing value', () => {
      fake.get('/zoop').replyWithError(500);

      return store
        .fetch('zoop', 'http://localhost/zoop', { staleIfError: false })
        .then(result => {
          throw Error('expected an error');
        })
        .catch(err => {
          expect(store.get('zoop')).to.equal(undefined);
          expect(err).to.have.property('status', 500);
        });
    });
    it('should do nothing when loading aborted', done => {
      fake.get('/beep').delayConnection(50).reply(200, { beep: 'beep' });

      store.fetch('beep', 'http://localhost/beep', { retry: 0, timeout: 10 }).then(done).catch(done);
      agent.abortAll();
      setTimeout(done, 100);
    });
  });

  describe('fetchAll()', () => {
    it('should return a Promise for array batch fetching', () => {
      fake.get('/foo').reply(200, { foo: 'foo' }).get('/bar').reply(200, { bar: 'bar' });
      store.setAll({ 'foo/__expires': 0, 'bar/__expires': 0 });

      return store
        .fetchAll([
          ['foo', 'http://localhost/foo', { staleWhileRevalidate: false }],
          ['bar', 'http://localhost/bar', { staleWhileRevalidate: false }]
        ])
        .then(results => {
          expect(results[0].body).to.have.property('foo', 'foo');
          expect(results[1].body).to.have.property('bar', 'bar');
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
