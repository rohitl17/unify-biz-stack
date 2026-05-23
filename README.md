# Nexus — Unified CRM for SMBs

> One tool. Every customer interaction. No sync required.

<video src="assets/demo.mp4" controls width="100%"></video>

---

## The Problem

A typical 10-person SMB runs customer operations across four separate tools — Pipedrive for sales, Mailchimp for marketing, Freshdesk for support, and spreadsheets for account health. Each tool works in isolation.

The result: your sales rep calls a prospect without knowing they filed an angry support ticket two days ago. Your customer success manager sends a renewal pitch to an account marketing flagged as disengaged. Your support agent resolves a critical ticket without knowing the account is worth $85K and up for renewal next month.

**SMBs are forced to maintain four different "truths" about the same customer.**

---

## What Nexus Does Differently

Nexus is built on a single backend. Every module — Sales, Marketing, Support, Customer Success — reads from and writes to the same dataset. There is no sync, no webhook, no nightly export.

- When a support ticket is filed, the sales rep sees it in the customer profile
- When a lead closes, a customer account is created automatically
- When marketing engagement spikes, it surfaces in the health view
- Every task from every module lands in one Action Queue, assigned to the right person

**One record per customer. Accessible from every role. Updated in real time.**

---

## Who It's For

**The 5–50 person company** that has outgrown spreadsheets but isn't ready to hire a RevOps team to configure Salesforce.

- A **SaaS startup** with a founder-led sales motion that needs support and marketing data in the same view
- A **services business** where renewal timing and account health drive most of the revenue
- A **B2B company** where the same 50 customers interact with sales, support, and marketing — and the left hand needs to know what the right hand is doing

---

## Core Modules

| Module | What it does |
|---|---|
| **Overview** | Live dashboard: pipeline value, health scores, active campaigns, engagement delta, live tickets, action queue — all real Firestore data |
| **Sales Pipeline** | Lead management, deterministic lead scoring, filter panel, task creation, auto-creates customer account on `closed_won` |
| **Marketing Hub** | Campaign management with real analytics — leads attributed since launch, computed ROI, win rate from actual deal values |
| **Support Inbox** | Ticket management with a chat-style activity thread per ticket and inline reply |
| **Customer Success** | Account health monitoring, inline score editing, renewal countdown, task creation |
| **Customer Detail** | 360° profile: activities, open tickets, deals, marketing engagement, data-driven account roadmap |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with Firestore and Google Auth enabled

### Local Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your Firebase credentials:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_DATABASE_ID=(default)
   ```
3. Add `localhost` to Firebase's authorized domains (Authentication → Settings → Authorized domains)
4. Start the dev server:
   ```bash
   npm run dev
   ```

> Never commit `.env.local`. The `.gitignore` already covers this.

### Seeding Demo Data

In development, a **Seed Demo Data** button appears at the bottom of the sidebar. It clears all collections and repopulates 7 Firestore collections with realistic demo data across 10 companies.

---

## Tech Stack

- **React 19 + TypeScript** + **Vite**
- **Tailwind CSS 4** — custom Bento Grid theme
- **Framer Motion** — transitions and modal animations
- **Firebase Firestore** — real-time backend via `onSnapshot`
- **Firebase Auth** — Google OAuth

---

## Further Reading

- [Product Brief & Competitor Positioning](./docs/PRODUCT.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Data Model](./docs/DATA_MODEL.md)
- [Production Roadmap](./docs/PRODUCTION_ROADMAP.md)
- [Security](./docs/SECURITY.md)
