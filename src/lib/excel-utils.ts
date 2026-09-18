import * as XLSX from "xlsx";
import { normalizePlateNumber } from "./plate-normalizer";

export interface ExcelImportRow {
  employee_id: string;
  name_ar: string;
  name_en: string;
  department: string;
  mobile: string;
  plate_number: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  vehicle_year?: number | string;
}

/**
 * Generates and downloads the official HARRIK Excel Import Template (.xlsx)
 */
export function downloadImportTemplate() {
  const wb = XLSX.utils.book_new();

  // 1. Data Sheet with headers & sample rows
  const headers = [
    "الرقم الوظيفي / Employee ID",
    "الاسم بالعربية / Name (AR)",
    "الاسم بالإنجليزية / Name (EN)",
    "القسم / Department",
    "رقم الجوال / Mobile",
    "رقم اللوحة / Plate Number",
    "الماركة / Make",
    "الموديل / Model",
    "اللون / Color",
    "سنة الصنع / Year",
  ];

  const sampleRows = [
    [
      "150",
      "راشد النعيمي",
      "Rashid Al-Nuaimi",
      "قسم العلوم",
      "+974 5511 2233",
      "654321",
      "Toyota",
      "Land Cruiser",
      "أبيض",
      "2023",
    ],
    [
      "151",
      "عبدالرحمن الكعبي",
      "Abdulrahman Al-Kaabi",
      "قسم الرياضيات",
      "+974 6622 3344",
      "789123",
      "Lexus",
      "LX570",
      "أسود",
      "2022",
    ],
    [
      "152",
      "حمد السليطي",
      "Hamad Al-Sulaiti",
      "قسم اللغة الإنجليزية",
      "+974 7733 4455",
      "456789",
      "Nissan",
      "Patrol",
      "رمادي",
      "2024",
    ],
    [
      "153",
      "سعد الهاجري",
      "Saad Al-Hajri",
      "قسم التربية الإسلامية",
      "+974 5544 5566",
      "123987",
      "GMC",
      "Yukon",
      "كحلي",
      "2021",
    ],
    [
      "154",
      "فهد الكواري",
      "Fahad Al-Kuwari",
      "قسم اللغة العربية",
      "+974 6655 6677",
      "987321",
      "Ford",
      "Expedition",
      "أبيض لؤلؤي",
      "2023",
    ],
  ];

  const dataSheetData = [headers, ...sampleRows];
  const wsData = XLSX.utils.aoa_to_sheet(dataSheetData);

  // Set column widths for readability
  wsData["!cols"] = [
    { wch: 26 }, // Employee ID
    { wch: 25 }, // Name AR
    { wch: 25 }, // Name EN
    { wch: 24 }, // Department
    { wch: 18 }, // Mobile
    { wch: 22 }, // Plate Number
    { wch: 15 }, // Make
    { wch: 18 }, // Model
    { wch: 14 }, // Color
    { wch: 14 }, // Year
  ];

  XLSX.utils.book_append_sheet(wb, wsData, "بيانات الكادر والسيارات");

  // 2. Instructions Sheet
  const instructions = [
    ["تعليمات وضوابط تعبئة نموذج استيراد نظام حَرِّك (HARRIK Instructions)"],
    [""],
    ["1. الرقم الوظيفي (Employee ID):", "حقل إلزامي وفريد لكل موظف."],
    [
      "2. رقم اللوحة (Plate Number):",
      "حقل إلزامي للسيارة، يدعم الأرقام الإنجليزية (123456) أو الأرقام العربية (١٢٣٤٥٦) مع التوحيد التلقائي.",
    ],
    [
      "3. رقم الجوال (Mobile):",
      "يفضل إضافة مفتاح دولة قطر (+974) أو كتابة الرقم المحلي مباشرة (مثال: 55112233).",
    ],
    [
      "4. الاسم واللغة:",
      "يرجى كتابة الاسم بالعربية لظهوره في بطاقات التنبيه ولوحة الاتصال.",
    ],
    [
      "5. الأقسام (Department):",
      "إذا لم يكن القسم مضافاً مسبقاً في النظام، سيقوم حَرِّك بإنشائه تلقائياً وربطه بالموظف.",
    ],
    ["6. منع التكرار:", "يقوم النظام تلقائياً بفحص الأرقام المكررة داخل الملف وقاعدة البيانات لمنع التضارب."],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions["!cols"] = [{ wch: 30 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, "تعليمات الاستيراد");

  // Trigger file download
  XLSX.writeFile(wb, "HARRIK_Staff_Vehicles_Template.xlsx");
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV file and normalizes its columns
 */
export async function parseExcelFile(file: File): Promise<ExcelImportRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  // Get the first sheet
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];

  // Convert to JSON array of objects
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

  // Map arbitrary headers to standard keys
  return rawRows.map((row) => {
    // Helper to find a value across possible Arabic / English header aliases
    const findVal = (aliases: string[]) => {
      for (const alias of aliases) {
        for (const key of Object.keys(row)) {
          if (
            key.trim().toLowerCase() === alias.trim().toLowerCase() ||
            key.includes(alias)
          ) {
            return String(row[key]).trim();
          }
        }
      }
      return "";
    };

    return {
      employee_id: findVal(["employee_id", "الرقم الوظيفي", "employee id", "id"]),
      name_ar: findVal(["name_ar", "الاسم بالعربية", "الاسم", "اسم الموظف", "name ar"]),
      name_en: findVal(["name_en", "الاسم بالإنجليزية", "name en", "name"]),
      department: findVal(["department", "القسم", "الإدارة", "dept"]),
      mobile: findVal(["mobile", "رقم الجوال", "الجوال", "الهاتف", "phone"]),
      plate_number: findVal(["plate_number", "رقم اللوحة", "اللوحة", "plate number", "plate"]),
      vehicle_make: findVal(["vehicle_make", "الماركة", "الشركة", "نوع السيارة", "make"]),
      vehicle_model: findVal(["vehicle_model", "الموديل", "الطراز", "model"]),
      vehicle_color: findVal(["vehicle_color", "اللون", "color"]),
      vehicle_year: findVal(["vehicle_year", "سنة الصنع", "السنة", "الموديل/السنة", "year"]),
    };
  });
}

/**
 * Neutralizes CSV/Excel formula injection for user-controlled strings.
 * If a value starts with '=', '+', '-', or '@', prepend a single quote so spreadsheet programs treat it as plain text.
 */
export function sanitizeCellValue(val: any): any {
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.length > 0 && ["=", "+", "-", "@"].includes(trimmed[0])) {
      return "'" + val;
    }
  }
  return val;
}

