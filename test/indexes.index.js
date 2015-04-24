var expect = require('chai').expect;
var Redis = require('../lib/redis');
var Index = require('../indexes/index');

describe('indexes/index', function() {
  var index, redis;
  var doc = {id: 1, foo: 'bar'};

  before(function(done) {
    redis = new Redis();
    redis.select(15, done);
  });

  it('should instantiate an index', function() {
    index = new Index(redis, {idAttribute: 'id', prefix: 'radish-test-index'});
    expect(index).to.have.keys(['redis', 'idAttribute', 'prefix', 'sorted']);
    expect(index.redis).to.equal(redis);
    expect(index.idAttribute).to.equal('id');
    expect(index.prefix).to.equal('radish-test-index:');
    expect(index.sorted).to.be.false;
  });

  describe('#add', function() {
    it('should add a document to the index', function(done) {
      index.add(doc, function(err, reply) {
        if (err) return done(err);
        expect(reply).to.equal(1);
        redis.KEYS('radish-test-index:1', function(err, reply) {
          if (err) return done(err);
          expect(reply).to.be.an.instanceof(Array);
          expect(reply).to.have.length(1);
          expect(reply[0]).to.equal('radish-test-index:1');
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
    it('should get documents matching a key', function(done) {
      index.get('1', function(err, docs) {
        if (err) return done(err);
        expect(docs).to.be.an.instanceof(Array);
        expect(docs).to.have.length(1);
        expect(docs[0]).to.equal('1');
        done();
      });
    });
  });

  describe('#search', function() {
    it('should throw an exception', function() {
      expect(index.search).to.throw(Error);
      expect(index.search).to.throw(/not implemented/);
    });
  });

  describe('#remove', function() {
    it('should remove a document from the index', function(done) {
      index.remove(doc, function(err, reply) {
        if (err) return done(err);
        expect(reply).to.equal('OK');
        redis.KEYS('radish-test-index:1', function(err, reply) {
          if (err) return done(err);
          expect(reply).to.be.an.instanceof(Array);
          expect(reply).to.have.length(0);
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
