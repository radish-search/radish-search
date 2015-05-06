var expect = require('chai').expect;
var Mongo = require('../readers/mongo');

describe('readers/mongo', function() {
  it('should create a connection to Mongo', function(done) {
    var mongo = this.mongo = new Mongo({db: 'radish-test'});
    mongo.connect().once('error', done).once('connected', function() {
      expect(this.dbName).to.equal('radish-test');
      expect(this.oplog).to.be.ok;
      done();
    });
  });
  it('should get a cursor to the oplog', function(done) {
    this.mongo.getCursor().once('error', done).once('cursor', function() {
      expect(this.cursor).to.be.ok;
      expect(this.lastOplogTime).to.be.ok;
      expect(this.lastOplogTime).to.have.keys(['_bsontype', 'low_', 'high_']);
      done();
    });
  });
  describe('events', function() {
    before(function(done) {
      this.mongo.listen().once('cursor', done);
      this.doc = {foo: 'bar'};
    });

    it('should track inserts', function(done) {
      var _this = this;
      this.mongo.once('insert', function(data) {
        expect(data).to.be.ok;
        expect(data.op).to.equal('i');
        expect(data.o).to.deep.equal(_this.doc);
        done();
      });
      this.mongo.db.db('radish-test').collection('radish-test').insert(this.doc, function(err) {
        if (err) return done(err);
      });
    });

    it('should track updates', function(done) {
      var _this = this;
      this.mongo.once('update', function(data) {
        expect(data).to.be.ok;
        expect(data.op).to.equal('u');
        expect(data.o).to.not.deep.equal(_this.doc);
        expect(data.o.foo).to.equal('baz');
        done();
      });
      this.mongo.db.db('radish-test').collection('radish-test').update(this.doc, {foo: 'baz'}, function(err) {
        if (err) return done(err);
      });
    });

    it('should track deletes', function(done) {
      var _this = this;
      this.mongo.once('delete', function(data) {
        expect(data).to.be.ok;
        expect(data.op).to.equal('d');
        expect(data.o._id).to.deep.equal(_this.doc._id);
        done();
      });
      this.mongo.db.db('radish-test').collection('radish-test').remove({_id: this.doc._id}, function(err) {
        if (err) return done(err);
      });
    });
  });

  after(function(done) {
    this.mongo.db.db('radish-test').collection('radish-test').remove({}, done);
  });
});
