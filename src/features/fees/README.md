Fees (web phase 8). Built on the mock API first.

- `types.ts`: shapes of sessions, class fees, plan, payments, `StudentFees` (a guess, see `docs/08-decisions.md` part D) and the words of frequency, pay mode and status.
- `api.ts`: `useSessions()`, `useClassFees(sessionId)`, `useSaveClassFees(sessionId)`, `useStudentFees(id, enabled)`, `useSaveFeePlan(id)`, `useRecordPayment(id)`, `useCorrectPayment(id)`, `useRefreshFees()`. A fee change fetches the box and the Students list again.
- `schedule.ts`: payment dates and `splitAmount()` (whole rupees, the last payment takes the odd rupees). Used by the preview and the mock server.
- `feePreview.ts`: the pure `feePreview()` of the Fee summary, and `describePayments()`. Unit tests in `feePreview.test.ts`.
- `labels.ts`: On time blue, Delayed amber, Defaulted red (the chart tokens of the Students design).
- `pages/FeeSetupPage.tsx`: `/settings/fees`, owner only (`SETTINGS_EDIT`); one money box per class, per school year.
- Where the screens live (a feature never imports another feature's components): part 4 and the Fee summary in `features/admissions/components/` (`FeesSection`, `FeeSummary`); "Fees this year", "Record a payment", "Correct a wrong payment" and the Fee column in `features/students/components/`.
- Permissions: `FEES_VIEW` shows the box and the column; `FEES_EDIT` shows part 4 and "Record a payment"; `FEES_CORRECT` (owner) shows "Correct a wrong payment".
- Not built: a screen to make a fee plan for a child who has none (the hook `useSaveFeePlan` exists), printing a receipt, the list of all payments.
