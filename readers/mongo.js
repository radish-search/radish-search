var EventEmitter = require('events').EventEmitter;
var utils = require('../lib/utils');
var MongoDB = require('mongodb');

var MongoReader = function(config) {
  config = config || {};
  this.dbName = config.db;
  this.dbHost = config.host || 'localhost';
  this.dbPort = config.port || 27017;
}

utils.inherits(MongoReader, EventEmitter);

// Listen to changes in the database
MongoReader.prototype.listen = function() {
  var _this = this;
  _this.connect().on('connected', function() {
    _this.cursor().on('cursor', function() {
      _this.stream().resume();
    });
  });
  return this;
}

// Connect to database
MongoReader.prototype.connect = function() {
  if (!this.dbName) return this.emit('error', new Error('Need database name to listen to'));
  var _this = this;
  var url = 'mongodb://' + this.dbHost + ':' + this.dbPort + '/local?authSource=' + this.dbName;
  MongoDB.MongoClient.connect(url, function(err, db) {
    if (err) return _this.emit('error', err);
    db.collection('oplog.rs', function(err, oplog) {
      if (err) return _this.emit('error', err);
      _this.oplog = oplog;
      _this.emit('connected', oplog);
    });
  });
  return this;
}

// Get a cursor to the latest read operation
// TODO: Find the first timestamp that has not yet been read
MongoReader.prototype.cursor = function() {
  var _this = this;
  this.oplog.find({}, {ts: 1}).sort({$natural: -1}).limit(1).toArray(function(err, data) {
    if (err) return _this.emit('error', err);
    _this.lastOplogTime = data[0].ts;
    var queryForTime;

    // If there isn't one found, get one from the local clock
    if (_this.lastOplogTime) {
      queryForTime = { $gt: _this.lastOplogTime };
    } else {
      tstamp = new MongoDB.Timestamp(0, Math.floor(new Date().getTime() / 1000))
      queryForTime = { $gt: tstamp };
    }

    // Create a cursor for tailing and set it to await data
    _this.cursor = _this.oplog.find({ts: queryForTime}, {
      tailable: true,
      awaitdata: true,
      oplogReplay: true,
      numberOfRetries: 1
    });

    _this.emit('cursor', _this.cursor);
  });
  return this;
}

// MongoDB oplog operations
MongoReader._ops = {'i': 'insert', 'u': 'update', 'd': 'delete'};

// Wrap that cursor in a Node Stream and start streaming
MongoReader.prototype.stream = function() {
  var _this = this;
  var stream = this.cursor.stream()

  stream.on('data', function(data) {
    if (MongoReader._ops.hasOwnProperty(data.op)) {
      _this.emit('data', data);
      _this.emit(MongoReader._ops[data.op], data);
    }
  }).on('close', function() {
    _this.emit('error', new Error('Connection to MongoDB closed'));
  }).on('end', function() {
    _this.emit('error', new Error('Connection to MongoDB ended'));
  }).on('error', function() {
    _this.emit('error', err);
  });

  this._keepAlive();

  return stream;
}

// Reset retries as a keep-alive
MongoReader.prototype._keepAlive = function() {
  var _this = this;
  setTimeout(function() {
    _this.cursor.s.currentNumberOfRetries = 1;
    _this._keepAlive();
  }, _this.cursor.s.tailableRetryInterval - 1);
}

module.exports = MongoReader;
