var expect = require('chai').expect;
var utils = require('../lib/utils');

describe('lib/utils', function() {
  describe('#flatten', function() {
    it('should flatten a nested object', function() {
      var nested = {
        foo: 'bar',
        more: {
          like: 'this'
        },
        list: ['foo', 'bar', 'baz']
      };
      var flat = utils.flatten(nested);
      expect(flat).to.have.keys(['foo', 'more.like', 'list.0', 'list.1', 'list.2']);
      expect(flat.foo).to.equal('bar');
      expect(flat['more.like']).to.equal('this');
      expect(flat['list.0']).to.equal('foo');
      expect(flat['list.1']).to.equal('bar');
      expect(flat['list.2']).to.equal('baz');
    });
  });
});
