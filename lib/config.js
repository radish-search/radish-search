var fs = require('fs');
var nconf = require('nconf');

var env = process.env.NODE_ENV || 'development';

nconf.use('memory');
nconf.env().argv();

// Load from development-specific configuration file
var filepath = 'config/' + env + '.json';
if (fs.existsSync(filepath)) {
  nconf.file(filepath);
}

// Load from file passed into command-line (e.g. --config=/path/to/file.json)
var config = nconf.get('config');
if (config) {
  nconf.file(config);
}

nconf.defaults(require('../config/defaults.json'));

module.exports = nconf;
