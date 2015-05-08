var BaseIndexer = require('./base');
var utils = require('../lib/utils');

var KeyIndexer = function(redis, options) {
  this.redis = redis;
  this.idAttribute = options.idAttribute;
  this.key = options.key;
  this.prefix = options.prefix ? (options.prefix + ':') : ('key:' + this.key + ':');
  this.sorted = false;
  this.cache = options.cache || 3600;
}

utils.inherits(KeyIndexer, BaseIndexer);

// Index document
KeyIndexer.prototype.add = function(obj, callback) {
  var doc = utils.flatten(obj);
  BaseIndexer.prototype.add.call(this, doc, callback);
}

// Search for documents using indexed key patterns
KeyIndexer.prototype.search = function(patterns, callback) {
  if (!Array.isArray(patterns)) {
    patterns = patterns.replace(/\s+/g, ' ').split(' ');
  }
  var _this = this;
  var destination = 'search:' + patterns.join('-');
  patterns = patterns.map(function(pattern) {
    return _this.prefix + pattern;
  });
  var key = this.prefix + destination;
  var cmd = !!this.sorted ? 'ZUNIONSTORE' : 'SUNIONSTORE';
  this.redis[cmd]([key, patterns.length].concat(patterns), function(err, count) {
    //~ _this.redis.EXPIRE(_this.prefix + destination, _this.cache);
    if (err) return callback(err);
    var result = { count: count };
    _this.get(destination, function(err, data) {
      if (err) return callback(err);
      // TODO: Decide whether to delete the destination or keep it for cache
      _this.redis.DEL(key);
      result.results = data;
      callback(null, result);
    });
  });
}

module.exports = KeyIndexer;
