# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 3000 (all interfaces)
npm run build     # Production build (outputs to dist/)
npm run preview   # Preview production build locally
npm run lint      # TypeScript type checking (tsc --noEmit)
npm run clean     # Remove dist/ directory
```

There is no test suite currently. Type checking via `npm run lint` is the primary validation step.

## Architecture

**Nexus** is a unified CRM for SMBs — a React SPA with Firebase as the sole backend. There is no custom server; all data access uses the Firebase client SDK directly.

### Tech Stack

- **React 19** + TypeScript, bundled with **Vite 6**
- **Tailwind CSS 4** with a custom `@theme` block in `src/index.css` (module-specific color tokens)
- **Firebase Firestore** (NoSQL, real-time) + **Firebase Auth** (Google OAuth via `signInWithPopup`)
- **Framer Motion** (`motion/react`) for animations
- **Lucide React** for icons

### Data Flow

All state lives in Firestore. `App.tsx` initializes **6 `onSnapshot` listeners** on mount (one per collection), storing results in `useState`. These are passed as props down to module components. There is no global state manager (Zustand/Redux is planned for production).

Collections: `leads`, `tickets`, `campaigns`, `customers`, `activities`, `tasks`, `marketingEngagement`, `users`.

**Cross-module joins use `customerName` string matching** — this is intentional technical debt. The production path is UUID-based `accountId` linking (see `docs/PRODUCTION_ROADMAP.md`).

### Key Architectural Patterns

**Lead → Customer lifecycle:** When a lead's stage changes to `closed_won`, `Sales.tsx` automatically creates a corresponding document in the `customers` collection.

**Activity log as shared thread:** The `activities` collection is used across modules — ticket replies write here, and `CustomerDetail.tsx` reads from it to build the 360° timeline.

**Lead scoring:** Computed deterministically in `Sales.tsx` (`computeLeadScore()`) based on stage (20–100) + status (0–15) + deal value (0–25), then written back to Firestore.

**Dev-only seed data:** A "Seed Demo Data" button appears in the sidebar only when `import.meta.env.DEV` is true. It clears all collections and populates ~80 records via `src/lib/seed.ts`.

### Module Structure

```
src/
├── App.tsx                 # Auth gate, sidebar nav, overview dashboard, global listeners
├── main.tsx                # React 19 createRoot entry point
├── index.css               # Tailwind @theme (custom color tokens per module)
├── hooks/useAuth.ts        # Firebase Auth hook (sign-in, profile, role management)
├── lib/
│   ├── firebase.ts         # Firebase initialization
│   ├── seed.ts             # Demo data generator
│   └── utils.ts            # cn() utility (clsx + tailwind-merge)
└── components/
    ├── Sales.tsx            # Lead pipeline, scoring, stage management
    ├── Marketing.tsx        # Campaign CRUD + analytics modal
    ├── Support.tsx          # Ticket management + chat-style activity thread
    ├── CustomerSuccess.tsx  # Account health, renewal tracking
    ├── CustomerDetail.tsx   # 360° customer overlay (cross-module aggregation)
    └── ErrorBoundary.tsx    # Catches render errors, parses Firestore errors
```

### Environment Variables

All variables are prefixed `VITE_` (injected at build time). Copy `.env.example` to `.env.local`:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_DATABASE_ID
```

### Firestore Security Rules

`firestore.rules` enforces:
- Authenticated access on all collections
- Admin-only deletes (needed for seed data)
- Field validation on `leads` and `users`
- Owner email hardcoded as fallback admin bootstrap (allows first seed without a pre-existing role document)

When modifying access patterns, update `firestore.rules` and deploy with `firebase deploy --only firestore:rules`.

### Documentation

In-depth docs live in `docs/`:
- `ARCHITECTURE.md` — technical design rationale
- `DATA_MODEL.md` — collection schemas and field definitions
- `PRODUCTION_ROADMAP.md` — phased plan (Zustand, UUID joins, AI insights, SSR)
- `DECISION_LOG.md` — key architectural decisions and tradeoffs
- `SECURITY.md` — security considerations
