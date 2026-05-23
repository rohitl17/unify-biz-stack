# Nexus Unified CRM: Decision Log

Significant architectural and design choices made during development.

---

## [2026-04-16] Bento Grid Visual Language

**Decision**: Adopt the "Bento Grid" styling for all dashboard elements.

**Rationale**: SMB users deal with high volumes of disparate data (sales, tickets, marketing). A grid system provides information density without overwhelming the user. Custom Tailwind utilities (`dashboard-card`, `bento-grid`, `pill-*`) and `@theme` accent variables keep the visual language consistent across all modules.

---

## [2026-04-16] Real-Time via `onSnapshot` (Not Polling)

**Decision**: Use Firestore `onSnapshot` for all core list views.

**Rationale**: In a unified CRM, updates in one module (e.g., Support closing a ticket) should appear in Sales' customer view instantly. `onSnapshot` delivers this live-collaboration feel with no additional infrastructure. All listeners are managed in a single `useEffect` in `App.tsx` with a unified cleanup array.

---

## [2026-04-16] Module Isolation with Global Detail Overlay

**Decision**: Keep Sales, Marketing, etc. as distinct components, but use a global `selectedCustomerName` string in `App.tsx` to trigger the `CustomerDetail` overlay.

**Rationale**: Users can explore customer details from any context without losing their place in their current workflow. The overlay aggregates data from five collections on demand and dismisses cleanly back to whichever module was active.

---

## [2026-04-16] `customerName` as Cross-Module Join Key

**Decision**: Use a plain string (`customerName` / `customerId`) to link all collections.

**Rationale**: Fast to implement for a prototype; no migration needed. Explicit tradeoff: fragile with duplicates or renames. Flagged for replacement with a UUID `accountId` before production use. See [DATA_MODEL.md](./DATA_MODEL.md).

---

## [2026-04-16] Tailwind CSS `@theme` for Brand Variables

**Decision**: Define all accent colors (`accent-sales`, `accent-cs`, `accent-support`, `accent-marketing`) as `@theme` variables in `index.css`.

**Rationale**: A single change to `index.css` propagates the brand identity across all module cards and buttons. No component needs to be updated individually for a rebrand.

---

## [2026-05-22] Firebase Credentials via Environment Variables

**Decision**: Replace the committed `firebase-applet-config.json` with `VITE_FIREBASE_*` env vars read from `.env.local`.

**Rationale**: Credentials committed to a public repo are immediately compromised. `.env.local` is gitignored. `.env.example` provides a blank template so collaborators know which keys to fill in. `tsconfig.json` was updated to include `vite/client` types to resolve `import.meta.env` TypeScript errors.

---

## [2026-05-22] `signInWithPopup` over `signInWithRedirect`

**Decision**: Use `signInWithPopup` for Google OAuth.

**Rationale**: `signInWithRedirect` caused a page loop on localhost because Firebase redirected back to the same page before the auth state was processed. Root cause was `localhost` not being in the Firebase Console's authorized domains list. After adding it, `signInWithPopup` works cleanly and gives a faster UX (no full-page reload).

---

## [2026-05-22] Deterministic Lead Scoring

**Decision**: Replace `Math.random() * 60 + 20` with a formula based on stage, status, and deal value.

**Rationale**: Random scores are useless for prioritization and create noise in the UI. The deterministic formula (max 140 points, capped at 100) lets sales reps trust the score and sort by it meaningfully. Score is written back to Firestore on every field update so it stays current.

---

## [2026-05-22] Browser-Based Seed Script

**Decision**: Implement `src/lib/seed.ts` as a TypeScript module (not a Node.js script) with a dev-only button in the sidebar.

**Rationale**: A Node.js seed script requires either the Firebase Admin SDK (service account key — a security risk) or anonymous auth (disabled in this project). Running the seed in the browser means the user is already authenticated and inherits admin permissions from Firestore rules. The button is hidden in production builds via `import.meta.env.DEV`.

---

## [2026-05-22] Admin-Only Deletes in Firestore Rules

**Decision**: Add `allow delete: if isAdmin()` to all collections that previously had no delete rule.

**Rationale**: The seed script's `clearCol()` function calls `deleteDoc` on every document before repopulating. Without an explicit delete rule, Firestore denies the operation silently. Admin-only delete is the right default — it prevents accidental or malicious data loss by non-admin users while enabling the seed workflow for developers.
