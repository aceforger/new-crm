const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");
require("dotenv").config();

async function hashAdminPassword() {
  const hashed = await bcrypt.hash("admin123", 10);
  console.log("Hashed password:", hashed);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await connection.execute("UPDATE users SET password = ? WHERE email = ?", [
    hashed,
    "admin@crm.com",
  ]);

  console.log("Admin password updated");
  await connection.end();
}

hashAdminPassword();
