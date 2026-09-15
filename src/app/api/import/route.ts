import { NextRequest, NextResponse } from "next/server";
import { normalizePlateNumber } from "@/lib/plate-normalizer";
import { normalizePhoneNumber } from "@/lib/whatsapp";

export interface ImportRow {
  employee_id: string;
  name_en: string;
  name_ar: string;
  department: string;
  mobile: string;
  plate_number: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationWarning {
  row: number;
  field: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows: ImportRow[] = body.rows || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: "No data rows provided" }, { status: 400 });
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const validRows: any[] = [];

    const seenEmployeeIds = new Set<string>();
    const seenPlates = new Set<string>();

    rows.forEach((row, index) => {
      const rowNum = index + 1;

      // Validate Employee ID
      if (!row.employee_id || !row.employee_id.trim()) {
        errors.push({ row: rowNum, field: "employee_id", message: "Employee ID is required" });
        return;
      }

      if (seenEmployeeIds.has(row.employee_id.trim())) {
        errors.push({ row: rowNum, field: "employee_id", message: `Duplicate employee ID '${row.employee_id}' in file` });
        return;
      }
      seenEmployeeIds.add(row.employee_id.trim());

      // Validate Names
      if (!row.name_ar || !row.name_ar.trim()) {
        warnings.push({ row: rowNum, field: "name_ar", message: "Arabic name missing, using English name" });
      }

      // Validate Plate Number
      if (!row.plate_number || !row.plate_number.trim()) {
        errors.push({ row: rowNum, field: "plate_number", message: "Plate number is required for vehicle registry" });
        return;
      }

      const normalizedPlate = normalizePlateNumber(row.plate_number);
      if (normalizedPlate.length < 3) {
        errors.push({ row: rowNum, field: "plate_number", message: "Plate number must have at least 3 characters" });
        return;
      }

      if (seenPlates.has(normalizedPlate)) {
        errors.push({ row: rowNum, field: "plate_number", message: `Duplicate plate '${row.plate_number}' in file` });
        return;
      }
      seenPlates.add(normalizedPlate);

      // Validate Mobile Number
      const normPhone = normalizePhoneNumber(row.mobile, "974");
      if (!normPhone || normPhone.length < 8) {
        warnings.push({ row: rowNum, field: "mobile", message: "Mobile number format is unverified" });
      }

      validRows.push({
        ...row,
        normalized_plate: normalizedPlate,
        normalized_mobile: normPhone,
      });
    });

    const isCommit = body.commit === true;

    return NextResponse.json({
      success: true,
      committed: isCommit && errors.length === 0,
      totalRows: rows.length,
      readyCount: validRows.length,
      warningCount: warnings.length,
      errorCount: errors.length,
      warnings,
      errors,
      validRows: validRows.slice(0, 50), // Preview sample
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
