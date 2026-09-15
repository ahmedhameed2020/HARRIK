"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Car, Plus, ShieldCheck } from "lucide-react";

interface VehicleRow {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  color: string;
  year?: number;
  owner_name: string;
  owner_dept: string;
  is_primary: boolean;
  is_active: boolean;
}

const SEED_VEHICLES: VehicleRow[] = [
  {
    id: "40000000-0000-0000-0000-000000000001",
    plate_number: "482731",
    make: "Toyota",
    model: "Land Cruiser",
    color: "أبيض (White)",
    year: 2023,
    owner_name: "أحمد حسن (Ahmed Hassan)",
    owner_dept: "قسم اللغة الإنجليزية",
    is_primary: true,
    is_active: true,
  },
  {
    id: "40000000-0000-0000-0000-000000000002",
    plate_number: "112731",
    make: "Toyota",
    model: "Camry",
    color: "فضي (Silver)",
    year: 2022,
    owner_name: "محمد السليطي",
    owner_dept: "قسم اللغة العربية",
    is_primary: true,
    is_active: true,
  },
  {
    id: "40000000-0000-0000-0000-000000000003",
    plate_number: "771925",
    make: "Nissan",
    model: "Patrol",
    color: "أسود (Black)",
    year: 2024,
    owner_name: "أحمد حسن (Ahmed Hassan)",
    owner_dept: "قسم اللغة الإنجليزية",
    is_primary: false,
    is_active: true,
  },
  {
    id: "40000000-0000-0000-0000-000000000004",
    plate_number: "554820",
    make: "Lexus",
    model: "LX600",
    color: "أبيض لؤلؤي (Pearl White)",
    year: 2024,
    owner_name: "خالد الكواري",
    owner_dept: "الأمن والسلامة",
    is_primary: true,
    is_active: true,
  },
  {
    id: "40000000-0000-0000-0000-000000000005",
    plate_number: "992731",
    make: "Toyota",
    model: "Prado",
    color: "رمادي (Grey)",
    year: 2021,
    owner_name: "عبدالله المري",
    owner_dept: "قسم الرياضيات",
    is_primary: true,
    is_active: true,
  },
  {
    id: "40000000-0000-0000-0000-000000000009",
    plate_number: "225419",
    make: "Kia",
    model: "Telluride",
    color: "رمادي غامق (Dark Grey)",
    year: 2023,
    owner_name: "طارق منصور",
    owner_dept: "قسم الدراسات الاجتماعية",
    is_primary: true,
    is_active: true,
  },
];

export default function VehicleDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredVehicles = SEED_VEHICLES.filter(
    (v) =>
      v.plate_number.includes(searchTerm) ||
      v.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            دليل سيارات المدرسة (Vehicle Directory)
          </h1>
          <p className="text-xs text-slate-500">
            سجل لوحات السيارات المسجلة بالمدرسة وأصحابها المصرح لهم بالمواقف
          </p>
        </div>

        <Link
          href="/admin/import"
          className="inline-flex items-center gap-2 rounded-xl bg-qatar px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-qatar/20 hover:bg-qatar-900"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة أو استيراد سيارات</span>
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="البحث برقم اللوحة، الموديل، أو اسم المالك..."
          className="w-full rounded-xl border border-slate-200 bg-white pr-9 pl-4 py-2.5 text-sm focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono"
        />
      </div>

      {/* Vehicles Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b bg-slate-50 text-xs font-bold text-slate-500 dark:bg-slate-800/60 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">لوحة السيارة</th>
                <th className="px-5 py-3.5">النوع والموديل</th>
                <th className="px-5 py-3.5">اللون / السنة</th>
                <th className="px-5 py-3.5">صاحب السيارة</th>
                <th className="px-5 py-3.5">القسم</th>
                <th className="px-5 py-3.5">نوع التسجيل</th>
                <th className="px-5 py-3.5">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-4">
                    {/* Compact License Plate Badge */}
                    <span className="inline-flex items-center overflow-hidden rounded-md border border-slate-900 bg-white font-mono shadow-xs dark:border-slate-400">
                      <span className="bg-qatar px-1.5 py-0.5 text-[8px] font-bold text-white">
                        قطر
                      </span>
                      <span className="px-2 py-0.5 font-black text-slate-950 numeric-plate text-sm">
                        {vehicle.plate_number}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                    {vehicle.make} {vehicle.model}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {vehicle.color} {vehicle.year ? `• ${vehicle.year}` : ""}
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200 font-arabic">
                    {vehicle.owner_name}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400">
                    {vehicle.owner_dept}
                  </td>
                  <td className="px-5 py-4">
                    {vehicle.is_primary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <ShieldCheck className="h-3 w-3" />
                        رئيسية
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        إضافية
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      مصرح
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
