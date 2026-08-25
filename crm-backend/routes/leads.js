const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");
const router = express.Router();

// Middleware: verify token
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

// Middleware: admin only
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" });
  next();
};

// GET all leads (with pagination, search, filter)
router.get("/", authenticate, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const tab = req.query.tab || "all";

    let whereClause = "";
    const params = [];

    if (tab === "assigned") {
      whereClause =
        "WHERE l.assigned_agent_id IS NOT NULL AND (l.cooling_until IS NULL OR l.cooling_until < NOW())";
    } else if (tab === "unassigned") {
      whereClause =
        "WHERE l.assigned_agent_id IS NULL AND (l.cooling_until IS NULL OR l.cooling_until < NOW())";
    } else if (tab === "closed") {
      whereClause = "WHERE l.status = 'closed'";
    } else if (tab === "duplicates") {
      // Return empty for duplicates tab - handled by separate endpoint
      return res.json({ leads: [], total: 0, page: 1, totalPages: 0 });
    } else if (tab === "wrong") {
      whereClause = "WHERE l.is_wrong_number = 1";
    } else {
      whereClause = "WHERE 1=1";
    }

    if (search) {
      whereClause +=
        " AND (REPLACE(LOWER(l.name), ' ', '') LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(l.phone, '(', ''), ')', ''), '-', ''), ' ', '') LIKE ? OR l.email LIKE ?)";
      const cleanSearch = search.replace(/\D/g, "");
      const cleanName = search.toLowerCase().replace(/\s+/g, "");
      params.push(
        `%${cleanName}%`,
        cleanSearch ? `%${cleanSearch}%` : "NOTHING_MATCHES",
        `%${search}%`,
      );
    }
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM leads l ${whereClause}`,
      params,
    );

    const [leads] = await db.query(
      `SELECT l.*, u.name as agent_name, u2.name as transferred_to_name,
   (SELECT COUNT(*) FROM lead_notes WHERE lead_id = l.id) as notes_count
   FROM leads l 
   LEFT JOIN users u ON l.assigned_agent_id = u.id
   LEFT JOIN users u2 ON l.transferred_to = u2.id 
   ${whereClause} 
   ORDER BY l.created_at DESC 
   LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    res.json({
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET active agents (for assign modal)
router.get("/active-agents", authenticate, async (req, res) => {
  try {
    const [agents] = await db.query(
      "SELECT id, name, email, role FROM users WHERE role IN ('opener', 'closer') AND status = 'active'",
    );
    res.json(agents);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST assign leads to agent
router.post("/assign", authenticate, adminOnly, async (req, res) => {
  const { leadIds, agentId } = req.body;
  if (!leadIds || !leadIds.length || !agentId) {
    return res.status(400).json({ message: "leadIds and agentId required" });
  }

  try {
    const [result] = await db.query(
      `UPDATE leads 
   SET assigned_agent_id = ?, is_pinned = 0, updated_at = NOW() 
   WHERE id IN (?) 
   AND assigned_agent_id IS NULL 
   AND (cooling_until IS NULL OR cooling_until < NOW())`,
      [agentId, leadIds],
    );

    res.json({ message: "Leads assigned", assigned: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST strip all leads from an agent
router.post("/strip-agent", authenticate, adminOnly, async (req, res) => {
  const { agentId, coolingHours = 168 } = req.body;

  if (!agentId) {
    return res.status(400).json({ message: "agentId required" });
  }

  try {
    const coolingUntil = new Date(Date.now() + coolingHours * 60 * 60 * 1000);

    const [result] = await db.query(
      "UPDATE leads SET assigned_agent_id = NULL, is_pinned = 0, cooling_until = ? WHERE assigned_agent_id = ? AND is_pinned = 0",
      [coolingUntil, agentId],
    );

    res.json({
      message: `${result.affectedRows} leads removed and in cooling`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST remove cooling from leads
router.post("/remove-cooling", authenticate, adminOnly, async (req, res) => {
  const { leadIds } = req.body;

  if (!leadIds || !leadIds.length) {
    return res.status(400).json({ message: "leadIds required" });
  }

  try {
    await db.query("UPDATE leads SET cooling_until = NULL WHERE id IN (?)", [
      leadIds,
    ]);
    res.json({ message: "Cooling removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// // GET agent's own leads
// router.get("/my-leads", authenticate, async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const offset = (page - 1) * limit;
//     const search = req.query.search || "";
//     const tab = req.query.tab || "active";

//     let whereClause = "";
//     const params = [req.user.id];

//     if (tab === "pinned") {
//       whereClause =
//         "AND l.is_pinned = 1 AND (l.assigned_agent_id = ? OR l.transferred_to = ?)";
//       params.push(req.user.id);
//     } else {
//       whereClause =
//         "AND l.is_pinned = 0 AND l.assigned_agent_id = ? AND (l.cooling_until IS NULL OR l.cooling_until < NOW())";
//     }

//     if (search) {
//       whereClause +=
//         " AND (REPLACE(LOWER(l.name), ' ', '') LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(l.phone, '(', ''), ')', ''), '-', ''), ' ', '') LIKE ? OR l.email LIKE ?)";
//       const cleanSearch = search.replace(/\D/g, "");
//       const cleanName = search.toLowerCase().replace(/\s+/g, "");
//       params.push(
//         `%${cleanName}%`,
//         cleanSearch ? `%${cleanSearch}%` : "NOTHING_MATCHES",
//         `%${search}%`,
//       );
//     }

//     const [[{ total }]] = await db.query(
//       `SELECT COUNT(*) as total FROM leads l WHERE 1=1 ${whereClause}`,
//       params,
//     );

//     const [leads] = await db.query(
//       `SELECT l.*,
//    (SELECT COUNT(*) FROM lead_notes WHERE lead_id = l.id) as notes_count
//    FROM leads l WHERE 1=1 ${whereClause}
//    ORDER BY l.created_at DESC
//    LIMIT ? OFFSET ?`,
//       [...params, limit, offset],
//     );

//     res.json({ leads, total, page, totalPages: Math.ceil(total / limit) });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// GET agent's own leads
router.get("/my-leads", authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const tab = req.query.tab || "active";
    const statusFilter = req.query.statusFilter || "";

    let whereClause = "";
    const params = [req.user.id];

    if (tab === "pinned") {
      whereClause =
        "AND l.is_pinned = 1 AND (l.assigned_agent_id = ? OR l.transferred_to = ?)";
      params.push(req.user.id);
    } else {
      whereClause =
        "AND l.is_pinned = 0 AND l.assigned_agent_id = ? AND (l.cooling_until IS NULL OR l.cooling_until < NOW())";
    }

    if (statusFilter) {
      whereClause += " AND l.status = ?";
      params.push(statusFilter);
    }

    if (search) {
      whereClause +=
        " AND (REPLACE(LOWER(l.name), ' ', '') LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(l.phone, '(', ''), ')', ''), '-', ''), ' ', '') LIKE ? OR l.email LIKE ?)";
      const cleanSearch = search.replace(/\D/g, "");
      const cleanName = search.toLowerCase().replace(/\s+/g, "");
      params.push(
        `%${cleanName}%`,
        cleanSearch ? `%${cleanSearch}%` : "NOTHING_MATCHES",
        `%${search}%`,
      );
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM leads l WHERE 1=1 ${whereClause}`,
      params,
    );

    const [leads] = await db.query(
      `SELECT l.*, 
  u2.name as transferred_to_name,
  u3.name as transferred_by_name,
  (SELECT COUNT(*) FROM lead_notes WHERE lead_id = l.id) as notes_count
FROM leads l
LEFT JOIN users u2 ON l.transferred_to = u2.id
LEFT JOIN users u3 ON l.assigned_agent_id = u3.id
WHERE 1=1 ${whereClause} 
   ORDER BY l.created_at DESC 
   LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    res.json({ leads, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH update lead status
router.patch("/:id/status", authenticate, async (req, res) => {
  const { status, transferTo } = req.body;
  const leadId = req.params.id;

  if (!["new", "contacted", "transferred", "closed"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const [lead] = await db.query(
      "SELECT * FROM leads WHERE id = ? AND (assigned_agent_id = ? OR transferred_to = ?)",
      [leadId, req.user.id, req.user.id],
    );
    if (lead.length === 0)
      return res.status(403).json({ message: "Not your lead" });

    const isPinned = status === "transferred" || status === "closed" ? 1 : 0;
    const transferredTo =
      status === "transferred" ? transferTo : lead[0].transferred_to;
    await db.query(
      "UPDATE leads SET status = ?, is_pinned = ?, transferred_to = ?, updated_at = NOW() WHERE id = ?",
      [status, isPinned, transferredTo, leadId],
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH toggle pin
router.patch("/:id/toggle-pin", authenticate, async (req, res) => {
  const leadId = req.params.id;

  try {
    const [lead] = await db.query(
      "SELECT * FROM leads WHERE id = ? AND (assigned_agent_id = ? OR transferred_to = ?)",
      [leadId, req.user.id, req.user.id],
    );
    if (lead.length === 0)
      return res.status(403).json({ message: "Not your lead" });

    const isCurrentlyPinned = lead[0].is_pinned;
    const newPin = isCurrentlyPinned ? 0 : 1;

    // If unpinning, reset status to new and clear transferred_to
    if (!newPin) {
      await db.query(
        "UPDATE leads SET is_pinned = 0, status = ?, transferred_to = NULL WHERE id = ?",
        ["new", leadId],
      );
    } else {
      await db.query("UPDATE leads SET is_pinned = 1 WHERE id = ?", [leadId]);
    }

    res.json({ message: "Pin toggled", is_pinned: newPin });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET notes for a lead
router.get("/:id/notes", authenticate, async (req, res) => {
  try {
    const [notes] = await db.query(
      "SELECT n.*, u.name as author FROM lead_notes n JOIN users u ON n.user_id = u.id WHERE n.lead_id = ? ORDER BY n.created_at DESC",
      [req.params.id],
    );
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST add note to lead
router.post("/:id/notes", authenticate, async (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ message: "Note required" });

  try {
    await db.query(
      "INSERT INTO lead_notes (lead_id, user_id, note) VALUES (?, ?, ?)",
      [req.params.id, req.user.id, note],
    );
    res.status(201).json({ message: "Note added" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST remove all cooling (keep pinned leads safe)
router.post(
  "/remove-all-cooling",
  authenticate,
  adminOnly,
  async (req, res) => {
    try {
      const [result] = await db.query(
        "UPDATE leads SET cooling_until = NULL, assigned_agent_id = NULL WHERE cooling_until IS NOT NULL AND cooling_until > NOW() AND is_pinned = 0",
      );
      res.json({
        message: `${result.affectedRows} leads restored to unassigned`,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// DELETE leads (bulk or single)
router.delete("/bulk-delete", authenticate, adminOnly, async (req, res) => {
  const { leadIds } = req.body;
  if (!leadIds || !leadIds.length) {
    return res.status(400).json({ message: "leadIds required" });
  }

  try {
    const [result] = await db.query("DELETE FROM leads WHERE id IN (?)", [
      leadIds,
    ]);
    res.json({ message: `${result.affectedRows} leads deleted` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET lead details
router.get("/:id/details", authenticate, async (req, res) => {
  try {
    const [details] = await db.query(
      "SELECT * FROM lead_details WHERE lead_id = ?",
      [req.params.id],
    );
    res.json(details[0] || null);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST/UPSERT lead details
router.post("/:id/details", authenticate, async (req, res) => {
  const {
    opener_notes,
    closer_notes,
    close_status,
    payment_type,
    amount,
    services,
    new_services,
    follow_up_date,
    follow_up_notes,
  } = req.body;

  try {
    await db.query(
      `INSERT INTO lead_details (lead_id, opener_notes, closer_notes, close_status, payment_type, amount, services, new_services, follow_up_date, follow_up_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       opener_notes = VALUES(opener_notes),
       closer_notes = VALUES(closer_notes),
       close_status = VALUES(close_status),
       payment_type = VALUES(payment_type),
       amount = VALUES(amount),
       services = VALUES(services),
       new_services = VALUES(new_services),
       follow_up_date = VALUES(follow_up_date),
       follow_up_notes = VALUES(follow_up_notes)`,
      [
        req.params.id,
        opener_notes || null,
        closer_notes || null,
        close_status || null,
        payment_type || null,
        amount || null,
        services || null,
        new_services || null,
        follow_up_date || null,
        follow_up_notes || null,
      ],
    );
    res.json({ message: "Details saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update lead
// router.put("/:id", authenticate, adminOnly, async (req, res) => {
//   const { name, phone, email, book_title } = req.body;
//   try {
//     await db.query(
//       "UPDATE leads SET name = ?, phone = ?, email = ?, book_title = ?, updated_at = NOW() WHERE id = ?",
//       [name, phone, email || null, book_title || null, req.params.id],
//     );
//     res.json({ message: "Lead updated" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// PUT update lead
router.put("/:id", authenticate, adminOnly, async (req, res) => {
  const {
    name,
    phone,
    email,
    book_title,
    status,
    transferred_to,
    assigned_agent_id,
    is_pinned,
  } = req.body;

  try {
    await db.query(
      "UPDATE leads SET name = ?, phone = ?, email = ?, book_title = ?, status = ?, transferred_to = ?, assigned_agent_id = ?, is_pinned = ?, updated_at = NOW() WHERE id = ?",
      [
        name,
        phone,
        email || null,
        book_title || null,
        status || "new",
        transferred_to || null,
        assigned_agent_id || null,
        is_pinned || 0,
        req.params.id,
      ],
    );
    res.json({ message: "Lead updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update note
router.put("/notes/:noteId", authenticate, async (req, res) => {
  const { note } = req.body;
  try {
    await db.query(
      "UPDATE lead_notes SET note = ? WHERE id = ? AND user_id = ?",
      [note, req.params.noteId, req.user.id],
    );
    res.json({ message: "Note updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE note (admin only)
router.delete("/notes/:noteId", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      // Check if note belongs to user
      const [note] = await db.query(
        "SELECT * FROM lead_notes WHERE id = ? AND user_id = ?",
        [req.params.noteId, req.user.id],
      );
      if (note.length === 0)
        return res.status(403).json({ message: "Not your note" });
    }
    await db.query("DELETE FROM lead_notes WHERE id = ?", [req.params.noteId]);
    res.json({ message: "Note deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET notifications for agent
// router.get("/notifications", authenticate, async (req, res) => {
//   try {
//     // Only transferred leads within last 2 minutes
//     const [transferred] = await db.query(
//       `SELECT l.id, l.name, l.phone, l.email, l.book_title, l.status, l.assigned_agent_id, l.transferred_to, l.created_at, l.updated_at,
//    (SELECT COUNT(*) FROM lead_notes WHERE lead_id = l.id) as notes_count,
//    u.name as transferred_to_name
//    FROM leads l
//    LEFT JOIN users u ON l.transferred_to = u.id
//    WHERE l.transferred_to = ?
//    AND l.status = 'transferred'
//    AND l.updated_at >= NOW() - INTERVAL 2 MINUTE
//    ORDER BY l.updated_at DESC
//    LIMIT 10`,
//       [req.user.id],
//     );

//     res.json({ count: transferred.length, items: transferred });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

router.get("/notifications", authenticate, async (req, res) => {
  try {
    // Transferred leads within last 2 minutes
    const [transferred] = await db.query(
      `SELECT l.id, l.name, l.book_title, l.status, l.created_at
       FROM leads l 
       WHERE l.transferred_to = ? 
       AND l.status = 'transferred'
       AND l.updated_at >= NOW() - INTERVAL 2 MINUTE
       ORDER BY l.updated_at DESC 
       LIMIT 10`,
      [req.user.id],
    );

    // Follow-up reminders - due now (within last 5 minutes)
    const [dueFollowUps] = await db.query(
      `SELECT l.id, l.name, l.book_title, l.status, ld.follow_up_date
   FROM leads l
   JOIN lead_details ld ON l.id = ld.lead_id
   WHERE (l.assigned_agent_id = ? OR l.transferred_to = ?)
   AND ld.follow_up_date IS NOT NULL
   AND ld.follow_up_date != ''
   AND STR_TO_DATE(ld.follow_up_date, '%Y-%m-%dT%H:%i') <= NOW()
   AND STR_TO_DATE(ld.follow_up_date, '%Y-%m-%dT%H:%i') >= NOW() - INTERVAL 5 MINUTE
   ORDER BY ld.follow_up_date DESC
   LIMIT 10`,
      [req.user.id, req.user.id],
    );

    const [newFollowUps] = await db.query(
      `SELECT l.id, l.name, l.book_title, l.status, ld.follow_up_date
   FROM leads l
   JOIN lead_details ld ON l.id = ld.lead_id
   WHERE (l.assigned_agent_id = ? OR l.transferred_to = ?)
   AND ld.follow_up_date IS NOT NULL
   AND ld.follow_up_date != ''
   AND STR_TO_DATE(ld.follow_up_date, '%Y-%m-%dT%H:%i') > NOW()
   AND ld.updated_at >= NOW() - INTERVAL 2 MINUTE
   ORDER BY ld.updated_at DESC
   LIMIT 10`,
      [req.user.id, req.user.id],
    );

    const items = [
      ...transferred.map((t) => ({ ...t, type: "transfer" })),
      ...dueFollowUps.map((f) => ({ ...f, type: "followup_due" })),
      ...newFollowUps.map((f) => ({ ...f, type: "followup_set" })),
    ];

    res.json({ count: items.length, items });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET search all leads (for agents)
router.get("/search-all", authenticate, async (req, res) => {
  const search = req.query.search || "";
  const limit = parseInt(req.query.limit) || 50;
  const cleanSearch = search.replace(/\D/g, "");
  const cleanName = search.toLowerCase().replace(/\s+/g, "");

  try {
    const [leads] = await db.query(
      `SELECT l.*, u.name as agent_name, u2.name as transferred_to_name
       FROM leads l 
       LEFT JOIN users u ON l.assigned_agent_id = u.id 
       LEFT JOIN users u2 ON l.transferred_to = u2.id
       WHERE REPLACE(LOWER(l.name), ' ', '') LIKE ? 
       OR REPLACE(REPLACE(REPLACE(REPLACE(l.phone, '(', ''), ')', ''), '-', ''), ' ', '') LIKE ?
       OR l.email LIKE ? 
       OR l.book_title LIKE ?
       ORDER BY l.created_at DESC 
       LIMIT ?`,
      [
        `%${cleanName}%`,
        cleanSearch ? `%${cleanSearch}%` : "NOTHING_MATCHES",
        `%${search}%`,
        `%${search}%`,
        limit,
      ],
    );

    res.json({ leads });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET duplicate leads
router.get("/duplicates", authenticate, adminOnly, async (req, res) => {
  try {
    const [duplicates] = await db.query(
      `SELECT phone, COUNT(*) as count, GROUP_CONCAT(id) as lead_ids, GROUP_CONCAT(name) as names
       FROM leads 
       WHERE phone IS NOT NULL AND phone != ''
       GROUP BY phone 
       HAVING COUNT(*) > 1
       ORDER BY COUNT(*) DESC`,
    );
    res.json({ duplicates });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET leads by IDs
router.post("/by-ids", authenticate, adminOnly, async (req, res) => {
  const { ids } = req.body;
  try {
    const [leads] = await db.query(
      `SELECT l.*, u.name as agent_name FROM leads l LEFT JOIN users u ON l.assigned_agent_id = u.id WHERE l.id IN (?)`,
      [ids],
    );
    res.json({ leads });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH mark lead as wrong number
router.patch("/:id/wrong-number", authenticate, async (req, res) => {
  const { notes } = req.body;
  try {
    const [lead] = await db.query(
      "SELECT * FROM leads WHERE id = ? AND assigned_agent_id = ?",
      [req.params.id, req.user.id],
    );
    if (lead.length === 0)
      return res.status(403).json({ message: "Not your lead" });

    await db.query(
      "UPDATE leads SET is_wrong_number = 1, wrong_number_notes = ? WHERE id = ?",
      [notes || null, req.params.id],
    );
    res.json({ message: "Marked as wrong number" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH unmark wrong number (admin only)
router.patch("/:id/unmark-wrong", authenticate, adminOnly, async (req, res) => {
  try {
    await db.query(
      "UPDATE leads SET is_wrong_number = 0, wrong_number_notes = NULL WHERE id = ?",
      [req.params.id],
    );
    res.json({ message: "Unmarked as wrong number" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST add lead manually (admin only)
router.post("/manual-add", authenticate, adminOnly, async (req, res) => {
  const { name, phone, email, book_title } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: "Name and phone required" });
  }

  try {
    // Normalize phone
    let normalizedPhone = phone.trim();
    const digits = normalizedPhone.replace(/\D/g, "");
    if (digits.length === 10) {
      normalizedPhone = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    const [result] = await db.query(
      "INSERT INTO leads (name, phone, email, book_title) VALUES (?, ?, ?, ?)",
      [name.trim(), normalizedPhone, email || null, book_title || null],
    );

    await db.query(
      "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
      [req.user.id, "add_lead", `Lead ${name} added manually`],
    );

    res.status(201).json({ message: "Lead added", leadId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
