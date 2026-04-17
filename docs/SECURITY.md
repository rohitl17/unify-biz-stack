# Nexus Unified CRM: Security Philosophy

## Core Principles
1. **Default Deny**: All Firestore collections are locked down by default. Access must be explicitly granted.
2. **Owner Partitioning**: Personal data (tasks assigned to you) is partitioned by UID.
3. **Data Integrity**: Security rules validate data types (e.g., `is string`) and lengths to prevent large-payload attacks.

## Current Implementations (`firestore.rules`)

### Global Helpers
- `isAuthenticated()`: Ensures `request.auth != null`.
- `isAdmin()`: Checks if the user's document in the `/users` collection has `role == 'admin'`, or matches the default bootstrap administrator email.

### Collection-Specific Rules
- **`/leads`**: Authenticated read/write for sales transparency across the team.
- **`/activities`**: Authenticated read/create. Update/Delete restricted to admins or creators.
- **`/tasks`**: Read/Create for authenticated users. Updates restricted to either the Assignee or Admin.

## Vulnerability Mitigation
- **PII Protection**: User profiles (email/phone) are stored in the `/users` collection, which is restricted to `isOwner(userId)` to prevent data scraping.
- **Input Sanitization**: Rules enforce max sizes on string content (e.g., titles, descriptions) to prevent Database Resource Exhaustion.

## Production Checklist (Security)
1. **Enable MFA**: Enforce Multi-Factor Authentication via Firebase Auth.
2. **IP Whitelisting**: If used purely for internal company operations, implement CIDR-based access in Cloud Armor or similar.
3. **Audit Logging**: Enable Firestore Audit logs in the Google Cloud Console to track "who touched what data."
