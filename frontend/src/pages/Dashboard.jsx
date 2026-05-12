import { useEffect, useState } from "react";
import { getStats, getSessions } from "../services/api";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getSessions(5)])
      .then(([s, r]) => {
        setStats(s);
        setRecentSessions(r.sessions);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center p-8">กำลังโหลด...</p>;

  const chartData = {
    labels: stats.weekly_data.map((w) => w.label),
    datasets: [
      {
        label: "จำนวนเซสชัน",
        data: stats.weekly_data.map((w) => w.count),
        backgroundColor: "rgba(200, 16, 46, 0.7)",
        borderRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  // Calendar: build a simple month view
  const calendarDays = buildCalendarDays(stats.calendar_data);

  return (
    <div className="space-y-4">
      {/* Active Package Card */}
      {stats.active_package && (
        <div className="card bg-gradient-to-br from-red-50 to-rose-50 border-[#c8102e]">
          <h2 className="text-lg font-bold text-[#c8102e]">📦 แพ็กเกจปัจจุบัน</h2>
          <p className="text-sm text-red-700">{stats.active_package.name}</p>
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span>
                ใช้ไป {stats.active_package.used_sessions}/
                {stats.active_package.total_sessions}
              </span>
              <span className="font-bold text-[#c8102e]">
                เหลือ {stats.active_package.remaining}
              </span>
            </div>
            <div className="w-full bg-gray-200 h-3">
              <div
                className="bg-[#c8102e] h-3 transition-all"
                style={{
                  width: `${
                    (stats.active_package.remaining /
                      stats.active_package.total_sessions) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            หมดอายุ{" "}
            {new Date(stats.active_package.expires_at).toLocaleDateString(
              "th-TH",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-[#c8102e]">
            {stats.total_sessions}
          </p>
          <p className="text-xs text-slate-500">ทั้งหมด</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">
            {stats.sessions_this_month}
          </p>
          <p className="text-xs text-slate-500">เดือนนี้</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-orange-600">
            {stats.current_streak}
          </p>
          <p className="text-xs text-slate-500">สัปดาห์ติดต่อกัน</p>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="card">
        <h3 className="font-semibold mb-3">📊 12 สัปดาห์ล่าสุด</h3>
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* Calendar */}
      <div className="card">
        <h3 className="font-semibold mb-3">📅 ปฏิทิน</h3>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((d) => (
            <div key={d} className="font-semibold text-slate-400 py-1">
              {d}
            </div>
          ))}
          {calendarDays.map((day, i) => (
            <div
              key={i}
              className={`py-2 text-sm ${
                day.isCurrentMonth ? "" : "text-slate-300"
              } ${
                day.hasSession
                  ? "bg-[#c8102e] text-white font-bold"
                  : day.isToday
                  ? "bg-red-100 text-[#c8102e] font-bold"
                  : ""
              }`}
            >
              {day.day}
              {day.hasSession && day.isCurrentMonth && (
                <span className="block text-[8px] opacity-80">
                  {day.sessionCount}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <h3 className="font-semibold mb-3">📋 เช็คอินล่าสุด</h3>
        {recentSessions.length === 0 ? (
          <p className="text-slate-400 text-sm">ยังไม่มีเซสชัน</p>
        ) : (
          <ul className="space-y-2">
            {recentSessions.map((s) => (
              <li key={s.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">
                    {new Date(s.session_date).toLocaleDateString("th-TH", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {s.coach_name && (
                    <span className="text-slate-500 ml-2">
                      🏋️ {s.coach_name}
                    </span>
                  )}
                </div>
                {s.notes && (
                  <span className="text-xs text-slate-400 truncate max-w-[120px]">
                    {s.notes}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function buildCalendarDays(calendarData) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Map calendar data for quick lookup
  const sessionMap = new Map();
  calendarData.forEach((d) => sessionMap.set(d.date, d.count));

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Adjust for Monday start (0=Sun -> 6, 1=Mon -> 0)
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const days = [];
  const today = now.toISOString().split("T")[0];

  // Previous month padding
  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({
      day: prevMonthLast - i,
      isCurrentMonth: false,
      hasSession: false,
      isToday: false,
      sessionCount: 0,
    });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const count = sessionMap.get(dateStr) || 0;
    days.push({
      day: d,
      isCurrentMonth: true,
      hasSession: count > 0,
      isToday: dateStr === today,
      sessionCount: count,
    });
  }

  // Next month padding (fill to complete grid)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      hasSession: false,
      isToday: false,
      sessionCount: 0,
    });
  }

  return days;
}
