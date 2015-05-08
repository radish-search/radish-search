module.exports = require('util');

// Flatten object recursively
var flatten = module.exports.flatten = function(obj, prefix, addFn) {
  obj = obj || {}
  prefix = prefix || '';
  addFn = addFn || function(k, v, o) { return o[k] = v; };

  var result = {};
  var keys = Object.keys(obj);

  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];

    if (Array.isArray(obj[key])) {
      obj[key].forEach(function(o, i) {
        if (typeof o === 'object') {
          flatten(o, prefix + key + '.' + i + '.', addFn);
        } else {
          addFn(prefix + key + '.' + i, o, result);
        }
      });
    } else if (obj[key] === Object(obj[key]) && (!obj[key].constructor || 'Object' == obj[key].constructor.name) && (!obj[key].type || obj[key].type.type)) {
      if (Object.keys(obj[key]).length) {
        var attrs = flatten(obj[key], prefix + key + '.', addFn);
        var attrKeys = Object.keys(attrs);
        for (var j = 0; j < attrKeys.length; ++j) {
          var attrKey = attrKeys[j];
          result[attrKey] = attrs[attrKey];
        }
      } else {
        addFn(prefix + key, obj[key], result);
      }
    } else {
      addFn(prefix + key, obj[key], result);
    }
  }
  return result;
}
