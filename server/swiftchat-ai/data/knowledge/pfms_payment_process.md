# PFMS Payment Process

## Who runs PFMS
The **Payment Officer** (PFMS role in SwiftChat) runs disbursement. PFMS officers cannot approve or reject scholarship applications themselves — that's the Cluster Approver's job. PFMS only sees payment-related actions: payment queue, failed payments, retry, batch status.

## Payment lifecycle
1. **Approved application** → IPMS sync creates a `monthly_payment_cycle` row each month.
2. The cycle is checked for eligibility (attendance ≥ 80%, first month exempt).
3. Eligible cycles are batched into a **PFMS batch** (e.g., `BATCH-2025-09-001`).
4. The batch is pushed to the PFMS payment API.
5. PFMS returns success (with **UTR**) or failure (with reason).

## Failure causes
| Failure reason | Typical share | Fix |
|---|---|---|
| Aadhaar–bank link missing | ~70% of failures | Open Aadhaar correction window; teacher updates record; payment retries automatically. |
| Account frozen | ~18% | Guardian visits the bank to reactivate; once active, retry. |
| Invalid IFSC | ~12% | Teacher corrects IFSC on the application; retry. |

## Retry process
1. PFMS officer opens **Payment Queue → Failed**.
2. For each failed payment, identify the cause from `failure_reason`.
3. If the cause is an Aadhaar-bank linking issue, open the **Aadhaar correction** window from the DEO console — teachers will be prompted to update student records, after which retry is auto-queued.
4. For IFSC / account issues, the teacher fixes the application and the cycle re-queues at the next batch.
5. Retried payments appear in the next PFMS batch with `retry_count` incremented (max 3 retries).

## UTR records
Successful payments return a **UTR** (Unique Transaction Reference). UTRs are visible from **Payment Queue → Success** and embedded on each application's row in the application list. UTRs are the audit trail for the payment.

## Batch status
Three states:
- **Processing** — batch sent, awaiting PFMS response. No retry decisions until processing completes.
- **Completed** — all records returned success.
- **Completed with failures** — some success + some failure rows. Use the failed rows for retry.

## Sanctioned vs disbursed vs pending
- **Sanctioned** = total monthly cycle amount auto-approved or approved.
- **Disbursed** = amount where PFMS returned success.
- **Pending** = sanctioned − disbursed. Comes from in-flight batches + payment failures awaiting retry.
