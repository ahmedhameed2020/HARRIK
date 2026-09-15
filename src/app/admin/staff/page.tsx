"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, UserPlus, Car, Phone, Building } from "lucide-react";

interface StaffRow {
  id: string;
  employee_id: string;
  name_ar: string;
  name_en: string;
  department: string;
  mobile: string;
  vehiclesCount: number;
  role: string;
  is_active: boolean;
}

const SEED_STAFF: StaffRow[] = [
  {
    id: "30000000-0000-0000-0000-000000000001",
    employee_id: "142",
    name_ar: "أحمد حسن",
    name_en: "Ahmed Hassan",
    department: "قسم اللغة الإنجليزية",
    mobile: "+974 5512 3456",
    vehiclesCount: 2,
    role: "admin",
    is_active: true,
  },
  {
    id: "30000000-0000-0000-0000-000000000002",
    employee_id: "101",
    name_ar: "خالد الكواري",
    name_en: "Khalid Al-Kuwari",
    department: "الأمن والسلامة",
    mobile: "+974 5598 7654",
    vehiclesCount: 1,
    role: "security",
    is_active: true,
  },
  {
    id: "30000000-0000-0000-0000-000000000003",
    employee_id: "103",
    name_ar: "محمد السليطي",
    name_en: "Mohammed Al-Sulaiti",
    department: "قسم اللغة العربية",
    mobile: "+974 5522 3344",
    vehiclesCount: 1,
    role: "staff",
    is_active: true,
  },
  {
    id: "30000000-0000-0000-0000-000000000004",
    employee_id: "104",
    name_ar: "عبدالله المري",
    name_en: "Abdullah Al-Marri",
    department: "قسم الرياضيات",
    mobile: "+974 6633 4455",
    vehiclesCount: 1,
    role: "staff",
    is_active: true,
  },
  {
    id: "30000000-0000-0000-0000-000000000005",
    employee_id: "105",
    name_ar: "سالم الهاجري",
    name_en: "Salem Al-Hajri",
    department: "قسم العلوم",
    mobile: "+974 7744 5566",
    vehiclesCount: 1,
    role: "staff",
    is_active: true,
  },
  {
    id: "30000000-0000-0000-0000-000000000006",
    employee_id: "106",
    name_ar: "عمر فاروق",
    name_en: "Omar Farooq",
    department: "قسم اللغة الإنجليزية",
    mobile: "+974 5588 9900",
    vehiclesCount: 1,
    role: "staff",
    is_active: true,
  },
];

export default function StaffDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  const filteredStaff = SEED_STAFF.filter((s) => {
    const matchSearch =
      s.name_ar.includes(searchTerm) ||
      s.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.employee_id.includes(searchTerm) ||
      s.mobile.includes(searchTerm);

    const matchDept = deptFilter === "ALL" || s.department === deptFilter;

    return matchSearch && matchDept;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-bold text-qatar hover:underline mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>العودة للوحة الإدارة</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-arabic">
            دليل الكادر الوظيفي (Staff Directory)
          </h1>
          <p className="text-xs text-slate-500">
            إدارة موظفي المدرسة وبيانات التواصل والسيارات المسجلة
          </p>
        </div>

        <Link
          href="/admin/import"
          className="inline-flex items-center gap-2 rounded-xl bg-qatar px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-qatar/20 hover:bg-qatar-900"
        >
          <UserPlus className="h-4 w-4" />
          <span>استيراد موظفين جدد</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث بالاسم، الرقم الوظيفي، أو رقم الجوال..."
            className="w-full rounded-xl border border-slate-200 bg-white pr-9 pl-4 py-2.5 text-sm focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="ALL">جميع الأقسام</option>
          <option value="قسم اللغة الإنجليزية">قسم اللغة الإنجليزية</option>
          <option value="قسم اللغة العربية">قسم اللغة العربية</option>
          <option value="قسم الرياضيات">قسم الرياضيات</option>
          <option value="قسم العلوم">قسم العلوم</option>
          <option value="الأمن والسلامة">الأمن والسلامة</option>
        </select>
      </div>

      {/* Staff Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b bg-slate-50 text-xs font-bold text-slate-500 dark:bg-slate-800/60 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">الرقم</th>
                <th className="px-5 py-3.5">اسم الموظف</th>
                <th className="px-5 py-3.5">القسم</th>
                <th className="px-5 py-3.5">الجوال</th>
                <th className="px-5 py-3.5">السيارات</th>
                <th className="px-5 py-3.5">الدور</th>
                <th className="px-5 py-3.5">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                    #{staff.employee_id}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-slate-900 dark:text-white block font-arabic">
                      {staff.name_ar}
                    </span>
                    <span className="text-xs text-slate-400 font-sans">{staff.name_en}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {staff.department}
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-300 numeric-plate">
                    {staff.mobile}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Car className="h-3 w-3 text-qatar" />
                      {staff.vehiclesCount} سيارة
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-md bg-qatar-50 px-2 py-0.5 text-xs font-bold text-qatar dark:bg-qatar-950/40 dark:text-qatar-300">
                      {staff.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      نشط
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
