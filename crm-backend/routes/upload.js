const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const jwt = require("jsonwebtoken");
const db = require("../db");
const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

router.post("/leads", authenticate, upload.single("file"), async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" });

  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0)
      return res.status(400).json({ message: "Empty file" });

    // Get all existing phones for duplicate check
    const [existing] = await db.query("SELECT phone FROM leads");
    const existingPhones = new Set(existing.map((r) => r.phone));

    const batchSize = 500;
    const values = [];
    const filePhones = new Set();
    let imported = 0;
    let skipped = 0;
    let duplicates = 0;

    for (const row of data) {
      const name = row.name?.toString().trim();
      let phone = row.phone?.toString().trim() || "";

      // Remove line breaks, tabs, extra spaces
      phone = phone
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Remove brackets and quotes from JSON-like strings
      phone = phone.replace(/[\[\]"]/g, "");

      // If there are multiple phones, clean each one
      if (phone.includes(",")) {
        const phones = phone.split(",").map((p) => {
          p = p.trim();
          const digits = p.replace(/\D/g, "");
          if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
          }
          return p;
        });
        phone = phones.join(", ");
      } else {
        // Single phone - normalize it
        const digits = phone.replace(/\D/g, "");
        if (digits.length === 10) {
          phone = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
      }

      // Remove any words or text after the phone number
      phone = phone.replace(/[a-zA-Z].*$/, "").trim();
      // Remove trailing non-digit characters
      phone = phone.replace(/[,;.\s-]+$/, "").trim();

      // Remove duplicate phones within the same lead
      if (phone.includes(",")) {
        const phones = phone.split(",").map((p) => p.trim());
        phone = [...new Set(phones)].join(", ");
      }

      // Skip non-US/Canada numbers (must be 10 digits)
      const firstPhoneDigits = phone.split(",")[0].replace(/\D/g, "");
      if (firstPhoneDigits.length !== 10) {
        skipped++;
        continue;
      }

      const email = row.email?.toString().trim() || null;
      const book_title = row.book_title?.toString().trim() || null;

      if (!name || !phone) {
        skipped++;
        continue;
      }

      // Check for duplicates: check each phone number individually
      const phoneNumbers = phone.split(",").map((p) => p.trim());
      const isDuplicate = phoneNumbers.some(
        (p) => existingPhones.has(p) || filePhones.has(p),
      );

      if (isDuplicate) {
        duplicates++;
        continue;
      }

      // Add all phone numbers to the filePhones set
      phoneNumbers.forEach((p) => filePhones.add(p));

      values.push([name, phone, email, book_title]);

      if (values.length >= batchSize) {
        await db.query(
          "INSERT INTO leads (name, phone, email, book_title) VALUES ?",
          [values],
        );
        imported += values.length;
        values.length = 0;
      }
    }

    if (values.length > 0) {
      await db.query(
        "INSERT INTO leads (name, phone, email, book_title) VALUES ?",
        [values],
      );
      imported += values.length;
    }

    // Log the activity
    await db.query(
      "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
      [
        req.user.id,
        "import_leads",
        `${imported} imported, ${duplicates} duplicates, ${skipped} skipped from ${req.file.originalname}`,
      ],
    );

    res.json({
      message: `${imported} imported, ${duplicates} duplicates skipped, ${skipped} invalid rows (${data.length} total)`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to process file" });
  }
});

module.exports = router;
