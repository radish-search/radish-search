var Index = require('./index');
var utils = require('../lib/utils');

var KeyIndex = function(redis, options) {
  this.redis = redis;
  this.idAttribute = options.idAttribute;
  this.key = options.key;
  this.prefix = (options.prefix + ':') || ('key:' + this.key + ':');
  this.sorted = true;
  this.cache = options.cache || 3600;
}

utils.inherits(KeyIndex, Index);

// TODO: Allow for nested fields
KeyIndex.prototype.add = function(obj, callback) {
  if (!obj.hasOwnProperty(this.idAttribute)) {
    return callback(new Error('Document does not contain attribute ' + this.idAttribute));
  }
  var doc = utils.flatten(obj);
  if (!doc.hasOwnProperty(this.key)) {
    return callback(new Error('Document does not contain key ' + this.key));
  }
  var _this = this;
  var id = doc[this.idAttribute];
  var key = this.prefix + doc[this.key];
  this.remove(doc, function(err) {
    if (err) return callback(err);
    _this.redis.ZADD(key, 0, id, callback);
  });
}

// Search for documents using indexed key patterns
KeyIndex.prototype.search = function(patterns, callback) {
  if (!Array.isArray(patterns)) {
    patterns = patterns.split(' ');
  }
  var _this = this;
  var result = {};
  var keys = [];
  var remaining = patterns.length;
  patterns.forEach(function(pattern) {
    var destination = 'search:' + pattern;
    // TODO: Use `destination` to reuse cached queries
    // Get a list of all keys matching the pattern
    _this.redis.SCAN(0, 'MATCH', _this.prefix + pattern, function(err, reply) {
      if (err) return callback(err);
      keys = keys.concat(reply[1]);
      if (--remaining === 0) {
        // Determine the union of all matching keys and cache it
        _this.redis.ZUNIONSTORE([_this.prefix + destination, keys.length].concat(keys), function(err, count) {
          //~ _this.redis.EXPIRE(_this.prefix + destination, _this.cache);
          if (err) return callback(err);
          result.count = count;
          // Fetch all the documents from the cache
          _this.get(destination, function(err, data) {
            if (err) return callback(err);
            // TODO: Decide whether to delete the destination or keep it for cache
            _this.redis.DEL(_this.prefix + destination);
            result.results = data;
            callback(null, result);
          });
        });
      }
    });
  });
}

module.exports = KeyIndex;
