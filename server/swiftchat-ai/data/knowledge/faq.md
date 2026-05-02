# SwiftChat FAQ

## Why does the mother's name need to match Aadhaar and the bank exactly?
DigiVritti is a fully DBT scheme. Government DBT compliance requires that the bank account name matches the Aadhaar name to which the seed is linked. A spelling mismatch — even a missing letter or a different order of name parts — causes the PFMS payment to fail with "Aadhaar–bank link missing". This is the #1 rejection reason. The fix is to update either the Aadhaar copy or the bank passbook so they read identically, then resubmit.

## What if the mother's Aadhaar is mismatched with her bank?
Update the source first (visit the bank branch with Aadhaar; or update Aadhaar at a Seva Kendra). The teacher then edits the application with the corrected spelling and resubmits. Approval typically clears within 7 days; the next monthly payment cycle picks up the corrected record.

## How long does CRC approval take?
Median 5 days, with most clusters clearing within a week. Applications older than 7 days appear in the **Older than 7 days** cluster view and are escalated. Cluster K.M.CHOKSI (Banaskantha) is the historical worst with 30+ days; the State command centre's deep-dive flags these.

## Where do I see the UTR for a paid scholarship?
Either:
- **Payment Queue → Success records** (PFMS officer)
- The application's expanded row in the **Application list** (any role with read access)
The UTR is the audit reference for that month's transfer.

## Can I edit a submitted application?
Only when its status is **Rejected** or **Resubmitted-pending-CRC-fix**. Submitted-but-pending applications cannot be edited; cancel and resubmit instead. Approved applications are immutable — the only allowed change is opt-out.

## Why was my student auto-rejected?
Auto-rejection happens at submission for hard-fail rules:
- Income > ₹6,00,000 (Namo Lakshmi)
- Class 10 < 50% (Namo Saraswati)
- Wrong class / not in school
- Aadhaar already used by another active record
Auto-rejection is irreversible — the rule didn't pass. For below-50% Namo Saraswati cases the student remains eligible for Namo Lakshmi separately.

## What's the difference between auto-approval and CRC approval?
Namo Saraswati auto-approves when Class 10 ≥ 50% AND seat number is verified. Namo Lakshmi always goes to CRC (no auto-approval). Auto-approved records still go to PFMS for monthly payment.

## What happens during monsoon (July–September)?
South Gujarat (DANG, TAPI, NAVSARI, VALSAD) sees attendance dropping below 80% due to rains, which would deny payment. The monthly cycle therefore enters **manual approver review** at much higher rates (DANG goes from 14% manual non-monsoon to 60% during monsoon). The State Secretariat's "Monsoon Impact Analysis" deep-dive simulates dropping the threshold to 70% and shows the cut in manual workload.

## Can a student opt out and rejoin?
Yes. Opt-out marks the application as **Not wanted** with the declaration PDF. The teacher can reopen it later and resubmit; no penalty, no waiting period.

## Does PFMS see student personal data?
No. PFMS sees only the payment record fields (account, IFSC, amount, UTR). Aadhaar / income / school photographs stay inside SwiftChat.
