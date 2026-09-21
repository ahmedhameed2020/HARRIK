"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  UserPlus,
  Car,
  RefreshCw,
  Edit2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Phone,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { exportStaffToExcel } from "@/lib/excel-utils";
import { useEntityConfig } from "@/contexts/EntityConfigContext";
import { useLocale } from "@/contexts/LocaleContext";

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
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);

  const memberLabel = lang === "ar" ? config.memberLabel : config.memberLabelEn;
  const memberSingle = lang === "ar" ? config.memberSingle : config.memberSingleEn;
  const unitLabel = lang === "ar" ? config.unitLabel : config.unitLabelEn;
  const unitPlural = lang === "ar" ? config.unitLabelPlural : config.unitLabelPluralEn;
  const identifierLabel = lang === "ar" ? config.identifierLabel : config.identifierLabelEn;
  const securityLabel = lang === "ar" ? config.securityLabel : config.securityLabelEn;
  const emptyState = lang === "ar" ? config.emptyState : config.emptyStateEn;

  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name_ar: string; name_en: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formNameAr, setFormNameAr] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formMobile, setFormMobile] = useState("+974 ");
  const [formDepartmentId, setFormDepartmentId] = useState("");
  const [formRole, setFormRole] = useState("staff");
  const [formIsActive, setFormIsActive] = useState(true);

  const PAGE_SIZE = 50;

  // Debounce the search box so typing does not spam the server.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(searchTerm), 350);
    return () => clearTimeout(id);
  }, [searchTerm]);

  const buildStaffUrl = (offset: number) => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (debouncedTerm.trim()) params.set("q", debouncedTerm.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (deptFilter !== "ALL") params.set("departmentId", deptFilter);
    return `/api/admin/staff?${params.toString()}`;
  };

  // Server-side search + pagination (loading "more" appends the next page).
  const fetchStaff = async (offset = 0, append = false, loadDepartments = false) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);

    try {
      const [staffRes, deptRes] = await Promise.all([
        fetch(buildStaffUrl(offset)),
        loadDepartments ? fetch("/api/admin/departments") : Promise.resolve(null),
      ]);

      const staffData = await staffRes.json();
      if (staffData.success && Array.isArray(staffData.staff)) {
        setStaffList((prev) => {
          if (!append) return staffData.staff;
          const seen = new Set(prev.map((s) => s.id));
          return [...prev, ...staffData.staff.filter((s: StaffRow) => !seen.has(s.id))];
        });
        setHasMore(Boolean(staffData.hasMore));
      }

      if (deptRes) {
        const deptData = await deptRes.json();
        if (deptData.success && Array.isArray(deptData.departments)) {
          setDepartments(deptData.departments);
        }
      }
    } catch {
      // Handled
    } finally {
      if (append) setIsLoadingMore(false);
      else setIsLoading(false);
    }
  };

  // Initial load (departments included).
  useEffect(() => {
    fetchStaff(0, false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-query from the first page whenever search or filters change.
  const isFirstFilterRun = React.useRef(true);
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }
    fetchStaff(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm, statusFilter, deptFilter]);

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
      setFormError(L("يرجى ملء جميع الحقول الإلزامية: الرقم الوظيفي، الاسم بالعربية، ورقم الجوال", "Please fill all required fields: ID, Arabic name and mobile"));
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
        setFormError(data.error || L("فشلت إضافة الموظف", "Failed to add the member"));
        triggerHaptic("error");
      } else {
        triggerHaptic("success");
        setIsAddOpen(false);
        fetchStaff(0, false);
      }
    } catch (err: any) {
      setFormError(err.message || L("حدث خطأ في الاتصال بالسيرفر", "A server connection error occurred"));
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
      setFormError(L("يرجى ملء جميع الحقول الإلزامية", "Please fill all required fields"));
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
        setFormError(data.error || L("فشل تحديث بيانات الموظف", "Failed to update the member record"));
        triggerHaptic("error");
      } else {
        triggerHaptic("success");
        setIsEditOpen(false);
        fetchStaff(0, false);
      }
    } catch (err: any) {
      setFormError(err.message || L("حدث خطأ في الاتصال بالسيرفر", "A server connection error occurred"));
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

  // Search and filters are applied server-side; staffList already holds the
  // current page(s) matching the active criteria.
  const filteredStaff = staffList;

  const roleLabel = (role: string) =>
    role === "admin" ? L("مدير نظام", "Admin") : role === "security" ? securityLabel : memberSingle;

  return (
    <div className="relative min-h-screen">
      <div className="ambient-glow-qatar top-10 start-10 opacity-60 pointer-events-none" />
      <div className="ambient-glow-qatar bottom-20 end-10 opacity-40 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:py-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800/80">
          <div>
            <Link
              href="/admin"
              className="mb-2 inline-flex min-h-[44px] items-center gap-1.5 text-caption font-bold text-qatar transition hover:underline active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              <span>{L("العودة للوحة الإدارة", "Back to dashboard")}</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-arabic flex items-center gap-2.5">
              <span>{L(`دليل ${memberLabel}`, `${memberLabel} Directory`)}</span>
              <span className="rounded-full bg-qatar-50 px-2.5 py-0.5 text-xs font-bold text-qatar dark:bg-qatar-950 dark:text-qatar-300">
                {staffList.length} {memberSingle}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {L(
                `إدارة ${memberLabel} في ${config.venueName || "المنشأة"}، بيانات التواصل، الصلاحيات، والربط بالمركبات`,
                `Manage ${memberLabel} at ${config.venueName || "the facility"} — contact details, roles and vehicle links`
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                exportStaffToExcel(filteredStaff, `HARRIK_${config.venueName || "Directory"}_Export.xlsx`);
              }}
              className="btn btn-secondary gap-2 px-4 text-caption text-slate-800 dark:text-slate-100 shadow-sm"
              title={L(`تصدير بيانات ${memberLabel} إلى ملف إكسل`, `Export ${memberLabel} to Excel`)}
            >
              <Download className="h-4 w-4 text-qatar" />
              <span>{L("تصدير Excel (.xlsx)", "Export Excel (.xlsx)")}</span>
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="glass-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold shadow-md"
            >
              <UserPlus className="h-4 w-4" />
              <span>{L(`إضافة ${memberSingle} جديد`, `Add new ${memberSingle}`)}</span>
            </button>

            <Link
              href="/admin/import"
              onClick={() => triggerHaptic("light")}
              className="btn btn-secondary gap-2 px-3.5 text-caption text-slate-700 dark:text-slate-200"
              title={L(`استيراد دفعات ${memberLabel} والسيارات من ملفات إكسل`, `Bulk-import ${memberLabel} and vehicles from Excel`)}
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>{L("استيراد جماعي", "Bulk import")}</span>
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
              placeholder={L(`ابحث بالاسم، ${identifierLabel}، أو رقم الجوال...`, `Search by name, ${identifierLabel}, or mobile...`)}
              className="w-full rounded-2xl border border-slate-200/80 bg-white/80 ps-10 pe-4 py-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-white"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full sm:w-56 rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-3 text-xs font-bold text-slate-700 shadow-sm backdrop-blur focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
          >
            <option value="ALL">{unitPlural || L("كافة الأقسام", "All units")}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {lang === "ar" ? d.name_ar : d.name_en || d.name_ar}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44 rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-3 text-xs font-bold text-slate-700 shadow-sm backdrop-blur focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
          >
            <option value="ALL">{L("كافة الحالات", "All statuses")}</option>
            <option value="ACTIVE">{L("الحسابات النشطة", "Active accounts")}</option>
            <option value="INACTIVE">{L("الحسابات المعطلة", "Disabled accounts")}</option>
          </select>
        </div>

        {/* Staff Table / List */}
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : filteredStaff.length === 0 ? (
          <div className="surface-card flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-4 text-body font-bold text-slate-800 dark:text-slate-200">
              {staffList.length === 0 ? emptyState : L(`لا يوجد ${memberSingle} يطابق معايير البحث`, `No ${memberSingle} matches the search criteria`)}
            </p>
            <p className="mt-1 max-w-sm text-caption text-slate-500 dark:text-slate-400">
              {staffList.length === 0
                ? L("ابدأ بإضافة فرد مصرح له أو استورد قائمة Excel.", "Add a member or import an Excel sheet to get started.")
                : L("جرّب تعديل كلمة البحث أو الفلاتر.", "Try adjusting the search term or filters.")}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: one card per person. A six-column table on a 390px screen
                squeezes the content and buries rows under the floating nav. */}
            <div className="space-y-3 md:hidden">
              {filteredStaff.map((staff) => (
                <article key={staff.id} className="surface-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-body font-bold text-slate-900 dark:text-white font-arabic">
                        {lang === "ar" ? staff.name_ar : staff.name_en || staff.name_ar}
                      </h3>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-caption text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-bold">#{staff.employee_id}</span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="font-arabic">
                          {lang === "ar"
                            ? staff.department?.name_ar || "—"
                            : staff.department?.name_en || staff.department?.name_ar || "—"}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={`rounded-pill px-2.5 py-1 text-caption font-bold ${
                          staff.role === "admin"
                            ? "bg-qatar-50 text-qatar dark:bg-qatar-950/60 dark:text-qatar-300"
                            : staff.role === "security"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                        }`}
                      >
                        {roleLabel(staff.role)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditModal(staff)}
                        aria-label={L(`تعديل بيانات ${memberSingle}`, `Edit ${memberSingle}`)}
                        className="flex h-11 w-11 items-center justify-center rounded-control border border-line text-slate-600 transition active:scale-95 dark:text-slate-300"
                      >
                        <Edit2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                    {staff.mobile ? (
                      <a
                        href={`tel:${staff.mobile}`}
                        className="flex min-h-[44px] items-center gap-2 rounded-control bg-surface-sunken/60 px-3 font-mono text-caption font-bold text-slate-700 dark:text-slate-200"
                      >
                        <Phone className="h-3.5 w-3.5 text-qatar" aria-hidden="true" />
                        {staff.mobile}
                      </a>
                    ) : (
                      <span className="text-caption text-slate-500 dark:text-slate-400">
                        {L("بدون رقم", "No number")}
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-pill border border-line px-2.5 py-1 text-caption font-bold text-slate-600 dark:text-slate-300">
                        <Car className="h-3.5 w-3.5 text-qatar" aria-hidden="true" />
                        {staff.staff_vehicles?.length || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(staff)}
                        className={`flex min-h-[44px] items-center gap-1.5 rounded-pill px-3 text-caption font-bold ${
                          staff.is_active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            staff.is_active ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {staff.is_active ? L("نشط", "Active") : L("معطل", "Disabled")}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop: the full table. */}
            <div className="surface-card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-caption font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 text-start">{identifierLabel}</th>
                    <th className="px-5 py-3.5 text-start">{L("الاسم", "Name")}</th>
                    <th className="px-5 py-3.5 text-start">{unitLabel}</th>
                    <th className="px-5 py-3.5 text-start">{L("الجوال", "Mobile")}</th>
                    <th className="px-5 py-3.5 text-start">{L("السيارات المسجلة", "Registered vehicles")}</th>
                    <th className="px-5 py-3.5 text-start">{L("الصلاحية", "Role")}</th>
                    <th className="px-5 py-3.5 text-start">{L("الحالة", "Status")}</th>
                    <th className="px-5 py-3.5 text-center">{L("الإجراءات", "Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                        #{staff.employee_id}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-900 dark:text-white block font-arabic text-sm">
                          {lang === "ar" ? staff.name_ar : staff.name_en || staff.name_ar}
                        </span>
                        <span className="text-caption text-slate-500 font-sans">
                          {lang === "ar" ? staff.name_en : staff.name_ar}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300 font-arabic">
                        {lang === "ar"
                          ? staff.department?.name_ar || "-"
                          : staff.department?.name_en || staff.department?.name_ar || "-"}
                      </td>
                      <td className="px-5 py-4 font-mono font-semibold text-slate-700 dark:text-slate-300 numeric-plate">
                        {staff.mobile}
                      </td>
                      <td className="px-5 py-4">
                        <span className="glass-card inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80">
                          <Car className="h-3.5 w-3.5 text-qatar" />
                          <span>{staff.staff_vehicles?.length || 0} {L("سيارة", "veh.")}</span>
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
                          {roleLabel(staff.role)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(staff)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold transition active:scale-95"
                          title={staff.is_active ? L("تعطيل الحساب", "Disable account") : L("تفعيل الحساب", "Enable account")}
                        >
                          {staff.is_active ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {L("نشط", "Active")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              {L("معطل", "Disabled")}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => openEditModal(staff)}
                          className="glass-btn-secondary inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:text-qatar dark:text-slate-300"
                          title={L(`تعديل بيانات ${memberSingle} والصلاحيات`, `Edit ${memberSingle} details and role`)}
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
          </>
        )}

        {/* Server-side pagination */}
        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                fetchStaff(staffList.length, true);
              }}
              disabled={isLoadingMore}
              className="btn btn-secondary gap-2 px-5 text-caption"
            >
              {isLoadingMore ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-qatar" /> : null}
              <span>{L("تحميل المزيد", "Load more")}</span>
            </button>
          </div>
        )}

        {/* Add Staff Modal (BottomSheet) */}
        <BottomSheet
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title={L(`إضافة ${memberSingle} جديد إلى دليل ${memberLabel}`, `Add a new ${memberSingle} to the ${memberLabel} directory`)}
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
                {identifierLabel} *
              </label>
              <input
                type="text"
                required
                value={formEmployeeId}
                onChange={(e) => setFormEmployeeId(e.target.value)}
                placeholder={L("مثال: 155 أو 1024", "e.g. 155 or 1024")}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {L("الاسم بالعربية *", "Name (Arabic) *")}
                </label>
                <input
                  type="text"
                  required
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  placeholder={L("مثال: ناصر الكواري", "e.g. ناصر الكواري")}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {L("الاسم بالإنجليزية", "Name (English)")}
                </label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  placeholder="e.g. Nasser Al-Kuwari"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {L("رقم الجوال *", "Mobile number *")}
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
                  {unitLabel}
                </label>
                <select
                  value={formDepartmentId}
                  onChange={(e) => setFormDepartmentId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">{L("بدون تحديد", "Unassigned")}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {lang === "ar" ? d.name_ar : d.name_en || d.name_ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {L("الصلاحية والدور في النظام", "Role & permissions")}
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              >
                <option value="staff">{L(`${memberSingle} (استعلام وتنبيهات)`, `${memberSingle} (lookup & alerts)`)}</option>
                <option value="security">{L(`أمن (${securityLabel})`, `Security (${securityLabel})`)}</option>
                <option value="admin">{L("مدير نظام (كامل الصلاحيات والإدارة)", "Admin (full permissions)")}</option>
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
                {L("حساب نشط ومفعل", "Active and enabled account")}
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="glass-btn-primary w-full rounded-2xl py-3.5 text-xs font-bold disabled:opacity-50"
            >
              {isSubmitting
                ? L(`جاري إضافة ${memberSingle}...`, `Adding ${memberSingle}...`)
                : L(`حفظ ${memberSingle} في الدليل`, `Save ${memberSingle} to directory`)}
            </button>
          </form>
        </BottomSheet>

        {/* Edit Staff Modal (BottomSheet) */}
        <BottomSheet
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={L(`تعديل بيانات ${memberSingle} والصلاحيات`, `Edit ${memberSingle} details and role`)}
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
                {identifierLabel} *
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
                  {L("الاسم بالعربية *", "Name (Arabic) *")}
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
                  {L("الاسم بالإنجليزية", "Name (English)")}
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
                  {L("رقم الجوال *", "Mobile number *")}
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
                  {unitLabel}
                </label>
                <select
                  value={formDepartmentId}
                  onChange={(e) => setFormDepartmentId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">{L("بدون تحديد", "Unassigned")}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {lang === "ar" ? d.name_ar : d.name_en || d.name_ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {L("الصلاحية والدور في النظام", "Role & permissions")}
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              >
                <option value="staff">{L(`${memberSingle} (استعلام وتنبيهات)`, `${memberSingle} (lookup & alerts)`)}</option>
                <option value="security">{L(`أمن (${securityLabel})`, `Security (${securityLabel})`)}</option>
                <option value="admin">{L("مدير نظام (كامل الصلاحيات والإدارة)", "Admin (full permissions)")}</option>
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
                {L("حساب نشط ومفعل", "Active and enabled account")}
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="glass-btn-primary w-full rounded-2xl py-3.5 text-xs font-bold disabled:opacity-50"
            >
              {isSubmitting ? L(`جاري تحديث ${memberSingle}...`, `Updating ${memberSingle}...`) : L("حفظ التعديلات", "Save changes")}
            </button>
          </form>
        </BottomSheet>
      </div>
    </div>
  );
}
