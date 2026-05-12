import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSession, getStats } from "../services/api";

export default function CheckIn() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [coachName, setCoachName] = useState("");
  const [notes, setNotes] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getStats().then(setStats).catch(console.error);
  }, []);

  // Initialize date to now
  useEffect(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    setSessionDate(local.toISOString().slice(0, 16));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await createSession({
        session_date: new Date(sessionDate).toISOString(),
        coach_name: coachName.trim(),
        notes: notes.trim(),
      });
      setSuccess(true);
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Package Status */}
      {stats?.active_package && (
        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-700">
            📦 <strong>{stats.active_package.name}</strong> — เหลือ{" "}
            {stats.active_package.remaining} เซสชัน
          </p>
          <p className="text-xs text-slate-500 mt-1">
            หมดอายุ{" "}
            {new Date(stats.active_package.expires_at).toLocaleDateString(
              "th-TH",
              { year: "numeric", month: "long", day: "numeric" }
            )}
          </p>
        </div>
      )}
      {!stats?.active_package && (
        <div className="card bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-700">
            ⚠️ ไม่มีแพ็กเกจที่ใช้งานอยู่ — เช็คอินจะบันทึกโดยไม่หักแพ็กเกจ
          </p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="card bg-green-50 border-green-200 text-center">
          <p className="text-lg font-bold text-green-700">✅ เช็คอินสำเร็จ!</p>
        </div>
      )}

      {/* Check-in Form */}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="text-lg font-bold">✅ เช็คอินเซสชัน</h2>

        {/* Quick Check-in Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-primary text-lg py-4 bg-green-600 hover:bg-green-700"
        >
          {submitting ? "กำลังบันทึก..." : "🏋️ เช็คอินเลย!"}
        </button>

        <hr className="border-slate-200" />

        {/* Date/Time */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            วันที่/เวลา
          </label>
          <input
            type="datetime-local"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>

        {/* Coach Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            โค้ช (ไม่บังคับ)
          </label>
          <input
            type="text"
            value={coachName}
            onChange={(e) => setCoachName(e.target.value)}
            placeholder="ชื่อโค้ช..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            หมายเหตุ (ไม่บังคับ)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="เช่น Chest & Triceps, Body weight..."
            rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>
      </form>
    </div>
  );
}
