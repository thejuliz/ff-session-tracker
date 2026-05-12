import { useEffect, useState } from "react";
import { getPackages, createPackage, deletePackage } from "../services/api";

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    total_sessions: "",
    purchased_at: "",
    expires_at: "",
  });

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = () => {
    getPackages().then(setPackages).catch(console.error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.total_sessions) return;

    await createPackage({
      ...formData,
      total_sessions: parseInt(formData.total_sessions),
      purchased_at: new Date(formData.purchased_at).toISOString(),
      expires_at: new Date(formData.expires_at).toISOString(),
    });

    setFormData({ name: "", total_sessions: "", purchased_at: "", expires_at: "" });
    setShowForm(false);
    loadPackages();
  };

  const handleDelete = async (id) => {
    if (!confirm("ต้องการลบแพ็กเกจนี้?")) return;
    try {
      await deletePackage(id);
      loadPackages();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Package Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full btn-primary"
      >
        {showForm ? "❌ ยกเลิก" : "➕ เพิ่มแพ็กเกจใหม่"}
      </button>

      {/* Add Package Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <h3 className="font-bold">เพิ่มแพ็กเกจ</h3>

          <div>
            <label className="block text-sm font-medium mb-1">ชื่อแพ็กเกจ</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="เช่น 50 Sessions"
              className="w-full border border-slate-300 px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">จำนวนเซสชัน</label>
            <input
              type="number"
              value={formData.total_sessions}
              onChange={(e) =>
                setFormData({ ...formData, total_sessions: e.target.value })
              }
              placeholder="50"
              className="w-full border border-slate-300 px-3 py-2"
              min="1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">วันที่ซื้อ</label>
              <input
                type="date"
                value={formData.purchased_at}
                onChange={(e) =>
                  setFormData({ ...formData, purchased_at: e.target.value })
                }
                className="w-full border border-slate-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">วันหมดอายุ</label>
              <input
                type="date"
                value={formData.expires_at}
                onChange={(e) =>
                  setFormData({ ...formData, expires_at: e.target.value })
                }
                className="w-full border border-slate-300 px-3 py-2"
                required
              />
            </div>
          </div>

          <button type="submit" className="w-full btn-primary">
            💾 บันทึก
          </button>
        </form>
      )}

      {/* Package List */}
      <div className="space-y-3">
        {packages.map((pkg) => {
          const statusColor = pkg.isExpired
            ? "border-[#c8102e] bg-red-50"
            : pkg.isAlmostEmpty
            ? "border-amber-500 bg-amber-50"
            : pkg.isActive
            ? "border-green-500 bg-green-50"
            : "border-slate-200";

          const statusBadge = pkg.isExpired
            ? "❌ หมดอายุ"
            : pkg.isAlmostEmpty
            ? "⚠️ ใกล้หมด"
            : pkg.isActive
            ? "✅ ใช้งานอยู่"
            : "🔜 ยังไม่เริ่ม";

          return (
            <div key={pkg.id} className={`card ${statusColor}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{pkg.name}</h3>
                  <span className="text-xs font-medium">{statusBadge}</span>
                </div>
                <button
                  onClick={() => handleDelete(pkg.id)}
                  className="btn-danger text-xs px-2 py-1"
                >
                  🗑️
                </button>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>
                    ใช้ไป {pkg.used_sessions}/{pkg.total_sessions}
                  </span>
                  <span className="font-bold">เหลือ {pkg.remaining}</span>
                </div>
                <div className="w-full bg-gray-200 h-2.5">
                  <div
                    className={`h-2.5 transition-all ${
                      pkg.isExpired
                        ? "bg-red-400"
                        : pkg.isAlmostEmpty
                        ? "bg-amber-400"
                        : "bg-green-500"
                    }`}
                    style={{
                      width: `${(pkg.remaining / pkg.total_sessions) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                หมดอายุ{" "}
                {new Date(pkg.expires_at).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          );
        })}

        {packages.length === 0 && (
          <p className="text-center text-slate-400 py-8">
            ยังไม่มีแพ็กเกจ — เพิ่มแพ็กเกจแรกของคุณด้านบน
          </p>
        )}
      </div>
    </div>
  );
}
