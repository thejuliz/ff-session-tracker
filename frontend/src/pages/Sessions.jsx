import { useEffect, useState } from "react";
import { getSessions, deleteSession } from "../services/api";

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    getSessions(100)
      .then((res) => {
        setSessions(res.sessions);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id) => {
    if (!confirm("ต้องการลบเซสชันนี้?")) return;
    await deleteSession(id);
    loadSessions();
  };

  if (loading) return <p className="text-center p-8">กำลังโหลด...</p>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">📋 ประวัติเซสชัน</h2>
        <span className="text-sm text-slate-500">ทั้งหมด {total} เซสชัน</span>
      </div>

      {sessions.length === 0 ? (
        <p className="text-center text-slate-400 py-8">ยังไม่มีเซสชัน</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="card flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {new Date(s.session_date).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {s.coach_name && (
                  <p className="text-sm text-slate-500">🏋️ {s.coach_name}</p>
                )}
                {s.notes && (
                  <p className="text-xs text-slate-400 mt-1">{s.notes}</p>
                )}
                {s.package_name && (
                  <p className="text-xs text-blue-500 mt-1">
                    📦 {s.package_name}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="btn-danger text-xs px-2 py-1"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
