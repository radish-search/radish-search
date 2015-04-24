var redis = require('redis');

module.exports = function(config) {
  config = config || {};
  var port = config.port || 6379;
  var host = config.host || 'localhost';
  var options = config.options || {};

  // Set authentication options
  if (config.hasOwnProperty('password')) {
    options.auth_pass = config.password;
  }
  redis.debug_mode = !!config.debug;
  // Create connection
  var conn = redis.createClient(port, host, options);

  // Select database
  if (config.hasOwnProperty('db')) {
    conn.once('ready', function() {
      conn.select(config.db, function(err, reply) {
        if (err) return conn.emit('error', err);
        conn.emit('connected', config.db);
      });
    });
  } else {
    process.nextTick(function() {
      conn.emit('connected', 0);
    });
  }
  return conn;
}
