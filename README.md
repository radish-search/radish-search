Radish Search
=============

Radish is an indexing engine that uses [Redis](http://redis.io/) as its backend
index store, allowing for fast in-memory reads with periodic flushing to a disk
for persistence.

It provides a plugin architecture with multiple readers and indexers, used to
create custom indexing strategies. A _reader_ is a plugin that reads a data
source and makes the index aware of it. An _indexer_ is a plugin that takes the
data and applies a specific indexing algorithm to it, storing the result in
Redis.

Radish is written in [node.js](https://nodejs.org/).

Usage
-----
There are two ways of using Radish: as a daemon, or as a module.

To use it as a daemon, you will typically want to install and run it in a
dedicated server with Redis running alongside it. This is the default way of
using Radish. It allows you to set up readers that passively monitor your data
source, indexing it based on your configured strategies. You will typically
search through the index using HTTP requests.

To use it as a module, `require('radish-search')` in your node.js application.
In addition to defining indexing strategies through a configuration file, you
can create them in your code by defining your own Readers and Indexers. Use as
a module if you intend to modify the core behavior of Radish, or do things that
plugins cannot do.

Configuration
-------------
When used as a daemon, Radish uses the [rc](https://github.com/dominictarr/rc)
module for managing configuration files.

The main things to configure are the Redis database to which Radish connects,
and the indexing strategies to use. Each indexing strategy is configured under
its own section, following the convention `[indexes.<index_name>]`, and adding
_reader_ and _indexer_ configuration options within that index section.

Please read the [rc standards](https://github.com/dominictarr/rc#standards) for
information on file naming conventions and directories. A good place to put it
is in `/etc/radishrc`.

```
[redis]
# Redis configuration
host = localhost
port = 6379
db = 0

[indexes.fts]
# MongoDB full-text indexing
reader.type = mongo
reader.host = localhost
reader.port = 27017
reader.db = radish-test
indexer.type = text
indexer.idAttribute = _id
indexer.fields[] = title
indexer.fields[] = body
```

When using Radish as a module, the only configuration necessary is the Redis
connection parameters, which is passed directly to the module export:

```javascript
var radish = require('radish-search')({host: 'localhost', port: 6379, db: 0});
```

All the indexing strategies are done in code by creating instances of the
appropriate `Reader` and `Indexer` classes.

Plugins
-------
Radish provides a plugin architecture so that new Readers and Indexers can be
added. When running as a daemon, including plugins is as easy as running `npm
install <plugin-name>` from within the Radish directory. Radish will pick it up
and load it next time the Radish daemon is started. When running as a module,
you can manually call plugins by calling `radish.loadPlugin(<plugin>);`. The
`loadPlugin` function can take a path, module name, loaded module, or custom
object that defines the behavior of the plugin.

To do
-----
* Expose `get`, `search`, `match` functions for each index.
