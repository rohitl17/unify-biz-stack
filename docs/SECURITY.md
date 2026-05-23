# Nexus Unified CRM: Security

## Core Principles

1. **Default Deny**: All Firestore collections are locked by default. Access must be explicitly granted per collection and operation.
2. **Authenticated Access**: Every read and write requires a valid Firebase Auth UID (`request.auth != null`).
3. **Admin Elevation**: Destructive operations (deletes) are restricted to admin users only.
4. **Data Integrity**: Rules validate field types, lengths, and enum values at the database layer.

---

## Credential Management

Firebase credentials are **never committed to the repository**.

- All `VITE_FIREBASE_*` values live in `.env.local` (gitignored)
- `.env.example` contains blank key names as a setup template
- The legacy `firebase-applet-config.json` file is also gitignored

---

## Firestore Security Rules (`firestore.rules`)

### Global Helpers

| Helper | Logic |
|---|---|
| `isAuthenticated()` | `request.auth != null` |
| `isOwner(userId)` | Authenticated AND `request.auth.uid == userId` |
| `isAdmin()` | User's `/users` doc has `role == 'admin'`, OR the request's verified email matches the bootstrap owner address |

The bootstrap email fallback (`isAdmin`) allows the first user to perform admin operations (e.g., run the seed script) before a role document exists.

### Collection-Level Rules

| Collection | Read | Create | Update | Delete |
|---|---|---|---|---|
| `/users` | authenticated | self only + `isValidUser` | self or admin + `isValidUser` | — |
| `/leads` | authenticated | authenticated + `isValidLead` | authenticated + `isValidLead` | admin only |
| `/tickets` | authenticated | authenticated | authenticated | admin only |
| `/campaigns` | authenticated | authenticated | authenticated | admin only |
| `/customers` | authenticated | authenticated | authenticated | admin only |
| `/marketingEngagement` | authenticated | authenticated | authenticated | admin only |
| `/activities` | authenticated | authenticated | admin only | admin only |
| `/tasks` | authenticated | authenticated | authenticated | admin only |

Admin-only deletes are required for the dev seed script (`src/lib/seed.ts`), which clears all collections before repopulating them.

### Validation Functions

**`isValidLead(data)`** — enforces:
- Required fields: `company`, `status`, `ownerId`, `createdAt`
- `company` is a string under 100 characters
- `status` is one of: `new`, `contacted`, `qualified`, `lost`

**`isValidUser(data)`** — enforces:
- Required fields: `uid`, `email`, `role`
- `role` is one of: `admin`, `sales`, `support`, `success`, `marketing`

---

## Vulnerability Mitigations

- **PII scoping**: User profiles (email, photo URL) are in `/users`, restricted to the owner — prevents data scraping by other authenticated users
- **Payload limits**: String field length checks (`company.size() < 100`) prevent database resource exhaustion via oversized writes
- **No anonymous auth**: Anonymous authentication is disabled in the Firebase project; only Google OAuth is permitted

---

## Production Security Checklist

- [ ] Enable MFA via Firebase Auth settings
- [ ] Add composite Firestore indexes before enabling high-volume queries
- [ ] Enable Cloud Audit Logs (GCP Console → Firestore → Audit Logs) to track all reads and writes
- [ ] Review and tighten the bootstrap admin email fallback in `isAdmin()` once role documents are seeded for all admin users
- [ ] Consider IP allowlisting via Cloud Armor if the app is internal-only
- [ ] Implement field-level security for sensitive financial data (lead `value`, campaign `budget`) if non-sales roles are added
