"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
} from "lucide-react";

export default function BulkImportPage() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const sampleCsvData = `employee_id,name_ar,name_en,department,mobile,plate_number,vehicle_make,vehicle_model,vehicle_color
150,راشد النعيمي,Rashid Al-Nuaimi,قسم العلوم,+974 5511 2233,654321,Toyota,Land Cruiser,White
151,عبدالرحمن الكعبي,Abdulrahman Al-Kaabi,قسم الرياضيات,+974 6622 3344,789123,Lexus,LX570,Black
152,حمد السليطي,Hamad Al-Sulaiti,قسم اللغة الإنجليزية,+974 7733 4455,456789,Nissan,Patrol,Silver
153,سعد الهاجري,Saad Al-Hajri,قسم التربية الإسلامية,+974 5544 5566,123987,GMC,Yukon,Grey
154,فهد الكواري,Fahad Al-Kuwari,قسم اللغة العربية,+974 6655 6677,987321,Ford,Expedition,Dark Blue`;

  const handleParseAndValidate = async () => {
    const raw = inputText.trim() || sampleCsvData;
    setIsLoading(true);

    try {
      const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) return;

      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const rowObj: any = {};
        headers.forEach((h, i) => {
          rowObj[h] = values[i] || "";
        });
        return rowObj;
      });

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, commit: false }),
      });

      const data = await res.json();
      setValidationResult(data);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!validationResult) return;
    setIsLoading(true);

    try {
      const raw = inputText.trim() || sampleCsvData;
      const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const rowObj: any = {};
        headers.forEach((h, i) => {
          rowObj[h] = values[i] || "";
        });
        return rowObj;
      });

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, commit: true }),
      });

      if (res.ok) {
        setIsSuccess(true);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-bold text-qatar hover:underline mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>العودة للوحة الإدارة</span>
        </Link>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white font-arabic">
          استيراد بيانات الكادر والسيارات (Bulk Import)
        </h1>
        <p className="text-xs text-slate-500">
          استيراد دفعات الموظفين وسياراتهم المسجلة من ملفات Excel و CSV مع التحقق التلقائي ومنع التكرار
        </p>
      </div>

      {isSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600 dark:text-emerald-400 animate-bounce" />
          <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white font-arabic">
            تم استيراد البيانات وحفظها في قاعدة بيانات Supabase بنجاح!
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            تمت إضافة الموظفين وتحديث سجل السيارات المسجلة مع ربط الأرقام الوطنية.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/vehicles"
              className="rounded-xl bg-qatar px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-qatar-900"
            >
              عرض دليل السيارات المحدث
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upload / Paste Area */}
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-qatar" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-arabic">
                  بيانات ملف CSV أو Excel
                </span>
              </div>

              <button
                onClick={() => setInputText(sampleCsvData)}
                className="inline-flex items-center gap-1 text-xs font-bold text-qatar hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                <span>تحميل نموذج تجريبي معتمد (Sample Data)</span>
              </button>
            </div>

            <div className="mt-4">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="الصق أسطر CSV هنا أو انقر على 'تحميل نموذج تجريبي معتمد' لتجربة الاستيراد الفوري..."
                className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
                rows={6}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleParseAndValidate}
                disabled={isLoading}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
              >
                {isLoading ? "جارٍ فحص الملف..." : "معاينة والتحقق من صحة الملف"}
              </button>
            </div>
          </div>

          {/* Validation Preview Card */}
          {validationResult && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
              <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-arabic">
                  نتائج فحص الملف قبل الحفظ
                </h3>

                {/* Status Badges: Ready / Warnings / Errors */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    جاهز: {validationResult.readyCount}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    تنبيهات: {validationResult.warningCount}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    <XCircle className="h-3.5 w-3.5" />
                    أخطاء: {validationResult.errorCount}
                  </span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">الموظف</th>
                      <th className="px-3 py-2">القسم</th>
                      <th className="px-3 py-2">الجوال</th>
                      <th className="px-3 py-2">رقم اللوحة</th>
                      <th className="px-3 py-2">اللوحة المعيارية</th>
                      <th className="px-3 py-2">السيارة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {validationResult.validRows?.map((r: any, i: number) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-bold font-arabic">{r.name_ar}</td>
                        <td className="px-3 py-2 text-slate-500">{r.department}</td>
                        <td className="px-3 py-2 font-mono numeric-plate">{r.mobile}</td>
                        <td className="px-3 py-2 font-mono font-bold text-qatar">{r.plate_number}</td>
                        <td className="px-3 py-2 font-mono text-slate-400">{r.normalized_plate}</td>
                        <td className="px-3 py-2">{r.vehicle_make} {r.vehicle_model}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Commit Action */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleCommit}
                  disabled={isLoading || validationResult.errorCount > 0}
                  className="rounded-xl bg-qatar px-6 py-3 text-sm font-bold text-white shadow-lg shadow-qatar/20 hover:bg-qatar-900 disabled:opacity-50"
                >
                  {isLoading ? "جارٍ الحفظ والاعتماد..." : "تأكيد واستيراد البيانات إلى النظام"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
