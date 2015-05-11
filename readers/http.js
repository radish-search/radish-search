var BaseReader = require('./base')
var utils = require('../lib/utils');
var http = require('http');

var HttpReader = function(config) {
  config = config || {};
  this.hostname = config.hostname || 'localhost';
  this.port = config.port || 6378;
  this.namespace = config.namespace || 'radish';
  this.secret = config.secret;
}

utils.inherits(HttpReader, BaseReader);

HttpReader.prototype.start = function() {
  var _this = this;
  if (!this.http) {
    this.http = http.createServer(function(req, res) {
      // Verify secret key
      // TODO: Change this to a Basic WWW-Authentication
      if (_this.secret && req.headers.secret && _this.secret !== req.headers.secret) {
        res.statusCode = 401;
        return res.end('Secret key is required');
      }

      if (new RegExp('^/' + _this.namespace + '/').test(req.url)) {
        // Resource URL (e.g. PUT|DELETE http://localhost:6378/radish/1)
        switch (req.method) {
          case 'PUT':
            parseBody(req, function(err, doc) {
              if (err) return _this.emit.call(_this, 'error', err);
              _this.emit.call(_this, 'add', doc);
            });
            return res.end('OK');
          case 'DELETE':
            parseBody(req, function(err, doc) {
              if (err) return _this.emit.call(_this, 'error', err);
              _this.emit.call(_this, 'remove', doc);
            });
            return res.end('OK');
          default:
            res.statusCode = 405;
            return res.end('Method Not Allowed');
        }
      } else if (new RegExp('^/' + _this.namespace + '$').test(req.url)) {
        // Index URL (e.g. HEAD|GET http://localhost:6378/radish)
        switch (req.method) {
          case 'HEAD':
          case 'GET':
            res.statusCode = 200;
            return res.end('OK');
          default:
            res.statusCode = 405;
            return res.end('Method Not Allowed');
        }
      } else {
        // Incorrect URL
        res.statusCode = 404;
        return res.end('Not Found');
      }
    });
  }
  this.http.listen(this.port, this.hostname, function() {
    utils.log('Radish is now listening on port ' + _this.port);
    _this.emit.call(_this, 'start');
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
    var _this = this;
    process.nextTick(function() {
      _this.emit.call(_this, 'stop');
    });
  }
  return this;
}

module.exports = HttpReader;
