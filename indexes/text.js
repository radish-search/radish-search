var KeyIndex = require('./key');
var utils = require('../lib/utils');
var stemmer = require('natural').PorterStemmer;

var TextIndex = function(redis, options) {
  this.redis = redis;
  this.idAttribute = options.idAttribute;
  this.fields = options.fields;
  this.prefix = (options.prefix + ':') || 'text:';
  this.minWordLength = options.minWordLength || 3;
  this.sorted = true;
  this.cache = options.cache || 3600;
}

utils.inherits(TextIndex, KeyIndex);

TextIndex.prototype.add = function(obj, callback) {
  if (!obj.hasOwnProperty(this.idAttribute)) {
    return callback(new Error('Document does not contain attribute ' + this.idAttribute));
  }

  var _this = this;
  var doc = utils.flatten(obj);

  // Get all words to index
  var words = [];
  this.fields.forEach(function(field) {
    _getWords(doc, field).forEach(function(word) {
      if (word.length >= _this.minWordLength && words.indexOf(word) === -1) {
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

TextIndex.prototype.search = function(patterns, callback) {
  if (Array.isArray(patterns)) {
    patterns = patterns.join(' ');
  }
  patterns = stemmer.tokenizeAndStem(patterns);
  KeyIndex.prototype.search.call(this, patterns, callback);
}

// Tokenize and stem words and return in an array
var _getWords = function(doc, field) {
  if (doc.hasOwnProperty(field)) {
    return stemmer.tokenizeAndStem(doc[field]);
  }
  return [];
}

module.exports = TextIndex;
