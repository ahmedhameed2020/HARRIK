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
  Monitor,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { triggerHaptic } from "@/lib/haptics";
import { ParkingPermitModal } from "@/components/ui/ParkingPermitModal";
import { useWebPush } from "@/hooks/useWebPush";
import {
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  isBiometricEnabled,
  registerBiometric,
  verifyBiometric,
  disableBiometric,
} from "@/lib/biometric";
import { Fingerprint } from "lucide-react";

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
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);

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

  // Biometric (WebAuthn) device unlock
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  // Devices & sessions
  const [devices, setDevices] = useState<
    Array<{ id: string; host: string; userAgent: string | null; createdAt: string | null }>
  >([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [deviceBusyId, setDeviceBusyId] = useState<string | null>(null);
  const [isSigningOutOthers, setIsSigningOutOthers] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supported = isBiometricSupported() && (await isPlatformAuthenticatorAvailable());
      if (!mounted) return;
      setBiometricSupported(supported);
      setBiometricEnabled(isBiometricEnabled());
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleBiometric = async () => {
    triggerHaptic("medium");
    setBiometricBusy(true);
    try {
      if (biometricEnabled) {
        disableBiometric();
        setBiometricEnabled(false);
        setStatusMessage({ type: "success", text: L("تم إيقاف الفتح بالبصمة على هذا الجهاز", "Biometric unlock has been disabled on this device") });
      } else {
        const res = await registerBiometric();
        if (res.success) {
          setBiometricEnabled(true);
          setStatusMessage({ type: "success", text: L("تم تفعيل الفتح بالبصمة بنجاح! سيفتح التطبيق ببصمتك في المرات القادمة", "Biometric unlock enabled! The app will open with your fingerprint next time") });
        } else {
          setStatusMessage({ type: "error", text: res.error || L("تعذّر تفعيل البصمة", "Could not enable biometrics") });
        }
      }
    } finally {
      setBiometricBusy(false);
    }
  };

  const handleTestBiometric = async () => {
    triggerHaptic("medium");
    setBiometricBusy(true);
    try {
      const res = await verifyBiometric();
      setStatusMessage(
        res.success
          ? { type: "success", text: L("تم التحقق بالبصمة بنجاح ✅", "Biometric verification succeeded ✅") }
          : { type: "error", text: res.error || L("فشل التحقق بالبصمة", "Biometric verification failed") }
      );
    } finally {
      setBiometricBusy(false);
    }
  };

  // ---------------------- Device & session management ----------------------
  const fetchDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const res = await fetch("/api/profile/devices");
      const json = await res.json();
      if (json.success && Array.isArray(json.devices)) {
        setDevices(json.devices);
      }
    } catch {
      // silent
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRemoveDevice = async (id: string) => {
    triggerHaptic("medium");
    setDeviceBusyId(id);
    try {
      const res = await fetch(`/api/profile/devices?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setDevices((prev) => prev.filter((d) => d.id !== id));
        setStatusMessage({ type: "success", text: L("تم إنهاء الجلسة على هذا الجهاز", "Session ended on that device") });
      } else {
        setStatusMessage({ type: "error", text: json.error || L("تعذّر إنهاء الجلسة", "Could not end the session") });
      }
    } catch {
      setStatusMessage({ type: "error", text: L("خطأ في الاتصال", "Connection error") });
    } finally {
      setDeviceBusyId(null);
    }
  };

  const handleSignOutOtherDevices = async () => {
    if (!confirm(L("سيتم إنهاء الجلسة على كل الأجهزة الأخرى. هل أنت متأكد؟", "This will sign you out on every other device. Continue?"))) return;
    triggerHaptic("warning");
    setIsSigningOutOthers(true);
    try {
      const res = await fetch("/api/profile/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signout_others" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatusMessage({ type: "success", text: json.message || L("تم إنهاء الجلسات الأخرى", "Other sessions ended") });
      } else {
        setStatusMessage({ type: "error", text: json.error || L("تعذّر إنهاء الجلسات الأخرى", "Could not end other sessions") });
      }
    } catch {
      setStatusMessage({ type: "error", text: L("خطأ في الاتصال", "Connection error") });
    } finally {
      setIsSigningOutOthers(false);
    }
  };

  const handleTogglePush = async () => {
    triggerHaptic("medium");
    try {
      if (isPushSubscribed) {
        await unsubscribePush();
        setStatusMessage({ type: "success", text: L("تم إيقاف إشعارات شاشة القفل على هذا الجهاز", "Lock-screen notifications disabled on this device") });
      } else {
        await subscribePush();
        setStatusMessage({ type: "success", text: L("تم تفعيل إشعارات شاشة القفل بنجاح! ستصلك التنبيهات حتى والتطبيق مغلق", "Lock-screen notifications enabled! You will receive alerts even when the app is closed") });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || L("فشل تحديث حالة الإشعارات", "Failed to update notification status") });
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
          title: L("🚨 تنبيه تجريبي من حَرِّك", "🚨 Test alert from HARRIK"),
          body: L("تهانينا! إشعارات شاشة القفل تعمل بكفاءة تامة على هاتفك في الخلفية.", "Congratulations! Lock-screen notifications are working in the background on your phone."),
          url: "/profile",
        }),
      });
      const data = await res.json();
      if (data.success && data.sentCount > 0) {
        triggerHaptic("success");
        setStatusMessage({ type: "success", text: L("تم إرسال إشعار تجريبي إلى جهازك بنجاح! تحقق من شاشة القفل أو شريط الإشعارات.", "A test notification was sent to your device! Check your lock screen or notification bar.") });
      } else {
        setStatusMessage({ type: "error", text: data.message || L("لم يتم العثور على أجهزة مشتركة لإرسال الإشعار.", "No subscribed devices found to send the notification.") });
      }
    } catch {
      setStatusMessage({ type: "error", text: L("تعذر إرسال الإشعار التجريبي", "Could not send the test notification") });
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
      setStatusMessage({ type: "error", text: L("تعذر تحميل بيانات الملف الشخصي", "Could not load profile data") });
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
        setStatusMessage({ type: "success", text: L("تم تحديث بياناتك بنجاح!", "Your details were updated successfully!") });
        await refreshProfile();
      } else {
        triggerHaptic("error");
        setStatusMessage({ type: "error", text: json.error || L("فشل التحديث", "Update failed") });
      }
    } catch {
      triggerHaptic("error");
      setStatusMessage({ type: "error", text: L("خطأ في الاتصال بالخادم", "Server connection error") });
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
          setVehicleError(json.error || L("فشل تعديل السيارة", "Failed to update the vehicle"));
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
          setVehicleError(json.error || L("فشل إضافة السيارة", "Failed to add the vehicle"));
        }
      }
    } catch {
      setVehicleError(L("تعذر الاتصال بالخادم", "Could not connect to the server"));
    } finally {
      setIsSavingVehicle(false);
    }
  };

  // Delete vehicle
  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm(L("هل أنت متأكد من رغبتك في إزالة هذه السيارة من ملفك؟", "Are you sure you want to remove this vehicle from your profile?"))) return;
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
        alert(json.error || L("فشل حذف السيارة", "Failed to delete the vehicle"));
      }
    } catch {
      alert(L("خطأ في الاتصال", "Connection error"));
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
        <p className="text-sm text-slate-500">{L("يرجى تسجيل الدخول لعرض ملفك الشخصي.", "Please sign in to view your profile.")}</p>
        <Link href="/login" className="mt-3 inline-block font-bold text-qatar">
          {L("تسجيل الدخول", "Sign in")}
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
              <h1 className="heading-page font-arabic">
                {profile.name_ar}
              </h1>
              <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                {profile.role === "admin" ? L("مدير نظام", "Admin") : profile.role === "security" ? L("أمن ومراقبة", "Security") : L("موظف / كادر", "Staff")}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {profile.organization?.name_ar || L("المنشأة", "Facility")} {profile.department ? `• ${lang === "ar" ? profile.department.name_ar : profile.department.name_en || profile.department.name_ar}` : ""} • {L("الرقم", "ID")}: {profile.employee_id}
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 self-start sm:self-auto"
        >
          <span>{L("الانتقال لبحث المواقف", "Go to plate search")}</span>
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
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
            <h2 className="heading-section font-arabic flex items-center gap-2">
              <Car className="h-5 w-5 text-qatar" />
              <span>{L(`سياراتي المسجلة في المواقف (${vehicles.length})`, `My registered vehicles (${vehicles.length})`)}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {L("تصلك تنبيهات تحريك السيارة فورياً على هذه اللوحات", "You receive instant move requests for these plates")}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddVehicle}
            className="flex items-center gap-1.5 rounded-2xl bg-qatar px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-qatar/25 transition active:scale-95 hover:bg-qatar-800"
          >
            <Plus className="h-4 w-4" />
            <span>{L("إضافة سيارة جديدة", "Add new vehicle")}</span>
          </button>
        </div>

        {vehicles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center dark:border-zinc-800">
            <Car className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">
              {L("لا توجد مركبات مسجلة في حسابك حالياً.", "You have no registered vehicles yet.")}
            </p>
            <button
              onClick={handleOpenAddVehicle}
              className="btn btn-secondary mt-4"
            >
              {L("+ أضف سيارتك الآن للتعرف التلقائي عليها", "+ Add your vehicle now for automatic identification")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="relative overflow-hidden surface-card surface-card-hover p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {/* Qatar Plate simulation */}
                    <div className="inline-flex items-stretch overflow-hidden rounded-xl border-2 border-slate-900 bg-white shadow-sm mb-3">
                      <div className="flex flex-col items-center justify-center bg-qatar px-2.5 py-1 text-micro font-black text-white">
                        <span>{L("قطر", "QATAR")}</span>
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
                      {L("اللون:", "Color:")} {v.color} {v.year ? `• ${L("موديل", "year")} ${v.year}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {v.is_primary && (
                      <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-micro font-black text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        {L("السيارة الأساسية ⭐", "Primary vehicle ⭐")}
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
                    <span>{L("طباعة تصريح الموقف (QR)", "Print parking permit (QR)")}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditVehicle(v)}
                      title={L("تعديل السيارة", "Edit vehicle")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVehicle(v.id)}
                      title={L("حذف السيارة", "Delete vehicle")}
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
      <div className="surface-card p-6">
        <h2 className="heading-section font-arabic mb-1 flex items-center gap-2">
          <Phone className="h-5 w-5 text-qatar" />
          <span>{L("بيانات التواصل واستقبال التنبيهات", "Contact details & alert reception")}</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          {L("يُستخدم هذا الرقم للتواصل معك عبر واتساب والمكالمات في حال إغلاق سيارتك للمسار", "This number is used to reach you via WhatsApp and calls if your vehicle blocks a lane")}
        </p>

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {L("رقم الهاتف الجوال (WhatsApp & Calls) *", "Mobile number (WhatsApp & Calls) *")}
            </label>
            <div className="relative">
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+974 5512 3456"
                className="field text-xs sm:text-sm"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {L("اللغة المفضلة للإشعارات", "Preferred notification language")}
            </label>
            <select
              value={preferredLang}
              onChange={(e) => setPreferredLang(e.target.value as "ar" | "en")}
              className="field text-xs sm:text-sm"
            >
              <option value="ar">{L("العربية (Arabic)", "Arabic")}</option>
              <option value="en">{L("English (الإنجليزية)", "English")}</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="flex items-center justify-center gap-2 rounded-2xl bg-qatar px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-qatar/25 transition active:scale-95 hover:bg-qatar-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSavingProfile ? L("جارٍ الحفظ...", "Saving...") : L("حفظ التغييرات", "Save changes")}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: Lockscreen Web Push Notifications */}
      <div className="surface-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-qatar/10 text-qatar">
                <BellRing className="h-4 w-4" />
              </div>
              <h2 className="heading-section font-arabic">
                {L("إشعارات شاشة القفل في الخلفية (Web Push)", "Background lock-screen notifications (Web Push)")}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-micro font-black ${
                  isPushSubscribed
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                }`}
              >
                {isPushSubscribed ? L("مفعلة وتعمل في الخلفية", "Enabled & working in background") : L("غير مفعلة", "Disabled")}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              {L("تصلك التنبيهات بصوت واضح واهتزاز على شاشة قفل هاتفك فور طلب تحريك سيارتك، حتى ولو كان المتصفح مغلقاً أو الشاشة مطفأة.", "You receive alerts with a clear sound and vibration on your lock screen the moment your vehicle is requested to move — even with the browser closed or the screen off.")}
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
                <span>{isSendingTestPush ? L("جارٍ الإرسال...", "Sending...") : L("تجربة إشعار", "Test notification")}</span>
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
                  ? L("جارٍ المعالجة...", "Processing...")
                  : isPushSubscribed
                  ? L("إلغاء التفعيل", "Disable")
                  : L("تفعيل إشعارات شاشة القفل الآن", "Enable lock-screen notifications now")}
              </span>
            </button>
          </div>
        </div>

        {!isPushSupported && (
          <p className="mt-3 text-caption text-amber-600 dark:text-amber-400">
            {L("⚠️ المتصفح الحالي لا يدعم تقنية Web Push. على هواتف iPhone، تأكد من إضافة التطبيق للشاشة الرئيسية (Add to Home Screen) وتحديث نظام iOS إلى 16.4+.", "⚠️ This browser does not support Web Push. On iPhone, add the app to your Home Screen and update iOS to 16.4+.")}
          </p>
        )}
      </div>

      {/* SECTION 4: Biometric Device Unlock */}
      <div className="surface-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-qatar/10 text-qatar">
                <Fingerprint className="h-4 w-4" />
              </div>
              <h2 className="heading-section font-arabic">
                {L("الفتح بالبصمة (Face ID / بصمة الإصبع)", "Biometric unlock (Face ID / Fingerprint)")}
              </h2>              <span
                className={`rounded-full px-2.5 py-0.5 text-micro font-black ${
                  biometricEnabled
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {biometricEnabled ? L("مفعّلة", "Enabled") : L("غير مفعّلة", "Disabled")}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              {L("افتح التطبيق ببصمة إصبعك أو Face ID دون إعادة إدخال كلمة المرور — تجربة تطبيق أصلي سريعة وآمنة.", "Open the app with your fingerprint or Face ID without re-entering your password — a fast, secure native-style experience.")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {biometricEnabled && (
              <button
                type="button"
                onClick={handleTestBiometric}
                disabled={biometricBusy}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 disabled:opacity-50"
              >
                <Fingerprint className="h-3.5 w-3.5 text-qatar" />
                <span>{L("تجربة البصمة", "Test biometrics")}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleBiometric}
              disabled={biometricBusy || !biometricSupported}
              className={`inline-flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50 ${
                biometricEnabled ? "bg-slate-700 hover:bg-slate-800" : "bg-qatar hover:bg-qatar-800 shadow-qatar/25"
              }`}
            >
              <Fingerprint className="h-4 w-4" />
              <span>{biometricBusy ? L("جارٍ المعالجة...", "Processing...") : biometricEnabled ? L("إلغاء البصمة", "Disable biometrics") : L("تفعيل الفتح بالبصمة", "Enable biometric unlock")}</span>
            </button>
          </div>
        </div>

        {!biometricSupported && (
          <p className="mt-3 text-caption text-amber-600 dark:text-amber-400">
            {L("⚠️ هذا الجهاز أو المتصفح لا يدعم المصادقة الحيوية. تأكد من استخدام جهاز يحتوي على قارئ بصمة أو Face ID، ومن فتح التطبيق عبر اتصال آمن (HTTPS).", "⚠️ This device or browser does not support biometric authentication. Use a device with a fingerprint reader or Face ID, and open the app over a secure (HTTPS) connection.")}
          </p>
        )}
      </div>

      {/* SECTION 5: Devices & Sessions */}
      <div className="surface-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-qatar/10 text-qatar">
                <Monitor className="h-4 w-4" />
              </div>
              <h2 className="heading-section font-arabic">
                {L("الأجهزة والجلسات النشطة", "Devices & active sessions")}
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-micro font-black text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                {devices.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              {L(
                "الأجهزة المسجّلة لاستقبال الإشعارات على حسابك. يمكنك إنهاء الجلسة على أي جهاز بعينه، أو إنهاء كل الجلسات الأخرى.",
                "Devices registered to receive notifications on your account. End the session on a specific device, or sign out everywhere else."
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOutOtherDevices}
            disabled={isSigningOutOthers}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            {isSigningOutOthers ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-qatar" />
            ) : (
              <LogOut className="h-3.5 w-3.5 text-qatar" />
            )}
            <span>{L("إنهاء الجلسات الأخرى", "Sign out other devices")}</span>
          </button>
        </div>

        {isLoadingDevices ? (
          <div className="mt-4 flex justify-center py-6">
            <RefreshCw className="h-5 w-5 animate-spin text-qatar" />
          </div>
        ) : devices.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-center text-xs font-bold text-slate-500 dark:bg-zinc-900/60 dark:text-zinc-400">
            {L("لا توجد أجهزة مسجّلة حالياً.", "No registered devices yet.")}
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100 dark:divide-zinc-800">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-800 dark:text-zinc-200">{d.host}</div>
                    <div className="truncate text-micro text-slate-500">
                      {d.userAgent || L("جهاز غير معروف", "Unknown device")}
                    </div>
                    {d.createdAt && (
                      <div className="text-micro text-slate-500">
                        {new Date(d.createdAt).toLocaleDateString(lang === "ar" ? "ar-QA" : "en-US")}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveDevice(d.id)}
                  disabled={deviceBusyId === d.id}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-caption font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{L("إنهاء", "End")}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Add / Edit Vehicle */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-surface-card dark:border dark:border-zinc-800">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-arabic mb-1">
              {editingVehicleId ? L("تعديل بيانات السيارة", "Edit vehicle details") : L("إضافة سيارة جديدة إلى ملفك", "Add a new vehicle to your profile")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {L("أدخل رقم اللوحة الرسمية والموديل واللون", "Enter the official plate number, model and color")}
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
                    {L("رقم اللوحة الرسمي (Qatar Plate) *", "Official plate number (Qatar) *")}
                  </label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder={L("مثال: 482731 أو ٤٨٢٧٣١", "e.g. 482731")}
                    required
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm font-mono font-bold focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              )}

              {/* Quick Make Chips */}
              <div>
                <label className="block text-caption font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {L("الشركة المصنعة (Make) *", "Make *")}
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
                  placeholder={L("مثال: تويوتا، نيسان...", "e.g. Toyota, Nissan...")}
                  required
                  className="field text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {L("طراز السيارة (Model) *", "Vehicle model *")}
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={L("مثال: لاندكروزر، كامري، باترول...", "e.g. Land Cruiser, Camry, Patrol...")}
                  required
                  className="field text-xs sm:text-sm"
                />
              </div>

              {/* Quick Color Chips */}
              <div>
                <label className="block text-caption font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {L("لون السيارة *", "Vehicle color *")}
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
                    {L("سنة الصنع (اختياري)", "Year (optional)")}
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2024"
                    className="field text-xs sm:text-sm"
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
                    {L("السيارة الأساسية", "Primary vehicle")}
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  {L("إلغاء", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSavingVehicle}
                  className="rounded-2xl bg-qatar px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-qatar/25 transition active:scale-95 hover:bg-qatar-800 disabled:opacity-50"
                >
                  {isSavingVehicle ? L("جارٍ الحفظ...", "Saving...") : L("حفظ السيارة", "Save vehicle")}
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
          venueName={profile.organization?.name_ar || profile.organization?.name_en || "حَرِّك | HARRIK"}
        />
      )}
    </div>
  );
}
