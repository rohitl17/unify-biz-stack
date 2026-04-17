# Nexus Unified CRM: Decision Log

This document tracks significant architectural and design choices made during the development of the Nexus prototype.

## [2026-04-16] Choice of Bento Grid (Visual Language)
- **Decision**: Adopt the "Bento Grid" styling for all dashboard elements.
- **Rationale**: SMB users deal with a high volume of disparate data (sales, tickets, marketing). A grid system provides "Information Density with Sanity," allowing users to scan multiple metrics without scrolling through long lists.
- **Reference**: `frontend-design` Skill (Recipe 1).

## [2026-04-16] Real-time Context vs. Polling
- **Decision**: Use Firestore `onSnapshot` for all core list views (Leads, Tasks, Activities).
- **Rationale**: In a unified CRM, updates in one module (e.g., Support closing a ticket) should be visible to Sales instantly. Real-time listeners provide this "Live Collaboration" feel out of the box.

## [2026-04-16] Module Isolation with Global Detail Overlay
- **Decision**: Keep Sales, Marketing, etc., as distinct components in `App.tsx`, but use a global `selectedCustomerName` state to trigger the `CustomerDetail` view.
- **Rationale**: This allows the user to explore customer details from *any* context without losing their place in their current primary workflow (e.g., browsing a lead list).

## [2026-04-16] Firebase Blueprint as Ir
- **Decision**: Use `firebase-blueprint.json` as a static schema reference.
- **Rationale**: Even though it doesn't deploy the database directly, it provides a "Source of Truth" for the AI Agent and human developers to maintain consistency across codebase edits.

## [2026-04-16] Styling Strategy
- **Decision**: Use Tailwind CSS 4.0 `@theme` variables for global branding (accent colors like `accent-sales`, `accent-cs`).
- **Rationale**: Simplifies branding changes; updating one variable in `index.css` propagates the color identity throughout all module cards.
