"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Car,
  Plus,
  ShieldCheck,
  RefreshCw,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Download,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { normalizePlateNumber } from "@/lib/plate-normalizer";
import { exportVehiclesToExcel } from "@/lib/excel-utils";
import { useLocale } from "@/contexts/LocaleContext";

interface VehicleRow {
  id: string;
  plate_number: string;
  normalized_plate: string;
  make: string;
  model: string;
  color: string;
  year?: number | null;
  owner_id?: string | null;
  owner_name_ar?: string | null;
  owner_name_en?: string | null;
  owner_dept?: string | null;
  owner_dept_en?: string | null;
  owner_mobile?: string | null;
  is_primary: boolean;
  is_active: boolean;
}

interface StaffOption {
  id: string;
  employee_id: string;
  name_ar: string;
  name_en: string;
  department?: { name_ar: string } | null;
}

export default function VehiclesDirectoryPage() {
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [formPlate, setFormPlate] = useState("");
  const [formMake, setFormMake] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formColor, setFormColor] = useState("أبيض (White)");
  const [formYear, setFormYear] = useState<string>("2024");
  const [formOwnerId, setFormOwnerId] = useState("");
  const [formIsPrimary, setFormIsPrimary] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);

  const PAGE_SIZE = 50;

  // Debounce the search box so typing does not spam the server.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(searchTerm), 350);
    return () => clearTimeout(id);
  }, [searchTerm]);

  const buildVehiclesUrl = (offset: number) => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (debouncedTerm.trim()) params.set("q", debouncedTerm.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    return `/api/admin/vehicles?${params.toString()}`;
  };

  // Server-side search + pagination (loading "more" appends the next page).
  const fetchVehiclesAndStaff = async (offset = 0, append = false, loadStaff = false) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);

    try {
      const [vRes, sRes] = await Promise.all([
        fetch(buildVehiclesUrl(offset)),
        loadStaff ? fetch("/api/admin/staff") : Promise.resolve(null),
      ]);
      const vData = await vRes.json();

      if (vData.success && Array.isArray(vData.vehicles)) {
        setVehicles((prev) => {
          if (!append) return vData.vehicles;
          const seen = new Set(prev.map((v) => v.id));
          return [...prev, ...vData.vehicles.filter((v: VehicleRow) => !seen.has(v.id))];
        });
        setHasMore(Boolean(vData.hasMore));
      }

      if (sRes) {
        const sData = await sRes.json();
        if (sData.success && Array.isArray(sData.staff)) {
          setStaffOptions(sData.staff);
        }
      }
    } catch {
      // Handled
    } finally {
      if (append) setIsLoadingMore(false);
      else setIsLoading(false);
    }
  };

  // Initial load (owner options included).
  useEffect(() => {
    fetchVehiclesAndStaff(0, false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-query from the first page whenever search or status changes.
  const isFirstFilterRun = React.useRef(true);
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }
    fetchVehiclesAndStaff(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm, statusFilter]);

  const openAddModal = () => {
    triggerHaptic("selection");
    setFormPlate("");
    setFormMake("");
    setFormModel("");
    setFormColor("أبيض (White)");
    setFormYear("2024");
    setFormOwnerId(staffOptions[0]?.id || "");
    setFormIsPrimary(true);
    setFormIsActive(true);
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (v: VehicleRow) => {
    triggerHaptic("selection");
    setSelectedVehicle(v);
    setFormPlate(v.plate_number);
    setFormMake(v.make);
    setFormModel(v.model);
    setFormColor(v.color || "أبيض (White)");
    setFormYear(v.year ? String(v.year) : "");
    setFormOwnerId(v.owner_id || "");
    setFormIsPrimary(v.is_primary);
    setFormIsActive(v.is_active);
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formPlate || !formMake || !formModel) {
      setFormError(L("يرجى إدخال رقم اللوحة ونوع وطراز السيارة", "Please enter the plate number, make and model"));
      triggerHaptic("warning");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic("light");

    try {
      const res = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber: formPlate,
          make: formMake,
          model: formModel,
          color: formColor,
          year: formYear ? parseInt(formYear, 10) : null,
          ownerId: formOwnerId || null,
          isPrimary: formIsPrimary,
          isActive: formIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || L("فشلت إضافة السيارة", "Failed to add the vehicle"));
        triggerHaptic("error");
      } else {
        triggerHaptic("success");
        setIsAddOpen(false);
        fetchVehiclesAndStaff(0, false);
      }
    } catch (err: any) {
      setFormError(err.message || L("حدث خطأ في الاتصال", "A connection error occurred"));
      triggerHaptic("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    setFormError(null);

    setIsSubmitting(true);
    triggerHaptic("light");

    try {
      const res = await fetch("/api/admin/vehicles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedVehicle.id,
          plateNumber: formPlate,
          make: formMake,
          model: formModel,
          color: formColor,
          year: formYear ? parseInt(formYear, 10) : null,
          ownerId: formOwnerId || null,
          isPrimary: formIsPrimary,
          isActive: formIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || L("فشل تحديث بيانات السيارة", "Failed to update the vehicle"));
        triggerHaptic("error");
      } else {
        triggerHaptic("success");
        setIsEditOpen(false);
        fetchVehiclesAndStaff(0, false);
      }
    } catch (err: any) {
      setFormError(err.message || L("حدث خطأ في الاتصال", "A connection error occurred"));
      triggerHaptic("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (v: VehicleRow) => {
    triggerHaptic("medium");
    try {
      const res = await fetch("/api/admin/vehicles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: v.id,
          isActive: !v.is_active,
        }),
      });
      if (res.ok) {
        setVehicles((prev) =>
          prev.map((item) => (item.id === v.id ? { ...item, is_active: !item.is_active } : item))
        );
      }
    } catch {
      // Handled
    }
  };

  // Search and status filtering are applied server-side; `vehicles` already
  // holds the current page(s) matching the active criteria.
  const filteredVehicles = vehicles;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800/80">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-qatar hover:underline mb-2 transition active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            <span>{L("العودة للوحة الإدارة", "Back to dashboard")}</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-arabic">
            {L("دليل المركبات المصرح بها (Vehicle Directory)", "Authorized Vehicle Directory")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {L("إدارة أرقام اللوحات القطرية، تخصيص المالكين، وتحديث المركبات المسجلة", "Manage Qatari plate numbers, assign owners and update registered vehicles")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("medium");
              exportVehiclesToExcel(filteredVehicles, "HARRIK_Vehicles_Directory.xlsx");
            }}
            className="glass-btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
          >
            <Download className="h-4 w-4 text-qatar" />
            <span>{L("تصدير إلى Excel (.xlsx)", "Export to Excel (.xlsx)")}</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="glass-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>{L("إضافة سيارة جديدة", "Add new vehicle")}</span>
          </button>
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
            placeholder={L("ابحث برقم اللوحة، الماركة، أو اسم المالك...", "Search by plate, make, or owner name...")}
            className="w-full rounded-2xl border border-slate-200/80 bg-white/80 ps-10 pe-4 py-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-white font-mono"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48 rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-3 text-xs font-bold text-slate-700 shadow-sm backdrop-blur focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
        >
          <option value="ALL">{L("كافة الحالات", "All statuses")}</option>
          <option value="ACTIVE">{L("السيارات المفعّلة", "Active vehicles")}</option>
          <option value="INACTIVE">{L("المعطلة أو المؤرشفة", "Disabled or archived")}</option>
        </select>
      </div>

      {/* Vehicles Grid */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : filteredVehicles.length === 0 ? (
        <div className="py-20 text-center text-slate-400">
          <AlertCircle className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
            {L("لا توجد سيارة تطابق معايير البحث", "No vehicle matches the search criteria")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((v) => (
            <div
              key={v.id}
              className="glass-panel rounded-3xl p-5 shadow-sm transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 space-y-4"
            >
              {/* Top Row: Plate & Actions */}
              <div className="flex items-start justify-between gap-3">
                {/* Qatar Plate Badge */}
                <div className="qatar-plate-frame flex items-stretch h-11 rounded-xl overflow-hidden border border-slate-300 bg-white shadow-sm ring-1 ring-slate-200/80 dark:border-slate-700 dark:bg-slate-900">
                  <div className="bg-qatar flex flex-col items-center justify-center px-2 py-0.5 text-white">
                    <span className="text-[8px] font-black leading-none font-arabic">قطر</span>
                    <span className="text-[6px] font-bold tracking-widest leading-none mt-0.5">QATAR</span>
                  </div>
                  <div className="flex items-center px-3 font-mono text-base font-black tracking-wider text-slate-900 dark:text-white">
                    {v.plate_number}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(v)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition active:scale-95"
                    title={L("تعديل السيارة أو إعادة تعيين المالك", "Edit vehicle or reassign owner")}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(v)}
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition active:scale-95 ${
                      v.is_active
                        ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    title={v.is_active ? L("تعطيل السيارة", "Disable vehicle") : L("تفعيل السيارة", "Enable vehicle")}
                  >
                    {v.is_active ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Vehicle Specs */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-arabic">
                    {v.make} {v.model}
                  </span>
                  {v.year && (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-mono">
                      {v.year}
                    </span>
                  )}
                  {v.is_primary && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {L("أساسية", "Primary")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{v.color}</p>
              </div>

              {/* Owner Info */}
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{L("المالك:", "Owner:")}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-arabic">
                    {v.owner_name_ar || L("غير مخصصة", "Unassigned")}
                  </span>
                </div>
                {v.owner_dept && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{L("القسم:", "Unit:")}</span>
                    <span className="text-slate-600 dark:text-slate-400 font-arabic">
                      {lang === "ar" ? v.owner_dept : v.owner_dept_en || v.owner_dept}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Server-side pagination */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              fetchVehiclesAndStaff(vehicles.length, true);
            }}
            disabled={isLoadingMore}
            className="glass-btn-secondary inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50 dark:text-slate-200"
          >
            {isLoadingMore ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-qatar" /> : null}
            <span>{L("تحميل المزيد", "Load more")}</span>
          </button>
        </div>
      )}

      {/* Add Vehicle Modal / BottomSheet */}
      <BottomSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={L("إضافة سيارة جديدة إلى الدليل", "Add a new vehicle to the directory")}
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          {formError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Live Qatar Plate Preview */}
          <div className="flex justify-center py-2">
            <div className="qatar-plate-frame flex items-stretch h-14 rounded-2xl overflow-hidden border border-slate-300 bg-white shadow-md ring-2 ring-slate-200/80 dark:border-slate-700 dark:bg-slate-900">
              <div className="bg-qatar flex flex-col items-center justify-center px-3 py-1 text-white">
                <span className="text-[10px] font-black leading-none font-arabic">قطر</span>
                <span className="text-[7px] font-bold tracking-widest leading-none mt-0.5">QATAR</span>
              </div>
              <div className="flex items-center px-5 font-mono text-xl font-black tracking-widest text-slate-900 dark:text-white min-w-[120px] justify-center">
                {normalizePlateNumber(formPlate) || "••••••"}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {L("رقم اللوحة * (يقبل الأرقام العربية والإنجليزية)", "Plate number * (accepts Arabic & Western digits)")}
            </label>
            <input
              type="text"
              required
              value={formPlate}
              onChange={(e) => setFormPlate(e.target.value)}
              placeholder={L("مثال: 482731 أو ٤٨٢٧٣١", "e.g. 482731")}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {L("الشركة المصنعة *", "Make *")}
              </label>
              <input
                type="text"
                required
                value={formMake}
                onChange={(e) => setFormMake(e.target.value)}
                placeholder="Toyota, Lexus, Nissan..."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {L("الموديل / الطراز *", "Model *")}
              </label>
              <input
                type="text"
                required
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                placeholder="Land Cruiser, Patrol..."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {L("اللون", "Color")}
              </label>
              <input
                type="text"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                placeholder="أبيض, أسود, رمادي..."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {L("سنة الصنع", "Year")}
              </label>
              <input
                type="number"
                value={formYear}
                onChange={(e) => setFormYear(e.target.value)}
                placeholder="2024"
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {L("المالك (عضو الكادر)", "Owner (staff member)")}
            </label>
            <select
              value={formOwnerId}
              onChange={(e) => setFormOwnerId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            >
              <option value="">{L("بدون مالك حالياً", "No owner assigned")}</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_ar} (#{s.employee_id}) — {s.department?.name_ar || ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="addIsPrimary"
              checked={formIsPrimary}
              onChange={(e) => setFormIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-qatar focus:ring-qatar"
            />
            <label htmlFor="addIsPrimary" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {L("السيارة الأساسية للموظف", "Primary vehicle for the member")}
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-qatar py-3.5 text-xs font-bold text-white shadow-lg shadow-qatar/25 transition active:scale-95 hover:bg-qatar-900 disabled:opacity-50"
          >
            {isSubmitting ? L("جاري الحفظ...", "Saving...") : L("حفظ السيارة", "Save vehicle")}
          </button>
        </form>
      </BottomSheet>

      {/* Edit Vehicle Modal / BottomSheet */}
      <BottomSheet
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={L("تعديل بيانات السيارة وإعادة تعيين المالك", "Edit vehicle details and reassign owner")}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {formError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Live Qatar Plate Preview */}
          <div className="flex justify-center py-2">
            <div className="qatar-plate-frame flex items-stretch h-14 rounded-2xl overflow-hidden border border-slate-300 bg-white shadow-md ring-2 ring-slate-200/80 dark:border-slate-700 dark:bg-slate-900">
              <div className="bg-qatar flex flex-col items-center justify-center px-3 py-1 text-white">
                <span className="text-[10px] font-black leading-none font-arabic">قطر</span>
                <span className="text-[7px] font-bold tracking-widest leading-none mt-0.5">QATAR</span>
              </div>
              <div className="flex items-center px-5 font-mono text-xl font-black tracking-widest text-slate-900 dark:text-white min-w-[120px] justify-center">
                {normalizePlateNumber(formPlate) || "••••••"}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {L("رقم اللوحة *", "Plate number *")}
            </label>
            <input
              type="text"
              required
              value={formPlate}
              onChange={(e) => setFormPlate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {L("الشركة المصنعة *", "Make *")}
              </label>
              <input
                type="text"
                required
                value={formMake}
                onChange={(e) => setFormMake(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {L("الموديل / الطراز *", "Model *")}
              </label>
              <input
                type="text"
                required
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {L("اللون", "Color")}
              </label>
              <input
                type="text"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                placeholder="أبيض, أسود, رمادي..."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {L("سنة الصنع", "Year")}
              </label>
              <input
                type="number"
                value={formYear}
                onChange={(e) => setFormYear(e.target.value)}
                placeholder="2024"
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {L("المالك (إعادة تعيين المالك)", "Owner (reassign)")}
            </label>
            <select
              value={formOwnerId}
              onChange={(e) => setFormOwnerId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            >
              <option value="">{L("بدون مالك", "No owner")}</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_ar} (#{s.employee_id}) — {s.department?.name_ar || ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="editIsActive"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-qatar focus:ring-qatar"
            />
            <label htmlFor="editIsActive" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {L("السيارة مفعّلة بالدليل", "Vehicle enabled in directory")}
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-qatar py-3.5 text-xs font-bold text-white shadow-lg shadow-qatar/25 transition active:scale-95 hover:bg-qatar-900 disabled:opacity-50"
          >
            {isSubmitting ? L("جاري التحديث...", "Updating...") : L("حفظ التعديلات", "Save changes")}
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}

