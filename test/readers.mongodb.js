var expect = require('chai').expect;
var Mongo = require('../readers/mongo');

describe('readers/mongo', function() {
  it('should create a connection to Mongo', function(done) {
    var mongo = this.mongo = new Mongo({db: 'radish-test'});
    mongo.connect().on('error', done).on('connected', function() {
      expect(this.dbName).to.equal('radish-test');
      expect(this.oplog).to.be.ok;
      done();
    });
  });
  it('should get a cursor to the oplog', function(done) {
    this.mongo.cursor().on('error', done).on('cursor', function() {
      expect(this.cursor).to.be.ok;
      expect(this.lastOplogTime).to.be.ok;
      expect(this.lastOplogTime).to.have.keys(['_bsontype', 'low_', 'high_']);
      done();
    });
  });
});
