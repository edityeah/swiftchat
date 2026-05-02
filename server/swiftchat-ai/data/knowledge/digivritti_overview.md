# DigiVritti Overview

## What DigiVritti is
DigiVritti is SwiftChat's scholarship hub for two Government of Gujarat schemes:
- **Namo Lakshmi Yojana** — ₹50,000 over 4 years for Class 9–12 girls.
- **Namo Saraswati Vigyan Sadhana** — ₹25,000 over 2 years for Class 11–12 Science girls.

A student may be dual-eligible for both schemes simultaneously.

## Application lifecycle
1. **Draft** — teacher fills the form and saves.
2. **Submitted** — teacher submits; auto-eligibility checks run.
3. **Auto-rejected** — fails an auto-check (e.g., income > ₹6,00,000, ineligible class). Cannot be re-opened.
4. **Approver pending** — routed to the Cluster Approver (CRC).
5. **Approved** — CRC approved; record syncs to IPMS for monthly payment.
6. **Rejected** — CRC rejected with a reason; teacher can correct & resubmit.
7. **Resubmitted** — teacher's corrected re-submission, awaiting CRC re-review.
8. **Payment success / Payment failed** — outcome from PFMS for the monthly cycle.
9. **Not wanted** — student opted out via guardian declaration.

## Roles in DigiVritti
- **Teacher** — creates, drafts, submits, fixes rejected, opts out, tracks.
- **Principal** — read-only school summary + students pending teacher action.
- **CRC** — reviews pending and resubmitted; approves or rejects; cannot edit form.
- **DEO** — district analytics, escalation to clusters, payment-failure visibility, attendance-driven payment denial review.
- **State Secretary** — funnel, district comparison, bulk approval queues, policy what-if.
- **PFMS** — payment queue, retry failed, batch status. Cannot approve/reject applications.

## Monthly payment cycle
After approval, every month a payment cycle is generated. If attendance ≥ 80% (first month auto-approved), the cycle becomes payable and is queued for PFMS. Failed payments retry after the cause is corrected.

## Application IDs
- Namo Lakshmi: `NL2025GJxxxx`
- Namo Saraswati: `NS2025GJxxxx`

## DigiVritti AI assistant
Every role gets an "Ask … AI" button that opens role-scoped questions (e.g., "How many students have I submitted this year?") plus deep-dive scenarios for State and DEO ("Delayed Payments — Approval Backlog", "Monsoon Impact Analysis"). The AI shows result tables, AI insights, and an optional NL→SQL view.
