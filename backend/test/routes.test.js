import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import {
  getLocalMonthStartUtc,
  parseTimezoneOffsetMinutes,
  sqliteTimezoneModifier,
} from "../src/routes.js";

test("Bangkok sessions just after midnight group under the local calendar day", () => {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE sessions (session_date TEXT NOT NULL)");

  // 06:00 in Bangkok (UTC+7) is 23:00 UTC on the previous calendar day.
  db.prepare("INSERT INTO sessions (session_date) VALUES (?)").run(
    "2026-05-13T23:00:00.000Z"
  );

  const timezoneModifier = sqliteTimezoneModifier(-420);
  const grouped = db
    .prepare(
      `SELECT date(session_date, ?) as date, COUNT(*) as count
       FROM sessions
       GROUP BY date(session_date, ?)`
    )
    .get(timezoneModifier, timezoneModifier);

  assert.deepEqual(grouped, { date: "2026-05-14", count: 1 });
});

test("local month start converts Bangkok midnight to the equivalent UTC instant", () => {
  const sixAmBangkok = new Date("2026-05-13T23:00:00.000Z");

  assert.equal(
    getLocalMonthStartUtc(sixAmBangkok, -420).toISOString(),
    "2026-04-30T17:00:00.000Z"
  );
});

test("timezone offset parsing keeps valid browser offsets and defaults invalid values", () => {
  assert.equal(parseTimezoneOffsetMinutes("-420"), -420);
  assert.equal(parseTimezoneOffsetMinutes("not-a-number"), 0);
  assert.equal(parseTimezoneOffsetMinutes("900"), 0);
});
