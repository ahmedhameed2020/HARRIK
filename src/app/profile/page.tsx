"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Car,
  Plus,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  QrCode,
  Shield,
  Building2,
  ArrowRight,
  Sparkles,
  Bell,
  BellRing,
  Send,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { triggerHaptic } from "@/lib/haptics";
import { ParkingPermitModal } from "@/components/ui/ParkingPermitModal";
import { useWebPush } from "@/hooks/useWebPush";

interface ProfileData {
  id: string;
  name_ar: string;
  name_en: string;
  employee_id: string;
  mobile: string;
  role: string;
  preferred_language: "ar" | "en";
  department?: {
    id: string;
    name_ar: string;
    name_en: string;
    code: string;
  };
  organization?: {
    id: string;
    name_ar: string;
    name_en: string;
  };
}

interface UserVehicle {
  id: string;
  plate_number: string;
  normalized_plate: string;
  make: string;
  model: string;
  color: string;
  year?: number | null;
  is_primary: boolean;
  is_active: boolean;
}

const COMMON_MAKES = ["تويوتا", "نيسان", "لكزس", "لاندكروزر", "كيا", "هيونداي", "فورد"];
const COMMON_COLORS = ["أبيض", "أسود", "فضي", "رمادي", "كحلي", "عنابي"];

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable Profile fields
  const [mobile, setMobile] = useState("");
  const [preferredLang, setPreferredLang] = useState<"ar" | "en">("ar");

  // Add/Edit Vehicle Modal
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [plateNumber, setPlateNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("أبيض");
  const [year, setYear] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  // QR Permit Modal
  const [selectedPermitVehicle, setSelectedPermitVehicle] = useState<UserVehicle | null>(null);

  // Web Push Notifications
  const {
    isSupported: isPushSupported,
    isSubscribed: isPushSubscribed,
    loading: isPushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = useWebPush();
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);

  const handleTogglePush = async () => {
    triggerHaptic("medium");
    try {
      if (isPushSubscribed) {
        await unsubscribePush();
        setStatusMessage({ type: "success", text: "تم إيقاف إشعارات شاشة القفل على هذا الجهاز" });
      } else {
        await subscribePush();
        setStatusMessage({ type: "success", text: "تم تفعيل إشعارات شاشة القفل بنجاح! ستصلك التنبيهات حتى والتطبيق مغلق" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "فشل تحديث حالة الإشعارات" });
    }
  };

  const handleSendTestPush = async () => {
    if (!profile) return;
    setIsSendingTestPush(true);
    triggerHaptic("selection");
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientProfileId: profile.id,
          title: "🚨 تنبيه تجريبي من حَرِّك",
          body: "تهانينا! إشعارات شاشة القفل تعمل بكفاءة تامة على هاتفك في الخلفية.",
          url: "/profile",
        }),
      });
      const data = await res.json();
      if (data.success && data.sentCount > 0) {
        triggerHaptic("success");
        setStatusMessage({ type: "success", text: "تم إرسال إشعار تجريبي إلى جهازك بنجاح! تحقق من شاشة القفل أو شريط الإشعارات." });
      } else {
        setStatusMessage({ type: "error", text: data.message || "لم يتم العثور على أجهزة مشتركة لإرسال الإشعار." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "تعذر إرسال الإشعار التجريبي" });
    } finally {
      setIsSendingTestPush(false);
    }
  };

  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();

      if (data.success && data.profile) {
        setProfile(data.profile);
        setMobile(data.profile.mobile || "");
        setPreferredLang(data.profile.preferred_language || "ar");
        setVehicles(data.vehicles || []);
      }
    } catch {
      setStatusMessage({ type: "error", text: "تعذر تحميل بيانات الملف الشخصي" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Save profile updates (phone, language)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setStatusMessage(null);
    triggerHaptic("medium");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile,
          preferred_language: preferredLang,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        triggerHaptic("success");
        setStatusMessage({ type: "success", text: "تم تحديث بياناتك بنجاح!" });
        await refreshProfile();
      } else {
        triggerHaptic("error");
        setStatusMessage({ type: "error", text: json.error || "فشل التحديث" });
      }
    } catch {
      triggerHaptic("error");
      setStatusMessage({ type: "error", text: "خطأ في الاتصال بالخادم" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Open add car modal
  const handleOpenAddVehicle = () => {
    setEditingVehicleId(null);
    setPlateNumber("");
    setMake("");
    setModel("");
    setColor("أبيض");
    setYear("");
    setIsPrimary(vehicles.length === 0);
    setVehicleError(null);
    setIsVehicleModalOpen(true);
    triggerHaptic("selection");
  };

  // Open edit car modal
  const handleOpenEditVehicle = (v: UserVehicle) => {
    setEditingVehicleId(v.id);
    setPlateNumber(v.plate_number);
    setMake(v.make);
    setModel(v.model);
    setColor(v.color);
    setYear(v.year ? String(v.year) : "");
    setIsPrimary(v.is_primary);
    setVehicleError(null);
    setIsVehicleModalOpen(true);
    triggerHaptic("selection");
  };

  // Save vehicle (POST or PATCH)
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingVehicle(true);
    setVehicleError(null);
    triggerHaptic("medium");

    try {
      if (editingVehicleId) {
        // PATCH
        const res = await fetch("/api/profile/vehicles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleId: editingVehicleId,
            make,
            model,
            color,
            year: year ? parseInt(year, 10) : undefined,
            isPrimary,
          }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          triggerHaptic("success");
          setIsVehicleModalOpen(false);
          await fetchProfileData();
        } else {
          setVehicleError(json.error || "فشل تعديل السيارة");
        }
      } else {
        // POST
        const res = await fetch("/api/profile/vehicles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plateNumber,
            make,
            model,
            color,
            year: year ? parseInt(year, 10) : undefined,
            isPrimary,
          }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          triggerHaptic("success");
          setIsVehicleModalOpen(false);
          await fetchProfileData();
        } else {
          setVehicleError(json.error || "فشل إضافة السيارة");
        }
      }
    } catch {
      setVehicleError("تعذر الاتصال بالخادم");
    } finally {
      setIsSavingVehicle(false);
    }
  };

  // Delete vehicle
  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في إزالة هذه السيارة من ملفك؟")) return;
    triggerHaptic("warning");

    try {
      const res = await fetch(`/api/profile/vehicles?id=${vehicleId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (res.ok && json.success) {
        triggerHaptic("success");
        await fetchProfileData();
      } else {
        alert(json.error || "فشل حذف السيارة");
      }
    } catch {
      alert("خطأ في الاتصال");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-qatar border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-slate-500">يرجى تسجيل الدخول لعرض ملفك الشخصي.</p>
        <Link href="/login" className="mt-3 inline-block font-bold text-qatar">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-zinc-800">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-qatar text-white shadow-lg shadow-qatar/25">
            <User className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white font-arabic">
                {profile.name_ar}
              </h1>
              <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                {profile.role === "admin" ? "مدير نظام" : profile.role === "security" ? "أمن ومراقبة" : "موظف / كادر"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {profile.organization?.name_ar || "المنشأة"} {profile.department ? `• ${profile.department.name_ar}` : ""} • الرقم: {profile.employee_id}
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 self-start sm:self-auto"
        >
          <span>الانتقال لبحث المواقف</span>
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-xs font-bold shadow-sm animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* SECTION 1: Registered Vehicles & Smart QR Windshield Pass */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white font-arabic flex items-center gap-2">
              <Car className="h-5 w-5 text-qatar" />
              <span>سياراتي المسجلة في المواقف ({vehicles.length})</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تصلك تنبيهات تحريك السيارة فورياً على هذه اللوحات
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddVehicle}
            className="flex items-center gap-1.5 rounded-2xl bg-qatar px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-qatar/25 transition active:scale-95 hover:bg-qatar-800"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة سيارة جديدة</span>
          </button>
        </div>

        {vehicles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center dark:border-zinc-800">
            <Car className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">
              لا توجد مركبات مسجلة في حسابك حالياً.
            </p>
            <button
              onClick={handleOpenAddVehicle}
              className="mt-3 font-bold text-xs text-qatar hover:underline"
            >
              + أضف سيارتك الآن للتعرف التلقائي عليها
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-[#0c0c0f]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {/* Qatar Plate simulation */}
                    <div className="inline-flex items-stretch overflow-hidden rounded-xl border-2 border-slate-900 bg-white shadow-sm mb-3">
                      <div className="flex flex-col items-center justify-center bg-qatar px-2.5 py-1 text-[10px] font-black text-white">
                        <span>قطر</span>
                        <span className="text-[8px] tracking-wider opacity-90">QATAR</span>
                      </div>
                      <div className="flex items-center px-3.5 py-1 font-mono text-base font-black tracking-widest text-slate-900">
                        {v.plate_number}
                      </div>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {v.make} {v.model}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      اللون: {v.color} {v.year ? `• موديل ${v.year}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {v.is_primary && (
                      <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        السيارة الأساسية ⭐
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions row */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      setSelectedPermitVehicle(v);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 transition"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>طباعة تصريح الموقف (QR)</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditVehicle(v)}
                      title="تعديل السيارة"
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVehicle(v.id)}
                      title="حذف السيارة"
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Contact & Notification Preferences */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f]">
        <h2 className="text-lg font-black text-slate-900 dark:text-white font-arabic mb-1 flex items-center gap-2">
          <Phone className="h-5 w-5 text-qatar" />
          <span>بيانات التواصل واستقبال التنبيهات</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          يُستخدم هذا الرقم للتواصل معك عبر واتساب والمكالمات في حال إغلاق سيارتك للمسار
        </p>

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              رقم الهاتف الجوال (WhatsApp & Calls) *
            </label>
            <div className="relative">
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+974 5512 3456"
                className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-bold focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              اللغة المفضلة للإشعارات
            </label>
            <select
              value={preferredLang}
              onChange={(e) => setPreferredLang(e.target.value as "ar" | "en")}
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-bold focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            >
              <option value="ar">العربية (Arabic)</option>
              <option value="en">English (الإنجليزية)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="flex items-center justify-center gap-2 rounded-2xl bg-qatar px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-qatar/25 transition active:scale-95 hover:bg-qatar-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSavingProfile ? "جارٍ الحفظ..." : "حفظ التغييرات"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: Lockscreen Web Push Notifications */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-qatar/10 text-qatar">
                <BellRing className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white font-arabic">
                إشعارات شاشة القفل في الخلفية (Web Push)
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                  isPushSubscribed
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                }`}
              >
                {isPushSubscribed ? "مفعلة وتعمل في الخلفية" : "غير مفعلة"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              تصلك التنبيهات بصوت واضح واهتزاز على شاشة قفل هاتفك فور طلب تحريك سيارتك، حتى ولو كان المتصفح مغلقاً أو الشاشة مطفأة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isPushSubscribed && (
              <button
                type="button"
                onClick={handleSendTestPush}
                disabled={isSendingTestPush}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5 text-qatar" />
                <span>{isSendingTestPush ? "جارٍ الإرسال..." : "تجربة إشعار"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleTogglePush}
              disabled={isPushLoading || !isPushSupported}
              className={`inline-flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50 ${
                isPushSubscribed
                  ? "bg-slate-700 hover:bg-slate-800"
                  : "bg-qatar hover:bg-qatar-800 shadow-qatar/25"
              }`}
            >
              <Bell className="h-4 w-4" />
              <span>
                {isPushLoading
                  ? "جارٍ المعالجة..."
                  : isPushSubscribed
                  ? "إلغاء التفعيل"
                  : "تفعيل إشعارات شاشة القفل الآن"}
              </span>
            </button>
          </div>
        </div>

        {!isPushSupported && (
          <p className="mt-3 text-[11px] text-amber-600 dark:text-amber-400">
            ⚠️ المتصفح الحالي لا يدعم تقنية Web Push. على هواتف iPhone، تأكد من إضافة التطبيق للشاشة الرئيسية (Add to Home Screen) وتحديث نظام iOS إلى 16.4+.
          </p>
        )}
      </div>

      {/* MODAL: Add / Edit Vehicle */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0c0c0f] dark:border dark:border-zinc-800">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-arabic mb-1">
              {editingVehicleId ? "تعديل بيانات السيارة" : "إضافة سيارة جديدة إلى ملفك"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              أدخل رقم اللوحة الرسمية والموديل واللون
            </p>

            {vehicleError && (
              <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
                {vehicleError}
              </div>
            )}

            <form onSubmit={handleSaveVehicle} className="space-y-4">
              {!editingVehicleId && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم اللوحة الرسمي (Qatar Plate) *
                  </label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="مثال: 482731 أو ٤٨٢٧٣١"
                    required
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm font-mono font-bold focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              )}

              {/* Quick Make Chips */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  الشركة المصنعة (Make) *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_MAKES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMake(m)}
                      className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                        make === m
                          ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="مثال: تويوتا، نيسان..."
                  required
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-bold focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  طراز السيارة (Model) *
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="مثال: لاندكروزر، كامري، باترول..."
                  required
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-bold focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              {/* Quick Color Chips */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  لون السيارة *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                        color === c
                          ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    سنة الصنع (اختياري)
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2024"
                    className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-bold focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="h-4 w-4 rounded text-qatar focus:ring-qatar"
                  />
                  <label htmlFor="isPrimary" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    السيارة الأساسية
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingVehicle}
                  className="rounded-2xl bg-qatar px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-qatar/25 transition active:scale-95 hover:bg-qatar-800 disabled:opacity-50"
                >
                  {isSavingVehicle ? "جارٍ الحفظ..." : "حفظ السيارة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Smart QR Parking Permit */}
      {selectedPermitVehicle && (
        <ParkingPermitModal
          isOpen={Boolean(selectedPermitVehicle)}
          onClose={() => setSelectedPermitVehicle(null)}
          vehicle={selectedPermitVehicle}
          profile={{
            name_ar: profile.name_ar,
            name_en: profile.name_en,
            employee_id: profile.employee_id,
            department_name: profile.department?.name_ar,
            mobile: profile.mobile,
          }}
          venueName={profile.organization?.name_ar || "حَرِّك | HARRIK"}
        />
      )}
    </div>
  );
}
