# Nexus Unified CRM: Architecture

## High-Level Vision

Nexus is a **Single-Source-of-Truth** platform for SMBs, unifying Sales, Customer Success, Marketing, and Support into one cohesive experience. All modules read from and write to the same Firestore collections — there is no sync logic, no ETL, no per-module database.

---

## Technical Architecture

### Frontend: React + Vite (SPA)

- **Framework**: React 19 (functional components + hooks)
- **Bundler**: Vite with `import.meta.env` for environment variable injection
- **Styling**: Tailwind CSS 4 with a custom `@theme` block defining the Bento color palette (`accent-sales`, `accent-cs`, `accent-support`, `accent-marketing`, `bento-text`, `bento-muted`, `bento-border`, `bento-bg`)
- **Animations**: `motion/react` (Framer Motion) for route transitions, modal entry/exit, and staggered list renders
- **Icons**: `lucide-react`

### Backend: Firebase (Serverless)

- **Database**: Firestore (NoSQL document store), accessed exclusively via the client SDK
- **Authentication**: Firebase Auth with Google OAuth (`signInWithPopup`)
- **Real-time strategy**: Every list view subscribes via `onSnapshot`. A single `useEffect` in `App.tsx` manages six listeners (leads, tickets, customers, campaigns, tasks, marketingEngagement) and tears them all down on unmount via an array of unsubscribe functions.

### Firebase Configuration

Credentials are injected at build time via `VITE_FIREBASE_*` environment variables in `.env.local` (gitignored). No credentials are committed to the repository.

---

## Key Design Decisions

### Bento Grid Layout

The dashboard is composed of atomic cards arranged in a responsive CSS grid. Custom Tailwind utilities (`dashboard-card`, `bento-grid`, `pill-*`) define the shared visual language. Updating the `@theme` block in `index.css` propagates the brand identity across all modules.

### Unified Action Queue

The Overview dashboard's Action Queue queries the `tasks` collection filtered by `assignedTo == user.uid`. Tasks created from any module (Sales, Support, Customer Success) appear here automatically because they all write to the same collection with the same `assignedTo` field.

### Contextual Navigation (Customer Detail)

A single `selectedCustomerName` string in `App.tsx` controls the `CustomerDetail` overlay. Any module can call `onSelectCustomer(name)` to surface a 360° profile without losing the user's place in their current workflow. The overlay aggregates data from five collections on demand.

### Cross-Module Data Linking

All modules join on `customerName` (a plain string). This is an acknowledged architectural tradeoff — simple to implement, fragile with duplicates. The production path is a UUID `accountId` foreign key across all collections (see [PRODUCTION_ROADMAP.md](./PRODUCTION_ROADMAP.md)).

### Lead Scoring

Lead scores are computed deterministically at read time by `computeLeadScore()` in `Sales.tsx`:

| Signal | Points |
|---|---|
| Stage (discovery → closed_won) | 20–100 |
| Status (new → qualified) | 0–15 |
| Deal value (up to $20K+) | 0–25 |

Scores are written back to Firestore on every field update so they're queryable.

### Won Lead → Customer Auto-Creation

When a lead's stage changes to `closed_won`, `Sales.tsx` checks whether a customer with that company name already exists. If not, it creates one in the `customers` collection (plan: basic, healthScore: 75, renewalDate: +365 days). This is the primary cross-module data flow currently implemented.

### Firestore Security Rules

Rules enforce:
- **Authenticated access** on all collections
- **Admin-only deletes** on all collections (required for the seed script to clear data)
- **Field validation** on `leads` (`isValidLead`) and `users` (`isValidUser`)
- **Admin bootstrap**: the owner email is hardcoded as a fallback admin in `isAdmin()` so the first user can seed data without a pre-existing role document

---

## File Structure (Key Files)

```
src/
├── App.tsx                  # Root: auth gate, nav, overview dashboard, global Firestore listeners
├── hooks/
│   └── useAuth.ts           # Google sign-in, auth state, profile creation, authError
├── lib/
│   ├── firebase.ts          # Firebase init from env vars, db export, error helpers
│   └── seed.ts              # runSeed(uid) — clears and re-populates all 7 collections
└── components/
    ├── Sales.tsx            # Lead pipeline, scoring, filter panel, closed_won → customer
    ├── Marketing.tsx        # Campaign management, real analytics modal
    ├── Support.tsx          # Ticket management, activity thread, reply
    ├── CustomerSuccess.tsx  # Account health, inline score edit, renewals, tasks
    ├── CustomerDetail.tsx   # 360° profile: activities, tickets, leads, engagement, roadmap
    └── ErrorBoundary.tsx    # Top-level React error boundary
firestore.rules              # Firestore security rules
```
