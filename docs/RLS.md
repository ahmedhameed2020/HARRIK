# حَرِّك | HARRIK — Row Level Security (RLS) Policy Matrix

## Fundamental Invariant

> **A user must never access or modify another organization's records.**

RLS is enabled on every business table. Permissions are enforced at the database layer via PostgreSQL policies, not merely hidden in client UI components.

---

## Role Matrix

| Resource | Staff | Security | Admin | Super Admin |
| :--- | :--- | :--- | :--- | :--- |
| **Organizations** | SELECT own | SELECT own | SELECT own | UPDATE own |
| **Departments** | SELECT own org | SELECT own org | ALL (Create/Update) | ALL |
| **Profiles** | SELECT own org, UPDATE self | SELECT own org, UPDATE self | ALL | ALL |
| **Vehicles** | Search permitted data | SELECT all in org | ALL | ALL |
| **Staff Vehicles**| SELECT in org | SELECT in org | ALL | ALL |
| **Parking Alerts**| SELECT own / involved, INSERT | SELECT all in org | ALL | ALL |
| **Search Events** | INSERT own search | SELECT in org | SELECT in org | SELECT in org |
| **Unknown Reports**| INSERT report | SELECT & Review | ALL | ALL |
| **Audit Logs** | None | Limited / None | SELECT in org | SELECT in org |
| **Settings** | SELECT in org | SELECT in org | UPDATE in org | UPDATE in org |
| **Import Jobs** | None | None | ALL | ALL |

---

## Key Security Functions

### `current_user_org_id()`
```sql
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```

### `current_user_role()`
```sql
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```
