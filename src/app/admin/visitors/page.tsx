"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  UserCheck,
  Plus,
  Search,
  Clock,
  Car,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Printer,
  Share2,
  Building2,
  Shield,
  ShieldCheck,
  User,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { triggerHaptic } from "@/lib/haptics";
import { QatarPlateBadge } from "@/components/ui/QatarPlateBadge";

interface VisitorPass {
  id: string;
  plate_number: string;
  normalized_plate: string;
  visitor_name: string;
  visitor_mobile: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  host_name: string;
  purpose: string;
  valid_from: string;
  valid_until: string;
  status: "active" | "expired" | "revoked";
  created_at: string;
}

export default function AdminVisitorsPage() {
  const { profile } = useAuth();
  const [passes, setPasses] = useState<VisitorPass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "expired" | "all">("active");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [plateNumber, setPlateNumber] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [visitorMobile, setVisitorMobile] = useState("");
  const [vehicleMake, setVehicleMake] = useState("تويوتا");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("أبيض");
  const [hostName, setHostName] = useState("");
  const [purpose, setPurpose] = useState("اجتماع عمل / مراجع");
  const [validHours, setValidHours] = useState("8");

  // Selected Pass for Print/Share
  const [selectedPass, setSelectedPass] = useState<VisitorPass | null>(null);

  const fetchPasses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/visitors?status=${activeTab}&q=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.passes)) {
        setPasses(json.passes);
      }
    } catch (err) {
      console.error("Failed to fetch passes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, [activeTab, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date().toISOString();
    const active = passes.filter((p) => p.status === "active" && p.valid_until > now).length;
    const expired = passes.filter((p) => p.status !== "active" || p.valid_until <= now).length;
    return { active, expired, total: passes.length };
  }, [passes]);

  const handleOpenModal = () => {
    setPlateNumber("");
    setVisitorName("");
    setVisitorMobile("");
    setVehicleMake("تويوتا");
    setVehicleModel("");
    setVehicleColor("أبيض");
    setHostName("");
    setPurpose("اجتماع عمل / مراجع");
    setValidHours("8");
    setFormError(null);
    setIsModalOpen(true);
    triggerHaptic("selection");
  };

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    triggerHaptic("medium");

    try {
      const res = await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber,
          visitorName,
          visitorMobile,
          vehicleMake,
          vehicleModel,
          vehicleColor,
          hostName,
          purpose,
          validHours: Number(validHours),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        triggerHaptic("success");
        setIsModalOpen(false);
        setSelectedPass(json.pass);
        await fetchPasses();
      } else {
        setFormError(json.error || "فشل إصدار التصريح");
      }
    } catch {
      setFormError("تعذر الاتصال بالخادم");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokePass = async (passId: string) => {
    if (!confirm("هل أنت متأكد من إلغاء هذا التصريح؟ لن يتمكن الزائر من الدخول")) return;
    triggerHaptic("warning");

    try {
      const res = await fetch("/api/visitors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passId, status: "revoked" }),
      });
      if (res.ok) {
        triggerHaptic("success");
        await fetchPasses();
      }
    } catch (err) {
      console.error("Revoke error:", err);
    }
  };

  const handleExtendPass = async (passId: string) => {
    triggerHaptic("selection");
    try {
      const res = await fetch("/api/visitors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passId, extendHours: 4 }),
      });
      if (res.ok) {
        triggerHaptic("success");
        await fetchPasses();
      }
    } catch (err) {
      console.error("Extend error:", err);
    }
  };

  const handleDeletePass = async (passId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟")) return;
    triggerHaptic("warning");

    try {
      const res = await fetch(`/api/visitors?id=${passId}`, { method: "DELETE" });
      if (res.ok) {
        triggerHaptic("success");
        await fetchPasses();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-arabic flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-qatar" />
            <span>تصاريح مواقف الزوار والمراجعين المؤقتة</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إصدار تصاريح دخول مؤقتة لسيارات الضيوف والمقاولين لتمكين التواصل الفوري وتفادي إغلاق المسارات
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 rounded-2xl bg-qatar px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-qatar/25 transition active:scale-95 hover:bg-qatar-800 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>إصدار تصريح زائر جديد</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">التصاريح السارية</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2 font-arabic">{stats.active}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">مصرّح لها بالوقوف حالياً</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">التصاريح المنتهية</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-700 dark:text-zinc-300 mt-2 font-arabic">{stats.expired}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">انتهت صلاحية الوقوف</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">إجمالي السجلات</span>
            <UserCheck className="h-4 w-4 text-qatar" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-arabic">{stats.total}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">كل التصاريح الصادرة</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {(
            [
              { id: "active", label: "التصاريح النشطة" },
              { id: "expired", label: "المنتهية" },
              { id: "all", label: "كافة التصاريح" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                triggerHaptic("selection");
              }}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-qatar text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باللوحة أو اسم الزائر..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-xs font-bold focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Visitor Passes List / Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f] overflow-hidden">
        {isLoading ? (
          <div className="flex min-h-[250px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-qatar border-t-transparent" />
          </div>
        ) : passes.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-slate-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm font-bold text-slate-600 dark:text-zinc-400">
              لا توجد تصاريح زوار مطابقة للبحث حالياً
            </p>
            <p className="text-xs text-slate-400 mt-1">
              انقر على &quot;إصدار تصريح زائر جديد&quot; لمنح سيارة ضيف أو مراجع إذناً مؤقتاً بالوقوف
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 dark:border-zinc-800 dark:bg-zinc-900/50 text-slate-600 dark:text-zinc-400 font-bold">
                <tr>
                  <th className="p-4">رقم اللوحة</th>
                  <th className="p-4">اسم الزائر</th>
                  <th className="p-4">الهاتف (واتساب)</th>
                  <th className="p-4">السيارة والموديل</th>
                  <th className="p-4">المستضيف / الغرض</th>
                  <th className="p-4">صلاحية التصريح</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800">
                {passes.map((pass) => {
                  const isExpired = new Date(pass.valid_until) <= new Date() || pass.status !== "active";
                  return (
                    <tr key={pass.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                      <td className="p-4">
                        <QatarPlateBadge plateNumber={pass.plate_number} size="sm" />
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {pass.visitor_name}
                      </td>
                      <td className="p-4 font-mono text-slate-700 dark:text-zinc-300" dir="ltr">
                        <a
                          href={`https://wa.me/${pass.visitor_mobile.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:underline inline-flex items-center gap-1 font-bold"
                        >
                          <span>{pass.visitor_mobile}</span>
                        </a>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-zinc-400">
                        {pass.vehicle_make} {pass.vehicle_model} ({pass.vehicle_color})
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 dark:text-zinc-200">{pass.host_name || "عام"}</div>
                        <div className="text-[10px] text-slate-400">{pass.purpose}</div>
                      </td>
                      <td className="p-4 font-mono text-slate-700 dark:text-zinc-300">
                        <div>
                          حتى:{" "}
                          {new Date(pass.valid_until).toLocaleTimeString("ar-QA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(pass.valid_until).toLocaleDateString("ar-QA")}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            !isExpired
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {!isExpired ? "ساري المفعول" : "منتهي الصلاحية"}
                        </span>
                      </td>
                      <td className="p-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedPass(pass)}
                            title="معاينة وطباعة بطاقة التصريح"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {!isExpired && (
                            <button
                              onClick={() => handleExtendPass(pass.id)}
                              title="تمديد 4 ساعات"
                              className="rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            >
                              +4س
                            </button>
                          )}
                          {!isExpired && (
                            <button
                              onClick={() => handleRevokePass(pass.id)}
                              title="إلغاء التصريح فوراً"
                              className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePass(pass.id)}
                            title="حذف"
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Issue Visitor Pass */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0c0c0f] dark:border dark:border-zinc-800">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-arabic mb-1 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-qatar" />
              <span>إصدار تصريح موقف زائر مؤقت</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              تسجيل سيارة الضيف يضمن التعرف عليها ومراسلة صاحبها فوراً في حال الوقوف الخاطئ
            </p>

            {formError && (
              <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800 border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePass} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم اللوحة القطري *
                  </label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="مثال: 654321"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    صلاحية التصريح *
                  </label>
                  <select
                    value={validHours}
                    onChange={(e) => setValidHours(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  >
                    <option value="4">4 ساعات (زيارة قصيرة)</option>
                    <option value="8">8 ساعات (دوام كامل)</option>
                    <option value="24">24 ساعة (يوم كامل)</option>
                    <option value="48">48 ساعة (يومان)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم الزائر / السائق *
                  </label>
                  <input
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="الاسم الثلاثي"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الجوال (واتساب) *
                  </label>
                  <input
                    type="tel"
                    value={visitorMobile}
                    onChange={(e) => setVisitorMobile(e.target.value)}
                    placeholder="+974 5512 3456"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الشركة المصنعة
                  </label>
                  <input
                    type="text"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    placeholder="تويوتا"
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الموديل
                  </label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="كامري / برادو"
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اللون
                  </label>
                  <input
                    type="text"
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    placeholder="أبيض"
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المستضيف (الموظف / الإدارة)
                  </label>
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="مثال: د. حمد الكواري"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    سبب الزيارة
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="اجتماع عمل / مقاول صيانة"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-qatar px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-qatar/25 transition active:scale-95 hover:bg-qatar-800 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSubmitting ? "جارٍ الإصدار..." : "إصدار التصريح الآن"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE / VIEW VISITOR PASS MODAL */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0c0c0f] dark:border dark:border-zinc-800 text-center">
            <button
              onClick={() => setSelectedPass(null)}
              className="absolute left-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Printable Pass Content */}
            <div className="p-4 border-2 border-dashed border-qatar/40 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/40">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-qatar" />
                <span className="text-xs font-black text-slate-900 dark:text-white font-arabic">
                  {profile?.organization?.name_ar || "برج الفردان التجاري"}
                </span>
              </div>
              <div className="text-[10px] font-bold text-qatar mb-4">تصريح موقف زائر رسمي (VISITOR PARKING PASS)</div>

              <div className="flex justify-center mb-3">
                <QatarPlateBadge plateNumber={selectedPass.plate_number} size="lg" />
              </div>

              <div className="space-y-1.5 text-xs text-slate-700 dark:text-zinc-300">
                <div className="font-bold text-slate-900 dark:text-white text-sm">{selectedPass.visitor_name}</div>
                <div className="text-[11px] text-slate-500">{selectedPass.vehicle_make} {selectedPass.vehicle_model} • {selectedPass.vehicle_color}</div>
                <div className="text-[11px]">المستضيف: <span className="font-bold">{selectedPass.host_name || "عام"}</span></div>
                <div className="rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold p-1.5 text-[11px] border border-emerald-200">
                  صالح حتى: {new Date(selectedPass.valid_until).toLocaleTimeString("ar-QA", { hour: "2-digit", minute: "2-digit" })} ({new Date(selectedPass.valid_until).toLocaleDateString("ar-QA")})
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl bg-qatar px-4 py-2 text-xs font-bold text-white shadow-md shadow-qatar/25"
              >
                <Printer className="h-4 w-4" />
                <span>طباعة التصريح</span>
              </button>
              <button
                onClick={() => setSelectedPass(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
