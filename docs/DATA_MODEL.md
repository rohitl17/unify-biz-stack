# Nexus Unified CRM: Data Model Definition

## Overview
The data model is defined as an "Intermediate Representation" in `firebase-blueprint.json`. It prioritizes relationships and unified identity across disparate customer-facing workflows.

## Primary Entities

### 1. Lead (`/leads`)
- **Purpose**: Tracks potential revenue and sales pipeline progress.
- **Key Fields**:
    - `name` (string): Prospect name.
    - `value` (number): Estimated deal size.
    - `status` (enum): New, Qualified, Negotiation, Lost.
    - `stage` (enum): Discovery, Proposal, Negotiation, Closed Won, Closed Lost.
    - `leadScore` (number): 0-100 score based on engagement.

### 2. MarketingEngagement (`/marketingEngagement`)
- **Purpose**: Logs touchpoints from marketing campaigns.
- **Key Fields**:
    - `customerName` (string): Linking key to other modules.
    - `type` (enum): Email Open, Link Click, Web Visit.
    - `timestamp` (timestamp): When the event occurred.

### 3. Activity (`/activities`)
- **Purpose**: A unified log of human interactions (calls, meetings, notes).
- **Key Fields**:
    - `customerId` (string): Reference to the customer.
    - `type` (enum): Call, Meeting, Note.
    - `subject` (string): Short summary.
    - `content` (string): Detailed logs.
    - `createdBy` (string): UID of the team member.

### 4. Task (`/tasks`)
- **Purpose**: Actionable items for team members.
- **Key Fields**:
    - `assignedTo` (string): UID of the assignee.
    - `priority` (enum): high, medium, low.
    - `relatedTo` (string): Customer identifier.
    - `category` (enum): sales, support, marketing, success.

## Relationships & Linking
- **The "Customer Name" Anchor**: Since this is a prototype, modules are currently linked via `customerName` or `relatedTo` strings. 
- **Production Recommendation**: Transition to UUID-based linking where every Customer has a master `accountID` that serves as a foreign key for all sub-collections.

## Security Schema
The model is protected by `firestore.rules` which enforces:
1. **Authenticated Access**: All reads/writes require a valid Firebase Auth UID.
2. **UID Ownership**: Creator-based write protection (e.g., users can only edit tasks assigned to them).
3. **Admin Elevation**: Special `role == 'admin'` check for destructive operations (delete).
