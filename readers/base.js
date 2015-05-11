var EventEmitter = require('events').EventEmitter;
var utils = require('../lib/utils');

var BaseReader = function() {}

utils.inherits(BaseReader, EventEmitter);

BaseReader.prototype.start = function() {
  var _this = this;
  process.nextTick(function() {
    _this.emit.call(_this, 'start');
  });
  return this;
}

BaseReader.prototype.stop = function() {
  var _this = this;
  process.nextTick(function() {
    _this.emit.call(_this, 'stop');
  });
  return this;
}

BaseReader.prototype.add = function(doc) {
  var _this = this;
  process.nextTick(function() {
    _this.emit.call(_this, 'add', doc);
  });
  return this;
}

BaseReader.prototype.remove = function(doc) {
  var _this = this;
  process.nextTick(function() {
    _this.emit.call(_this, 'remove', doc);
  });
  return this;
}

module.exports = BaseReader;
