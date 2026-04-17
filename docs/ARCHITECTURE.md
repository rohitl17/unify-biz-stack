# Nexus Unified CRM: Architecture Definition

## High-Level Vision
Nexus Unified CRM is designed as a **Single-Source-of-Truth** platform for SMBs, unifying Sales, Customer Success, Marketing, and Support into a single cohesive experience. Unlike legacy CRMs that rely on sync-logic between modules, Nexus operates on a unified data blueprint.

## Technical Architecture

### 1. Frontend: React + Vite (SPA)
- **Framework**: React 19 (Functional Components + Hooks).
- **Styling**: Tailwind CSS 4.0 (Utility-first).
- **Design Philosophy**: **Bento Grid**. Modular, card-based layout inspired by the `frontend-design` recipe for "Technical Dashboards."
- **Animations**: `motion/react` (Framer Motion) for route transitions and interactive feedback.
- **Icons**: `lucide-react` for a consistent, professional iconography set.

### 2. Backend: Firebase (Serverless)
- **Database**: Firestore (NoSQL Document Store).
- **Authentication**: Firebase Authentication (Google OAuth).
- **Real-time Strategy**: Systematic use of `onSnapshot` listeners to ensure the "Unified Action Queue" and "Customer Profiles" reflect global changes instantly without manual refreshes.

## Core Design Decisions

### The Bento Grid System
The interface is subdivided into atomic "cards" within a responsive grid. 
- **Purpose**: To provide high information density while maintaining visual hierarchy.
- **Implementation**: Custom Tailwind utility classes combined with a standard grid-gap strategy.

### Unified Action Queue
A centralized state in the dashboard that aggregates tasks across all modules (assigned to the current user). 
- **Decision**: Tasks are not scoped per-module in the UI; they are aggregated globally to reduce context-switching friction.

### Contextual Navigation
Users can drill down into a **Unified Customer Profile** from any module (Sales, Success, etc.). 
- **State Management**: App-wide `selectedCustomerName` state controls the overlay detail view, ensuring the user's working context is preserved in the background module.

## Production Roadmap
To move this prototype to production:
1. **Server-Side Rendering (SSR)**: Consider migrating to Next.js or a custom Express-Vite setup for better SEO and initial load performance.
2. **State Management**: Migrate from simple `useState` to a more robust solution like **Zustand** or **Redux Toolkit** as the data complexity grows.
3. **Advanced RBAC**: Implement field-level security in Firestore to handle sensitive financial data within leads.
