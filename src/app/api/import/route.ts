import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { normalizePlateNumber } from "@/lib/plate-normalizer";
import { normalizePhoneNumber } from "@/lib/whatsapp";

export interface ImportRow {
  employee_id: string;
  name_en?: string;
  name_ar?: string;
  department?: string;
  mobile?: string;
  plate_number: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  vehicle_year?: number | string;
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
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    if (session.role !== "admin" && session.role !== "super_admin" && session.role !== "security") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin or Security access required" },
        { status: 403 }
      );
    }

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
      const empId = (row.employee_id || "").trim();
      const rawPlate = (row.plate_number || "").trim();
      const nameAr = (row.name_ar || "").trim();
      const nameEn = (row.name_en || "").trim();
      const deptName = (row.department || "").trim();
      const rawMobile = (row.mobile || "").trim();

      // Validate Employee ID
      if (!empId) {
        errors.push({ row: rowNum, field: "employee_id", message: "الرقم الوظيفي إلزامي" });
        return;
      }

      if (seenEmployeeIds.has(empId)) {
        errors.push({
          row: rowNum,
          field: "employee_id",
          message: `الرقم الوظيفي '${empId}' مكرر داخل الملف`,
        });
        return;
      }
      seenEmployeeIds.add(empId);

      // Validate Names
      if (!nameAr && !nameEn) {
        errors.push({ row: rowNum, field: "name_ar", message: "اسم الموظف إلزامي (عربي أو إنجليزي)" });
        return;
      }

      if (!nameAr && nameEn) {
        warnings.push({
          row: rowNum,
          field: "name_ar",
          message: "الاسم بالعربية مفقود، سيتم استخدام الاسم بالإنجليزية",
        });
      }

      // Validate Plate Number
      if (!rawPlate) {
        errors.push({ row: rowNum, field: "plate_number", message: "رقم اللوحة إلزامي لتسجيل السيارة" });
        return;
      }

      const normalizedPlate = normalizePlateNumber(rawPlate);
      if (normalizedPlate.length < 2) {
        errors.push({
          row: rowNum,
          field: "plate_number",
          message: "رقم اللوحة يجب أن يحتوي على رقمين على الأقل",
        });
        return;
      }

      if (seenPlates.has(normalizedPlate)) {
        errors.push({
          row: rowNum,
          field: "plate_number",
          message: `رقم اللوحة '${rawPlate}' مكرر داخل الملف`,
        });
        return;
      }
      seenPlates.add(normalizedPlate);

      // Validate Mobile Number
      const normPhone = normalizePhoneNumber(rawMobile, "974");
      if (!normPhone || normPhone.length < 8) {
        warnings.push({
          row: rowNum,
          field: "mobile",
          message: "تنسيق رقم الجوال غير مؤكد أو قصير",
        });
      }

      validRows.push({
        employee_id: empId,
        name_ar: nameAr || nameEn,
        name_en: nameEn || nameAr,
        department: deptName || "عام",
        mobile: normPhone || rawMobile,
        plate_number: rawPlate,
        normalized_plate: normalizedPlate,
        vehicle_make: (row.vehicle_make || "Toyota").trim(),
        vehicle_model: (row.vehicle_model || "Sedan").trim(),
        vehicle_color: (row.vehicle_color || "أبيض").trim(),
        vehicle_year: row.vehicle_year ? parseInt(String(row.vehicle_year), 10) : null,
      });
    });

    const isCommit = body.commit === true;

    // Dry-run preview
    if (!isCommit) {
      return NextResponse.json({
        success: true,
        committed: false,
        totalRows: rows.length,
        readyCount: validRows.length,
        warningCount: warnings.length,
        errorCount: errors.length,
        warnings,
        errors,
        validRows: validRows.slice(0, 100),
      });
    }

    // If there are fatal errors, do not commit
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "الملف يحتوي على أخطاء يجب معالجتها أولاً",
          errors,
        },
        { status: 400 }
      );
    }

    // Execute actual database insertion
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const orgId = session.organizationId;

    let importedCount = 0;

    for (const item of validRows) {
      // 1. Department resolution
      let deptId: string | null = null;
      if (item.department) {
        const { data: existingDept } = await supabase
          .from("departments")
          .select("id")
          .eq("organization_id", orgId)
          .or(`name_ar.eq.${item.department},name_en.eq.${item.department}`)
          .maybeSingle();

        if (existingDept) {
          deptId = existingDept.id;
        } else {
          // Create new department
          const newDeptId = crypto.randomUUID();
          const { data: newDept } = await supabase
            .from("departments")
            .insert({
              id: newDeptId,
              organization_id: orgId,
              code: item.department.substring(0, 10).toUpperCase(),
              name_ar: item.department,
              name_en: item.department,
            })
            .select("id")
            .maybeSingle();

          if (newDept) deptId = newDept.id;
        }
      }

      // 2. Staff Profile resolution / creation
      let staffId: string;
      const { data: existingStaff } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", orgId)
        .eq("employee_id", item.employee_id)
        .maybeSingle();

      if (existingStaff) {
        staffId = existingStaff.id;
        // Update contact/dept info
        await supabase
          .from("profiles")
          .update({
            name_ar: item.name_ar,
            name_en: item.name_en,
            mobile: item.mobile,
            department_id: deptId,
          })
          .eq("id", staffId);
      } else {
        // Create auth user and profile
        const sanitizedEmp = item.employee_id.toLowerCase().replace(/[^a-z0-9]/g, "");
        const staffEmail = `staff_${sanitizedEmp}@school.edu.qa`;

        const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
          email: staffEmail,
          password: "Password123!",
          email_confirm: true,
          user_metadata: {
            name_ar: item.name_ar,
            name_en: item.name_en,
            employee_id: item.employee_id,
          },
        });

        if (authErr) {
          const { data: users } = await adminClient.auth.admin.listUsers();
          const found = users?.users?.find((u) => u.email === staffEmail);
          staffId = found ? found.id : crypto.randomUUID();
        } else {
          staffId = authData.user.id;
        }

        await supabase.from("profiles").upsert({
          id: staffId,
          organization_id: orgId,
          employee_id: item.employee_id,
          name_ar: item.name_ar,
          name_en: item.name_en,
          mobile: item.mobile,
          department_id: deptId,
          role: "staff",
          is_active: true,
        });
      }

      // 3. Vehicle resolution / creation
      let vehicleId: string;
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("organization_id", orgId)
        .eq("normalized_plate", item.normalized_plate)
        .maybeSingle();

      if (existingVehicle) {
        vehicleId = existingVehicle.id;
        await supabase
          .from("vehicles")
          .update({
            plate_number: item.plate_number,
            make: item.vehicle_make,
            model: item.vehicle_model,
            color: item.vehicle_color,
            year: item.vehicle_year,
            is_active: true,
          })
          .eq("id", vehicleId);
      } else {
        vehicleId = crypto.randomUUID();
        await supabase.from("vehicles").insert({
          id: vehicleId,
          organization_id: orgId,
          plate_number: item.plate_number,
          normalized_plate: item.normalized_plate,
          make: item.vehicle_make,
          model: item.vehicle_model,
          color: item.vehicle_color,
          year: item.vehicle_year,
          is_active: true,
        });
      }

      // 4. Link staff to vehicle
      await supabase
        .from("staff_vehicles")
        .delete()
        .eq("organization_id", orgId)
        .eq("vehicle_id", vehicleId);

      await supabase.from("staff_vehicles").insert({
        organization_id: orgId,
        staff_id: staffId,
        vehicle_id: vehicleId,
        is_primary: true,
      });

      importedCount++;
    }

    // 5. Record Audit Log
    await supabase.from("audit_logs").insert({
      organization_id: orgId,
      actor_id: session.profile.id,
      action: "bulk_import",
      entity_type: "batch_import",
      entity_id: orgId,
      change_summary: {
        totalRows: rows.length,
        importedCount,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      committed: true,
      importedCount,
      totalRows: rows.length,
      message: `تم استيراد ${importedCount} سجل بنجاح وحفظها في قاعدة البيانات`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