/**
 * Exports vehicle directory records to an Excel workbook (.xlsx)
 */
export function exportVehiclesToExcel(vehicles: any[], filename = "HARRIK_Vehicles_Directory.xlsx") {
  const wb = XLSX.utils.book_new();

  const headers = [
    "رقم اللوحة",
    "اللوحة المعيارية",
    "الشركة المصنعة",
    "الموديل / الطراز",
    "اللون",
    "سنة الصنع",
    "اسم المالك (عربي)",
    "اسم المالك (إنجليزي)",
    "الرقم الوظيفي",
    "القسم",
    "رقم الجوال",
    "سيارة أساسية",
    "حالة السيارة",
  ];

  const rows = vehicles.map((v) => [
    sanitizeCellValue(v.plate_number || ""),
    sanitizeCellValue(v.normalized_plate || normalizePlateNumber(v.plate_number || "")),
    sanitizeCellValue(v.make || ""),
    sanitizeCellValue(v.model || ""),
    sanitizeCellValue(v.color || ""),
    sanitizeCellValue(v.year || ""),
    sanitizeCellValue(v.owner_name_ar || "غير مخصصة"),
    sanitizeCellValue(v.owner_name_en || ""),
    sanitizeCellValue(v.owner_employee_id || v.employee_id || ""),
    sanitizeCellValue(v.owner_dept || v.department || ""),
    sanitizeCellValue(v.owner_mobile || v.mobile || ""),
    v.is_primary ? "نعم" : "لا",
    v.is_active ? "مفعّلة" : "معطلة",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws["!cols"] = [
    { wch: 16 }, // Plate
    { wch: 18 }, // Norm plate
    { wch: 16 }, // Make
    { wch: 18 }, // Model
    { wch: 12 }, // Color
    { wch: 12 }, // Year
    { wch: 24 }, // Owner AR
    { wch: 24 }, // Owner EN
    { wch: 16 }, // Emp ID
    { wch: 22 }, // Dept
    { wch: 18 }, // Mobile
    { wch: 14 }, // Primary
    { wch: 14 }, // Active
  ];

  XLSX.utils.book_append_sheet(wb, ws, "دليل السيارات المعتمد");
  XLSX.writeFile(wb, filename);
}

/**
 * Exports parking alerts records to an Excel workbook (.xlsx)
 */
export function exportAlertsToExcel(alerts: any[], filename = "HARRIK_Parking_Alerts_Report.xlsx") {
  const wb = XLSX.utils.book_new();

  const headers = [
    "معرّف البلاغ",
    "رقم لوحة السيارة",
    "نوع التنبيه",
    "نص البلاغ",
    "اسم مالك السيارة",
    "اسم المبلّغ",
    "حالة البلاغ",
    "تاريخ ووقت الإنشاء",
    "تاريخ ووقت الحل",
  ];

  const rows = alerts.map((a) => {
    const statusLabel =
      a.status === "pending"
        ? "بانتظار الاستجابة"
        : a.status === "acknowledged"
        ? "تمت الاستجابة"
        : a.status === "resolved"
        ? "تم الحل"
        : a.status || "";

    return [
      sanitizeCellValue(a.id || ""),
      sanitizeCellValue(a.vehicle?.plate_number || a.plate_number || ""),
      sanitizeCellValue(a.alert_type?.name_ar || a.type || "تنبيه موقف"),
      sanitizeCellValue(a.message || a.notes || ""),
      sanitizeCellValue(a.owner?.name_ar || a.owner_name_ar || ""),
      sanitizeCellValue(a.reporter?.name_ar || a.reporter_name_ar || "الأفراد المصرح لهم"),
      statusLabel,
      a.created_at ? new Date(a.created_at).toLocaleString("ar-QA") : "",
      a.resolved_at ? new Date(a.resolved_at).toLocaleString("ar-QA") : "—",
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws["!cols"] = [
    { wch: 32 }, // ID
    { wch: 18 }, // Plate
    { wch: 20 }, // Type
    { wch: 35 }, // Message
    { wch: 24 }, // Owner
    { wch: 24 }, // Reporter
    { wch: 18 }, // Status
    { wch: 24 }, // Created at
    { wch: 24 }, // Resolved at
  ];

  XLSX.utils.book_append_sheet(wb, ws, "سجل بلاغات المواقف");
  XLSX.writeFile(wb, filename);
}

/**
 * Exports staff directory records to an Excel workbook (.xlsx)
 */
export function exportStaffToExcel(staffList: any[], filename = "HARRIK_Staff_Directory.xlsx") {
  const wb = XLSX.utils.book_new();

  const headers = [
    "الرقم الوظيفي",
    "الاسم بالعربية",
    "الاسم بالإنجليزية",
    "القسم",
    "رقم الجوال",
    "الدور / الصلاحية",
    "عدد السيارات المسجلة",
    "حالة الحساب",
  ];

  const rows = staffList.map((s) => [
    sanitizeCellValue(s.employee_id || ""),
    sanitizeCellValue(s.name_ar || ""),
    sanitizeCellValue(s.name_en || ""),
    sanitizeCellValue(s.department?.name_ar || s.department_name || ""),
    sanitizeCellValue(s.mobile || ""),
    s.role === "admin" ? "مدير نظام" : s.role === "security" ? "مسؤول أمن" : "كادر",
    s.staff_vehicles?.length || 0,
    s.is_active ? "نشط" : "معطل",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws["!cols"] = [
    { wch: 18 }, // Employee ID
    { wch: 26 }, // Name AR
    { wch: 26 }, // Name EN
    { wch: 24 }, // Department
    { wch: 20 }, // Mobile
    { wch: 18 }, // Role
    { wch: 20 }, // Vehicles Count
    { wch: 14 }, // Active Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, "دليل الكادر الوظيفي");
  XLSX.writeFile(wb, filename);
}

