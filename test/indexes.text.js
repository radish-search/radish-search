var expect = require('chai').expect;
var Redis = require('../lib/redis');
var TextIndex = require('../indexes/text');

describe('indexes/text', function() {
  var index, redis;
  var doc = {id: 1, description: 'The quick brown fox jumps over the lazy dog.'};

  before(function(done) {
    redis = new Redis();
    redis.select(15, done);
  });

  it('should instantiate an index', function() {
    index = new TextIndex(redis, {idAttribute: 'id', fields: ['description'], minWordLength: 1, prefix: 'radish-test-text'});
    expect(index).to.have.keys(['redis', 'idAttribute', 'fields', 'minWordLength', 'prefix', 'sorted', 'cache']);
    expect(index.redis).to.equal(redis);
    expect(index.idAttribute).to.equal('id');
    expect(index.fields).to.deep.equal(['description']);
    expect(index.minWordLength).to.equal(1);
    expect(index.prefix).to.equal('radish-test-text:');
    expect(index.sorted).to.be.true;
  });

  describe('#add', function() {
    it('should add a document to the index', function(done) {
      index.add(doc, function(err, reply) {
        if (err) return done(err);
        expect(reply).to.equal(7);
        redis.KEYS('radish-test-text:*', function(err, reply) {
          if (err) return done(err);
          expect(reply).to.be.an.instanceof(Array);
          expect(reply).to.have.length(7);
          done();
        });
      });
    });
    it('should re-index a repeat document', function(done) {
      index.add(doc, function(err, reply) {
        if (err) return done(err);
        expect(reply).to.equal(7);
        done();
      });
    });
  });

  describe('#get', function() {
    before(function(done) {
      index.add({id: 2, description: 'The quick brown fox hopped over the lazy dog'}, done);
    });
    before(function(done) {
      index.add({id: 3, description: 'The quick brown fox jumped over the lazy dog'}, done);
    });

    it('should get documents matching a key', function(done) {
      index.get('jump', function(err, docs) {
        if (err) return done(err);
        expect(docs).to.be.an.instanceof(Array);
        expect(docs).to.have.length(2);
        expect(docs).to.contain.members(['1', '3']);
        done();
      });
    });
  });

  describe('#search', function() {
    it('should search for all ids with matching keys', function(done) {
      index.search('dogs with problems about laziness', function(err, result) {
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
        index.get('fox', function(err, docs) {
          if (err) return done(err);
          expect(docs).to.be.an.instanceof(Array);
          expect(docs).to.have.length(2);
          expect(docs).to.contain.members(['2', '3']);
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
