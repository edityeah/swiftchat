# Role × Action Matrix

This document is the canonical "who can do what" for SwiftChat. Roles are enforced both in the frontend (`actionRegistry.allowedRoles`) and in the AI prompt that grounds the intent classifier.

## Teacher
Allowed:
- Mark attendance (own classes)
- Open XAMTA scanner / view past results
- Open class dashboard
- Open DigiVritti home, Namo Lakshmi, Namo Saraswati
- Open application list, open rejected applications, fix & resubmit
- Opt-out a student with guardian declaration
- Send parent alerts (with confirmation)
- Use DigiVritti AI (teacher queries)

Not allowed: approve / reject scholarship applications, run PFMS payments, see other teachers' rosters, see district aggregates.

## Principal
Allowed:
- All Teacher actions, plus:
- School Dashboard, school-level scholarship summary (read-only)
- Pending-teacher-action list
- Use DigiVritti AI (school-level queries)

Not allowed: approve / reject applications, payment actions, district / state views.

## CRC (Cluster Approver)
Allowed:
- Pending review queue, resubmitted re-review queue
- Approve / reject applications with reason (irreversible)
- Approval summary, cluster-level metrics
- Use DigiVritti AI (cluster queries)

Not allowed: edit application content (only approve/reject), mark attendance, run XAMTA, run payments.

## DEO (District Education Officer)
Allowed:
- District metrics, failed payments breakdown, attendance review
- First-month bulk approvals (no attendance check)
- Aadhaar correction windows
- District dashboard, district drill-down
- Use DigiVritti AI (district queries) + Delayed-Payments + Monsoon deep dives

Not allowed: edit teacher applications, run PFMS batches.

## State Secretary
Allowed:
- State metrics, application funnel, payment by district
- Bulk approval, monsoon what-if, district comparison
- State Dashboard, State command centre
- Use DigiVritti AI (state queries) + all deep dives

Not allowed: edit teacher applications. (Has read access to everything.)

## PFMS (Payment Officer)
Allowed:
- Payment queue (pending / failed / success / all)
- Retry failed payments
- District success rate, sanctioned-vs-disbursed
- Use DigiVritti AI (payment queries)

Not allowed: approve / reject scholarship applications, mark attendance, run XAMTA.

## Parent
Allowed:
- Own child's attendance, latest result, homework
- Message teacher

Not allowed: school-wide views, scholarship management actions, war-room alerts, anything about other students.
