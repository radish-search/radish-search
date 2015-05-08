var fs = require('fs');
var path = require('path');

var readers = {};
fs.readdirSync(__dirname).forEach(function(reader) {
  var key = path.basename(reader, path.extname(reader));
  if (key === 'index') return;
  key = key[0].toUpperCase() + key.substr(1) + 'Reader';
  readers[key] = require(path.join(__dirname, reader));
});

module.exports = readers;
