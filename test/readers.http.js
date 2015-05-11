var expect = require('chai').expect;
var http = require('http');
var querystring = require('querystring')
var HttpReader = require('../readers/http');

describe('readers/http', function() {
  var res = function(statusCode, body, done) {
    return function(res) {
      expect(res).to.be.ok;
      expect(res.statusCode).to.equal(statusCode);
      var response = '';
      res.on('data', function(chunk) {
        response += chunk;
      }).once('end', function() {
        res.removeAllListeners();
        expect(response).to.equal(body);
        if (done) done();
      })
      if (done) res.once('error', done);
    }
  }

  it('should start listening to HTTP requests', function(done) {
    this.reader = new HttpReader();
    this.reader.start().once('start', done);
  });

  it('should respond to HTTP requests', function(done) {
    var req = http.request({host: 'localhost', port: 6378, path: '/radish', method: 'HEAD'}, res(200, '', done));
    req.once('error', done);
    req.end();
  });

  it('should respond to GET with 200 code', function(done) {
    var req = http.request({host: 'localhost', port: 6378, path: '/radish', method: 'GET'}, res(200, 'OK', done));
    req.once('error', done);
    req.end();
  });

  it('should respond to GET with 405 error', function(done) {
    var req = http.request({host: 'localhost', port: 6378, path: '/radish/1', method: 'GET'}, res(405, 'Method Not Allowed', done));
    req.once('error', done);
    req.end();
  });

  it('should respond to POST with 405 error', function(done) {
    var req = http.request({host: 'localhost', port: 6378, path: '/radish/1', method: 'POST'}, res(405, 'Method Not Allowed', done));
    req.once('error', done);
    req.end();
  });

  it('should listen to new documents to index', function(done) {
    this.reader.once('error', done).once('add', function(doc) {
      expect(doc).to.deep.equal({"id": 1, "foo": "bar"});
      done();
    });
    var req = http.request({host: 'localhost', port: 6378, path: '/radish/1', method: 'PUT'}, res(200, 'OK'));
    req.write('{"id": 1, "foo": "bar"}');
    req.once('error', done);
    req.end();
  });

  it('should listen to documents to remove', function(done) {
    this.reader.once('error', done).once('remove', function(doc) {
      expect(doc).to.deep.equal({"id": 1, "foo": "bar"});
      done();
    });
    var req = http.request({host: 'localhost', port: 6378, path: '/radish/1', method: 'DELETE'}, res(200, 'OK'));
    req.write('{"id": 1, "foo": "bar"}');
    req.once('error', done);
    req.end();
  });

  it('should stop listening', function(done) {
    this.reader.stop();
    var req = http.request({host: 'localhost', port: 6378, path: '/radish', method: 'HEAD'}, function(res) {
      done(new Error('Radish is still listening for HTTP requests'));
    });
    req.once('error', function(err) {
      expect(err).to.be.an.instanceof(Error);
      expect(err.code).to.equal('ECONNREFUSED');
      done();
    });
    req.end();
  });
});
