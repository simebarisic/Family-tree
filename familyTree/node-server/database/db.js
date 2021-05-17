var mysql = require('mysql')
var db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'fesb',
  database: 'familytree_db',
  multipleStatements: true

})

module.exports = db