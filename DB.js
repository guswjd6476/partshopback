
// const mysql = require("mysql");
// let connection = mysql.createConnection({
//     host     : '127.0.0.1', //실제로 연결할 데이터베이스의 위치
//     user     : 'partshop',
//     password : 'tech7975',
//     database : 'partshop', //데이터베이스 이름
//     connectionLimit: 500,
//   waitForConnections: true,
//   dateStrings: 'date'
//   });
  
  
//     connection.connect();
  
//     module.exports = connection;


const mysql = require("mysql");
let connection = mysql.createConnection({
    host     : 'my8002.gabiadb.com', //실제로 연결할 데이터베이스의 위치
    user     : 'guswjd6476',
    password : 'rkdguswjd--11',
    database : 'hyuny' //데이터베이스 이름
  });
  
  
    // connection.connect();
  
    module.exports = connection;

    connection.connect(function(err) {
      if (err) {
        console.error('error connecting: ' + err.stack);
        return;
      }
    
      console.log('connected as id ' + connection.threadId);
    });