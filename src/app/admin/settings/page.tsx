"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Shield, MessageSquare, Search, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [privacyMode, setPrivacyMode] = useState<"mode_a" | "mode_b" | "mode_c">("mode_a");
  const [partialSearch, setPartialSearch] = useState(true);
  const [minDigits, setMinDigits] = useState(3);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-bold text-qatar hover:underline mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>العودة للوحة الإدارة</span>
        </Link>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white font-arabic">
          إعدادات النظام والخصوصية (Settings)
        </h1>
        <p className="text-xs text-slate-500">
          تخصيص قواعد البحث، خصوصية بيانات المعلمين، وربط واتساب لمدرسة قطر الثانوية
        </p>
      </div>

      {isSaved && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          <span>تم حفظ الإعدادات وتطبيقها بنجاح!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Privacy Modes Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-qatar" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-arabic">
              مستويات خصوصية أرقام الهواتف (Privacy Modes)
            </h2>
          </div>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
              <input
                type="radio"
                name="privacy"
                value="mode_a"
                checked={privacyMode === "mode_a"}
                onChange={() => setPrivacyMode("mode_a")}
                className="mt-1 h-4 w-4 accent-qatar"
              />
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  الوضع (A): إظهار الاسم، القسم، ورقم الجوال مع أزرار الاتصال والواتساب
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  الوضع القياسي الموصى به للمدارس لتسهيل وسرعة التواصل المباشر بين الكادر.
                </span>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
              <input
                type="radio"
                name="privacy"
                value="mode_b"
                checked={privacyMode === "mode_b"}
                onChange={() => setPrivacyMode("mode_b")}
                className="mt-1 h-4 w-4 accent-qatar"
              />
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  الوضع (B): إظهار أزرار الاتصال والواتساب فقط مع إخفاء رقم الهاتف النصي
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  يمنع نسخ أو تصوير الرقم مع بقاء إمكانية الضغط المباشر للتواصل.
                </span>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
              <input
                type="radio"
                name="privacy"
                value="mode_c"
                checked={privacyMode === "mode_c"}
                onChange={() => setPrivacyMode("mode_c")}
                className="mt-1 h-4 w-4 accent-qatar"
              />
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  الوضع (C): تنبيهات مواقف داخلية فقط بدون كشف رقم الهاتف
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  يتلقى المالك تنبيهات داخل تطبيق حَرِّك دون إتاحة الاتصال أو الواتساب الخارجي.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Search Engine Settings */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-qatar" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-arabic">
              إعدادات محرك البحث باللوحة
            </h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                تفعيل البحث الجزئي (آخر الأرقام)
              </span>
              <span className="block text-xs text-slate-500">
                السماح بالعثور على السيارة عند إدخال آخر 3 أو 4 أرقام فقط.
              </span>
            </div>
            <input
              type="checkbox"
              checked={partialSearch}
              onChange={(e) => setPartialSearch(e.target.checked)}
              className="h-5 w-5 accent-qatar rounded"
            />
          </div>

          <div className="pt-2">
            <label className="block text-sm font-bold text-slate-900 dark:text-white">
              الحد الأدنى لعدد الأرقام في البحث الجزئي: ({minDigits} أرقام)
            </label>
            <input
              type="range"
              min="2"
              max="5"
              value={minDigits}
              onChange={(e) => setMinDigits(parseInt(e.target.value))}
              className="w-full accent-qatar mt-2"
            />
          </div>
        </div>

        {/* WhatsApp & Communication */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-arabic">
              التواصل عبر واتساب والاتصال
            </h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                تفعيل زر واتساب في بطاقة السيارة
              </span>
              <span className="block text-xs text-slate-500">
                فتح محادثة واتساب مجهزة برسالة جاهزة دون الحاجة لحفظ الرقم في جهات الاتصال.
              </span>
            </div>
            <input
              type="checkbox"
              checked={whatsappEnabled}
              onChange={(e) => setWhatsappEnabled(e.target.checked)}
              className="h-5 w-5 accent-qatar rounded"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-qatar px-6 py-3 text-sm font-bold text-white shadow-lg shadow-qatar/20 hover:bg-qatar-900 active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>حفظ وتطبيق الإعدادات</span>
          </button>
        </div>
      </form>
    </div>
  );
}
