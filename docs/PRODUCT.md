# Nexus — Product Brief

## The Problem

A typical 10-person SMB runs their customer operations across four separate tools:

- **Pipedrive or HubSpot** for the sales pipeline
- **Mailchimp or ActiveCampaign** for marketing campaigns
- **Freshdesk or Zendesk** for support tickets
- **Spreadsheets or Notion** for account health and renewals

Each tool works in isolation. None of them talk to each other in real time.

The result: your sales rep calls a prospect without knowing they filed an angry support ticket two days ago. Your customer success manager sends a renewal pitch to an account that marketing flagged as churned. Your support agent resolves a ticket without knowing the account is worth $85K and up for renewal next month.

This isn't a tools problem. It's a data architecture problem. **SMBs are forced to maintain four different "truths" about the same customer.**

---

## What Nexus Does Differently

Nexus is built on a single Firestore backend. Every module — Sales, Marketing, Support, Customer Success — reads from and writes to the same dataset. There is no sync, no webhook, no nightly export. When a support ticket is filed, the sales rep sees it. When a lead closes, a customer account is created automatically. When marketing engagement spikes for an account, it surfaces in the customer health view.

**One record per customer. Accessible from every role.**

---

## The Market Gap

### Enterprise CRMs (Salesforce, HubSpot)

These tools are genuinely unified — but built for companies with dedicated RevOps teams to configure them. A 10-person SMB doesn't have a Salesforce admin. Implementation costs typically run $15K–$50K before a single lead is entered. Monthly per-seat pricing scales fast.

The core problem isn't cost — it's that these tools assume a level of operational maturity most SMBs haven't reached yet. They're buying a factory floor when they need a workbench.

### Mid-Market CRMs (Pipedrive, Freshworks, Zoho)

Closer to the right price point, but they solve one problem well and bolt the rest on. Pipedrive is an excellent sales pipeline tool. Freshworks has solid support. Zoho has everything — but their suite is as fragmented as using four separate tools, just under one invoice. Data doesn't flow between Zoho CRM and Zoho Desk without configuration work.

### Flexible Tools (Monday.com, Notion, Airtable)

SMBs often start here because the price is right and the flexibility is appealing. The problem: flexibility requires someone to design the system. Most SMBs end up with a Notion workspace that has 12 databases, none of which agree on what a "customer" is. There is no real-time signal. There is no health score. There is no action queue.

### The Gap Nexus Fills

| | Salesforce / HubSpot | Pipedrive / Zoho | Notion / Monday | **Nexus** |
|---|---|---|---|---|
| All 4 functions in one tool | ✓ | Partial | ✗ | **✓** |
| Real-time cross-module data | ✓ | ✗ | ✗ | **✓** |
| SMB-appropriate complexity | ✗ | Partial | ✓ | **✓** |
| Unified customer profile | ✓ | ✗ | ✗ | **✓** |
| Action-oriented (not report-heavy) | ✗ | ✗ | ✗ | **✓** |
| Setup without a consultant | ✗ | Partial | ✓ | **✓** |

---

## Design Principles

These aren't aspirational — they're constraints that shaped every UI and data decision in the current prototype.

### 1. The same customer record, everywhere

Every collection in the database references the same customer anchor. A support ticket, a sales deal, a marketing engagement event, a renewal date — they all resolve to one account. There is no "sync." The moment data is written, it is visible everywhere.

### 2. Signals, not reports

Traditional CRMs surface data through reports: you schedule a weekly export, someone reads it, then acts. Nexus surfaces signals: a health score drops below 60 and it turns red, immediately, for whoever is looking at that account. The Action Queue on the dashboard is not a report — it is a live feed of what needs to happen today, assembled from tasks created across all four modules.

### 3. Information density without noise

SMB operators are generalists. The same person often manages sales *and* handles account escalations *and* reviews campaign performance. Nexus uses a Bento Grid layout — a card-based dashboard that presents multiple data streams simultaneously without requiring context switches between tabs. The goal is to make the right information visible at a glance, not buried three clicks deep.

### 4. Earned complexity

Salesforce is complex because it was built to be configured. Nexus starts simple and earns the right to be more detailed. New accounts have a health score. Deals have a lead score. Tasks have a priority. That's enough to act on. Complexity is added only where it changes a decision.

---

## What's Built Today

This is a functional prototype — not a mockup, not a slide deck. Every data point in the product comes from Firestore.

- **Sales Pipeline**: Create and manage leads, track stage and status, score every lead deterministically based on deal value and progression. Closing a deal automatically creates a customer account.
- **Marketing Hub**: Manage campaigns, attribute leads to campaigns by launch date, compute real ROI from actual deal values — not estimated projections.
- **Support Inbox**: File and manage tickets, view a per-customer activity thread, reply inline. Support agents see the same customer record as the sales team.
- **Customer Success**: Monitor account health scores, track renewals by countdown, log activities. Health scores are editable inline and reflected immediately across the product.
- **360° Customer Profile**: Open from any module. Surfaces all activities, open tickets, active deals, marketing touchpoints, and a health-based account roadmap in one view.
- **Unified Action Queue**: Every task — regardless of which module created it — surfaces on the overview dashboard, assigned to the right person, sorted by due date.

---

## What Makes This More Than a Prototype

The architecture decisions were made with production in mind:

- **Firestore security rules** enforce authenticated access, field validation, and role-based permissions at the database layer — not just in the UI
- **Lead scoring is deterministic** — based on stage, status, and deal value. It's queryable, sortable, and consistent across sessions
- **Cross-module data flows are real** — closing a deal creates a customer; support threads draw from the same activity log as the customer profile
- **No hardcoded demo data** — everything shown is written to and read from a live database. A seed script exists for development, but production data and demo data use the same code paths
- **Credentials are never committed** — environment variables only, gitignored, with a blank template for collaborators

The known architectural debt is documented and sequenced: UUID-based customer linking, Zustand state management, composite Firestore indexes. These are engineering choices that trade short-term simplicity for speed of iteration.

---

## Who This Is For

**The 5–50 person company** that has outgrown spreadsheets but isn't ready to hire a RevOps team to implement Salesforce.

Specifically:
- A **SaaS startup** with a founder-led sales motion, a small support inbox, and marketing campaigns that need to connect to deal outcomes
- A **services business** where account health and renewal timing are the primary drivers of revenue retention
- A **B2B company** where support escalations and sales calls involve the same set of customers and the left hand needs to know what the right hand is doing

---

## What's Next

The immediate roadmap prioritizes two things:

1. **AI-assisted insights** — `@google/genai` is already installed. The next feature is a "Summarize" button on the customer profile that generates a 2–3 sentence executive summary of the last 30 days of activity. Then: suggested next actions based on health score trends and open tickets.

2. **In-app notifications** — the bell icon is already in the header. The next step is wiring it to a live feed: health score drops below 60, high-priority ticket opened, task due today.

Both of these are about the same thing: **reducing the time between a signal appearing in the data and a human acting on it.** That's the product thesis. Everything else is in service of it.
