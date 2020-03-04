"use strict";

const { create: createStore } = require("../src/index");
const { expect } = require("chai");

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

  describe("get()", () => {
    it("should return a value for a string key", () => {
      expect(store.get("bar")).to.equal("bat");
      expect(store.get("/bar")).to.equal("bat");
    });
    it("should return all data if no key specified", () => {
      expect(store.get().bar).to.equal("bat");
    });
    it("should cache read results if not writeable", () => {
      store.setWriteable(false);
      expect(store.get("boo/bat/foo")).to.equal("foo");
      expect(store._getCache).to.have.property("boo/bat/foo:1", "foo");
    });
    it('should cache read results if not writeable, respecting "options.referenceDepth"', () => {
      store.setWriteable(false);
      expect(store.get("boop")).to.eql(["__ref:bar", "__ref:foo"]);
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

  describe("destroy()", () => {
    it("should destroy all data references", () => {
      store.destroy();
      expect(store.destroyed).to.eql(true);
      expect(store._data).to.eql({});
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
});
