var expect = require('chai').expect;
var Redis = require('../lib/redis');
var TextIndex = require('../indexers/text');

describe('indexers/text', function() {
  var index, redis;
  var doc = {id: 1, description: 'The quick brown fox jumps over the lazy dog.'};

  before(function(done) {
    this.redis = new Redis();
    this.redis.select(15, done);
  });

  it('should instantiate an index', function() {
    this.index = new TextIndex(this.redis, {idAttribute: 'id', fields: ['description'], minWordLength: 1, prefix: 'radish-test-text'});
    expect(this.index).to.have.keys(['redis', 'idAttribute', 'fields', 'minWordLength', 'prefix', 'sorted', 'cache']);
    expect(this.index.redis).to.equal(this.redis);
    expect(this.index.idAttribute).to.equal('id');
    expect(this.index.fields).to.deep.equal(['description']);
    expect(this.index.minWordLength).to.equal(1);
    expect(this.index.prefix).to.equal('radish-test-text:');
    expect(this.index.sorted).to.be.true;
  });

  describe('#add', function() {
    it('should add a document to the index', function(done) {
      var redis = this.redis;
      this.index.add(doc, function(err, reply) {
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
      this.index.add(doc, function(err, reply) {
        if (err) return done(err);
        expect(reply).to.equal(7);
        done();
      });
    });
  });

  describe('#get', function() {
    before(function(done) {
      this.index.add({id: 2, description: 'The quick brown fox hopped over the lazy dog'}, done);
    });

    before(function(done) {
      this.index.add({id: 3, description: 'The quick brown fox jumped over the lazy dog'}, done);
    });

    it('should get documents matching a key', function(done) {
      this.index.get('jump', function(err, docs) {
        if (err) return done(err);
        expect(docs).to.be.an.instanceof(Array);
        expect(docs).to.have.length(2);
        expect(docs).to.have.members(['1', '3']);
        done();
      });
    });
  });

  describe('#match', function() {
    it('should return documents with keys that match the pattern', function(done) {
      this.index.match('ju*', function(err, result) {
        if (err) return done(err);
        expect(result).to.have.keys(['count', 'results']);
        expect(result.count).to.equal(2);
        expect(result.results).to.be.an.instanceof(Array);
        expect(result.results).to.have.length(2);
        expect(result.results).to.have.members(['1', '3']);
        done();
      });
    });
  });

  describe('#search', function() {
    it('should search for all ids with matching keys', function(done) {
      this.index.search('dogs with problems about laziness', function(err, result) {
        if (err) return done(err);
        expect(result).to.have.keys(['count', 'results']);
        expect(result.count).to.equal(3);
        expect(result.results).to.be.an.instanceof(Array);
        expect(result.results).to.have.length(3);
        expect(result.results).to.have.members(['1', '2', '3']);
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
        index.get('fox', function(err, docs) {
          if (err) return done(err);
          expect(docs).to.be.an.instanceof(Array);
          expect(docs).to.have.length(2);
          expect(docs).to.have.members(['2', '3']);
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
