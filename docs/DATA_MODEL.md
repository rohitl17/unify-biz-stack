# Nexus Unified CRM: Data Model

## Overview

All data lives in Firestore. Seven collections share a common `customerName` / `customerId` string key for cross-module joins. This is a prototype-friendly simplification; the production path is a UUID `accountId` (see below).

---

## Collections

### `/customers`
Accounts under active management.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Primary join key used by all other collections |
| `healthScore` | number | 0–100; editable inline in Customer Success |
| `plan` | enum | `basic` \| `pro` \| `enterprise` |
| `renewalDate` | ISO string | Used for renewal countdown |
| `successManagerId` | string (uid) | Owner |

Auto-created when a lead moves to `closed_won` (plan: basic, healthScore: 75, renewalDate: +365d).

---

### `/leads`
Sales pipeline records.

| Field | Type | Notes |
|---|---|---|
| `company` | string | Links to `customers.name` |
| `contactName` | string | |
| `email` | string | |
| `status` | enum | `new` \| `contacted` \| `qualified` \| `lost` |
| `stage` | enum | `discovery` \| `proposal` \| `negotiation` \| `closed_won` \| `closed_lost` |
| `value` | number | Deal size in USD |
| `leadScore` | number | 0–100; computed by `computeLeadScore()` |
| `ownerId` | string (uid) | |
| `createdAt` | ISO string | |

**Lead score formula**: stage points (20–100) + status points (0–15) + value points (0–25, capped at $20K). Written back to Firestore on every update.

---

### `/tickets`
Support requests.

| Field | Type | Notes |
|---|---|---|
| `subject` | string | |
| `description` | string | |
| `priority` | enum | `low` \| `medium` \| `high` \| `urgent` |
| `status` | enum | `open` \| `in-progress` \| `resolved` |
| `customerId` | string | Links to `customers.name` |
| `assignedTo` | string | Team member name or uid |
| `createdAt` | ISO string | |

---

### `/activities`
Unified log of human interactions across all modules.

| Field | Type | Notes |
|---|---|---|
| `type` | enum | `note` \| `call` \| `meeting` |
| `subject` | string | Short label |
| `content` | string | Full log text |
| `customerId` | string | Links to `customers.name` |
| `createdBy` | string (uid) | |
| `createdAt` | ISO string | |

Used by Support's thread view (filtered by `customerId`) and CustomerDetail's activity timeline.

---

### `/tasks`
Actionable items surfaced in the Action Queue.

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `priority` | enum | `low` \| `medium` \| `high` |
| `category` | enum | `sales` \| `support` \| `success` \| `marketing` |
| `relatedTo` | string | Customer name |
| `assignedTo` | string (uid) | Queried by `user.uid` in Action Queue |
| `dueDate` | string | Date string |
| `createdAt` | ISO string | |

Tasks can be created from Sales lead cards, Support ticket cards, and Customer Success account cards.

---

### `/campaigns`
Marketing campaigns.

| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `type` | enum | `email` \| `social` \| `webinar` \| `ads` |
| `status` | enum | `active` \| `planned` \| `completed` |
| `budget` | number | USD |
| `leadsGenerated` | number | Seeded; analytics modal computes real count from `/leads` |
| `startDate` | ISO string | Used to filter leads for attribution |

---

### `/marketingEngagement`
Individual engagement events (email opens, clicks, web visits).

| Field | Type | Notes |
|---|---|---|
| `customerName` | string | Links to `customers.name` |
| `type` | enum | `email_open` \| `link_click` \| `web_visit` |
| `timestamp` | ISO string | Used for month-over-month delta on Overview |

---

## Cross-Module Relationships

```
customers.name ──┬── leads.company
                 ├── tickets.customerId
                 ├── activities.customerId
                 ├── tasks.relatedTo
                 └── marketingEngagement.customerName
```

All joins are string equality checks. There is no referential integrity — deleting a customer does not cascade.

---

## Known Architectural Debt

**The `customerName` string join is fragile.** Duplicate company names, renames, or typos silently break cross-module relationships.

**Production fix**: introduce an `accountId` UUID as the primary key on `customers`. Backfill all other collections with a one-time migration script. All queries switch from `where('customerName', '==', name)` to `where('accountId', '==', id)`.

---

## Security

Enforced by `firestore.rules`:

- All reads and writes require `request.auth != null`
- `isAdmin()` is required for all deletes (admin = `role == 'admin'` in `/users`, or the bootstrap owner email)
- `isValidLead()` validates required fields and enum values on lead create/update
- `isValidUser()` validates required fields and role enum on user create/update
