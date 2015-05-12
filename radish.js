var Redis = require('./lib/redis');
var Index = require('./lib/index');

// Return a new connection to Redis
module.exports = function(config) {
  return new Redis(config);
}

// Load all indexers and readers
var indexers = require('./indexers');
var readers = require('./readers');

for (var i in indexers) { module.exports[i] = indexers[i]; }
for (var r in readers) { module.exports[r] = readers[r]; }

// Allow plugin-loading
var plugins = require('./lib/plugins');
module.exports.loadPlugin = function(plugin) {
  plugins.loadPlugin.call(this, plugin);
}

module.exports.Redis = Redis;
module.exports.Index = Index;
