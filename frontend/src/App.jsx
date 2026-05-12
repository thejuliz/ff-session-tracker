import { Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import CheckIn from "./pages/CheckIn";
import Packages from "./pages/Packages";
import Sessions from "./pages/Sessions";

export default function App() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "🏠 แดชบอร์ด" },
    { path: "/checkin", label: "✅ เช็คอิน" },
    { path: "/packages", label: "📦 แพ็กเกจ" },
    { path: "/sessions", label: "📋 ประวัติ" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      <header className="bg-blue-700 text-white p-4 sticky top-0 z-10 shadow-lg">
        <h1 className="text-xl font-bold text-center">💪 FF Session Tracker</h1>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/sessions" element={<Sessions />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-lg mx-auto flex">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                  isActive
                    ? "text-blue-600 border-t-2 border-blue-600 bg-blue-50"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
