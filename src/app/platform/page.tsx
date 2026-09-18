"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Building2, 
  ShieldCheck, 
  Users, 
  Car, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  Ban, 
  Clock,
  Archive,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

interface PlatformOrgOverview {
  organization_id: string;
  name_en: string;
  name_ar: string;
  entity_type: string;
  status: "onboarding" | "active" | "suspended" | "archived";
  onboarding_status: string;
  member_count: number;
  vehicle_count: number;
  active_alert_count: number;
  created_at: string;
}

export default function PlatformControlCenter() {
  const [orgs, setOrgs] = useState<PlatformOrgOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/platform/organizations");
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access Denied: Platform Administrator role required");
        }
        throw new Error("Failed to load platform organizations");
      }
      const data = await res.json();
      setOrgs(data.organizations || []);
    } catch (err: any) {
      setError(err.message || "Error fetching organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleStatusChange = async (orgId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    const confirmMsg = currentStatus === "onboarding"
      ? "Activate this organization and move it from Onboarding to Active Production status?"
      : nextStatus === "suspended" 
      ? "Are you sure you want to SUSPEND this tenant? Operational access for its users will be blocked immediately."
      : "Reactivate this tenant organization?";

    if (!window.confirm(confirmMsg)) return;

    try {
      setUpdatingId(orgId);
      const res = await fetch("/api/platform/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, status: nextStatus }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update status");
      }

      await fetchOrganizations();
    } catch (err: any) {
      alert(err.message || "Failed to update tenant status");
    } finally {
      setUpdatingId(null);
    }
  };

  const totalTenants = orgs.length;
  const activeTenants = orgs.filter((o) => o.status === "active").length;
  const suspendedTenants = orgs.filter((o) => o.status === "suspended").length;
  const onboardingTenants = orgs.filter((o) => o.status === "onboarding").length;
  const totalVehicles = orgs.reduce((acc, o) => acc + Number(o.vehicle_count || 0), 0);
  const totalMembers = orgs.reduce((acc, o) => acc + Number(o.member_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans" dir="ltr">
      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  HARRIK Platform Control Center
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    SaaS Owner
                  </span>
                </h1>
                <p className="text-sm text-slate-400">
                  Global Tenant Management &amp; Platform Lifecycle Oversight
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchOrganizations()}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors flex items-center gap-2 border border-slate-700/60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/"
              className="px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors flex items-center gap-1.5 border border-slate-700/60"
            >
              Tenant View
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <Building2 className="w-4 h-4 text-blue-400" />
              Total Tenants
            </div>
            <div className="text-2xl font-bold text-white">{totalTenants}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Active
            </div>
            <div className="text-2xl font-bold text-emerald-400">{activeTenants}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              Onboarding
            </div>
            <div className="text-2xl font-bold text-amber-400">{onboardingTenants}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <Ban className="w-4 h-4 text-rose-400" />
              Suspended
            </div>
            <div className="text-2xl font-bold text-rose-400">{suspendedTenants}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <Users className="w-4 h-4 text-purple-400" />
              Total Members
            </div>
            <div className="text-2xl font-bold text-purple-400">{totalMembers.toLocaleString()}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <Car className="w-4 h-4 text-cyan-400" />
              Total Vehicles
            </div>
            <div className="text-2xl font-bold text-cyan-400">{totalVehicles.toLocaleString()}</div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Platform Access Notice</p>
              <p className="text-xs text-rose-400/80">{error}</p>
            </div>
          </div>
        )}

        {/* Tenant Table */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Registered Tenant Organizations</h2>
            <span className="text-xs text-slate-400">
              {orgs.length} organization{orgs.length === 1 ? "" : "s"} listed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Onboarding</th>
                  <th className="py-3 px-4 text-center">Members</th>
                  <th className="py-3 px-4 text-center">Vehicles</th>
                  <th className="py-3 px-4 text-center">Active Incidents</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                      Loading platform organizations...
                    </td>
                  </tr>
                ) : orgs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No tenant organizations configured.
                    </td>
                  </tr>
                ) : (
                  orgs.map((org) => {
                    const isSuspended = org.status === "suspended";
                    const isArchived = org.status === "archived";
                    const isOnboarding = org.status === "onboarding";

                    return (
                      <tr key={org.organization_id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-white">{org.name_en}</div>
                          <div className="text-xs text-slate-400">{org.name_ar}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                            {org.entity_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                              org.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : isSuspended
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : isOnboarding
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                            }`}
                          >
                            {org.status === "active" && <CheckCircle2 className="w-3 h-3" />}
                            {isSuspended && <Ban className="w-3 h-3" />}
                            {isOnboarding && <Clock className="w-3 h-3" />}
                            {isArchived && <Archive className="w-3 h-3" />}
                            <span className="capitalize">{org.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {org.onboarding_status}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-200">
                          {Number(org.member_count || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-200">
                          {Number(org.vehicle_count || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              Number(org.active_alert_count || 0) > 0
                                ? "bg-amber-500/10 text-amber-400 font-bold"
                                : "text-slate-500"
                            }`}
                          >
                            {org.active_alert_count || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleStatusChange(org.organization_id, org.status)}
                            disabled={updatingId === org.organization_id || isArchived}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                              isOnboarding || isSuspended
                                ? "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30"
                                : "bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border-rose-500/30"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {updatingId === org.organization_id
                              ? "Updating..."
                              : isOnboarding
                              ? "Activate Tenant"
                              : isSuspended
                              ? "Reactivate"
                              : "Suspend"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
