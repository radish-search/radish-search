var BaseReader = require('./base')
var utils = require('../lib/utils');
var http = require('http');

var HttpReader = function(config) {
  config = config || {};
  this.hostname = config.hostname || 'localhost';
  this.port = config.port || 6378;
  this.secret = config.secret;
  this.index = config.index;
}

utils.inherits(HttpReader, BaseReader);

HttpReader.prototype.start = function() {
  var _this = this;
  if (!this.http) {
    this.http = http.createServer(function(req, res) {
      // Verify correct URL
      if (!(new RegExp('^/' + _this.index + '/')).test(req.url)) {
        res.statusCode = 404;
        return res.end('Not Found');
      }

      // Verify secret key
      // TODO: Change this to a Basic WWW-Authentication
      if (_this.secret && req.headers.secret && _this.secret !== req.headers.secret) {
        res.statusCode = 401;
        return res.end('Secret key is required');
      }

      switch (req.method) {
        case 'PUT':
          parseBody(req, function(err, doc) {
            if (err) return _this.emit('error', err);
            _this.emit('add', doc);
          });
          break;
        case 'DELETE':
          parseBody(req, function(err, doc) {
            if (err) return _this.emit('error', err);
            _this.emit('remove', doc);
          });
          break;
        case 'GET':
        case 'POST':
        default:
          res.statusCode = 405;
          return res.end('Method Not Allowed');
      }
      res.end('OK');
    });
  }
  this.http.listen(this.port, this.hostname, function() {
    utils.log('Radish is now listening on port ' + _this.port);
    _this.emit('start');
  });
  return this;
}

var parseBody = function(req, callback) {
  var data = '';
  req.on('data', function(chunk) {
    data += chunk;
  }).on('end', function() {
    try {
      data = JSON.parse(data);
      callback(null, data);
    } catch (err) {
      callback(err);
    }
  }).on('error', callback);
}

HttpReader.prototype.stop = function() {
  if (this.http) {
    this.http.close();
    this.emit('stop');
  }
  return this;
}

module.exports = HttpReader;
