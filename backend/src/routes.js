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

router.get("/stats", (req, res) => {
  const timezoneOffsetMinutes = parseTimezoneOffsetMinutes(
    req.query.timezone_offset_minutes
  );
  const now = new Date();
  const startOfMonth = getLocalMonthStartUtc(
    now,
    timezoneOffsetMinutes
  ).toISOString();

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
  const streak = computeStreak(db, now, timezoneOffsetMinutes);

  // Calendar data: sessions grouped by date (YYYY-MM-DD)
  const timezoneModifier = sqliteTimezoneModifier(timezoneOffsetMinutes);
  const calendarData = db
    .prepare(
      `SELECT date(session_date, ?) as date, COUNT(*) as count, SUM(1) as sessions
       FROM sessions
       GROUP BY date(session_date, ?)
       ORDER BY date ASC`
    )
    .all(timezoneModifier, timezoneModifier);

  // Weekly data: last 12 weeks
  const weeklyData = computeWeeklyData(db, timezoneOffsetMinutes);

  // Predicted session dates: next Tue (2) / Thu (4) until remaining runs out or package expires
  const predictedDates = computePredictedDates(
    db,
    activePackage,
    timezoneOffsetMinutes
  );

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

function computeStreak(db, now = new Date(), timezoneOffsetMinutes = 0) {
  const timezoneModifier = sqliteTimezoneModifier(timezoneOffsetMinutes);

  // Get distinct weeks that have sessions in the user's local timezone, most recent first
  const weeks = db
    .prepare(
      `SELECT DISTINCT strftime('%Y-%W', session_date, ?) as week
       FROM sessions
       ORDER BY week DESC`
    )
    .all(timezoneModifier)
    .map((r) => r.week);

  if (weeks.length === 0) return 0;

  // Check if current week has a session
  const currentWeek = strftimeWeek(toLocalDate(now, timezoneOffsetMinutes));
  const lastWeek = strftimeWeek(
    new Date(
      toLocalDate(now, timezoneOffsetMinutes).getTime() -
        7 * 24 * 60 * 60 * 1000
    )
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
    d.setUTCDate(d.getUTCDate() - 7);
    checkWeek = strftimeWeek(d);
  }

  return streak;
}

function strftimeWeek(date) {
  // Return YYYY-WW format for a given date
  const d = new Date(date);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor(
    (d.getTime() - yearStart) / (24 * 60 * 60 * 1000)
  );
  const week = Math.floor(dayOfYear / 7);
  return `${d.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function parseWeek(weekStr) {
  const [year, week] = weekStr.split("-").map(Number);
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const d = new Date(jan1.getTime() + week * 7 * 24 * 60 * 60 * 1000);
  return d;
}

function computeWeeklyData(db, timezoneOffsetMinutes = 0, now = new Date()) {
  const weeks = [];
  const localNow = toLocalDate(now, timezoneOffsetMinutes);

  for (let i = 11; i >= 0; i--) {
    const localWeekStart = new Date(
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate() - i * 7
      )
    );
    const localWeekEnd = new Date(
      localWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000
    );
    const weekStart = fromLocalDate(localWeekStart, timezoneOffsetMinutes);
    const weekEnd = fromLocalDate(localWeekEnd, timezoneOffsetMinutes);
    const count = db
      .prepare(
        `SELECT COUNT(*) as count FROM sessions
         WHERE session_date >= ? AND session_date < ?`
      )
      .get(weekStart.toISOString(), weekEnd.toISOString()).count;

    weeks.push({
      week: `W${12 - i}`,
      label: localWeekStart.toLocaleDateString("th-TH", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      count,
    });
  }
  return weeks;
}

function computePredictedDates(
  db,
  activePackage,
  timezoneOffsetMinutes = 0,
  now = new Date()
) {
  if (!activePackage) return [];

  const remaining = activePackage.total_sessions - activePackage.used_sessions;
  if (remaining <= 0) return [];

  const expiresAt = new Date(activePackage.expires_at);
  const sessionDays = [2, 4]; // Tuesday, Thursday

  const dates = [];
  let d = toLocalDate(now, timezoneOffsetMinutes);
  d = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );

  // Start from today in the user's local timezone — find the next Tue or Thu
  while (
    dates.length < remaining &&
    fromLocalDate(d, timezoneOffsetMinutes) <= expiresAt
  ) {
    const dow = d.getUTCDay();
    if (sessionDays.includes(dow)) {
      dates.push(formatLocalDateKey(d));
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }

  return dates;
}

function parseTimezoneOffsetMinutes(value) {
  const offset = Number(value);
  if (!Number.isFinite(offset) || offset < -14 * 60 || offset > 14 * 60) {
    return 0;
  }
  return Math.trunc(offset);
}

function sqliteTimezoneModifier(timezoneOffsetMinutes) {
  const localOffsetMinutes = -timezoneOffsetMinutes;
  const sign = localOffsetMinutes >= 0 ? "+" : "-";
  return `${sign}${Math.abs(localOffsetMinutes)} minutes`;
}

function toLocalDate(date, timezoneOffsetMinutes) {
  return new Date(date.getTime() - timezoneOffsetMinutes * 60 * 1000);
}

function fromLocalDate(localDate, timezoneOffsetMinutes) {
  return new Date(localDate.getTime() + timezoneOffsetMinutes * 60 * 1000);
}

function getLocalMonthStartUtc(date, timezoneOffsetMinutes) {
  const localDate = toLocalDate(date, timezoneOffsetMinutes);
  const localMonthStart = new Date(
    Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), 1)
  );
  return fromLocalDate(localMonthStart, timezoneOffsetMinutes);
}

function formatLocalDateKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export {
  computePredictedDates,
  computeStreak,
  computeWeeklyData,
  getLocalMonthStartUtc,
  parseTimezoneOffsetMinutes,
  sqliteTimezoneModifier,
};

export default router;
