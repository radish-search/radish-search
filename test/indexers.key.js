var expect = require('chai').expect;
var Redis = require('../lib/redis');
var KeyIndex = require('../indexers/key');

describe('indexers/key', function() {
  var doc = {id: 1, foo: 'bar'};

  before(function(done) {
    this.redis = new Redis();
    this.redis.select(15, done);
  });

  it('should instantiate an index', function() {
    this.index = new KeyIndex(this.redis, {idAttribute: 'id', key: 'foo', prefix: 'radish-test-key'});
    expect(this.index).to.have.keys(['redis', 'idAttribute', 'key', 'prefix', 'sorted', 'cache']);
    expect(this.index.redis).to.equal(this.redis);
    expect(this.index.idAttribute).to.equal('id');
    expect(this.index.key).to.equal('foo');
    expect(this.index.prefix).to.equal('radish-test-key:');
    expect(this.index.sorted).to.be.false;
  });

  describe('#add', function() {
    it('should add a document to the index', function(done) {
      var redis = this.redis;
      this.index.add(doc, function(err, reply) {
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
      this.index.add(doc, function(err, reply) {
        if (err) return done(err);
        expect(reply).to.equal(1);
        done();
      });
    });
  });

  describe('#get', function() {
    before(function(done) {
      this.index.add({id: 2, foo: 'bar'}, done);
    });

    it('should get documents matching a key', function(done) {
      this.index.get('bar', function(err, docs) {
        if (err) return done(err);
        expect(docs).to.be.an.instanceof(Array);
        expect(docs).to.have.length(2);
        expect(docs).to.have.members(['1', '2']);
        done();
      });
    });
  });

  describe('#match', function() {
    before(function(done) {
      this.index.add({id: 3, foo: 'ber'}, done);
    });

    before(function(done) {
      this.index.add({id: 4, foo: 'baz'}, done);
    });

    it('should return documents with keys that match the pattern', function(done) {
      this.index.match('ba*', function(err, result) {
        if (err) return done(err);
        expect(result).to.have.keys(['count', 'results']);
        expect(result.count).to.equal(3);
        expect(result.results).to.be.an.instanceof(Array);
        expect(result.results).to.have.length(3);
        expect(result.results).to.have.members(['1', '2', '4']);
        done();
      });
    });
  });

  describe('#search', function() {
    it('should search for all ids with matching keys', function(done) {
      this.index.search('bar baz', function(err, result) {
        if (err) return done(err);
        expect(result).to.have.keys(['count', 'results']);
        expect(result.count).to.equal(3);
        expect(result.results).to.be.an.instanceof(Array);
        expect(result.results).to.have.length(3);
        expect(result.results).to.have.members(['1', '2', '4']);
        done();
      });
    });
  });

  describe('#remove', function() {
    it('should remove a document from the index', function(done) {
      var index = this.index;
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
    var redis = this.redis;
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
