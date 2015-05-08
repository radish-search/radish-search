var KeyIndexer = require('./key');
var utils = require('../lib/utils');
var stemmer = require('natural').PorterStemmer;

var TextIndexer = function(redis, options) {
  this.redis = redis;
  this.idAttribute = options.idAttribute;
  this.fields = options.fields;
  this.prefix = options.prefix ? (options.prefix + ':') : 'text:';
  this.minWordLength = options.minWordLength || 3;
  this.sorted = true;
  this.cache = options.cache || 3600;
}

utils.inherits(TextIndexer, KeyIndexer);

TextIndexer.prototype.add = function(obj, callback) {
  if (!obj.hasOwnProperty(this.idAttribute)) {
    return callback(new Error('Document does not contain attribute ' + this.idAttribute));
  }

  var _this = this;
  var doc = utils.flatten(obj);

  // Get all words to index
  var words = [];
  Object.keys(doc).forEach(function(field) {
    if (field === _this.idAttribute) return;
    if (/\./.test(field)) {
      var skip = true;
      var fieldName = '';
      field.split('.').forEach(function(f) {
        fieldName += f;
        if (_this.fields.indexOf(fieldName) !== -1) {
          skip = false;
        }
        fieldName += '.';
      });
      if (skip) return;
    } else if (_this.fields.indexOf(field) === -1) return;
    var w = _getWords(doc, field);
    w.forEach(function(word) {
      if (word && word.length >= _this.minWordLength && words.indexOf(word) === -1) {
        words.push(word);
      }
    });
  });

  // Add document ID to each word's set
  var id = doc[this.idAttribute];
  var remaining = words.length;
  var count = 0;
  this.remove(doc, function(err) {
    if (err) return callback(err);
    words.forEach(function(word) {
      var key = _this.prefix + word;
      _this.redis.ZADD(key, 0, id, function(err, reply) {
        if (err) return callback(err);
        count += reply;
        if (--remaining === 0) {
          callback(null, count);
        }
      });
    });
  });
}

TextIndexer.prototype.search = function(patterns, callback) {
  if (Array.isArray(patterns)) {
    patterns = patterns.join(' ');
  }
  patterns = stemmer.tokenizeAndStem(patterns);
  KeyIndexer.prototype.search.call(this, patterns, callback);
}

// Tokenize and stem words and return in an array
var _getWords = function(doc, field) {
  if (doc.hasOwnProperty(field)) {
    if (typeof doc[field] === 'string') {
      return stemmer.tokenizeAndStem(doc[field]);
    } else {
      return [doc[field]];
    }
  }
  return [];
}

module.exports = TextIndexer;
