"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  UserPlus,
  Car,
  Phone,
  Building,
  RefreshCw,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Users,
  Shield,
  Check,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { exportStaffToExcel } from "@/lib/excel-utils";
import { useEntityConfig } from "@/contexts/EntityConfigContext";

interface StaffRow {
  id: string;
  employee_id: string;
  name_ar: string;
  name_en: string;
  mobile: string;
  department_id?: string | null;
  department?: { id: string; name_ar: string; name_en: string } | null;
  role: string;
  preferred_language: string;
  is_active: boolean;
  staff_vehicles?: Array<{ id: string; is_primary: boolean; vehicle?: any }>;
}

export default function StaffDirectoryPage() {
  const { config } = useEntityConfig();
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name_ar: string; name_en: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formNameAr, setFormNameAr] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formMobile, setFormMobile] = useState("+974 ");
  const [formDepartmentId, setFormDepartmentId] = useState("");
  const [formRole, setFormRole] = useState("staff");
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const [staffRes, deptRes] = await Promise.all([
        fetch("/api/admin/staff"),
        fetch("/api/admin/departments"),
      ]);
      const staffData = await staffRes.json();
      const deptData = await deptRes.json();

      if (staffData.success && Array.isArray(staffData.staff)) {
        setStaffList(staffData.staff);
      }
      if (deptData.success && Array.isArray(deptData.departments)) {
        setDepartments(deptData.departments);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openAddModal = () => {
    triggerHaptic("selection");
    setFormEmployeeId("");
    setFormNameAr("");
    setFormNameEn("");
    setFormMobile("+974 ");
    setFormDepartmentId(departments[0]?.id || "");
    setFormRole("staff");
    setFormIsActive(true);
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (staff: StaffRow) => {
    triggerHaptic("selection");
    setSelectedStaff(staff);
    setFormEmployeeId(staff.employee_id || "");
    setFormNameAr(staff.name_ar || "");
    setFormNameEn(staff.name_en || "");
    setFormMobile(staff.mobile || "+974 ");
    setFormDepartmentId(staff.department_id || staff.department?.id || "");
    setFormRole(staff.role || "staff");
    setFormIsActive(staff.is_active);
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formEmployeeId.trim() || !formNameAr.trim() || !formMobile.trim()) {
      setFormError("يرجى ملء جميع الحقول الإلزامية: الرقم الوظيفي، الاسم بالعربية، ورقم الجوال");
      triggerHaptic("warning");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic("light");

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: formEmployeeId.trim(),
          nameAr: formNameAr.trim(),
          nameEn: formNameEn.trim() || formNameAr.trim(),
          mobile: formMobile.trim(),
          departmentId: formDepartmentId || null,
          role: formRole,
          isActive: formIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "فشلت إضافة الموظف");
        triggerHaptic("error");
      } else {
        triggerHaptic("success");
        setIsAddOpen(false);
        fetchStaff();
      }
    } catch (err: any) {
      setFormError(err.message || "حدث خطأ في الاتصال بالسيرفر");
      triggerHaptic("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setFormError(null);

    if (!formEmployeeId.trim() || !formNameAr.trim() || !formMobile.trim()) {
      setFormError("يرجى ملء جميع الحقول الإلزامية");
      triggerHaptic("warning");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic("light");

    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedStaff.id,
          employeeId: formEmployeeId.trim(),
          nameAr: formNameAr.trim(),
          nameEn: formNameEn.trim() || formNameAr.trim(),
          mobile: formMobile.trim(),
          departmentId: formDepartmentId || null,
          role: formRole,
          isActive: formIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "فشل تحديث بيانات الموظف");
        triggerHaptic("error");
      } else {
        triggerHaptic("success");
        setIsEditOpen(false);
        fetchStaff();
      }
    } catch (err: any) {
      setFormError(err.message || "حدث خطأ في الاتصال بالسيرفر");
      triggerHaptic("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (staff: StaffRow) => {
    triggerHaptic("medium");
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: staff.id,
          isActive: !staff.is_active,
        }),
      });
      if (res.ok) {
        setStaffList((prev) =>
          prev.map((s) => (s.id === staff.id ? { ...s, is_active: !s.is_active } : s))
        );
      }
    } catch {
      // Handled
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      s.name_ar?.includes(term) ||
      s.name_en?.toLowerCase().includes(term) ||
      s.employee_id?.includes(term) ||
      s.mobile?.includes(term);

    const deptName = s.department?.name_ar || "";
    const matchDept =
      deptFilter === "ALL" || deptName === deptFilter || s.department_id === deptFilter;

    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && s.is_active) ||
      (statusFilter === "INACTIVE" && !s.is_active);

    return matchSearch && matchDept && matchStatus;
  });

  return (
    <div className="relative min-h-screen">
      {/* Ambient Qatar Maroon Glow */}
      <div className="ambient-glow-qatar top-10 start-10 opacity-60 pointer-events-none" />
      <div className="ambient-glow-qatar bottom-20 end-10 opacity-40 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:py-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800/80">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-qatar hover:underline mb-2 transition active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>العودة للوحة الإدارة</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-arabic flex items-center gap-2.5">
              <span>دليل {config.memberLabel}</span>
              <span className="rounded-full bg-qatar-50 px-2.5 py-0.5 text-xs font-bold text-qatar dark:bg-qatar-950 dark:text-qatar-300">
                {staffList.length} {config.memberSingle}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              إدارة {config.memberLabel} في {config.venueName || "المنشأة"}، بيانات التواصل، الصلاحيات، والربط بالمركبات
            </p>
          </div>

          {/* Action Buttons: Add, Export Excel, Bulk Import */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Export Staff to Excel Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                exportStaffToExcel(filteredStaff, `HARRIK_${config.venueName || "Directory"}_Export.xlsx`);
              }}
              className="glass-btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
              title={`تصدير بيانات ${config.memberLabel} إلى ملف إكسل`}
            >
              <Download className="h-4 w-4 text-qatar" />
              <span>تصدير Excel (.xlsx)</span>
            </button>

            {/* Add Staff Button - Now Fully Connected to BottomSheet */}
            <button
              type="button"
              onClick={openAddModal}
              className="glass-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold shadow-md"
            >
              <UserPlus className="h-4 w-4" />
              <span>إضافة {config.memberSingle} جديد</span>
            </button>

            {/* Bulk Import Link */}
            <Link
              href="/admin/import"
              onClick={() => triggerHaptic("light")}
              className="glass-btn-secondary inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200"
              title={`استيراد دفعات ${config.memberLabel} والسيارات من ملفات إكسل`}
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>استيراد جماعي</span>
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute start-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`ابحث بالاسم، ${config.identifierLabel}، أو رقم الجوال...`}
              className="w-full rounded-2xl border border-slate-200/80 bg-white/80 ps-10 pe-4 py-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-white"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full sm:w-56 rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-3 text-xs font-bold text-slate-700 shadow-sm backdrop-blur focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
          >
            <option value="ALL">{config.unitLabelPlural || "كافة الأقسام"}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name_ar}>
                {d.name_ar}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44 rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-3 text-xs font-bold text-slate-700 shadow-sm backdrop-blur focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
          >
            <option value="ALL">كافة الحالات</option>
            <option value="ACTIVE">الحسابات النشطة</option>
            <option value="INACTIVE">الحسابات المعطلة</option>
          </select>
        </div>

        {/* Staff Table / List */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-qatar" />
            <p className="mt-2 text-xs font-bold">جاري تحميل دليل {config.memberLabel}...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <AlertCircle className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              {staffList.length === 0 ? config.emptyState : `لا يوجد ${config.memberSingle} يطابق معايير البحث`}
            </p>
          </div>
        ) : (
          <div className="glass-panel overflow-hidden rounded-3xl shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-100 bg-slate-100/70 text-[11px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                  <tr>
                    <th className="px-5 py-3.5 text-start">{config.identifierLabel}</th>
                    <th className="px-5 py-3.5 text-start">الاسم</th>
                    <th className="px-5 py-3.5 text-start">{config.unitLabel}</th>
                    <th className="px-5 py-3.5 text-start">الجوال</th>
                    <th className="px-5 py-3.5 text-start">السيارات المسجلة</th>
                    <th className="px-5 py-3.5 text-start">الصلاحية</th>
                    <th className="px-5 py-3.5 text-start">الحالة</th>
                    <th className="px-5 py-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/40 dark:bg-slate-900/40">
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                      <td className="px-5 py-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                        #{staff.employee_id}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-900 dark:text-white block font-arabic text-sm">
                          {staff.name_ar}
                        </span>
                        <span className="text-[11px] text-slate-400 font-sans">{staff.name_en}</span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300 font-arabic">
                        {staff.department?.name_ar || "-"}
                      </td>
                      <td className="px-5 py-4 font-mono font-semibold text-slate-700 dark:text-slate-300 numeric-plate">
                        {staff.mobile}
                      </td>
                      <td className="px-5 py-4">
                        <span className="glass-card inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80">
                          <Car className="h-3.5 w-3.5 text-qatar" />
                          <span>{staff.staff_vehicles?.length || 0} سيارة</span>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            staff.role === "admin"
                              ? "bg-qatar-50 text-qatar border border-qatar/20 dark:bg-qatar-950/60 dark:text-qatar-300"
                              : staff.role === "security"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                        >
                          {staff.role === "admin" ? "مدير نظام" : staff.role === "security" ? config.securityLabel : config.memberSingle}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(staff)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold transition active:scale-95"
                          title={staff.is_active ? "تعطيل الحساب" : "تفعيل الحساب"}
                        >
                          {staff.is_active ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              نشط
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              معطل
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => openEditModal(staff)}
                          className="glass-btn-secondary inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:text-qatar dark:text-slate-300"
                          title={`تعديل بيانات ${config.memberSingle} والصلاحيات`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Staff Modal (BottomSheet) */}
        <BottomSheet
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title={`إضافة ${config.memberSingle} جديد إلى دليل ${config.memberLabel}`}
        >
          <form onSubmit={handleSaveAdd} className="space-y-4">
            {formError && (
              <div className="glass-card rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {config.identifierLabel} *
              </label>
              <input
                type="text"
                required
                value={formEmployeeId}
                onChange={(e) => setFormEmployeeId(e.target.value)}
                placeholder="مثال: 155 أو 1024"
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم بالعربية *
                </label>
                <input
                  type="text"
                  required
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  placeholder="مثال: ناصر الكواري"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم بالإنجليزية
                </label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  placeholder="مثال: Nasser Al-Kuwari"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الجوال *
                </label>
                <input
                  type="text"
                  required
                  value={formMobile}
                  onChange={(e) => setFormMobile(e.target.value)}
                  placeholder="+974 5511 2233"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono numeric-plate"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {config.unitLabel}
                </label>
                <select
                  value={formDepartmentId}
                  onChange={(e) => setFormDepartmentId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">بدون تحديد</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name_ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الصلاحية والدور في النظام
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              >
                <option value="staff">{config.memberSingle} (استعلام وتنبيهات)</option>
                <option value="security">أمن ({config.securityLabel})</option>
                <option value="admin">مدير نظام (كامل الصلاحيات والإدارة)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="staffIsActive"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-qatar focus:ring-qatar"
              />
              <label htmlFor="staffIsActive" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                حساب نشط ومفعل
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="glass-btn-primary w-full rounded-2xl py-3.5 text-xs font-bold disabled:opacity-50"
            >
              {isSubmitting ? `جاري إضافة ${config.memberSingle}...` : `حفظ ${config.memberSingle} في الدليل`}
            </button>
          </form>
        </BottomSheet>

        {/* Edit Staff Modal (BottomSheet) */}
        <BottomSheet
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`تعديل بيانات ${config.memberSingle} والصلاحيات`}
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {formError && (
              <div className="glass-card rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {config.identifierLabel} *
              </label>
              <input
                type="text"
                required
                value={formEmployeeId}
                onChange={(e) => setFormEmployeeId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم بالعربية *
                </label>
                <input
                  type="text"
                  required
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم بالإنجليزية
                </label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الجوال *
                </label>
                <input
                  type="text"
                  required
                  value={formMobile}
                  onChange={(e) => setFormMobile(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono numeric-plate"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {config.unitLabel}
                </label>
                <select
                  value={formDepartmentId}
                  onChange={(e) => setFormDepartmentId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">بدون تحديد</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name_ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الصلاحية والدور في النظام
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              >
                <option value="staff">{config.memberSingle} (استعلام وتنبيهات)</option>
                <option value="security">أمن ({config.securityLabel})</option>
                <option value="admin">مدير نظام (كامل الصلاحيات والإدارة)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editStaffIsActive"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-qatar focus:ring-qatar"
              />
              <label htmlFor="editStaffIsActive" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                حساب نشط ومفعل
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="glass-btn-primary w-full rounded-2xl py-3.5 text-xs font-bold disabled:opacity-50"
            >
              {isSubmitting ? `جاري تحديث ${config.memberSingle}...` : "حفظ التعديلات"}
            </button>
          </form>
        </BottomSheet>
      </div>
    </div>
  );
}
