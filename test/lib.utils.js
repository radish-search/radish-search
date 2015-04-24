var expect = require('chai').expect;
var utils = require('../lib/utils');

describe('lib/utils', function() {
  describe('#flatten', function() {
    it('should flatten a nested object', function() {
      var nested = {
        foo: 'bar',
        more: {
          like: 'this'
        }
      };
      var flat = utils.flatten(nested);
      expect(flat).to.have.keys(['foo', 'more.like']);
      expect(flat.foo).to.equal('bar');
      expect(flat['more.like']).to.equal('this');
    });
  });
});
