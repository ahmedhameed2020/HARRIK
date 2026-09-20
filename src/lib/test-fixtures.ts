/**
 * حَرِّك | HARRIK — Non-production test fixtures.
 *
 * These records are ONLY used when test fixtures are explicitly enabled
 * (ENABLE_TEST_FIXTURES=true) or when running outside production. They are
 * never served in production so that a database outage can never surface
 * fake vehicle data to real users.
 */

import type { SearchResultVehicle } from "@/types";

export const SEED_VEHICLES: SearchResultVehicle[] = [
  {
    vehicle_id: "40000000-0000-0000-0000-000000000001",
    plate_number: "482731",
    normalized_plate: "482731",
    make: "Toyota",
    model: "Land Cruiser",
    color: "أبيض (White)",
    year: 2023,
    is_primary: true,
    owner_id: "30000000-0000-0000-0000-000000000001",
    owner_name_ar: "أحمد حسن",
    owner_name_en: "Ahmed Hassan",
    owner_employee_id: "142",
    owner_mobile: "+97455123456",
    department_name_ar: "قسم اللغة الإنجليزية",
    department_name_en: "English Department",
    match_type: "exact",
  },
  {
    vehicle_id: "40000000-0000-0000-0000-000000000002",
    plate_number: "112731",
    normalized_plate: "112731",
    make: "Toyota",
    model: "Camry",
    color: "فضي (Silver)",
    year: 2022,
    is_primary: true,
    owner_id: "30000000-0000-0000-0000-000000000003",
    owner_name_ar: "محمد السليطي",
    owner_name_en: "Mohammed Al-Sulaiti",
    owner_employee_id: "103",
    owner_mobile: "+97455223344",
    department_name_ar: "قسم اللغة العربية",
    department_name_en: "Arabic Department",
    match_type: "partial",
  },
  {
    vehicle_id: "40000000-0000-0000-0000-000000000003",
    plate_number: "771925",
    normalized_plate: "771925",
    make: "Nissan",
    model: "Patrol",
    color: "أسود (Black)",
    year: 2024,
    is_primary: false,
    owner_id: "30000000-0000-0000-0000-000000000001",
    owner_name_ar: "أحمد حسن",
    owner_name_en: "Ahmed Hassan",
    owner_employee_id: "142",
    owner_mobile: "+97455123456",
    department_name_ar: "قسم اللغة الإنجليزية",
    department_name_en: "English Department",
    match_type: "exact",
  },
  {
    vehicle_id: "40000000-0000-0000-0000-000000000004",
    plate_number: "554820",
    normalized_plate: "554820",
    make: "Lexus",
    model: "LX600",
    color: "أبيض لؤلؤي (Pearl White)",
    year: 2024,
    is_primary: true,
    owner_id: "30000000-0000-0000-0000-000000000002",
    owner_name_ar: "خالد الكواري",
    owner_name_en: "Khalid Al-Kuwari",
    owner_employee_id: "101",
    owner_mobile: "+97455987654",
    department_name_ar: "الأمن والسلامة",
    department_name_en: "Security & Safety",
    match_type: "exact",
  },
  {
    vehicle_id: "40000000-0000-0000-0000-000000000005",
    plate_number: "992731",
    normalized_plate: "992731",
    make: "Toyota",
    model: "Prado",
    color: "رمادي (Grey)",
    year: 2021,
    is_primary: true,
    owner_id: "30000000-0000-0000-0000-000000000004",
    owner_name_ar: "عبدالله المري",
    owner_name_en: "Abdullah Al-Marri",
    owner_employee_id: "104",
    owner_mobile: "+97466334455",
    department_name_ar: "قسم الرياضيات",
    department_name_en: "Mathematics Department",
    match_type: "partial",
  },
  {
    vehicle_id: "40000000-0000-0000-0000-000000000009",
    plate_number: "225419",
    normalized_plate: "225419",
    make: "Kia",
    model: "Telluride",
    color: "رمادي غامق (Dark Grey)",
    year: 2023,
    is_primary: true,
    owner_id: "30000000-0000-0000-0000-000000000008",
    owner_name_ar: "طارق منصور",
    owner_name_en: "Tariq Mansoor",
    owner_employee_id: "108",
    owner_mobile: "+97477223344",
    department_name_ar: "قسم الدراسات الاجتماعية",
    department_name_en: "Social Studies",
    match_type: "exact",
  },
];

/** Deterministic permit tokens used by tests and seed verification. */
export const KNOWN_PERMIT_TOKENS: Record<string, any> = {
  "11111111-1111-4111-8111-111111111111": {
    is_valid: true,
    status_reason: "active",
    entity_type: "staff",
    vehicle_id: "40000000-0000-0000-0000-000000000001",
    organization_id: "00000000-0000-0000-0000-000000000001",
    make: "Toyota",
    model: "Land Cruiser",
    color: "أبيض",
    venue_name: "المنشأة المركزية",
  },
  "22222222-2222-4222-8222-222222222222": {
    is_valid: true,
    status_reason: "active",
    entity_type: "visitor",
    vehicle_id: "50000000-0000-0000-0000-000000000001",
    organization_id: "00000000-0000-0000-0000-000000000001",
    make: "Lexus",
    model: "ES350",
    color: "فضي",
    venue_name: "المنشأة المركزية",
  },
  "33333333-3333-4333-8333-333333333333": {
    is_valid: false,
    status_reason: "revoked",
    entity_type: "staff",
    error: "تصريح الموقف ملغى من قبل إدارة المنشأة",
  },
  "44444444-4444-4444-8444-444444444444": {
    is_valid: false,
    status_reason: "expired",
    entity_type: "visitor",
    error: "انتهت صلاحية تصريح موقف الزائر",
  },
};

/** Deterministic permit-token → vehicle mapping for the scan alert route. */
export const MOCK_TOKEN_VEHICLES: Record<string, any> = {
  "11111111-1111-4111-8111-111111111111": {
    vehicle_id: "40000000-0000-0000-0000-000000000001",
    organization_id: "00000000-0000-0000-0000-000000000001",
    owner_id: "30000000-0000-0000-0000-000000000001",
    is_active: true,
  },
  "22222222-2222-4222-8222-222222222222": {
    vehicle_id: "40000000-0000-0000-0000-000000000002",
    organization_id: "00000000-0000-0000-0000-000000000001",
    owner_id: "30000000-0000-0000-0000-000000000003",
    is_active: true,
  },
  "33333333-3333-4333-8333-333333333333": {
    vehicle_id: "40000000-0000-0000-0000-000000000003",
    organization_id: "00000000-0000-0000-0000-000000000001",
    owner_id: "30000000-0000-0000-0000-000000000001",
    is_active: false, // Revoked
  },
  "44444444-4444-4444-8444-444444444444": {
    vehicle_id: "50000000-0000-0000-0000-000000000001",
    organization_id: "00000000-0000-0000-0000-000000000001",
    owner_id: "30000000-0000-0000-0000-000000000004",
    is_active: true,
    is_expired: true, // Expired visitor
  },
};

/** Whether test fixtures may be used in the current environment. */
export const FIXTURES_ENABLED =
  process.env.ENABLE_TEST_FIXTURES === "true" || process.env.NODE_ENV !== "production";
