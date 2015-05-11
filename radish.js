var config = require('./lib/config');
var Redis = require('./lib/redis');
var Index = require('./lib/index');

module.exports = function(options) {
  options = options || {};
  return new Redis(options.redis || config.get('redis'));
}

var indexers = require('./indexers');
var readers = require('./readers');

for (var i in indexers) { module.exports[i] = indexers[i]; }
for (var r in readers) { module.exports[r] = readers[r]; }

var plugins = require('./lib/plugins');
module.exports.loadPlugin = function(plugin) {
  plugins.loadPlugin.call(this, plugin);
}

module.exports.Redis = Redis;
module.exports.Index = Index;
