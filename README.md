# Nexus (Prototype)

## Overview & Vision

**Nexus** is a functional prototype of a **Unified CRM** designed specifically for SMBs. It explores a "Single-Source-of-Truth" architecture where Sales, Customer Success, Marketing, and Support are integrated into a cohesive visual experience.

### Core Value Pillars (Design Goals):

*   **Unified Context**: A central objective is to eliminate silos between departments. Every interaction—from marketing signals to support tickets—is presented in a single, unified customer profile.
*   **Bento Grid Interface**: The application utilizes a "Bento Grid" styling to manage information density. The goal is to make complex customer data scannable and intuitive without overwhelming the user.
*   **Real-Time Data**: Built on top of Firebase, the prototype demonstrates how real-time updates and an aggregated "Action Queue" can help small teams react faster to customer needs.

---

## Design Context: The Need for Unification

SMBs often struggle with fragmented data because disparate tools (Sales, Support, Marketing) don't naturally talk to each other. Nexus was built to test several hypotheses on how to solve this:

1.  **Schema Alignment**: Instead of syncing different databases, Nexus uses a single, shared data blueprint (Intermediate Representation) to ensure consistency across all modules.
2.  **Reduced Context Switching**: By integrating a 360-degree view directly into the workflow, we test whether users can make better decisions (e.g., Sales knowing about a Support issue before a call).
3.  **Visual Prioritization**: Moving away from traditional "table-heavy" CRM designs toward a more modern, card-based grid that highlights active signals rather than just rows of static data.

---

## Project Status

**Current State**: High-Fidelity Functional Prototype.  
**Purpose**: To demonstrate UI/UX patterns for a unified SMB platform, integrated with a live real-time backend. 
**Next Steps**: See the [Production Roadmap](./docs/PRODUCTION_ROADMAP.md) for details on transitioning this to an enterprise-grade application.

## Core Modules

*   **Sales Pipeline**: High-velocity lead management and revenue tracking.
*   **Marketing Hub**: Campaign performance and real-time activity feeds.
*   **Support Center**: Mission-critical ticketing and issue resolution.
*   **Customer Success**: Account health monitoring and renewal roadmaps.
*   **Unified Profiles**: The definitive 360-degree view of every customer relationship.

---

## Tech Stack
- **React + TypeScript**
- **Tailwind CSS** (Custom Bento Theme)
- **Framer Motion** (Interaction Design)
- **Firebase** (Firestore & Authentication)
- **Lucide Icons**
