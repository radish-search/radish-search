var BaseReader = require('./base')
var utils = require('../lib/utils');
var MongoDB = require('mongodb');

var MongoReader = function(config) {
  config = config || {};
  this.dbName = config.db;
  this.dbHost = config.host || 'localhost';
  this.dbPort = config.port || 27017;
}

utils.inherits(MongoReader, BaseReader);

// Listen to changes in the database
MongoReader.prototype.start = function() {
  if (this._stream) {
    this._stream.resume();
  } else {
    var _this = this;
    this.connect(function(err) {
      if (err) return _this.emit.call(_this, 'error', err);
      _this.getCursor(function(err) {
        if (err) return _this.emit.call(_this, 'error', err);
        _this.stream().resume();
        _this.emit.call(_this, 'start');
      });
    });
  }
  return this;
}

// Stop streaming data
MongoReader.prototype.stop = function() {
  if (this._stream) {
    this._stream.pause();
    var _this = this;
    process.nextTick(function() {
      _this.emit.call(_this, 'stop');
    });
  }
  return this;
}

// Connect to database
MongoReader.prototype.connect = function(callback) {
  if (!this.dbName) return callback(new Error('Need database name to listen to'));
  var _this = this;
  var url = 'mongodb://' + this.dbHost + ':' + this.dbPort + '/local?authSource=' + this.dbName;
  MongoDB.MongoClient.connect(url, function(err, db) {
    if (err) return callback.call(_this, err);
    _this.db = db;
    db.collection('oplog.rs', function(err, oplog) {
      if (err) return callback.call(_this, err);
      _this.oplog = oplog;
      callback.call(_this, null, oplog);
    });
  });
  return this;
}

// Get a cursor to the latest read operation
// TODO: Find the first timestamp that has not yet been read
MongoReader.prototype.getCursor = function(callback) {
  var _this = this;
  this.oplog.find({}, {ts: 1}).sort({$natural: -1}).limit(1).toArray(function(err, data) {
    if (err) return callback.call(_this, err);
    _this.lastOplogTime = data[0].ts;
    var queryForTime;

    // If there isn't one found, get one from the local clock
    if (_this.lastOplogTime) {
      queryForTime = { $gt: _this.lastOplogTime };
    } else {
      tstamp = new MongoDB.Timestamp(0, Math.floor(new Date().getTime() / 1000));
      queryForTime = { $gt: tstamp };
    }

    // Create a cursor for tailing and set it to await data
    _this.cursor = _this.oplog.find({ts: queryForTime}, {
      tailable: true,
      awaitdata: true,
      oplogReplay: true,
      numberOfRetries: 1
    });

    callback.call(_this, null, _this.cursor);
  });
  return this;
}

// Wrap that cursor in a Node Stream and start streaming
MongoReader.prototype.stream = function() {
  var _this = this;
  var stream = this._stream = this.cursor.stream();

  stream.on('data', function(data) {
    switch (data.op) {
      case 'i':
        _this.add(data.o);
        break;
      case 'u':
        var db = data.ns.split('.');
        var collection = db[1];
        db = db[0];
        _this.db.db(db).collection(collection).findOne(data.o2, function(err, doc) {
          _this.add(doc);
        });
        break;
      case 'd':
        _this.remove(data.o);
        break;
    }
  }).on('close', function() {
    _this.emit.call(_this, 'error', new Error('Connection to MongoDB closed'));
  }).on('end', function() {
    _this.emit.call(_this, 'error', new Error('Connection to MongoDB ended'));
  }).on('error', function() {
    _this.emit.call(_this, 'error', err);
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
