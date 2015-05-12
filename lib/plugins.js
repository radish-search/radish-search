var fs = require('fs');
var path = require('path');

var plugins = module.exports = {};

plugins.loadPlugin = function(plugin) {
  if (plugins.isPlugin(plugin)) {
    if (typeof plugin === 'string') {
      plugin = require(plugin);
    }
    this[plugin.plugin] = this[plugin.plugin.toLowerCase()] = plugin(this);
  }
}

plugins.isPlugin = function(plugin) {
  if (typeof plugin === 'string') {
    try {
      return plugins.isPlugin(require(plugin));
    } catch (e) {
      return false;
    }
  }

  return plugin.radish === 2
}
