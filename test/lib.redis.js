var expect = require('chai').expect;
var Redis = require('../lib/redis');

describe('lib/redis', function() {
  it('should create a connection to Redis', function(done) {
    var redis = this.redis = new Redis();
    redis.on('error', done).on('ready', done);
  });
  it('should select a different database', function(done) {
    this.redis.SELECT(1, function(err, reply) {
      if (err) return done(err);
      expect(reply).to.equal('OK');
      done()
    });
  });
  it('should run a command', function(done) {
    this.redis.PING(function(err, reply) {
      if (err) return done(err);
      expect(reply).to.equal('PONG');
      done();
    });
  });
});
