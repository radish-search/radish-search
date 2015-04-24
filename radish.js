var config = require('./lib/config');
var Redis = require('./lib/redis');
var Mongo = require('./readers/mongo');

module.exports = function(options) {
  options = options || {};
  return new Redis(options.redis || config.get('redis'));
}

module.exports.Redis = Redis;

module.exports.readers = {
  Mongo: Mongo
}

module.exports.indexes = {
  Index: require('./indexes/index'),
  KeyIndex: require('./indexes/key'),
  TextIndex: require('./indexes/text')
}
