# Nexus Unified CRM: Production Roadmap

This document tracks what has been built and what remains to reach production quality.

---

## What's Done

### Core Infrastructure
- [x] Firebase Auth (Google OAuth, `signInWithPopup`)
- [x] Firestore security rules with role-based access and field validation
- [x] Firebase credentials moved to `.env.local` (gitignored); `.env.example` provided as template
- [x] TypeScript configured for `import.meta.env` (`vite/client` types)

### Overview Dashboard
- [x] All 6 cards pull real Firestore data via `onSnapshot`
- [x] Pipeline value, conversion rate, win rate computed from live leads
- [x] Avg health score and at-risk count computed from live customers
- [x] Marketing engagement with month-over-month delta
- [x] Live tickets list (last 5, ordered by createdAt)
- [x] Active campaigns count and next upcoming campaign name
- [x] Action Queue filtered by current user's UID

### Sales Pipeline
- [x] Lead CRUD with stage and status dropdowns
- [x] Deterministic lead scoring (stage + status + deal value)
- [x] Filter panel (by status and stage) with active filter badge
- [x] Task creation from lead cards (pre-fills category, relatedTo, assignedTo)
- [x] `closed_won` → auto-create Customer in Firestore if none exists

### Marketing Hub
- [x] Campaign CRUD
- [x] Analytics modal: leads generated since campaign start, total lead value, computed ROI, conversion rate, win rate
- [x] Campaign cards show real lead count attributed since launch date

### Support Inbox
- [x] Ticket CRUD with priority and status management
- [x] Chat-style activity thread per ticket (reads from `activities` collection)
- [x] Reply writes to `activities` collection
- [x] Task creation from ticket cards

### Customer Success
- [x] Account list with health score display
- [x] Inline health score editing (click to edit, Enter to save)
- [x] Renewal countdown with color-coded urgency (red ≤30d, amber ≤90d)
- [x] "Review Account" navigates to CustomerDetail
- [x] Task creation from account cards

### Customer Detail (360° Profile)
- [x] Activities timeline (filtered to this customer)
- [x] Open tickets (filtered to this customer)
- [x] Deals/leads (filtered to this customer)
- [x] Marketing engagement (filtered by `customerName` — bug fixed)
- [x] Data-driven CS roadmap (phases derived from health score, activity count, days to renewal)

### Developer Experience
- [x] Seed script (`src/lib/seed.ts`) — clears and repopulates all 7 collections with realistic demo data
- [x] Seed button in sidebar (dev-only, `import.meta.env.DEV`)
- [x] Seed result (success/error) shown visibly below the button

---

## Phase 1 — Robustness (Next Priority)

- [ ] **UUID-based customer linking**: Replace `customerName` string joins with an `accountId` UUID across all collections. Requires a one-time migration script to backfill existing records.
- [ ] **Zustand state management**: Replace scattered `useState` + `onSnapshot` with centralized stores (`useLeadsStore`, `useCustomersStore`, etc.). Reduces re-renders and simplifies cross-module data sharing.
- [ ] **Firestore composite indexes**: Add indexes for `tasks(assignedTo, dueDate)`, `activities(customerId, createdAt)`, `tickets(customerId, priority)`.
- [ ] **Error Boundaries**: Wrap each module in an Error Boundary to prevent one module's crash from taking down the whole app.
- [ ] **Automated tests**:
  - [ ] Unit tests for `computeLeadScore()` and date helpers
  - [ ] Firestore rules tests via `@firebase/rules-unit-testing`
  - [ ] E2E tests (Playwright) for critical flows: sign-in, create lead, close deal → verify customer created

---

## Phase 2 — Functional Expansion

- [ ] **AI Insights Engine** (`@google/genai` is already installed):
  - [ ] "Summarize" button on CustomerDetail — sends last N activities to Gemini, returns executive summary
  - [ ] "Next Best Action" — suggests follow-up based on health score, open tickets, activity recency
  - [ ] Lead prioritization — rank leads by predicted close probability
- [ ] **In-app notifications**: The bell icon in the header is rendered but non-functional. Wire it to a `notifications` Firestore collection; surface alerts for high-priority tickets, health score drops below 60, and tasks due today.
- [ ] **CSV Import/Export**: Client-side CSV export for leads and customers; CSV import for bulk lead creation with validation.
- [ ] **CI/CD**: GitHub Actions — `tsc --noEmit` + deploy to Firebase Hosting on push to `main`.

---

## Phase 3 — Scale & Compliance

- [ ] **SSR**: Migrate to Next.js for SEO and faster initial load if the product goes public-facing.
- [ ] **Performance monitoring**: Track Firestore read/write costs; add caching for frequently accessed static data.
- [ ] **Audit trail**: Non-deletable `history` collection logging every state change (who changed what, when).
- [ ] **SOC2/GDPR**: Data deletion scripts for Right to be Forgotten requests.
- [ ] **MFA**: Enforce multi-factor authentication via Firebase Auth.
