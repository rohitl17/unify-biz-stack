# Nexus Unified CRM: Production Roadmap

This roadmap outlines the steps required to transition the **Nexus Unified CRM** from its current functional prototype state to a production-ready enterprise application.

## Phase 1: Robustness & Reliability
- [ ] **State Management Migration**: Transition from React local state to **Zustand** or **Redux Toolkit** for cross-module data consistency.
- [ ] **Error Boundaries & Logging**: Implement higher-level Error Boundaries and integrate with a service like **Sentry** for crash reporting.
- [ ] **Automated Testing**: 
    - [ ] Unit tests for utility logic (Lead scoring, date formatting).
    - [ ] Integration tests for Firestore security rules using the `@firebase/rules-unit-testing` library.
    - [ ] E2E tests (Playwright) for critical user flows like "Select Lead -> Log Activity."

## Phase 2: Functional Expansion
- [ ] **AI Insights Engine**:
    - [ ] Integrate `@google/genai` to generate summaries of long activity timelines.
    - [ ] Implement predictive "Next Best Action" recommendations based on customer health and engagement data.
- [ ] **Notification Service**: 
    - [ ] Implement browser push notifications or email alerts for high-priority task assignments.
    - [ ] Use Firestore Cloud Functions to trigger notifications when certain data thresholds are met (e.g., Lead Score drops by 20 points).
- [ ] **CSV Import/Export**: Build robust tools for bulk uploading leads from legacy CSV files.

## Phase 3: Infrastructure & Scale
- [ ] **Indexing**: Add composite indexes in Firestore for complex queries (e.g., "All high-priority tasks for User X sorted by Due Date").
- [ ] **CI/CD Pipeline**: Set up GitHub Actions for automated linting, testing, and deployment to Cloud Run.
- [ ] **Performance Monitoring**: Monitor Firestore read/write costs and implement caching for frequently accessed static data.

## Phase 4: Compliance & Advanced Security
- [ ] **Audit Trail**: Implement a non-deletable `history` collection that logs every state change for leads (who changed status from X to Y).
- [ ] **SOC2/GDPR Readiness**: Ensure data deletion requests (Right to be Forgotten) are handled via administrative scripts.
