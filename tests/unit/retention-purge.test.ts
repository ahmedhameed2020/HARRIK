/**
 * حَرِّك | HARRIK — data retention.
 *
 * `retention_days` sat in the schema with a 90-day default and nothing read it:
 * every plate lookup and every contact event was kept forever. This job expires
 * them per tenant.
 *
 * A delete job is the one place where a bug is unrecoverable, so the tests
 * below are mostly about its rails: the window is clamped so a stray `0` cannot
 * mean "delete everything", only the two log tables are touched, and every
 * delete is scoped to a single organization.
 */
import { describe, it, expect } from "vitest";
import {
  purgeExpiredEventLogs,
  normaliseRetentionDays,
  cutoffFor,
  PURGEABLE_EVENT_TABLES,
  MIN_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
  DEFAULT_RETENTION_DAYS,
} from "@/lib/retention/purge";

describe("retention window", () => {
  it("clamps a dangerous or missing value instead of trusting it", () => {
    // The dangerous one: 0 would otherwise mean "delete everything".
    expect(normaliseRetentionDays(0)).toBe(MIN_RETENTION_DAYS);
    expect(normaliseRetentionDays(-40)).toBe(MIN_RETENTION_DAYS);
    expect(normaliseRetentionDays(999999)).toBe(MAX_RETENTION_DAYS);
    expect(normaliseRetentionDays(null)).toBe(DEFAULT_RETENTION_DAYS);
    expect(normaliseRetentionDays("not a number")).toBe(DEFAULT_RETENTION_DAYS);
    expect(normaliseRetentionDays(90)).toBe(90);
  });

  it("computes the cutoff the stated number of days back", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    expect(cutoffFor(90, now)).toBe("2026-03-03T00:00:00.000Z");
  });
});

/** Records every delete so the test can assert scope, not just counts. */
function recordingSupabase(settingsRows: any[]) {
  const deletes: Array<{ table: string; filters: Record<string, any> }> = [];

  const client: any = {
    from(table: string) {
      const filters: Record<string, any> = {};
      let isDelete = false;

      const builder: any = {
        select: () => builder,
        delete: () => {
          isDelete = true;
          return builder;
        },
        eq: (col: string, value: any) => {
          filters[col] = value;
          return builder;
        },
        lt: (col: string, value: any) => {
          filters[`${col}__lt`] = value;
          return builder;
        },
        then: (resolve: any) => {
          if (isDelete) {
            deletes.push({ table, filters });
            return resolve({ data: [{ id: "a" }, { id: "b" }], error: null });
          }
          return resolve({ data: table === "system_settings" ? settingsRows : [], error: null });
        },
      };
      return builder;
    },
  };

  return { client, deletes };
}

describe("purging expired event logs", () => {
  it("only ever deletes from the two log tables", async () => {
    const { client, deletes } = recordingSupabase([
      { organization_id: "org-1", retention_days: 90 },
    ]);

    await purgeExpiredEventLogs(client);

    const tables = [...new Set(deletes.map((d) => d.table))].sort();
    expect(tables).toEqual([...PURGEABLE_EVENT_TABLES].sort());
    // The records and the compliance trail must never be expired on a timer.
    expect(tables).not.toContain("audit_logs");
    expect(tables).not.toContain("parking_alerts");
    expect(tables).not.toContain("profiles");
    expect(tables).not.toContain("vehicles");
  });

  it("scopes every delete to one organization and to the cutoff", async () => {
    const { client, deletes } = recordingSupabase([
      { organization_id: "org-1", retention_days: 30 },
      { organization_id: "org-2", retention_days: 365 },
    ]);

    await purgeExpiredEventLogs(client, { now: new Date("2026-06-01T00:00:00.000Z") });

    // A tenant's window must never reach another tenant's rows.
    for (const d of deletes) {
      expect(d.filters.organization_id).toBeDefined();
      expect(d.filters.created_at__lt).toBeDefined();
    }

    const org1 = deletes.find((d) => d.filters.organization_id === "org-1")!;
    const org2 = deletes.find((d) => d.filters.organization_id === "org-2")!;
    expect(org1.filters.created_at__lt).toBe("2026-05-02T00:00:00.000Z");
    expect(org2.filters.created_at__lt).toBe("2025-06-01T00:00:00.000Z");
  });

  it("applies each tenant's own window, and reports what it removed", async () => {
    const { client } = recordingSupabase([
      { organization_id: "org-1", retention_days: 30 },
      { organization_id: "org-2", retention_days: 180 },
    ]);

    const result = await purgeExpiredEventLogs(client);

    expect(result.organizations).toHaveLength(2);
    expect(result.organizations[0].retentionDays).toBe(30);
    expect(result.organizations[1].retentionDays).toBe(180);
    // Two rows per table, per organization, from the stub.
    expect(result.totalDeleted).toBe(2 * PURGEABLE_EVENT_TABLES.length * 2);
  });

  it("uses the clamped window when a tenant has a nonsense value stored", async () => {
    const { client, deletes } = recordingSupabase([
      { organization_id: "org-1", retention_days: 0 },
    ]);

    await purgeExpiredEventLogs(client, { now: new Date("2026-06-01T00:00:00.000Z") });

    // 7 days back, not "everything".
    expect(deletes[0].filters.created_at__lt).toBe("2026-05-25T00:00:00.000Z");
  });

  it("keeps going when one tenant fails", async () => {
    let calls = 0;
    const client: any = {
      from(table: string) {
        const builder: any = {
          select: () => builder,
          delete: () => builder,
          eq: () => builder,
          lt: () => builder,
          then: (resolve: any) => {
            if (table === "system_settings") {
              return resolve({
                data: [
                  { organization_id: "org-broken", retention_days: 90 },
                  { organization_id: "org-fine", retention_days: 90 },
                ],
                error: null,
              });
            }
            calls++;
            // Fail everything for the first organization only.
            if (calls <= PURGEABLE_EVENT_TABLES.length) {
              return resolve({ data: null, error: { message: "permission denied" } });
            }
            return resolve({ data: [{ id: "x" }], error: null });
          },
        };
        return builder;
      },
    };

    const result = await purgeExpiredEventLogs(client);

    expect(result.organizations[0].errors.length).toBe(PURGEABLE_EVENT_TABLES.length);
    expect(result.organizations[1].errors).toEqual([]);
    expect(result.totalDeleted).toBe(PURGEABLE_EVENT_TABLES.length);
  });
});
