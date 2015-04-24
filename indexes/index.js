var Index = function(redis, options) {
  this.redis = redis;
  this.idAttribute = options.idAttribute;
  this.prefix = (options.prefix + ':') || 'index:';
  this.sorted = !!options.sorted;
}

// Index document
Index.prototype.add = function(doc, callback) {
  if (!doc.hasOwnProperty(this.idAttribute)) {
    return callback(new Error('Document does not contain attribute ' + this.idAttribute));
  }
  var _this = this;
  var id = doc[this.idAttribute];
  var key = this.prefix + id;
  var cmd = this.sorted ? 'ZADD' : 'SADD';
  this.remove(doc, function(err) {
    if (err) return callback(err);
    _this.redis[cmd](key, id, callback);
  });
}

// Iterate through all sets, finding members that contain `id`, then running `SREM #{set} #{id}`
Index.prototype.remove = function(doc, callback) {
  var _this = this;
  var id = 'string' === typeof doc ? doc : doc[this.idAttribute];
  var prefix = this.prefix;
  var cmd = this.sorted ? 'ZREM' : 'SREM';
  var cursor = 0;
  var _remove = function(cb) {
    _this.redis.SCAN(cursor, 'MATCH', prefix + '*', function(err, reply) {
      if (err) return callback(err);
      cursor = reply[0];
      var keys = reply[1] || [null];
      var remaining = keys.length;
      if (!remaining) return callback(null, 'OK');
      keys.forEach(function(key) {
        _this.redis[cmd](key, id, function(err, reply) {
          if (err) return cb(err);
          if (--remaining === 0) {
            if (cursor == 0) {
              cb(null, 'OK');
            } else {
              process.nextTick(function() {
                _remove(cb);
              });
            }
          }
        });
      });
    });
  };
  _remove(callback);
}

// Get documents matching a key
Index.prototype.get = function(key, callback) {
  key = this.prefix + key;
  var cmd = this.sorted ? 'ZRANGE' : 'SMEMBERS';
  var args = [key];
  if (this.sorted) {
    args.push(0);
    args.push(-1);
  }
  this.redis[cmd](args, callback);
}

Index.prototype.search = function() {
  throw new Error('Search not implemented for this index type');
}

module.exports = Index;
