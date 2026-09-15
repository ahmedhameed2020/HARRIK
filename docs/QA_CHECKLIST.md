# حَرِّك | HARRIK — Manual QA & Acceptance Checklist

## 1. Plate Search & Normalization
- [x] Search using Western digits: `482731` → finds Ahmed Hassan (Toyota Land Cruiser).
- [x] Search using Arabic-Indic digits: `٤٨٢٧٣١` → normalizes to `482731` and returns exact match.
- [x] Partial suffix search: `2731` → displays ambiguous selector with matching Land Cruiser (`482731`), Camry (`112731`), and Prado (`992731`).
- [x] Search unregistered plate: `883201` → shows friendly empty state with action to report unknown vehicle.

## 2. Direct Contact & Actions
- [x] Click Call button → opens `tel:+97455123456`.
- [x] Click WhatsApp button → generates deep link `https://wa.me/97455123456?text=...` with prepared message in Arabic/English.

## 3. Parking Alert Lifecycle
- [x] Click "إرسال تنبيه موقف" → modal opens with 5 types (`BLOCKING`, `LIGHTS_ON`, `WINDOW_OPEN`, `CHECK_VEHICLE`, `CONTACT_ME`).
- [x] Submit alert → persists to `/api/alerts` and appears in active alerts inbox.
- [x] In Inbox, click "جاي حالًا 🏃‍♂️" → status updates to `acknowledged` with timestamp.
- [x] Click "تم تحريك السيارة ✅" → status updates to `resolved` with resolution duration calculated.

## 4. Admin Dashboard & Analytics
- [x] Overview page displays real KPIs: Registered Vehicles (38), Coverage (93.3%), Searches (38), Success Rate (89.5%), Active Incidents (2).
- [x] Current Issues displays pending and acknowledged counts + oldest active incident timer.
- [x] Operational insights dynamically display peak times (1:00 - 1:30 PM), fast resolution rate (77.8%), and repeat unknown plate warnings.

## 5. Bulk Import
- [x] CSV/XLSX input parses correctly.
- [x] Validates required employee IDs and plate numbers.
- [x] Detects duplicates across Arabic and Western digit representations.
- [x] Displays preview counters: `جاهز` / `تنبيهات` / `أخطاء`.
- [x] Confirms and commits rows without errors.

## 6. Language, Direction & Appearance
- [x] Default Arabic RTL layout with proper margins, typography, and plate number alignment.
- [x] English LTR mode toggles seamlessly via globe button.
- [x] Dark mode / Light mode toggles and maintains high contrast.
