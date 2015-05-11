var expect = require('chai').expect;
var Redis = require('../lib/redis');
var BaseIndex = require('../indexers/base');

describe('indexers/base', function() {
  var doc = {id: 1, foo: 'bar'};

  before(function(done) {
    this.redis = new Redis();
    this.redis.select(15, done);
  });

  it('should instantiate an index', function() {
    this.index = new BaseIndex(this.redis, {idAttribute: 'id', prefix: 'radish-test-base'});
    expect(this.index).to.have.keys(['redis', 'idAttribute', 'key', 'prefix', 'sorted', 'cache']);
    expect(this.index.redis).to.equal(this.redis);
    expect(this.index.idAttribute).to.equal('id');
    expect(this.index.prefix).to.equal('radish-test-base:');
    expect(this.index.sorted).to.be.false;
  });

  describe('#add', function() {
    it('should add a document to the index', function(done) {
      var redis = this.redis;
      this.index.add(doc, function(err, reply) {
        if (err) return done(err);
        expect(reply).to.equal(1);
        redis.KEYS('radish-test-base:1', function(err, reply) {
          if (err) return done(err);
          expect(reply).to.be.an.instanceof(Array);
          expect(reply).to.have.length(1);
          expect(reply[0]).to.equal('radish-test-base:1');
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
    it('should get documents matching a key', function(done) {
      this.index.get('1', function(err, docs) {
        if (err) return done(err);
        expect(docs).to.be.an.instanceof(Array);
        expect(docs).to.have.length(1);
        expect(docs[0]).to.equal('1');
        done();
      });
    });
  });

  describe('#match', function() {
    before(function(done) {
      this.index.add({id: 2, foo: 'bar'}, done);
    });

    before(function(done) {
      this.index.add({id: 10, foo: 'bar'}, done);
    });

    it('should return documents with an id that matches the pattern', function(done) {
      this.index.match('1*', function(err, result) {
        if (err) return done(err);
        expect(result).to.have.keys(['count', 'results']);
        expect(result.count).to.equal(2);
        expect(result.results).to.be.an.instanceof(Array);
        expect(result.results).to.have.length(2);
        expect(result.results).to.have.members(['1', '10']);
        done();
      });
    });
  });

  describe('#search', function() {
    it('should throw an exception', function() {
      expect(this.index.search).to.throw(Error);
      expect(this.index.search).to.throw(/not implemented/);
    });
  });

  describe('#remove', function() {
    it('should remove a document from the index', function(done) {
      var redis = this.redis;
      this.index.remove(doc, function(err, reply) {
        if (err) return done(err);
        expect(reply).to.equal('OK');
        redis.KEYS('radish-test-base:1', function(err, reply) {
          if (err) return done(err);
          expect(reply).to.be.an.instanceof(Array);
          expect(reply).to.have.length(0);
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
