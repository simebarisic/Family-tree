var syncmysql = require('sync-mysql')
var syncdb = new syncmysql({
  host: 'localhost',
  user: 'root',
  password: 'fesb',
  database: 'familytree_db',
})

module.exports = syncdb