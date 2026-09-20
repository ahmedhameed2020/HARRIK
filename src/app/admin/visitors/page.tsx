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
import { useLocale } from "@/contexts/LocaleContext";
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
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
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
        setFormError(json.error || L("فشل إصدار التصريح", "Failed to issue the pass"));
      }
    } catch {
      setFormError(L("تعذر الاتصال بالخادم", "Could not connect to the server"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokePass = async (passId: string) => {
    if (!confirm(L("هل أنت متأكد من إلغاء هذا التصريح؟ لن يتمكن الزائر من الدخول", "Are you sure you want to revoke this pass? The visitor will not be able to enter"))) return;
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
    if (!confirm(L("هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟", "Are you sure you want to permanently delete this record?"))) return;
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
          <h1 className="heading-page font-arabic flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-qatar" />
            <span>{L("تصاريح مواقف الزوار والمراجعين المؤقتة", "Temporary Visitor & Contractor Parking Passes")}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {L(
              "إصدار تصاريح دخول مؤقتة لسيارات الضيوف والمقاولين لتمكين التواصل الفوري وتفادي إغلاق المسارات",
              "Issue temporary entry passes for guest and contractor vehicles to enable instant contact and avoid lane blocking"
            )}
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 rounded-2xl bg-qatar px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-qatar/25 transition active:scale-95 hover:bg-qatar-800 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>{L("إصدار تصريح زائر جديد", "Issue new visitor pass")}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="surface-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{L("التصاريح السارية", "Active passes")}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2 font-arabic">{stats.active}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">{L("مصرّح لها بالوقوف حالياً", "Currently authorized to park")}</p>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{L("التصاريح المنتهية", "Expired passes")}</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-700 dark:text-zinc-300 mt-2 font-arabic">{stats.expired}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">{L("انتهت صلاحية الوقوف", "Parking validity ended")}</p>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{L("إجمالي السجلات", "Total records")}</span>
            <UserCheck className="h-4 w-4 text-qatar" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-arabic">{stats.total}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">{L("كل التصاريح الصادرة", "All issued passes")}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {(
            [
              { id: "active", label: L("التصاريح النشطة", "Active") },
              { id: "expired", label: L("المنتهية", "Expired") },
              { id: "all", label: L("كافة التصاريح", "All") },
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
            placeholder={L("بحث باللوحة أو اسم الزائر...", "Search by plate or visitor name...")}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2 ps-3 pe-9 text-xs font-bold focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
          <Search className="absolute end-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Visitor Passes List / Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-surface-card overflow-hidden">
        {isLoading ? (
          <div className="flex min-h-[250px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-qatar border-t-transparent" />
          </div>
        ) : passes.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-slate-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm font-bold text-slate-600 dark:text-zinc-400">
              {L("لا توجد تصاريح زوار مطابقة للبحث حالياً", "No visitor passes match the current search")}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {L(
                'انقر على "إصدار تصريح زائر جديد" لمنح سيارة ضيف أو مراجع إذناً مؤقتاً بالوقوف',
                'Click "Issue new visitor pass" to grant a guest or contractor vehicle temporary parking permission'
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 dark:border-zinc-800 dark:bg-zinc-900/50 text-slate-600 dark:text-zinc-400 font-bold">
                <tr>
                  <th className="p-4 text-start">{L("رقم اللوحة", "Plate")}</th>
                  <th className="p-4 text-start">{L("اسم الزائر", "Visitor name")}</th>
                  <th className="p-4 text-start">{L("الهاتف (واتساب)", "Phone (WhatsApp)")}</th>
                  <th className="p-4 text-start">{L("السيارة والموديل", "Vehicle & model")}</th>
                  <th className="p-4 text-start">{L("المستضيف / الغرض", "Host / purpose")}</th>
                  <th className="p-4 text-start">{L("صلاحية التصريح", "Pass validity")}</th>
                  <th className="p-4 text-start">{L("الحالة", "Status")}</th>
                  <th className="p-4 text-end">{L("إجراءات", "Actions")}</th>
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
                        <div className="font-bold text-slate-800 dark:text-zinc-200">{pass.host_name || L("عام", "General")}</div>
                        <div className="text-[10px] text-slate-500">{pass.purpose}</div>
                      </td>
                      <td className="p-4 font-mono text-slate-700 dark:text-zinc-300">
                        <div>
                          {L("حتى:", "Until:")}{" "}
                          {new Date(pass.valid_until).toLocaleTimeString(lang === "ar" ? "ar-QA" : "en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(pass.valid_until).toLocaleDateString(lang === "ar" ? "ar-QA" : "en-US")}
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
                          {!isExpired ? L("ساري المفعول", "Valid") : L("منتهي الصلاحية", "Expired")}
                        </span>
                      </td>
                      <td className="p-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedPass(pass)}
                            title={L("معاينة وطباعة بطاقة التصريح", "Preview and print the pass")}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {!isExpired && (
                            <button
                              onClick={() => handleExtendPass(pass.id)}
                              title={L("تمديد 4 ساعات", "Extend 4 hours")}
                              className="rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            >
                              {L("+4س", "+4h")}
                            </button>
                          )}
                          {!isExpired && (
                            <button
                              onClick={() => handleRevokePass(pass.id)}
                              title={L("إلغاء التصريح فوراً", "Revoke pass immediately")}
                              className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePass(pass.id)}
                            title={L("حذف", "Delete")}
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
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-surface-card dark:border dark:border-zinc-800">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-arabic mb-1 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-qatar" />
              <span>{L("إصدار تصريح موقف زائر مؤقت", "Issue a temporary visitor parking pass")}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {L(
                "تسجيل سيارة الضيف يضمن التعرف عليها ومراسلة صاحبها فوراً في حال الوقوف الخاطئ",
                "Registering the guest vehicle ensures it is identified and its driver reached instantly if parked incorrectly"
              )}
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
                    {L("رقم اللوحة القطري *", "Qatari plate number *")}
                  </label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder={L("مثال: 654321", "e.g. 654321")}
                    className="field p-2.5 font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {L("صلاحية التصريح *", "Pass validity *")}
                  </label>
                  <select
                    value={validHours}
                    onChange={(e) => setValidHours(e.target.value)}
                    className="field p-2.5 text-xs"
                  >
                    <option value="4">{L("4 ساعات (زيارة قصيرة)", "4 hours (short visit)")}</option>
                    <option value="8">{L("8 ساعات (دوام كامل)", "8 hours (full shift)")}</option>
                    <option value="24">{L("24 ساعة (يوم كامل)", "24 hours (full day)")}</option>
                    <option value="48">{L("48 ساعة (يومان)", "48 hours (two days)")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {L("اسم الزائر / السائق *", "Visitor / driver name *")}
                  </label>
                  <input
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder={L("الاسم الثلاثي", "Full name")}
                    className="field p-2.5 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {L("رقم الجوال (واتساب) *", "Mobile number (WhatsApp) *")}
                  </label>
                  <input
                    type="tel"
                    value={visitorMobile}
                    onChange={(e) => setVisitorMobile(e.target.value)}
                    placeholder="+974 5512 3456"
                    className="field p-2.5 font-mono text-xs"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {L("الشركة المصنعة", "Make")}
                  </label>
                  <input
                    type="text"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    placeholder="Toyota"
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {L("الموديل", "Model")}
                  </label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder={L("كامري / برادو", "Camry / Prado")}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {L("اللون", "Color")}
                  </label>
                  <input
                    type="text"
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    placeholder={L("أبيض", "White")}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {L("المستضيف (الموظف / الإدارة)", "Host (staff / admin)")}
                  </label>
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder={L("مثال: د. حمد الكواري", "e.g. Dr. Hamad Al-Kuwari")}
                    className="field p-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {L("سبب الزيارة", "Purpose of visit")}
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder={L("اجتماع عمل / مقاول صيانة", "Business meeting / maintenance contractor")}
                    className="field p-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300"
                >
                  {L("إلغاء", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-qatar px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-qatar/25 transition active:scale-95 hover:bg-qatar-800 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSubmitting ? L("جارٍ الإصدار...", "Issuing...") : L("إصدار التصريح الآن", "Issue pass now")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE / VIEW VISITOR PASS MODAL */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-surface-card dark:border dark:border-zinc-800 text-center">
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
                  {profile?.organization?.name_ar || profile?.organization?.name_en || "HARRIK"}
                </span>
              </div>
              <div className="text-[10px] font-bold text-qatar mb-4">{L("تصريح موقف زائر رسمي (VISITOR PARKING PASS)", "Official Visitor Parking Pass")}</div>

              <div className="flex justify-center mb-3">
                <QatarPlateBadge plateNumber={selectedPass.plate_number} size="lg" />
              </div>

              <div className="space-y-1.5 text-xs text-slate-700 dark:text-zinc-300">
                <div className="font-bold text-slate-900 dark:text-white text-sm">{selectedPass.visitor_name}</div>
                <div className="text-[11px] text-slate-500">{selectedPass.vehicle_make} {selectedPass.vehicle_model} • {selectedPass.vehicle_color}</div>
                <div className="text-[11px]">{L("المستضيف:", "Host:")} <span className="font-bold">{selectedPass.host_name || L("عام", "General")}</span></div>
                <div className="rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold p-1.5 text-[11px] border border-emerald-200">
                  {L("صالح حتى:", "Valid until:")} {new Date(selectedPass.valid_until).toLocaleTimeString(lang === "ar" ? "ar-QA" : "en-US", { hour: "2-digit", minute: "2-digit" })} ({new Date(selectedPass.valid_until).toLocaleDateString(lang === "ar" ? "ar-QA" : "en-US")})
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl bg-qatar px-4 py-2 text-xs font-bold text-white shadow-md shadow-qatar/25"
              >
                <Printer className="h-4 w-4" />
                <span>{L("طباعة التصريح", "Print pass")}</span>
              </button>
              <button
                onClick={() => setSelectedPass(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                {L("إغلاق", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
