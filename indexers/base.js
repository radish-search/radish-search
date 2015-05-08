var BaseIndexer = function(redis, options) {
  this.redis = redis;
  this.idAttribute = options.idAttribute;
  this.key = options.idAttribute;
  this.prefix = options.prefix ? (options.prefix + ':') : 'index:';
  this.sorted = !!options.sorted;
  this.cache = options.cache || 3600;
}

// Index document
BaseIndexer.prototype.add = function(doc, callback) {
  if (!doc.hasOwnProperty(this.idAttribute)) {
    return callback(new Error('Document does not contain attribute ' + this.idAttribute));
  }
  if (!doc.hasOwnProperty(this.key)) {
    return callback(new Error('Document does not contain key ' + this.key));
  }
  var _this = this;
  var id = doc[this.idAttribute];
  var key = this.prefix + doc[this.key];
  var cmd = !!this.sorted ? 'ZADD' : 'SADD';
  this.remove(doc, function(err) {
    if (err) return callback(err);
    if (_this.sorted) {
      _this.redis.ZADD(key, 0, id, callback);
    } else {
      _this.redis.SADD(key, id, callback);
    }
  });
}

// Iterate through all sets, finding members that contain `id`, then running `SREM #{set} #{id}`
BaseIndexer.prototype.remove = function(doc, callback) {
  var _this = this;
  var id = 'string' === typeof doc ? doc : doc[this.idAttribute];
  var prefix = this.prefix;
  var cmd = this.sorted ? 'ZREM' : 'SREM';
  var cursor = 0;
  var _remove = function(cb) {
    _this.redis.SCAN(cursor, 'MATCH', prefix + '*', function(err, reply) {
      if (err) return cb(err);
      cursor = reply[0];
      var keys = reply[1] || [];
      var remaining = keys.length;
      if (!remaining) return _next(cursor, cb);
      keys.forEach(function(key) {
        _this.redis[cmd](key, id, function(err, reply) {
          if (err) return cb(err);
          if (--remaining === 0) {
            _next(cursor, cb);
          }
        });
      });
    });
  };
  var _next = function(cursor, cb) {
    if (cursor == 0) {
      cb(null, 'OK');
    } else {
      process.nextTick(function() {
        _remove(cb);
      });
    }
  }
  _remove(callback);
}

// Get documents matching a key
BaseIndexer.prototype.get = function(key, callback) {
  key = this.prefix + key;
  var cmd = this.sorted ? 'ZRANGE' : 'SMEMBERS';
  var args = [key];
  if (this.sorted) {
    args.push(0);
    args.push(-1);
  }
  this.redis[cmd](args, callback);
}

// Find documents matching keys using patterns
BaseIndexer.prototype.match = function(pattern, callback) {
  var key = this.prefix + pattern;
  var cursor = 0;
  var _this = this;
  var keys = [];
  var _match = function(cb) {
    // Get a list of all keys matching the pattern
    _this.redis.SCAN(cursor, 'MATCH', key, function(err, reply) {
      if (err) return cb(err);
      cursor = reply[0];
      keys = keys.concat(reply[1] || []);
      if (cursor == 0) {
        cb(null, keys);
      } else {
        process.nextTick(function() {
          _match(cb);
        });
      }
    });
  }
  _match(function(err, keys) {
    if (err) return callback(err);
    var destination = 'match:' + pattern;
    // Determine the union of all matching keys and cache it
    var cmd = !!_this.sorted ? 'ZUNIONSTORE' : 'SUNIONSTORE';
    _this.redis[cmd]([_this.prefix + destination, keys.length].concat(keys), function(err, count) {
      //~ _this.redis.EXPIRE(_this.prefix + destination, _this.cache);
      if (err) return callback(err);
      var result = { count: count };
      _this.get(destination, function(err, data) {
        if (err) return callback(err);
        // TODO: Decide whether to delete the destination or keep it for cache
        _this.redis.DEL(_this.prefix + destination);
        result.results = data;
        callback(null, result);
      });
    });
  });
}

BaseIndexer.prototype.search = function() {
  throw new Error('Search not implemented for this index type');
}

module.exports = BaseIndexer;
