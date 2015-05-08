var config = require('./config');
var redis = require('./redis')(config.get('redis'));
var EventEmitter = require('events').EventEmitter;
var utils = require('./utils');

var Index = function(indexer, reader) {
  this.indexer = indexer;
  this.reader = reader;
}

utils.inherits(Index, EventEmitter);

Index.prototype.start = function() {
  var _this = this;

  // Start listening to the reader
  this.reader.on('start', function() {
    _this.emit('start');
  }).start();

  // Listen to events from the database
  this.reader.on('add', function(doc) {
    _this.indexer.add(doc, function(err) {
      if (err) _this.emit('error', err);
      else _this.emit('add', doc);
    });
  }).on('remove', function(doc) {
    _this.indexer.remove(doc._id, function(err) {
      if (err) _this.emit('error', err);
      else _this.emit('remove', doc);
    });
  });

  return this;
}

Index.prototype.stop = function() {
  var _this = this;
  this.reader.on('stop', function() {
    _this.emit('stop');
  }).stop();
  return this;
}

module.exports = Index;
