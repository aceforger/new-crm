// const mysql = require("mysql2/promise");
// require("dotenv").config();

// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   timezone: "+08:00", // Philippines timezone
// });

// module.exports = pool;

const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 3,
  connectTimeout: 30000,
  idleTimeout: 20000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 5000,
  timezone: "+08:00",
});

pool.on("connection", (connection) => {
  console.log("MySQL connection established");
});

pool.on("error", (err) => {
  console.error("MySQL pool error:", err.code, err.message);
});

module.exports = pool;
