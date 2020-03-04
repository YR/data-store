"use strict";

const { create: createStore } = require("../src/index");
const { expect } = require("chai");
const HandlerContext = require("../src/lib/HandlerContext");

let store;

describe("DataStore", () => {
  beforeEach(() => {
    store = createStore("store", {
      bar: "bat",
      boo: {
        bar: "foo",
        bat: {
          foo: "foo"
        }
      },
      foo: {
        bar: "foo",
        boo: "__ref:boo",
        bat: "__ref:bar"
      },
      bat: ["foo", "bar"],
      boop: ["__ref:bar", "__ref:foo"]
    });
  });
  afterEach(() => {
    store.destroy();
  });

  describe("constructor", () => {
    it("should instantiate with passed data", () => {
      expect(store._data).to.have.property("bar", "bat");
    });
    it("should instantiate with id", () => {
      store = createStore("foo");
      expect(store.id).to.equal("foo");
    });
  });

  describe("_resolveRefKey()", () => {
    it("should resolve key with no references", () => {
      expect(store._resolveRefKey("bar")).to.equal("bar");
      expect(store._resolveRefKey("zing/zoop")).to.equal("zing/zoop");
    });
    it("should resolve key with references", () => {
      expect(store._resolveRefKey("foo/boo")).to.equal("boo");
    });
    it("should resolve nested key with references", () => {
      expect(store._resolveRefKey("foo/boo/bat/foo")).to.equal("boo/bat/foo");
      expect(store._resolveRefKey("foo/boo/zing/zoop")).to.equal(
        "boo/zing/zoop"
      );
    });
  });

  describe("get()", () => {
    it("should return a value for a string key", () => {
      expect(store.get("bar")).to.equal("bat");
      expect(store.get("/bar")).to.equal("bat");
    });
    it("should return all data if no key specified", () => {
      expect(store.get().bar).to.equal("bat");
    });
    it("should return a referenced value", () => {
      expect(store.get("foo/boo")).to.eql({ bar: "foo", bat: { foo: "foo" } });
      expect(store.get("foo/boo/bat/foo")).to.eql("foo");
    });
    it("should return a referenced value when passed a reference key", () => {
      expect(store.get("__ref:boo")).to.eql({
        bar: "foo",
        bat: { foo: "foo" }
      });
    });
    it('should return a referenced value when passed a reference key and "options.referenceDepth = 0"', () => {
      expect(store.get("__ref:boo", { referenceDepth: 0 })).to.eql({
        bar: "foo",
        bat: { foo: "foo" }
      });
    });
    it("should return a resolved object of referenced values", () => {
      expect(store.get("foo")).to.eql({
        bar: "foo",
        boo: { bar: "foo", bat: { foo: "foo" } },
        bat: "bat"
      });
    });
    it('should not return a resolved object of referenced values if "options.referenceDepth = 0"', () => {
      expect(store.get("foo", { referenceDepth: 0 })).to.eql({
        bar: "foo",
        boo: "__ref:boo",
        bat: "__ref:bar"
      });
    });
    it("should return a resolved array of referenced values", () => {
      expect(store.get("boop")).to.eql([
        "bat",
        { bar: "foo", boo: "__ref:boo", bat: "__ref:bar" }
      ]);
    });
    it('should return a deeply resolved array of referenced values when "options.referenceDepth = 2"', () => {
      expect(store.get("boop", { referenceDepth: 2 })).to.eql([
        "bat",
        { bar: "foo", boo: { bar: "foo", bat: { foo: "foo" } }, bat: "bat" }
      ]);
    });
    it('should not return a resolved array of referenced values if "options.referenceDepth = 0"', () => {
      expect(store.get("boop", { referenceDepth: 0 })).to.eql([
        "__ref:bar",
        "__ref:foo"
      ]);
    });
    it("should cache read results if not writeable", () => {
      store.setWriteable(false);
      expect(store.get("boo/bat/foo")).to.equal("foo");
      expect(store._getCache).to.have.property("boo/bat/foo:1", "foo");
    });
    it('should cache read results if not writeable, respecting "options.referenceDepth"', () => {
      store.setWriteable(false);
      expect(store.get("boop")).to.eql([
        "bat",
        { bar: "foo", boo: "__ref:boo", bat: "__ref:bar" }
      ]);
      expect(store._getCache).to.have.property("boop:1");
      expect(store.get("boop", { referenceDepth: 0 })).to.eql([
        "__ref:bar",
        "__ref:foo"
      ]);
      expect(store._getCache).to.have.property("boop:0");
      expect(store._getCache["boob:1"]).to.not.equal(store._getCache["boop:0"]);
    });
  });

  describe("getAll()", () => {
    it("should return an array of values for an array of string keys", () => {
      expect(store.getAll(["bar", "bat"])).to.eql(["bat", ["foo", "bar"]]);
    });
  });

  describe("set()", () => {
    it("should do nothing if called with missing key", () => {
      const data = store._data;

      store.set("", "bar");
      store.set(null, "bar");
      expect(store._data).to.equal(data);
    });
    it("should throw if dataStore is not writable", () => {
      store.setWriteable(false);
      try {
        store.set("foo", "bar");
        expect(false);
      } catch (err) {
        expect(store._data.foo).to.not.equal("bar");
      }
    });
    it("should store a value when called with simple key", () => {
      store.set("foo", "bar");
      expect(store._data.foo).to.equal("bar");
    });
    it("should not update the original referenced value", () => {
      store.set("foo/boo/bar", "bar");
      expect(store._data.foo.boo.bar).to.equal("bar");
    });
    it("should create new object when immutable", () => {
      const data = store._data;

      store.set("foo", "bar", { immutable: true });
      expect(store._data.foo).to.equal("bar");
      expect(store._data).to.not.equal(data);
      expect(store.changed).to.equal(true);
    });
    it("should not create new object when immutable if no change", () => {
      const data = store._data;

      store.set("bar", "bat", { immutable: true });
      expect(store._data).to.equal(data);
      expect(store.changed).to.equal(false);
    });
  });

  describe("setAll()", () => {
    it("should allow batch writes", () => {
      store.setAll({
        "/test": "success",
        "boop/bar": "foo"
      });
      expect(store._data.test).to.equal("success");
      expect(store._data.boop).to.have.property("bar", "foo");
    });
  });

  describe("reference()", () => {
    it("should return a key reference", () => {
      expect(store.reference("bar")).to.equal("__ref:bar");
    });
    it("should return an already referenced key reference", () => {
      expect(store.reference("foo/boo")).to.equal("__ref:boo");
    });
  });

  describe("referenceAll()", () => {
    it("should return an array of key references", () => {
      expect(store.referenceAll(["bar", "foo/bar"])).to.eql([
        "__ref:bar",
        "__ref:foo/bar"
      ]);
    });
  });

  describe("unreference()", () => {
    it("should return a regular key", () => {
      expect(store.unreference("bar")).to.equal("bar");
    });
    it("should return an unreferenced key", () => {
      expect(store.unreference("__ref:bar")).to.equal("bar");
    });
  });

  describe("unreferenceAll()", () => {
    it("should return an array of unreferenced keys", () => {
      expect(store.unreferenceAll(["__ref:bar", "__ref:foo/bar"])).to.eql([
        "bar",
        "foo/bar"
      ]);
    });
  });

  describe("destroy()", () => {
    it("should destroy all data references", () => {
      store.destroy();
      expect(store.destroyed).to.eql(true);
      expect(store._data).to.eql({});
    });
  });

  describe("dump()", () => {
    it("should return a serialisable json object with no excluded properties", () => {
      store.setSerialisabilityOfKey("bar", false);
      const data = store.dump();

      expect(data.bar).to.equal("bat");
    });
    it("should return an object with resolved references", () => {
      const data = store.dump();

      expect(data.foo.boo.bar).to.equal("foo");
    });
    it("should optionally return a serialised string", () => {
      const json = store.dump(true);

      expect(json).to.be.a("string");
    });
  });

  describe("toJSON()", () => {
    it("should return a serialisable json object", () => {
      const json = store.toJSON();

      expect(json).to.be.an("object");
      expect(json.bar).to.equal("bat");
    });
    it("should return a serialisable json object with correctly handled array properties", () => {
      const json = JSON.stringify(store);

      expect(json).to.be.a("string");
      expect(json).to.match(/"bat":\["foo","bar"\]/);
      expect(JSON.parse(json)).to.have.property("bat");
      expect(JSON.parse(json).bat).to.eql(["foo", "bar"]);
    });
    it("should return a serialisable json object with excluded properties", () => {
      store.set("bing", "bong");
      store.setSerialisabilityOfKeys({ bing: false, bat: false });
      const json = store.toJSON();

      expect(json).to.be.an("object");
      expect(json.bar).to.equal("bat");
      expect(json.bing).to.equal(undefined);
      expect(json.bat).to.equal(undefined);
    });
    it("should return a serialisable json object with excluded nested properties", () => {
      store.set("foo/bar", "bong");
      store.setSerialisabilityOfKey("foo/bar", false);
      const json = store.toJSON();

      expect(json).to.be.an("object");
      expect(json.bar).to.equal("bat");
      expect(json.foo.bar).to.equal(undefined);
    });
    it("should return a serialised json object at specific key", () => {
      const json = store.toJSON("foo");

      expect(json).to.eql(store.get("foo"));
    });
    it("should return a serialised json object at specific key with excluded properties", () => {
      store.set("foo/bar", "bong");
      store.setSerialisabilityOfKey("foo/bar", false);
      const json = store.toJSON("foo");

      expect(json.bar).to.equal(undefined);
    });
  });

  describe("handlers", () => {
    it("should ignore invalid handlers", () => {
      store.useHandler();
      store.useHandler(true);
      store.useHandler(false);
      store.useHandler(null);
      store.useHandler(undefined);
      store.useHandler("foo", true);
      store.useHandler("foo", false);
      store.useHandler("foo", null);
      store.useHandler("foo", undefined);
      expect(store._handlers).to.eql([]);
    });
    it("should allow middleware", () => {
      let run = 0;

      store.useHandler(context => {
        run++;
        expect(context.method).to.equal("reset");
      });
      store.reset({});
      expect(run).to.equal(1);
    });
    it("should allow delegation", () => {
      let run = 0;

      store.useHandler(/zing/, context => {
        run++;
        context.value = "bar";
        expect(context.key).to.equal("zing");
        expect(context.method).to.equal("set");
      });
      store.set("zing", "foo");
      expect(run).to.equal(1);
      expect(store._data.zing).to.equal("bar");
    });
    it("should allow delegation when using setAll", () => {
      let run = 0;

      store.useHandler(/zing/, context => {
        run++;
        context.value = "bar";
        expect(context.key).to.equal("zing");
        expect(context.method).to.equal("set");
      });
      store.setAll({ zing: "foo", zang: "bar" });
      expect(run).to.equal(1);
      expect(store._data.zing).to.equal("bar");
      expect(store._data.zang).to.equal("bar");
    });
    it("should allow handling with option merging", () => {
      let run = 0;

      store.useHandler(/foo/, context => {
        run++;
        context.merge("options", { merge: false });
        expect(context.key).to.equal("foo");
      });
      store.set("foo", { bar: "bar" });
      expect(store._data.foo).to.eql({ bar: "bar" });
      expect(run).to.equal(1);
    });
    it("should allow multiple handlers", () => {
      let run = 0;

      store.useHandler(/zing/, context => {
        run++;
        context.value = "bar";
      });
      store.useHandler(/zing/, context => {
        run++;
      });
      store.set("zing", "foo");
      expect(store._data.zing).to.equal("bar");
      expect(run).to.equal(2);
    });
    it("should remove a single handler", () => {
      let run = 0;
      const fn = context => {
        run++;
      };

      store.useHandler(fn);
      store.set("bar", "boo");
      expect(run).to.equal(1);
      store.unuseHandler(fn);
      store.set("bar", "boop");
      expect(run).to.equal(1);
    });
    it("should remove batched handlers", () => {
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
      store.set("bar", "boo");
      expect(run).to.equal(2);
      store.unuseHandler(handlers);
      store.set("bar", "boop");
      expect(run).to.equal(2);
    });
  });
});

