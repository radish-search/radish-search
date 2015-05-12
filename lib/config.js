var fs = require('fs');
var conf = require('rc')('radish', require('../config/defaults.json'));

// Expand nested index options
for (var i in conf.indexes) {
  for (var c in conf.indexes[i]) {
    if (/\./.test(c)) {
      var k = c.split('.');
      conf.indexes[i][k[0]] = conf.indexes[i][k[0]] || {};
      conf.indexes[i][k[0]][k[1]] = conf.indexes[i][c];
      delete conf.indexes[i][c];
    }
  }
}

module.exports = conf;
