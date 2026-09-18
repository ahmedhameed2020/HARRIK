/**
 * حَرِّك | HARRIK — Canonical Types and Contracts
 */

export type Role = "staff" | "security" | "admin" | "super_admin";
export type AlertStatus = "pending" | "acknowledged" | "resolved" | "cancelled";
export type PrivacyMode = "mode_a" | "mode_b" | "mode_c";
export type MatchType = "exact" | "partial" | "none";

export interface Organization {
  id: string;
  name_en: string;
  name_ar: string;
  logo_url?: string | null;
  country_code: string;
  default_language: "ar" | "en";
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  organization_id: string;
  name_en: string;
  name_ar: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  employee_id: string;
  name_en: string;
  name_ar: string;
  mobile: string;
  department_id?: string | null;
  preferred_language: "ar" | "en";
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: Department | null;
  organization?: Organization | null;
}

export interface Vehicle {
  id: string;
  organization_id: string;
  plate_number: string;
  normalized_plate: string;
  make: string;
  model: string;
  color: string;
  year?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffVehicle {
  id: string;
  organization_id: string;
  staff_id: string;
  vehicle_id: string;
  is_primary: boolean;
  created_at: string;
  vehicle?: Vehicle;
  profile?: Profile;
}

export interface ParkingAlertType {
  id: string;
  organization_id: string;
  code: string;
  name_en: string;
  name_ar: string;
  icon?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ParkingAlert {
  id: string;
  organization_id: string;
  vehicle_id: string;
  owner_id: string;
  reporter_id: string;
  alert_type_id: string;
  status: AlertStatus;
  message?: string | null;
  created_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  vehicle?: Vehicle;
  owner?: Profile;
  reporter?: Profile;
  alert_type?: ParkingAlertType;
}

export interface UnknownVehicleReport {
  id: string;
  organization_id: string;
  reported_by?: string | null;
  plate_number: string;
  normalized_plate: string;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
  note?: string | null;
  status: "open" | "identified" | "dismissed";
  created_at: string;
  resolved_at?: string | null;
}

export interface SearchResultVehicle {
  vehicle_id: string;
  plate_number: string;
  normalized_plate: string;
  make: string;
  model: string;
  color: string;
  year?: number | null;
  is_primary: boolean;
  owner_id?: string | null;
  owner_name_en?: string | null;
  owner_name_ar?: string | null;
  owner_employee_id?: string | null;
  owner_mobile?: string | null;
  department_name_en?: string | null;
  department_name_ar?: string | null;
  match_type: MatchType;
}

// ============================================================================
// METRIC CONTRACTS & ANALYTICS TYPES
// ============================================================================
export type MetricStatus = "ok" | "empty" | "partial" | "unavailable";
export type MetricTrendDirection = "up" | "down" | "flat" | "new" | "not_applicable";
export type MetricUnit = "count" | "percentage" | "milliseconds" | "seconds" | "minutes";
export type MetricPeriod = "today" | "last_7_days" | "last_30_days" | "custom";

export interface MetricValue {
  key: string;
  value: number | null;
  unit: MetricUnit;
  status: MetricStatus;
  sampleSize?: number | null;
  comparison?: {
    previousValue: number | null;
    absoluteChange: number | null;
    percentageChange: number | null;
    direction: MetricTrendDirection;
  } | null;
}

export interface CurrentIssuesSummary {
  pending: number;
  acknowledged: number;
  activeTotal: number;
  openUnknownVehicles: number;
  oldestActiveIncident?: {
    alertId: string;
    plateDisplay: string;
    createdAt: string;
    ageSeconds: number;
    status: "pending" | "acknowledged";
  } | null;
}

export interface DashboardMetricSet {
  registeredStaff: MetricValue;
  registeredVehicles: MetricValue;
  vehicleCoverage: MetricValue;
  searches: MetricValue;
  successfulSearches: MetricValue;
  searchSuccessRate: MetricValue;
  alertsCreated: MetricValue;
  activeIncidents: MetricValue;
  pendingAlerts: MetricValue;
  acknowledgedAlerts: MetricValue;
  resolvedAlerts: MetricValue;
  resolutionRate: MetricValue;
  averageAcknowledgementTime: MetricValue;
  averageResolutionTime: MetricValue;
  resolvedWithinFiveMinutes: MetricValue;
  openUnknownVehicles: MetricValue;
}

export interface DashboardOverview {
  schemaVersion: 1;
  organizationId: string;
  timezone: string;
  metrics: DashboardMetricSet;
  currentIssues: CurrentIssuesSummary;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  change_summary?: Record<string, any> | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  actor?: Profile | null;
}

