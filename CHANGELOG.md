# Changelog

All notable changes to the **حَرِّك | HARRIK** project will be documented in this file.

## [1.0.0] — 2026-09-16

### Added
- **Application Architecture:** Next.js 15+ App Router, React 19, TypeScript strict mode, and Tailwind CSS.
- **Bilingual & RTL Foundation:** Arabic RTL (`dir="rtl"`) default and English LTR (`dir="ltr"`) toggle with custom typography and Qatar Maroon brand palette.
- **Supabase Production Backend:**
  - Complete schema migrations for 13 tables (`organizations`, `departments`, `profiles`, `vehicles`, `staff_vehicles`, `parking_alerts`, `parking_alert_types`, `vehicle_search_events`, `unknown_vehicle_reports`, `contact_action_events`, `import_jobs`, `audit_logs`, `system_settings`).
  - Row Level Security (RLS) enabled on all tables with tenant isolation policies.
  - Normalization engine and trigger converting Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩`) and stripping separators.
  - Stored Procedures & RPCs: `find_vehicle_by_plate` and `get_dashboard_overview`.
- **Plate Search Engine:**
  - Mobile-first numeric keypad input with instant feedback.
  - Exact match + partial suffix fallback (minimum 3 digits).
  - Ambiguous multiple-matches selector.
  - Qatar license plate replica UI badge.
- **Direct Contact System:**
  - Direct phone calling (`tel:`).
  - WhatsApp deep-link generation (`wa.me`) with dynamic Arabic and English message templates.
- **Parking Alerts Lifecycle:**
  - 5 configurable alert types (`BLOCKING`, `LIGHTS_ON`, `WINDOW_OPEN`, `CHECK_VEHICLE`, `CONTACT_ME`).
  - Alert inbox with quick actions: "جاي حالًا 🏃‍♂️" (acknowledged) and "تم تحريك السيارة ✅" (resolved).
  - Exact resolution duration calculation.
- **Admin Dashboard & Analytics:**
  - Real computed KPIs (Registered Vehicles, Searches Today, Success Rate, Active Incidents, Resolution Rate).
  - Current Issues live monitoring and oldest active incident tracking.
  - Deterministic operational insights.
- **Directory & Management Screens:**
  - Staff Directory with search and department filtering.
  - Vehicle Directory with plate badges and ownership tracking.
  - Parking Alerts management table.
  - Unknown vehicle report management.
  - System settings for privacy modes (Mode A, B, C) and search limits.
- **Bulk Import:**
  - CSV / XLSX uploader, parser, and validator.
  - Pre-import preview with Ready, Warnings, and Errors counters.
  - Prevention of duplicate employee IDs and plates.
- **Automated Test Suite:**
  - 17 unit, integration, and critical E2E tests passing with 100% success.
