var fs = require('fs');
var path = require('path');

var indexers = {};
fs.readdirSync(__dirname).forEach(function(indexer) {
  var key = path.basename(indexer, path.extname(indexer));
  if (key === 'index') return;
  key = key[0].toUpperCase() + key.substr(1) + 'Indexer';
  indexers[key] = require(path.join(__dirname, indexer));
});

module.exports = indexers;
