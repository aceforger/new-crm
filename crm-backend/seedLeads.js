const mysql = require("mysql2/promise");
require("dotenv").config();

const leads = [
  { name: "James Wilson", phone: "555-0101", email: "james@email.com" },
  { name: "Maria Garcia", phone: "555-0102", email: "maria@email.com" },
  { name: "Robert Chen", phone: "555-0103", email: "robert@email.com" },
  { name: "Sarah Johnson", phone: "555-0104", email: "sarah@email.com" },
  { name: "David Kim", phone: "555-0105", email: "david@email.com" },
  { name: "Lisa Brown", phone: "555-0106", email: "lisa@email.com" },
  { name: "Michael Davis", phone: "555-0107", email: "michael@email.com" },
  { name: "Emily White", phone: "555-0108", email: "emily@email.com" },
  { name: "Tom Harris", phone: "555-0109", email: "tom@email.com" },
  { name: "Anna Martinez", phone: "555-0110", email: "anna@email.com" },
  { name: "Chris Taylor", phone: "555-0111", email: "chris@email.com" },
  { name: "Nina Patel", phone: "555-0112", email: "nina@email.com" },
  { name: "Steve Anderson", phone: "555-0113", email: "steve@email.com" },
  { name: "Kelly Thomas", phone: "555-0114", email: "kelly@email.com" },
  { name: "Ryan Jackson", phone: "555-0115", email: "ryan@email.com" },
  { name: "Diana Lee", phone: "555-0116", email: "diana@email.com" },
  { name: "Kevin Robinson", phone: "555-0117", email: "kevin@email.com" },
  { name: "Sandra Clark", phone: "555-0118", email: "sandra@email.com" },
  { name: "Paul Rodriguez", phone: "555-0119", email: "paul@email.com" },
  { name: "Michelle Lewis", phone: "555-0120", email: "michelle@email.com" },
  { name: "Brian Walker", phone: "555-0121", email: "brian@email.com" },
  { name: "Amanda Hall", phone: "555-0122", email: "amanda@email.com" },
  { name: "Jason Young", phone: "555-0123", email: "jason@email.com" },
  { name: "Rachel Allen", phone: "555-0124", email: "rachel@email.com" },
  { name: "Mark King", phone: "555-0125", email: "mark@email.com" },
];

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  for (const lead of leads) {
    await connection.execute(
      "INSERT INTO leads (name, phone, email) VALUES (?, ?, ?)",
      [lead.name, lead.phone, lead.email],
    );
  }

  console.log(`${leads.length} leads inserted`);
  await connection.end();
}

seed();
