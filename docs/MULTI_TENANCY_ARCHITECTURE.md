# HARRIK Multi-Tenancy & Authorization Architecture

## 1. Executive Summary
HARRIK operates on a strict separation between:
1. **Platform Control Plane**: SaaS/Platform administration managing tenant lifecycle, entity presets, aggregate health, and platform governance.
2. **Tenant Data Plane**: Tenant-scoped operational administration where organizations, departments, members, vehicles, visitor passes, and parking alerts reside.

---

## 2. Architectural Hierarchy
```text
HARRIK PLATFORM
│
├── SaaS / Platform Owner (`public.platform_admins.role = 'owner'`)
│
├── Platform Administration (`public.platform_admins.role = 'platform_admin'`)
│
└── Organizations / Tenants (`public.organizations`)
     │
     ├── Organization 1 (e.g., Ahmad Bin Mohammad School)
     ├── Organization 2 (e.g., Commercial Tower)
     └── ...
          │
          ├── Tenant Admin (`public.profiles.role = 'admin'`)
          ├── Security (`public.profiles.role = 'security'`)
          └── Staff / Members (`public.profiles.role = 'staff'`)
```

---

## 3. Fundamental Role Separation
Platform authority is **never** represented as a tenant profile role (`profiles.role = 'super_admin'`).

| Role Identity | Storage Location | Scope | Permissions |
| :--- | :--- | :--- | :--- |
| **Platform Owner** | `public.platform_admins` | Global Platform | Full SaaS management, tenant lifecycle, platform admin assignment |
| **Platform Admin** | `public.platform_admins` | Global Platform | Tenant lifecycle, aggregate metrics, platform audit access |
| **Tenant Admin** | `public.profiles` | Single Organization | Staff CRUD, vehicle registration, visitor passes, tenant settings |
| **Security** | `public.profiles` | Single Organization | Plate lookup, visitor gate pass issuance, alert verification |
| **Staff / Member** | `public.profiles` | Single Organization | Personal profile, personal vehicle permits, notifications |

---

## 4. Platform Owner Least-Privilege Data Principle
Platform Owners do **not** have universal RLS bypass on tenant operational tables.
- **Tenant Tables** (`profiles`, `vehicles`, `parking_alerts`, `visitor_passes`, `audit_logs`) have **zero** `is_platform_owner()` bypass policies.
- Platform monitoring is conducted strictly via security definer RPC: `get_platform_organizations_overview()`.
- The aggregate RPC returns **zero PII**: no employee names, no phone numbers, no plate numbers, no visitor identities, and no private audit logs.

---

## 5. Tenant Lifecycle & Suspension Enforcement
Organizations have a `status`:
- `onboarding`: Tenant is being provisioned; normal staff operational access pending.
- `active`: Normal operations enabled.
- `suspended`: Immediate platform-wide operational freeze.
- `archived`: Read-only historic retention.

### Double-Layer Suspension Mechanism:
1. **Database RLS Layer**:
   ```sql
   CREATE OR REPLACE FUNCTION public.current_user_org_id()
   RETURNS UUID ...
     SELECT p.organization_id 
     FROM public.profiles p
     JOIN public.organizations o ON o.id = p.organization_id
     WHERE p.id = auth.uid() AND p.is_active = TRUE AND o.status = 'active';
   ```
   If an organization is `suspended`, `current_user_org_id()` immediately returns `NULL`. All tenant policies evaluate `organization_id = NULL` and return empty sets.
2. **Gateway API Session Layer (`getAuthenticatedSession`)**:
   Verifies `profile.organization.status === 'active'`. If suspended, immediately rejects any API request with `HTTP 403 Forbidden: Tenant is suspended. Operational access suspended.` No re-login required.

---

## 6. V1 Multi-Membership Decision & V2 Evolution Path

### V1 Decision: 1 Identity → 1 Primary Tenant Profile (+ Optional Platform Admin)
- Each authenticated user has at most one record in `public.profiles` with `profiles.organization_id`.
- Independently, an identity may have a record in `public.platform_admins`.
- **Rationale**: Eliminates multi-tenant session context switching ambiguity, ensures instant O(1) foreign key resolution, prevents tenant leakage, and simplifies audit trails during V1 launch.

### Future V2 Migration Path: Explicit `organization_memberships`
When multi-organization users (such as outsourced security guards working across multiple schools or towers) are required:
```text
auth.users
    ├── public.profiles (Global user metadata: name, email, avatar)
    │
    ├── public.organization_memberships
    │    ├── id UUID PRIMARY KEY
    │    ├── user_id UUID REFERENCES auth.users(id)
    │    ├── organization_id UUID REFERENCES organizations(id)
    │    ├── role TEXT ('admin', 'security', 'member')
    │    ├── is_active BOOLEAN
    │    └── created_at TIMESTAMPTZ
    │
    └── public.platform_admins (Platform control plane)
```
- A trusted session header (`x-harrik-active-org`) or JWT claim will select the active tenant context.
- `current_user_org_id()` will resolve the active tenant from verified memberships.
