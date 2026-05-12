import { Router } from "express";
import db from "./db.js";

const router = Router();

// ──────────────────────────────────────────────
// PACKAGES CRUD
// ──────────────────────────────────────────────

router.get("/packages", (_req, res) => {
  const packages = db
    .prepare(
      `SELECT *,
        (SELECT COUNT(*) FROM sessions WHERE package_id = packages.id) as used_sessions
       FROM packages
       ORDER BY purchased_at ASC`
    )
    .all();

  const now = new Date().toISOString();
  res.json(
    packages.map((p) => {
      const remaining = Math.max(0, p.total_sessions - p.used_sessions);
      const isExpired = new Date(p.expires_at) < new Date(now);
      const isActive = !isExpired && remaining > 0;
      const isAlmostEmpty = remaining > 0 && remaining <= 5 && !isExpired;
      return {
        ...p,
        remaining,
        isExpired,
        isActive,
        isAlmostEmpty,
      };
    })
  );
});

router.post("/packages", (req, res) => {
  const { name, total_sessions, purchased_at, expires_at } = req.body;
  if (!name || !total_sessions || !purchased_at || !expires_at) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const result = db
    .prepare(
      `INSERT INTO packages (name, total_sessions, purchased_at, expires_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
    .run(name, total_sessions, purchased_at, expires_at);

  res.status(201).json({ id: result.lastInsertRowid, ...req.body });
});

router.delete("/packages/:id", (req, res) => {
  const { id } = req.params;

  // Check if package has sessions
  const sessionCount = db
    .prepare("SELECT COUNT(*) as count FROM sessions WHERE package_id = ?")
    .get(id);

  if (sessionCount.count > 0) {
    return res.status(400).json({
      error: "Cannot delete package with existing sessions. Delete sessions first.",
    });
  }

  db.prepare("DELETE FROM packages WHERE id = ?").run(id);
  res.json({ success: true });
});

// ──────────────────────────────────────────────
// SESSIONS CRUD
// ──────────────────────────────────────────────

router.get("/sessions", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const sessions = db
    .prepare(
      `SELECT s.*, p.name as package_name, p.total_sessions
       FROM sessions s
       LEFT JOIN packages p ON s.package_id = p.id
       ORDER BY s.session_date DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);

  const total = db.prepare("SELECT COUNT(*) as count FROM sessions").get().count;

  res.json({ sessions, total });
});

router.post("/sessions", (req, res) => {
  const { session_date, coach_name, notes } = req.body;
  if (!session_date) {
    return res.status(400).json({ error: "session_date is required" });
  }

  // Find active package using FIFO: oldest non-expired package with remaining sessions
  const activePackage = db
    .prepare(
      `SELECT p.id, p.name, p.total_sessions, p.expires_at,
        (SELECT COUNT(*) FROM sessions WHERE package_id = p.id) as used_sessions
       FROM packages p
       WHERE datetime(p.expires_at) > datetime('now')
       ORDER BY p.purchased_at ASC`
    )
    .all()
    .find((p) => p.total_sessions - p.used_sessions > 0);

  const packageId = activePackage ? activePackage.id : null;

  const result = db
    .prepare(
      `INSERT INTO sessions (package_id, session_date, coach_name, notes, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
    .run(packageId, session_date, coach_name || null, notes || null);

  res.status(201).json({
    id: result.lastInsertRowid,
    package_id: packageId,
    package_name: activePackage?.name || null,
    session_date,
    coach_name,
    notes,
  });
});

router.delete("/sessions/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  res.json({ success: true });
});

router.put("/sessions/:id", (req, res) => {
  const { id } = req.params;
  const { session_date, coach_name, notes, package_id } = req.body;

  const existing = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ error: "Session not found" });
  }

  db.prepare(
    `UPDATE sessions SET session_date = ?, coach_name = ?, notes = ?, package_id = ?
     WHERE id = ?`
  ).run(session_date, coach_name || null, notes || null, package_id || null, id);

  res.json({ id: parseInt(id), ...req.body });
});

// ──────────────────────────────────────────────
// STATS / DASHBOARD
// ──────────────────────────────────────────────

router.get("/stats", (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Active package info (FIFO)
  const activePackage = db
    .prepare(
      `SELECT p.id, p.name, p.total_sessions, p.purchased_at, p.expires_at,
        (SELECT COUNT(*) FROM sessions WHERE package_id = p.id) as used_sessions
       FROM packages p
       WHERE datetime(p.expires_at) > datetime('now')
       ORDER BY p.purchased_at ASC`
    )
    .all()
    .find((p) => p.total_sessions - p.used_sessions > 0);

  const remaining = activePackage
    ? Math.max(0, activePackage.total_sessions - activePackage.used_sessions)
    : 0;

  // Sessions this month
  const monthCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM sessions WHERE session_date >= ?`
    )
    .get(startOfMonth).count;

  // Total sessions all time
  const totalCount = db
    .prepare("SELECT COUNT(*) as count FROM sessions")
    .get().count;

  // Current streak (consecutive weeks with at least 1 session)
  const streak = computeStreak(db);

  // Calendar data: sessions grouped by date (YYYY-MM-DD)
  const calendarData = db
    .prepare(
      `SELECT date(session_date) as date, COUNT(*) as count, SUM(1) as sessions
       FROM sessions
       GROUP BY date(session_date)
       ORDER BY date ASC`
    )
    .all();

  // Weekly data: last 12 weeks
  const weeklyData = computeWeeklyData(db);

  // Predicted session dates: next Tue (2) / Thu (4) until remaining runs out or package expires
  const predictedDates = computePredictedDates(db, activePackage);

  res.json({
    active_package: activePackage
      ? {
          ...activePackage,
          remaining,
        }
      : null,
    sessions_this_month: monthCount,
    total_sessions: totalCount,
    current_streak: streak,
    calendar_data: calendarData,
    weekly_data: weeklyData,
    predicted_dates: predictedDates,
  });
});

