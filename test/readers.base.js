var expect = require('chai').expect;
var BaseReader = require('../readers/base');

describe('readers/base', function() {
  it('should instantiate reader', function() {
    this.reader = new BaseReader();
  });

  it('should emit `start`', function(done) {
    this.reader.start().on('start', done);
  });

  it('should emit `stop`', function(done) {
    this.reader.stop().on('stop', done);
  });

  it('should emit `add`', function(done) {
    this.reader.add({foo: 'bar'}).on('add', function(doc) {
      expect(doc).to.deep.equal({foo: 'bar'});
      done();
    });
  });

  it('should emit `remove`', function(done) {
    this.reader.remove({bar: 'baz'}).on('remove', function(doc) {
      expect(doc).to.deep.equal({bar: 'baz'});
      done();
    });
  });
});
