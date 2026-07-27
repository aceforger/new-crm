const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");

const app = express();

// Middleware
// app.use(cors());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/agents", require("./routes/agents"));
app.use("/api/leads", require("./routes/leads"));
app.use("/api/upload", require("./routes/upload"));

app.use("/api/gemini", require("./routes/gemini"));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Test route
app.get("/", (req, res) => {
  res.json({ message: "CRM API is running" });
});

// TEMP - Test login (remove after)
app.post("/test-login", async (req, res) => {
  const bcrypt = require("bcrypt");
  const db = require("./db");
  const jwt = require("jsonwebtoken");

  const { email, password } = req.body;

  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

  if (rows.length === 0) return res.json({ error: "User not found" });

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password);

  res.json({ valid, user: { id: user.id, name: user.name, role: user.role } });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
