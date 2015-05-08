var EventEmitter = require('events').EventEmitter;
var utils = require('../lib/utils');

var BaseReader = function() {}

utils.inherits(BaseReader, EventEmitter);

BaseReader.prototype.start = function() {
  throw new Error('Reader needs to implement `#start()`');
}

BaseReader.prototype.stop = function() {
  throw new Error('Reader needs to implement `#stop()`');
}

module.exports = BaseReader;
