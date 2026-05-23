# Nexus (Prototype)

## Overview & Vision

**Nexus** is a functional prototype of a **Unified CRM** designed specifically for SMBs. It delivers a "Single-Source-of-Truth" architecture where Sales, Customer Success, Marketing, and Support share a live Firestore backend and a unified customer profile view.

### Core Value Pillars

- **Unified Context**: Every interaction — marketing signals, support tickets, sales activities — surfaces in a single customer profile accessible from any module.
- **Bento Grid Interface**: A card-based layout manages information density, making complex customer data scannable without overwhelming the user.
- **Real-Time Data**: All modules use Firestore `onSnapshot` listeners. Updates in one module appear instantly across the rest of the app.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with Firestore and Google Auth enabled

### Local Setup

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` in the project root (copy from `.env.example`) and fill in your Firebase credentials:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_DATABASE_ID=(default)
   ```
4. Add `localhost` to your Firebase project's authorized domains (Authentication → Settings → Authorized domains)
5. Start the dev server:
   ```bash
   npm run dev
   ```

> **Note**: Never commit `.env.local` or any file containing Firebase credentials. The `.gitignore` already covers this.

### Seeding Demo Data

In development, a **Seed Demo Data** button appears at the bottom of the sidebar. Clicking it clears all collections and populates 7 Firestore collections with 10 companies of realistic data (customers, leads, tickets, campaigns, activities, tasks, marketing engagement). Requires admin-level Firestore delete permissions — your account is pre-configured as admin in `firestore.rules`.

---

## Core Modules

| Module | What it does |
|---|---|
| **Overview** | Live dashboard: pipeline value, health scores, active campaigns, engagement delta, live tickets, action queue — all from real Firestore data |
| **Sales Pipeline** | Lead management with stage/status tracking, deterministic lead scoring, filter panel, task creation, and automatic customer creation on `closed_won` |
| **Marketing Hub** | Campaign management with real analytics (leads generated since launch, computed ROI, win rate) |
| **Support Inbox** | Ticket management with a chat-style activity thread per ticket and per-ticket task creation |
| **Customer Success** | Account health monitoring with inline score editing, renewal countdown, and task creation |
| **Customer Detail** | 360° profile aggregating activities, open tickets, deals, marketing engagement, and a data-driven CS roadmap |

---

## Tech Stack

- **React 19 + TypeScript** — functional components and hooks throughout
- **Vite** — dev server and bundler
- **Tailwind CSS 4** — custom Bento theme with accent color variables (`accent-sales`, `accent-cs`, `accent-support`, `accent-marketing`)
- **Framer Motion** (`motion/react`) — page transitions and modal animations
- **Firebase Firestore** — real-time NoSQL backend via `onSnapshot`
- **Firebase Auth** — Google OAuth via `signInWithPopup`
- **Lucide React** — icon set

---

## Project Status

**Current State**: High-fidelity functional prototype — all six dashboard cards and all module interactions pull from live Firestore data.

**Known architectural debt**: All cross-module joins use `customerName` as a string key. See [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) for the UUID migration path.

**Next Steps**: See [docs/PRODUCTION_ROADMAP.md](./docs/PRODUCTION_ROADMAP.md).
