var config = require('./lib/config');
var Redis = require('./lib/redis');

module.exports = function(options) {
  options = options || {};
  return new Redis(options.redis || config.get('redis'));
}

module.exports.Redis = Redis;
module.exports.Index = require('./lib/index');

var indexers = require('./indexers');
var readers = require('./readers');

for (var i in indexers) { module.exports[i] = indexers[i]; }
for (var r in readers) { module.exports[r] = readers[r]; }
