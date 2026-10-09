# Phase 7 — Enquiries

## Goal

The admissions desk can add an enquiry in a roomy form, see all enquiries by stage, never miss a follow-up, and start an admission from an enquiry.

This phase needs only web Phase 1. You can do it earlier if you like.

## Screens

| Screen | Design |
|---|---|
| Enquiry list `/enquiries` | `Enquiries.dc.html` |
| Add an enquiry `/enquiries/new` | `AddEnquiry.dc.html` |
| One enquiry `/enquiries/:id` | none. Plain, see `docs/04-screens.md`. |
| New admission → blue "started from an enquiry" box | `Admission.dc.html` |

## Read first

- `docs/04-screens.md` → screens 4, 5, One enquiry
- `docs/backend/api.md` → Enquiries

## API used

`GET /enquiries`, `GET /enquiries/summary`, `POST /enquiries`, `GET/PUT /enquiries/{id}`, `POST /enquiries/{id}/follow-ups`, `POST /enquiries/{id}/status`, `GET /enquiries/{id}/prefill`.

## Behaviour

### List

1. Seven stage tiles: All, New, Contacted, Visited, Applied, Admitted, Lost, with counts from the summary. Each is a button; the chosen one is dark. Clicking sets `?status=`.
2. Top right: "4 of 29 admitted so far · 14%" and the "Add enquiry" button.
3. The amber "follow-ups are overdue" box shows the count and a button "Show only overdue" (`?overdue=true`). Hidden when the count is 0.
4. Table columns as in the design. "Next step" is red and bold when overdue ("Overdue since 5 Oct"). A lost enquiry shows "Reason: fee too high".
5. Filters (search, village, source) and the page number are in the URL.

### Add an enquiry

6. The form is **roomy**: a single column up to 920px wide, four numbered parts (Parent, Child, How they heard about us, Follow-up), two inputs per row, inputs 52px high. Do not shrink it. The owner rejected a tight form.
7. Needed: parent name, phone, village, class wanted, source, call back date.
8. "Source" is a group of big choice boxes. "Referred by which parent" appears only for Referral and is then needed.
9. "Save enquiry" saves and goes to the list. "Save and add another" saves, shows a toast, clears the form, and puts the cursor in the first input.
10. `ENQUIRY_EXISTS` → amber box: "This parent already has an open enquiry." with a link "Open it".

### One enquiry

11. Left: the same form, filled. "Save changes".
12. Right, top: the stage as a `StatusDot`, and one button for each allowed next stage. "Mark as lost" opens a small form asking the reason. An admitted enquiry shows a link to the student.
13. Right, middle: follow-ups, newest first (date, note, who), and the form "Add a call or visit note" with an optional next date.
14. Right, bottom: "Start admission" → `/admissions/new?enquiryId=<id>`. Shown for stages Visited and Applied, and only with `ADMISSIONS_CREATE`.

### Admission from an enquiry

15. With `?enquiryId=`, the admission page calls `GET /enquiries/{id}/prefill`, fills parent name, phone, village, class and child name, and shows the blue box "Started from the enquiry of Anita Goyal…". The clerk can change every field.
16. `POST /admissions` carries `enquiryId`. After it, that enquiry shows as Admitted in the list.

## Tasks

- [x] 7.1 Types: `Enquiry`, `EnquiryStatus`, `EnquirySource`, `FollowUp`, `EnquirySummary`, with labels.
- [x] 7.2 Mock data: 29 enquiries across the stages, 4 overdue, some follow-ups.
- [x] 7.3 Mock handlers with filters, the stage rules, `ENQUIRY_EXISTS`, and prefill.
- [x] 7.4 API hooks.
- [x] 7.5 `EnquiriesPage`: tiles, overdue box, filters, table (behaviour 1 to 5).
- [x] 7.6 `EnquiryForm` shared by add and edit, with its Zod schema (behaviour 6 to 8).
- [x] 7.7 `AddEnquiryPage` with both save buttons and the duplicate message (behaviour 9, 10).
- [x] 7.8 `EnquiryDetailPage`: form, stage buttons, follow-ups, start admission (behaviour 11 to 14).
- [ ] 7.9 Prefill on the admission page (behaviour 15, 16).
- [ ] 7.10 Playwright flow: add an enquiry, add a follow-up, start admission, save, see the enquiry as Admitted.
- [ ] 7.11 **Switch to the real backend** (needs backend Phase 6).

## Tests that must pass

- `stageTileFiltersTheList`
- `overdueBoxIsHiddenWhenNothingIsOverdue`
- `overdueNextStepIsRed`
- `referredByAppearsOnlyForReferral`
- `saveAndAddAnotherClearsTheForm`
- `duplicateEnquiryShowsLinkToTheOldOne`
- `lostNeedsAReason`
- `followUpAppearsOnTopAndMovesTheNextDate`
- `startAdmissionCarriesTheEnquiryId`
- `admissionFormIsPrefilledFromTheEnquiry`
- `transportInchargeCannotOpenEnquiries`

## Done when

- The list and the add form in mock mode look like their designs.
- The add form at 1440px width is one wide, airy column, as designed.
- After 7.11: the flow of task 7.10 works against the real backend.
- `/check-phase 7` passes.

## Differences found

(Fill this in during task 7.11.)

## Out of scope

- Sending SMS to enquiries.
- A board view with drag and drop.
- A public enquiry form for parents.
