# Phase 3 — Students and admission

## Goal

The office can admit a student, find any student, and change details, photo, parents' phone numbers and the bus.

## Screens

| Screen | Design |
|---|---|
| Students `/students` | `Students.dc.html` |
| One student `/students/:id` | `StudentProfile.dc.html` |
| New admission `/admissions/new` | `Admission.dc.html` (parts 1 to 3 now; part 4 and the fee summary in Phase 8) |

## Read first

- `docs/04-screens.md` → screens 9, 10, 6
- `docs/backend/api.md` → Students
- `design/README.md` → "Known differences" (the open forms in the design are closed by default)

## API used

`GET /students`, `GET/PUT /students/{id}`, `POST /students/{id}/guardians`, `PUT/DELETE /students/{id}/guardians/{guardianId}`, `GET/PUT /students/{id}/transport`, `POST/GET/DELETE /students/{id}/photo`, `GET /students/{id}/history`, `POST /students/import`, `POST /admissions`, `GET /routes`, `GET /routes/load-board`.

## Behaviour

### Students list

1. Search and the three filters are in the URL. Reloading the page keeps them.
2. Search waits 300 ms after the last key before calling the server.
3. 25 students per page. "Showing 1 to 25 of 290" with Back and Next.
4. The photo square shows the photo if there is one, else the first letters of the name.

### One student

5. The page opens in **view** state. Each box has its own button to edit. Only one box is in edit state at a time.
6. **Details:** "Edit" turns the box into a form. "Save" or "Cancel" turns it back.
7. **Phone numbers:** "Add a phone number" opens the inline form: name, relation, phone, "send bus SMS to this number too".
   Example: add grandfather Ramkumar, `94XXX XX208`, SMS on → after saving, he is the third line of the list.
8. The last phone number has no remove button. If the server still says `LAST_GUARDIAN`, show its message.
9. **Transport:** the box shows the state now and a "Change" button. The form has: Uses the bus / No bus, route, stop (only stops of the chosen route), start date, bus fee.
   - Choosing a route that is full shows the red-border warning at once, from the load-board numbers.
   - After saving, if the answer has `warning.code = ROUTE_FULL`, keep showing it. The change was saved.
   - Choosing "No bus" hides route, stop and fee, and asks only "from which date".
10. **Photo:** "Add a photo" opens the file chooser. Accept JPEG and PNG up to 2 MB; larger → "The photo is too big. Choose one under 2 MB." Show the new photo right after upload.
11. **Change history** shows date, what changed, who. Newest first.
12. "Mark as left the school" is inside Edit details, with a date and a confirm dialog.
13. A user with only `STUDENTS_VIEW` sees everything but no edit buttons.

### New admission

14. Four numbered parts in one long page, as in the design. In this phase parts 1 to 3: Student, Family, Transport.
15. Needed: student name, date of birth, gender, class, father's name, father's phone, father's occupation, village, and "Uses the school bus". Route and stop are needed when the answer is Yes.
16. "Brother or sister already in this school" searches students by name or admission number. Picking one shows "Parents will be copied from Aryan Punia" and hides the parent inputs.
17. The "route is already full" box shows as soon as a full route is chosen. It does not block saving.
18. On save: one `POST /admissions`. Field errors go under their inputs and the page scrolls to the first one.
19. After saving: go to the new student's page; toast "Admitted. Admission number A-2026-119".
20. Leaving the page with typed data asks "Leave without saving?".

### Import

21. The import dialog: choose a CSV file → "Check" runs `dryRun=true` and lists problem lines ("Line 17: phone has 9 digits") → "Import" saves the good lines and shows "284 students added, 6 lines skipped".

## Tasks

Mock first:

- [x] 3.1 Types: `Student`, `StudentListRow`, `Guardian`, `TransportEnrolment`, `HistoryEntry`, `AdmissionRequest`, the class list, the occupation list with labels.
- [x] 3.2 Mock data: about 60 students across the 9 routes, including brothers and sisters with one phone, a student with no bus (Ishaan), one with a photo.
- [x] 3.3 Mock handlers for all calls above, with filters, paging, the business errors and the `ROUTE_FULL` warning.

Shared components:

- [x] 3.4 `FilterBar`, `Pagination`.
- [x] 3.5 `DefinitionGrid`, `TextArea`.

Students list:

- [x] 3.6 API hooks; `StudentsPage` with URL filters, debounce, paging (behaviour 1 to 4).
- [ ] 3.7 Import dialog (behaviour 21).

One student:

- [ ] 3.8 Page header with photo, name, class, admission number; photo add, change, remove (behaviour 10).
- [ ] 3.9 Details box, view and edit (behaviour 5, 6, 12).
- [ ] 3.10 Phone numbers box with add, edit, remove (behaviour 7, 8).
- [ ] 3.11 Transport box with the change form and warnings (behaviour 9).
- [ ] 3.12 Change history box.
- [ ] 3.13 View-only mode (behaviour 13).

New admission:

- [ ] 3.14 The form, parts 1 to 3, with its Zod schema (behaviour 14, 15).
- [ ] 3.15 Brother or sister search (behaviour 16).
- [ ] 3.16 Route-full warning, save, errors, success, leave guard (behaviour 17 to 20).

Finish:

- [ ] 3.17 Playwright flow: admit a child with no bus; open the child; start the bus from a later date; add a phone number.
- [ ] 3.18 **Switch to the real backend** (needs backend Phase 3). Also switch the child counts on Routes and load.

## Tests that must pass

- `filtersAreKeptInTheUrl`
- `searchWaitsBeforeCallingTheServer`
- `onlyOneBoxIsInEditStateAtATime`
- `addedPhoneAppearsInTheList`
- `lastPhoneHasNoRemoveButton`
- `stopListFollowsTheChosenRoute`
- `fullRouteShowsWarningButSaves`
- `noBusAsksOnlyForTheDate`
- `photoOver2MbIsRefusedBeforeUpload`
- `admissionShowsFieldErrorsUnderInputs`
- `siblingChoiceHidesParentInputs`
- `afterAdmissionTheStudentPageOpensWithTheNumber`
- `leavingADirtyFormAsksFirst`
- `importCheckListsProblemLines`
- `viewOnlyRoleSeesNoEditButtons`

## Done when

- The three screens in mock mode look like their designs (with the edit forms opened).
- You can do the whole story in the browser: admit, find, add a phone, start the bus later, add a photo.
- After 3.18: the same story works against the real backend.
- `/check-phase 3` passes.

## Differences found

(Fill this in during task 3.18.)

## Out of scope

- The fees part of admission and the "Fees this year" box (Phase 8).
- Cropping or rotating photos.
- Promoting students to the next class.