function computeStreak(db) {
  // Get distinct weeks (ISO week) that have sessions, most recent first
  const weeks = db
    .prepare(
      `SELECT DISTINCT strftime('%Y-%W', session_date) as week
       FROM sessions
       ORDER BY week DESC`
    )
    .all()
    .map((r) => r.week);

  if (weeks.length === 0) return 0;

  // Check if current week has a session
  const currentWeek = strftimeWeek(new Date());
  const lastWeek = strftimeWeek(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  let streak = 0;
  let checkWeek = currentWeek;

  // If no session this week, check from last week
  if (!weeks.includes(currentWeek)) {
    if (!weeks.includes(lastWeek)) return 0;
    checkWeek = lastWeek;
  }

  while (weeks.includes(checkWeek)) {
    streak++;
    // Go back one week
    const d = parseWeek(checkWeek);
    d.setDate(d.getDate() - 7);
    checkWeek = strftimeWeek(d);
  }

  return streak;
}

function strftimeWeek(date) {
  // Return YYYY-WW format for a given date
  const d = new Date(date);
  const dayOfYear = Math.floor(
    (d - new Date(d.getFullYear(), 0, 1)) / (24 * 60 * 60 * 1000)
  );
  const week = Math.floor(dayOfYear / 7);
  return `${d.getFullYear()}-${String(week).padStart(2, "0")}`;
}

function parseWeek(weekStr) {
  const [year, week] = weekStr.split("-").map(Number);
  const jan1 = new Date(year, 0, 1);
  const d = new Date(jan1.getTime() + week * 7 * 24 * 60 * 60 * 1000);
  return d;
}

function computeWeeklyData(db) {
  const weeks = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(
      weekStart.getTime() + 7 * 24 * 60 * 60 * 1000
    );
    const count = db
      .prepare(
        `SELECT COUNT(*) as count FROM sessions
         WHERE session_date >= ? AND session_date < ?`
      )
      .get(weekStart.toISOString(), weekEnd.toISOString()).count;

    weeks.push({
      week: `W${12 - i}`,
      label: weekStart.toLocaleDateString("th-TH", {
        month: "short",
        day: "numeric",
      }),
      count,
    });
  }
  return weeks;
}

function computePredictedDates(db, activePackage) {
  if (!activePackage) return [];

  const remaining = activePackage.total_sessions - activePackage.used_sessions;
  if (remaining <= 0) return [];

  const expiresAt = new Date(activePackage.expires_at);
  const sessionDays = [2, 4]; // Tuesday, Thursday

  const dates = [];
  let d = new Date();
  // Start from today — find the next Tue or Thu
  while (dates.length < remaining && d <= expiresAt) {
    const dow = d.getDay();
    if (sessionDays.includes(dow) && d >= new Date(new Date().toDateString())) {
      dates.push(d.toISOString().split("T")[0]);
    }
    d.setDate(d.getDate() + 1);
  }

  return dates;
}

export default router;
