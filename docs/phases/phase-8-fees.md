# Phase 8 — Fees

## Goal

The fees part of New admission works, the student page shows fees and records payments, and the Students list shows who is on time.

Do not start this phase before the owner has answered backend question C2 (does the accountant already keep fees elsewhere?).

## Screens

| Screen | Design |
|---|---|
| New admission → part 4 "Fees" and the "Fee summary" box | `Admission.dc.html` |
| One student → "Fees this year" box | `StudentProfile.dc.html` |
| Record a payment (dialog) | none, plain |
| Students → "Fee" column | `Students.dc.html` |
| Fee setup `/settings/fees` | none, plain. Owner only. |

## Read first

- `docs/backend/api.md` → Fees
- The backend's fee rules, if you have the backend repo open: `docs/phases/phase-7-fees.md` there

## API used

`GET /sessions`, `GET/PUT /sessions/{id}/class-fees`, `GET /students/{id}/fees`, `PUT /students/{id}/fee-plan`, `POST /students/{id}/payments`, `POST /students/{id}/payment-corrections`, `POST /admissions` (now with the plan and first payment), `GET /students` (now with `feeStatus`).

## Behaviour

### Admission, part 4

1. "School fee for the year" is filled from the class fee of the chosen class. The clerk may change it.
2. "Bus fee for the year" is filled from settings when "Uses the school bus" is Yes, and is 0 and hidden when No.
3. Discount with a reason. A discount above 0 needs a reason.
4. "The family will pay": Every month, Every 3 months, Once a year.
5. "First payment, received today": amount and how it was paid. May be left empty.
6. **Fee summary** (the box on the right) is calculated in the browser on every key press:
   - total = school fee + bus fee − discount
   - still to pay = total − paid today
   - next payment = total ÷ number of payments, and its date

   Example: ₹30,000 + ₹8,800 − ₹0 = ₹38,800. Paid today ₹9,700. Still to pay ₹29,100. Four payments of ₹9,700.
7. The summary is only a preview. After saving, the real numbers come from the server.
8. Put the sum in one pure function `feePreview(...)` with unit tests.

### Student page, "Fees this year"

9. Shows: school fee, bus fee, paid so far, pending now, still to pay this year, next payment with date, and the status of each fee head with `StatusDot` (On time blue, Delayed amber, Defaulted red).
10. "Record a payment" opens a dialog: fee head (School, Bus, or both), amount for each, date (today), paid by (UPI, Cash, Bank transfer, Cheque), note. After saving, show the receipt number in a toast and refresh the box.
11. `PAYMENT_TOO_LARGE` → show the server's message under the amount.
12. Below the totals, a small list of payments: date, amount, how, receipt number.
13. The owner alone sees "Correct a wrong payment" on each payment line (`FEES_CORRECT`). It asks for a note and confirms twice, because it changes money records.
14. A role without `FEES_VIEW` does not see the box at all.

### Students list

15. The "Fee" column shows the overall status with `StatusDot`. A dash for a student with no fee plan.

### Fee setup

16. A plain page under Settings, owner only: choose the session, a table of the 15 classes with one money input each, "Save". This fills the admission form.

### Bus change with a fee

17. The transport form on the student page already has "Bus fee for the rest of this year". Now, after saving, also refresh the fees box, because the server adds bus dues.

## Tasks

- [x] 8.1 Types: `Session`, `ClassFee`, `FeePlan`, `FeeDue`, `FeePayment`, `StudentFees`, `FeeStatus`, with labels.
- [x] 8.2 Mock data: plans and payments for the sample students (on time, delayed, defaulted), class fees for all classes.
- [x] 8.3 Mock handlers, with `PAYMENT_TOO_LARGE` and the receipt number.
- [x] 8.4 API hooks.
- [x] 8.5 `feePreview()` pure function with tests (behaviour 6, 8).
- [x] 8.6 Admission part 4 and the Fee summary box; extend the Zod schema and the request (behaviour 1 to 7).
- [x] 8.7 "Fees this year" box (behaviour 9, 12, 14).
- [x] 8.8 Record a payment dialog (behaviour 10, 11).
- [x] 8.9 Correct a payment, owner only (behaviour 13).
- [x] 8.10 "Fee" column on Students (behaviour 15).
- [x] 8.11 Fee setup page and its menu item for the owner (behaviour 16).
- [x] 8.12 Refresh fees after a bus change (behaviour 17).
- [x] 8.13 Playwright flow: admit with ₹30,000 + ₹8,800 quarterly and ₹9,700 paid; open the student; see still to pay ₹29,100; record ₹9,700; see ₹19,400.
- [ ] 8.14 **Switch to the real backend** (needs backend Phase 7).

## Tests that must pass

- `feePreviewExample38800`
- `busFeeIsHiddenWhenNoBus`
- `discountNeedsAReason`
- `summaryUpdatesWhileTyping`
- `feesBoxShowsStatusPerHead`
- `paymentTooLargeShowsServerMessage`
- `receiptNumberIsShownAfterPayment`
- `onlyOwnerSeesCorrectPayment`
- `roleWithoutFeesViewDoesNotSeeTheBox`
- `studentsListShowsFeeStatus`
- `feeSetupIsOwnerOnly`

## Done when

- New admission in mock mode looks like `Admission.dc.html`, with the summary changing as you type.
- The flow of task 8.13 works in mock mode, and after 8.14 against the real backend.
- `/check-phase 8` passes.

## Differences found

(Fill this in during task 8.14.)

## Out of scope

- Printing a receipt.
- Online payment.
- Fee reminders.
- A page listing all payments of the school (the API exists; the screen is later).
