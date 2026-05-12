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
    <div className="min-h-screen bg-[#f5f5f5] pb-20">
      <header className="bg-black text-white p-4 sticky top-0 z-10 shadow-md">
        <h1 className="text-xl font-bold text-center">
          <span className="text-[#c8102e]">💪</span> FitnessFirst Session Tracker
        </h1>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/sessions" element={<Sessions />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800">
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
                    ? "text-[#c8102e] border-t-2 border-[#c8102e] bg-gray-900"
                    : "text-gray-400 hover:text-white"
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