describe("HandlerContext", () => {
  describe("constructor", () => {
    it("should assign passed args based on signature", () => {
      const context = new HandlerContext(
        {},
        "set",
        ["key", "value"],
        ["foo", "bar"]
      );

      expect(context.key).to.equal("foo");
      expect(context.value).to.equal("bar");
    });
    it("should assign passed args, including rest argument", () => {
      const context = new HandlerContext(
        {},
        "set",
        ["key", "value", "...args"],
        ["foo", "bar", true]
      );

      expect(context.key).to.equal("foo");
      expect(context.value).to.equal("bar");
      expect(context.args).to.eql([true]);
    });
  });

  describe("merge", () => {
    it("should define missing options", () => {
      const context = new HandlerContext(
        {},
        "set",
        ["key", "value", "options"],
        ["foo", "bar"]
      );

      context.merge("options", { merge: false });
      expect(context.options).to.eql({ merge: false });
    });
    it("should merge existing options", () => {
      const context = new HandlerContext(
        {},
        "set",
        ["key", "value", "options"],
        ["foo", "bar", { foo: true }]
      );

      context.merge("options", { merge: false });
      expect(context.options).to.eql({ foo: true, merge: false });
    });
  });

  describe("toArguments", () => {
    it("should return args based on signature", () => {
      const context = new HandlerContext(
        {},
        "set",
        ["key", "value"],
        ["foo", "bar"]
      );

      expect(context.toArguments()).to.eql(["foo", "bar"]);
    });
    it("should return args, including rest argument", () => {
      const context = new HandlerContext(
        {},
        "set",
        ["key", "value", "...args"],
        ["foo", "bar", true]
      );

      expect(context.toArguments()).to.eql(["foo", "bar", true]);
    });
  });
});
