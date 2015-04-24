var expect = require('chai').expect;
var Redis = require('../lib/redis');
var KeyIndex = require('../indexes/key');

describe('indexes/key', function() {
  var index, redis;
  var doc = {id: 1, foo: 'bar'};

  before(function(done) {
    redis = new Redis();
    redis.select(15, done);
  });

  it('should instantiate an index', function() {
    index = new KeyIndex(redis, {idAttribute: 'id', key: 'foo', prefix: 'radish-test-key'});
    expect(index).to.have.keys(['redis', 'idAttribute', 'key', 'prefix', 'sorted', 'cache']);
    expect(index.redis).to.equal(redis);
    expect(index.idAttribute).to.equal('id');
    expect(index.key).to.equal('foo');
    expect(index.prefix).to.equal('radish-test-key:');
    expect(index.sorted).to.be.true;
  });

  describe('#add', function() {
    it('should add a document to the index', function(done) {
      index.add(doc, function(err, reply) {
        if (err) return done(err);
        expect(reply).to.equal(1);
        redis.KEYS('radish-test-key:bar', function(err, reply) {
          if (err) return done(err);
          expect(reply).to.be.an.instanceof(Array);
          expect(reply).to.have.length(1);
          expect(reply[0]).to.equal('radish-test-key:bar');
          done();
        });
      });
    });
    it('should re-index a repeat document', function(done) {
      index.add(doc, function(err, reply) {
        if (err) return done(err);
        expect(reply).to.equal(1);
        done();
      });
    });
  });

  describe('#get', function() {
    before(function(done) {
      index.add({id: 2, foo: 'bar'}, done);
    });

    it('should get documents matching a key', function(done) {
      index.get('bar', function(err, docs) {
        if (err) return done(err);
        expect(docs).to.be.an.instanceof(Array);
        expect(docs).to.have.length(2);
        expect(docs[0]).to.equal('1');
        expect(docs[1]).to.equal('2');
        done();
      });
    });
  });

  describe('#search', function() {
    before(function(done) {
      index.add({id: 3, foo: 'baz'}, done);
    });

    it('should search for all ids with matching keys', function(done) {
      index.search('ba*', function(err, result) {
        if (err) return done(err);
        expect(result).to.have.keys(['count', 'results']);
        expect(result.count).to.equal(3);
        expect(result.results).to.be.an.instanceof(Array);
        expect(result.results).to.have.length(3);
        expect(result.results[0]).to.equal('1');
        expect(result.results[1]).to.equal('2');
        expect(result.results[2]).to.equal('3');
        done();
      });
    });
  });

  describe('#remove', function() {
    it('should remove a document from the index', function(done) {
      index.remove(doc, function(err, reply) {
        if (err) return done(err);
        expect(reply).to.equal('OK');
        index.get('bar', function(err, docs) {
          if (err) return done(err);
          expect(docs).to.be.an.instanceof(Array);
          expect(docs).to.have.length(1);
          expect(docs[0]).to.equal('2');
          done();
        });
      });
    });
  });

  after(function(done) {
    redis.KEYS('radish-test*', function(err, keys) {
      if (err) return done(err);
      var remaining = keys.length;
      if (!remaining) return done();
      keys.forEach(function(key) {
        redis.DEL(key, function(err, reply) {
          if (err) return done(err);
          if (--remaining === 0) {
            done()
          }
        });
      });
    });
  });
});
