const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.USER,
    database: process.env.DB,
    password: process.env.PASSWORD
});

const promisePool = pool.promise();

module.exports = promisePool;