"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  FileUp,
  RefreshCw,
  Sparkles,
  Search,
  Check,
  ShieldCheck,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import {
  downloadImportTemplate,
  parseExcelFile,
  exportVehiclesToExcel,
  ExcelImportRow,
} from "@/lib/excel-utils";
import { useEntityConfig } from "@/contexts/EntityConfigContext";

export default function BulkImportPage() {
  const { config } = useEntityConfig();
  const [inputText, setInputText] = useState("");
  const [parsedRows, setParsedRows] = useState<ExcelImportRow[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewFilter, setPreviewFilter] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleCsvData = `employee_id,name_ar,name_en,department,mobile,plate_number,vehicle_make,vehicle_model,vehicle_color,vehicle_year
150,راشد النعيمي,Rashid Al-Nuaimi,قسم العلوم,+974 5511 2233,654321,Toyota,Land Cruiser,أبيض,2023
151,عبدالرحمن الكعبي,Abdulrahman Al-Kaabi,قسم الرياضيات,+974 6622 3344,789123,Lexus,LX570,أسود,2022
152,حمد السليطي,Hamad Al-Sulaiti,قسم اللغة الإنجليزية,+974 7733 4455,456789,Nissan,Patrol,رمادي,2024
153,سعد الهاجري,Saad Al-Hajri,قسم التربية الإسلامية,+974 5544 5566,123987,GMC,Yukon,كحلي,2021
154,فهد الكواري,Fahad Al-Kuwari,قسم اللغة العربية,+974 6655 6677,987321,Ford,Expedition,أبيض لؤلؤي,2023`;

  // Download official template
  const handleDownloadTemplate = () => {
    triggerHaptic("medium");
    downloadImportTemplate();
  };

  // Handle file selection (Excel or CSV)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic("light");
    setIsLoading(true);
    setUploadedFileName(file.name);
    setErrorMessage(null);

    try {
      const rows = await parseExcelFile(file);
      if (rows.length === 0) {
        setErrorMessage("الملف المرفوع فارغ أو لا يحتوي على بيانات صالحة");
        triggerHaptic("error");
        return;
      }
      setParsedRows(rows);
      await sendValidationRequest(rows);
      triggerHaptic("success");
    } catch (err: any) {
      setErrorMessage("فشل في قراءة ملف الإكسل: " + (err.message || "تنسيق غير مدعوم"));
      triggerHaptic("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Drag & drop handlers
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    triggerHaptic("light");
    setIsLoading(true);
    setUploadedFileName(file.name);
    setErrorMessage(null);

    try {
      const rows = await parseExcelFile(file);
      setParsedRows(rows);
      await sendValidationRequest(rows);
      triggerHaptic("success");
    } catch (err: any) {
      setErrorMessage("فشل في قراءة الملف: " + (err.message || "تنسيق غير مدعوم"));
      triggerHaptic("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Parse text area CSV
  const handleParseText = async () => {
    const raw = inputText.trim() || sampleCsvData;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        setErrorMessage("يرجى إدخال سطر ترويسة وسطر بيانات واحد على الأقل");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const rowObj: any = {};
        headers.forEach((h, i) => {
          rowObj[h] = values[i] || "";
        });
        return rowObj;
      });

      setParsedRows(rows);
      await sendValidationRequest(rows);
    } catch (err: any) {
      setErrorMessage("حدث خطأ أثناء معالجة البيانات النصية");
    } finally {
      setIsLoading(false);
    }
  };

  // Validation API call
  const sendValidationRequest = async (rows: any[]) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, commit: false }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "فشل التحقق من البيانات");
        triggerHaptic("error");
      } else {
        setValidationResult(data);
      }
    } catch {
      setErrorMessage("تعذر الاتصال بخدمة التحقق");
      triggerHaptic("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Commit and write to Supabase
  const handleCommit = async () => {
    if (!parsedRows.length || !validationResult) return;
    setIsLoading(true);
    setErrorMessage(null);
    triggerHaptic("medium");

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows, commit: true }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessCount(data.importedCount || parsedRows.length);
        setIsSuccess(true);
        triggerHaptic("success");
      } else {
        setErrorMessage(data.error || "فشل استيراد البيانات إلى قاعدة البيانات");
        triggerHaptic("error");
      }
    } catch (err: any) {
      setErrorMessage("حدث خطأ أثناء الاتصال بقاعدة البيانات");
      triggerHaptic("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter preview rows
  const filteredValidRows = (validationResult?.validRows || []).filter((r: any) => {
    if (!previewFilter) return true;
    const term = previewFilter.toLowerCase();
    return (
      r.name_ar?.includes(term) ||
      r.plate_number?.includes(term) ||
      r.employee_id?.includes(term) ||
      r.department?.includes(term) ||
      r.vehicle_make?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="relative min-h-screen">
      {/* Ambient Qatar Maroon Glow Blobs behind glass */}
      <div className="ambient-glow-qatar top-10 start-10 opacity-70" />
      <div className="ambient-glow-qatar bottom-20 end-10 opacity-50" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-qatar hover:underline mb-2 transition active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>العودة للوحة الإدارة</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-arabic flex items-center gap-2.5">
              <span>استيراد وتصدير بيانات {config.memberLabel} والسيارات</span>
              <span className="rounded-full bg-qatar-50 px-2.5 py-0.5 text-xs font-bold text-qatar dark:bg-qatar-950 dark:text-qatar-300">
                Excel Suite
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              استيراد دفعات {config.memberLabel} وسياراتهم من ملفات Excel (.xlsx) و CSV مع التحقق الفوري ومنع التكرار
            </p>
          </div>

          {/* Download Official Template Button */}
          <button
            onClick={handleDownloadTemplate}
            className="glass-btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
          >
            <Download className="h-4 w-4 text-qatar" />
            <span>تحميل نموذج Excel المعتمد (.xlsx)</span>
          </button>
        </div>

        {errorMessage && (
          <div className="glass-card rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2.5">
            <XCircle className="h-5 w-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess ? (
          /* Success Card */
          <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center space-y-5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/10 animate-in zoom-in-75 duration-300">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white font-arabic">
                تم استيراد وحفظ {successCount} سجل ومركبة بنجاح!
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                تمت مزامنة كافة بيانات {config.memberLabel}، {config.unitLabelPlural}، والأرقام الوطنية للوحات وتوثيق العملية في سجل التدقيق المعتمد.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/admin/vehicles"
                className="glass-btn-primary rounded-2xl px-6 py-3 text-xs font-bold shadow-lg"
              >
                عرض دليل السيارات المحدّث
              </Link>

              <button
                onClick={() => {
                  setIsSuccess(false);
                  setValidationResult(null);
                  setParsedRows([]);
                  setUploadedFileName(null);
                  setInputText("");
                }}
                className="glass-btn-secondary rounded-2xl px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                استيراد ملف إكسل آخر
              </button>
            </div>
          </div>
        ) : (
          /* Main Import & Validation Section */
          <div className="space-y-6">
            {/* Drag & Drop Glass Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="glass-panel relative rounded-3xl border-2 border-dashed border-slate-300/80 p-8 text-center transition hover:border-qatar/60 dark:border-slate-700/80 space-y-4"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-qatar-50 text-qatar dark:bg-qatar-950/60 dark:text-qatar-300 shadow-md">
                <FileSpreadsheet className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-arabic">
                  اسحب وأفلت ملف Excel (.xlsx) أو انقر للاختيار
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  يدعم ملفات Microsoft Excel (.xlsx, .xls) وقوائم CSV مع المعاينة والتحقق المباشر
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="glass-btn-primary rounded-2xl px-5 py-2.5 text-xs font-bold"
                >
                  <FileUp className="inline-block h-4 w-4 me-1.5" />
                  <span>{isLoading ? "جارٍ فحص الملف..." : "اختيار ملف من جهازك"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInputText(sampleCsvData);
                    handleParseText();
                  }}
                  className="glass-btn-secondary rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  <Sparkles className="inline-block h-3.5 w-3.5 text-amber-500 me-1" />
                  <span>تجربة فورية ببيانات معتمدة</span>
                </button>
              </div>

              {uploadedFileName && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                  <Check className="h-3.5 w-3.5" />
                  <span>الملف المختار: {uploadedFileName}</span>
                </div>
              )}
            </div>

            {/* Validation Results & Preview Table */}
            {validationResult && (
              <div className="glass-panel rounded-3xl p-6 shadow-sm space-y-5">
                {/* Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white font-arabic">
                      نتائج فحص وتدقيق الملف ({validationResult.totalRows} صفوف)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      تم فحص سلامة الأرقام الوظيفية واللوحات القطرية ومنع التكرار
                    </p>
                  </div>

                  {/* Summary Badges */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      جاهز: {validationResult.readyCount}
                    </span>

                    {validationResult.warningCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        تنبيهات: {validationResult.warningCount}
                      </span>
                    )}

                    {validationResult.errorCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
                        <XCircle className="h-3.5 w-3.5" />
                        أخطاء: {validationResult.errorCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Filter & Search inside Preview */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute start-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={previewFilter}
                      onChange={(e) => setPreviewFilter(e.target.value)}
                      placeholder="تصفية المعاينة باسم الموظف أو رقم اللوحة..."
                      className="w-full rounded-xl border border-slate-200/80 bg-white/70 ps-9 pe-3 py-2 text-xs font-medium focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900/70"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => exportVehiclesToExcel(validationResult.validRows, "HARRIK_Validated_Preview.xlsx")}
                    className="glass-btn-secondary rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5"
                    title="تصدير هذه المعاينة لملف إكسل"
                  >
                    <Download className="h-3.5 w-3.5 text-qatar" />
                    <span className="hidden sm:inline">تصدير المعاينة</span>
                  </button>
                </div>

                {/* Table View */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-right text-xs">
                      <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur font-bold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="px-3 py-2.5">الرقم الوظيفي</th>
                          <th className="px-3 py-2.5">الموظف</th>
                          <th className="px-3 py-2.5">القسم</th>
                          <th className="px-3 py-2.5">الجوال</th>
                          <th className="px-3 py-2.5">رقم اللوحة</th>
                          <th className="px-3 py-2.5">اللوحة المعيارية</th>
                          <th className="px-3 py-2.5">السيارة</th>
                          <th className="px-3 py-2.5">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/40 dark:bg-slate-900/40">
                        {filteredValidRows.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                            <td className="px-3 py-2 font-mono font-bold text-slate-500">#{r.employee_id}</td>
                            <td className="px-3 py-2 font-bold text-slate-900 dark:text-white font-arabic">
                              {r.name_ar}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-arabic">
                              {r.department}
                            </td>
                            <td className="px-3 py-2 font-mono numeric-plate text-slate-600 dark:text-slate-400">
                              {r.mobile}
                            </td>
                            <td className="px-3 py-2 font-mono font-black text-qatar">{r.plate_number}</td>
                            <td className="px-3 py-2 font-mono text-slate-400">{r.normalized_plate}</td>
                            <td className="px-3 py-2 font-medium">
                              {r.vehicle_make} {r.vehicle_model} ({r.vehicle_color})
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                <ShieldCheck className="h-3 w-3" />
                                معتمد
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Final Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-slate-500">
                    {validationResult.errorCount === 0
                      ? "كافة الأسطر تم التحقق منها وجاهزة للحفظ المباشر."
                      : "يرجى تصحيح الأخطاء المشار إليها قبل تأكيد الحفظ."}
                  </span>

                  <button
                    onClick={handleCommit}
                    disabled={isLoading || validationResult.errorCount > 0}
                    className="glass-btn-primary w-full sm:w-auto rounded-2xl px-6 py-3.5 text-xs font-bold disabled:opacity-50"
                  >
                    {isLoading ? "جارٍ الحفظ في Supabase..." : "تأكيد واستيراد البيانات إلى النظام"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
