"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  FileUp,
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
import { useLocale } from "@/contexts/LocaleContext";

export default function BulkImportPage() {
  const { config } = useEntityConfig();
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const memberLabel = lang === "ar" ? config.memberLabel : config.memberLabelEn;
  const unitPlural = lang === "ar" ? config.unitLabelPlural : config.unitLabelPluralEn;

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

  const handleDownloadTemplate = () => {
    triggerHaptic("medium");
    downloadImportTemplate();
  };

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
        setErrorMessage(L("الملف المرفوع فارغ أو لا يحتوي على بيانات صالحة", "The uploaded file is empty or has no valid rows"));
        triggerHaptic("error");
        return;
      }
      setParsedRows(rows);
      await sendValidationRequest(rows);
      triggerHaptic("success");
    } catch (err: any) {
      setErrorMessage(L("فشل في قراءة ملف الإكسل: ", "Failed to read the Excel file: ") + (err.message || L("تنسيق غير مدعوم", "unsupported format")));
      triggerHaptic("error");
    } finally {
      setIsLoading(false);
    }
  };

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
      setErrorMessage(L("فشل في قراءة الملف: ", "Failed to read the file: ") + (err.message || L("تنسيق غير مدعوم", "unsupported format")));
      triggerHaptic("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseText = async () => {
    const raw = inputText.trim() || sampleCsvData;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        setErrorMessage(L("يرجى إدخال سطر ترويسة وسطر بيانات واحد على الأقل", "Please provide a header row and at least one data row"));
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
    } catch {
      setErrorMessage(L("حدث خطأ أثناء معالجة البيانات النصية", "An error occurred while parsing the text data"));
    } finally {
      setIsLoading(false);
    }
  };

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
        setErrorMessage(data.error || L("فشل التحقق من البيانات", "Data validation failed"));
        triggerHaptic("error");
      } else {
        setValidationResult(data);
      }
    } catch {
      setErrorMessage(L("تعذر الاتصال بخدمة التحقق", "Could not reach the validation service"));
      triggerHaptic("error");
    } finally {
      setIsLoading(false);
    }
  };

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
        setErrorMessage(data.error || L("فشل استيراد البيانات إلى قاعدة البيانات", "Failed to import data into the database"));
        triggerHaptic("error");
      }
    } catch {
      setErrorMessage(L("حدث خطأ أثناء الاتصال بقاعدة البيانات", "An error occurred while connecting to the database"));
      triggerHaptic("error");
    } finally {
      setIsLoading(false);
    }
  };

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
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              <span>{L("العودة للوحة الإدارة", "Back to dashboard")}</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-arabic flex items-center gap-2.5">
              <span>{L(`استيراد وتصدير بيانات ${memberLabel} والسيارات`, `Import & Export ${memberLabel} and Vehicles`)}</span>
              <span className="rounded-full bg-qatar-50 px-2.5 py-0.5 text-xs font-bold text-qatar dark:bg-qatar-950 dark:text-qatar-300">
                Excel Suite
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {L(
                `استيراد دفعات ${memberLabel} وسياراتهم من ملفات Excel (.xlsx) و CSV مع التحقق الفوري ومنع التكرار`,
                `Bulk-import ${memberLabel} and their vehicles from Excel (.xlsx) and CSV files with live validation and duplicate prevention`
              )}
            </p>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="glass-btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
          >
            <Download className="h-4 w-4 text-qatar" />
            <span>{L("تحميل نموذج Excel المعتمد (.xlsx)", "Download official Excel template (.xlsx)")}</span>
          </button>
        </div>

        {errorMessage && (
          <div className="glass-card rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2.5">
            <XCircle className="h-5 w-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center space-y-5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/10 animate-in zoom-in-75 duration-300">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <h2 className="heading-page font-arabic">
                {L(`تم استيراد وحفظ ${successCount} سجل ومركبة بنجاح!`, `Successfully imported ${successCount} records and vehicles!`)}
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                {L(
                  `تمت مزامنة كافة بيانات ${memberLabel}، ${unitPlural}، والأرقام الوطنية للوحات وتوثيق العملية في سجل التدقيق المعتمد.`,
                  `All ${memberLabel}, ${unitPlural} and plate numbers were synced and the action was recorded in the audit log.`
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/admin/vehicles"
                className="glass-btn-primary rounded-2xl px-6 py-3 text-xs font-bold shadow-lg"
              >
                {L("عرض دليل السيارات المحدّث", "View the updated vehicle directory")}
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
                {L("استيراد ملف إكسل آخر", "Import another Excel file")}
              </button>
            </div>
          </div>
        ) : (
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
                  {L("اسحب وأفلت ملف Excel (.xlsx) أو انقر للاختيار", "Drag & drop an Excel (.xlsx) file or click to choose")}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {L(
                    "يدعم ملفات Microsoft Excel (.xlsx, .xls) وقوائم CSV مع المعاينة والتحقق المباشر",
                    "Supports Microsoft Excel (.xlsx, .xls) and CSV lists with live preview and validation"
                  )}
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
                  <span>{isLoading ? L("جارٍ فحص الملف...", "Scanning file...") : L("اختيار ملف من جهازك", "Choose a file from your device")}</span>
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
                  <span>{L("تجربة فورية ببيانات معتمدة", "Instant try with sample data")}</span>
                </button>
              </div>

              {uploadedFileName && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                  <Check className="h-3.5 w-3.5" />
                  <span>{L("الملف المختار:", "Selected file:")} {uploadedFileName}</span>
                </div>
              )}
            </div>

            {/* Validation Results & Preview Table */}
            {validationResult && (
              <div className="glass-panel rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white font-arabic">
                      {L(`نتائج فحص وتدقيق الملف (${validationResult.totalRows} صفوف)`, `File validation results (${validationResult.totalRows} rows)`)}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {L("تم فحص سلامة الأرقام الوظيفية واللوحات القطرية ومنع التكرار", "Employee IDs and Qatari plates were validated and duplicates prevented")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {L("جاهز:", "Ready:")} {validationResult.readyCount}
                    </span>

                    {validationResult.warningCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {L("تنبيهات:", "Warnings:")} {validationResult.warningCount}
                      </span>
                    )}

                    {validationResult.errorCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
                        <XCircle className="h-3.5 w-3.5" />
                        {L("أخطاء:", "Errors:")} {validationResult.errorCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute start-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={previewFilter}
                      onChange={(e) => setPreviewFilter(e.target.value)}
                      placeholder={L("تصفية المعاينة باسم الموظف أو رقم اللوحة...", "Filter the preview by member name or plate number...")}
                      className="w-full rounded-xl border border-slate-200/80 bg-white/70 ps-9 pe-3 py-2 text-xs font-medium focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900/70"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => exportVehiclesToExcel(validationResult.validRows, "HARRIK_Validated_Preview.xlsx")}
                    className="glass-btn-secondary rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5"
                    title={L("تصدير هذه المعاينة لملف إكسل", "Export this preview to Excel")}
                  >
                    <Download className="h-3.5 w-3.5 text-qatar" />
                    <span className="hidden sm:inline">{L("تصدير المعاينة", "Export preview")}</span>
                  </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-start text-xs">
                      <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur font-bold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="px-3 py-2.5 text-start">{L("الرقم الوظيفي", "Employee ID")}</th>
                          <th className="px-3 py-2.5 text-start">{L("الموظف", "Member")}</th>
                          <th className="px-3 py-2.5 text-start">{L("القسم", "Department")}</th>
                          <th className="px-3 py-2.5 text-start">{L("الجوال", "Mobile")}</th>
                          <th className="px-3 py-2.5 text-start">{L("رقم اللوحة", "Plate")}</th>
                          <th className="px-3 py-2.5 text-start">{L("اللوحة المعيارية", "Normalized")}</th>
                          <th className="px-3 py-2.5 text-start">{L("السيارة", "Vehicle")}</th>
                          <th className="px-3 py-2.5 text-start">{L("الحالة", "Status")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/40 dark:bg-slate-900/40">
                        {filteredValidRows.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                            <td className="px-3 py-2 font-mono font-bold text-slate-500">#{r.employee_id}</td>
                            <td className="px-3 py-2 font-bold text-slate-900 dark:text-white font-arabic">{r.name_ar}</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-arabic">{r.department}</td>
                            <td className="px-3 py-2 font-mono numeric-plate text-slate-600 dark:text-slate-400">{r.mobile}</td>
                            <td className="px-3 py-2 font-mono font-black text-qatar">{r.plate_number}</td>
                            <td className="px-3 py-2 font-mono text-slate-400">{r.normalized_plate}</td>
                            <td className="px-3 py-2 font-medium">
                              {r.vehicle_make} {r.vehicle_model} ({r.vehicle_color})
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                <ShieldCheck className="h-3 w-3" />
                                {L("معتمد", "Verified")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-slate-500">
                    {validationResult.errorCount === 0
                      ? L("كافة الأسطر تم التحقق منها وجاهزة للحفظ المباشر.", "All rows are validated and ready to save.")
                      : L("يرجى تصحيح الأخطاء المشار إليها قبل تأكيد الحفظ.", "Please fix the highlighted errors before confirming.")}
                  </span>

                  <button
                    onClick={handleCommit}
                    disabled={isLoading || validationResult.errorCount > 0}
                    className="glass-btn-primary w-full sm:w-auto rounded-2xl px-6 py-3.5 text-xs font-bold disabled:opacity-50"
                  >
                    {isLoading ? L("جارٍ الحفظ في Supabase...", "Saving to Supabase...") : L("تأكيد واستيراد البيانات إلى النظام", "Confirm & import data into the system")}
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
