const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");
const router = express.Router();

const logActivity = async (userId, action, details) => {
  await db.query(
    "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
    [userId, action, details],
  );
};

// Middleware: verify admin
const adminOnly = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "Admin only" });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// GET all agents
// router.get("/", adminOnly, async (req, res) => {
//   try {
//     const [agents] = await db.query(
//       "SELECT id, name, email, role, status, created_at FROM users WHERE role != 'admin'",
//     );
//     res.json(agents);
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

// GET all agents
router.get("/", adminOnly, async (req, res) => {
  try {
    const [agents] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
       (SELECT COUNT(*) FROM leads WHERE assigned_agent_id = u.id AND (cooling_until IS NULL OR cooling_until < NOW())) as active_leads,
       (SELECT COUNT(*) FROM leads WHERE assigned_agent_id = u.id AND is_pinned = 1) as pinned_leads
       FROM users u WHERE u.role != 'admin'`,
    );
    res.json(agents);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET dashboard stats
router.get("/stats", adminOnly, async (req, res) => {
  try {
    const [[{ totalAgents }]] = await db.query(
      "SELECT COUNT(*) as totalAgents FROM users WHERE role != 'admin'",
    );

    const [[{ totalLeads }]] = await db.query(
      "SELECT COUNT(*) as totalLeads FROM leads",
    );

    const [[{ activeLeads }]] = await db.query(
      "SELECT COUNT(*) as activeLeads FROM leads WHERE status IN ('new', 'contacted')",
    );

    const [[{ closedLeads }]] = await db.query(
      "SELECT COUNT(*) as closedLeads FROM leads WHERE status = 'closed'",
    );

    res.json({
      totalAgents,
      totalLeads,
      activeLeads,
      closedLeads,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET recent activity
router.get("/activity", adminOnly, async (req, res) => {
  try {
    const [logs] = await db.query(
      `SELECT a.*, u.name as admin_name 
       FROM activity_logs a 
       JOIN users u ON a.user_id = u.id 
       ORDER BY a.created_at DESC 
       LIMIT 10`,
    );
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH toggle agent status
router.patch("/:id/toggle-status", adminOnly, async (req, res) => {
  try {
    const [agent] = await db.query(
      "SELECT id, name, status FROM users WHERE id = ?",
      [req.params.id],
    );
    if (agent.length === 0)
      return res.status(404).json({ message: "Agent not found" });

    const newStatus = agent[0].status === "active" ? "inactive" : "active";
    await db.query("UPDATE users SET status = ? WHERE id = ?", [
      newStatus,
      req.params.id,
    ]);
    await logActivity(
      req.user.id,
      "toggle_agent_status",
      `"${agent[0].name}" set to ${newStatus}`,
    );

    res.json({ message: "Status updated", status: newStatus });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE agent
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    const [agent] = await db.query(
      "SELECT name FROM users WHERE id = ? AND role != 'admin'",
      [req.params.id],
    );
    if (agent.length === 0)
      return res.status(404).json({ message: "Agent not found" });

    await db.query("DELETE FROM users WHERE id = ? AND role != 'admin'", [
      req.params.id,
    ]);
    await logActivity(
      req.user.id,
      "delete_agent",
      `Agent "${agent[0].name}" deleted`,
    );
    res.json({ message: "Agent deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update agent
router.put("/:id", adminOnly, async (req, res) => {
  const { name, email, password, role, status } = req.body;

  try {
    if (password) {
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        "UPDATE users SET name = ?, email = ?, password = ?, role = ?, status = ? WHERE id = ? AND role != 'admin'",
        [name, email, hashedPassword, role, status, req.params.id],
      );
    } else {
      await db.query(
        "UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ? AND role != 'admin'",
        [name, email, role, status, req.params.id],
      );
    }

    await logActivity(req.user.id, "edit_agent", `Agent ${name} updated`);
    res.json({ message: "Agent updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
