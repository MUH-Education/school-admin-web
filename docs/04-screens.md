# 4. Screens

Every screen of the app, with its URL, its design file, who may open it, and which API calls it makes.

API paths are written without the `/api/v1` start. Their shapes are in `docs/backend/api.md`.

Every screen has four states: **loading**, **error** (with Retry), **empty**, **data**. Only the special ones are written below.

## List of screens

| # | Screen | URL | Design file | Permission | Web phase |
|---|---|---|---|---|---|
| L | Login | `/login` | none (see `docs/05-auth-permissions.md`) | open | 1 |
| 8 | Users and roles | `/users` | `Roles.dc.html` | `USERS_MANAGE` | 1 |
| 11 | Vehicles and staff | `/vehicles` | `Vehicles.dc.html` | `VEHICLES_VIEW` | 2 |
| 12 | One vehicle | `/vehicles/:id`, `/vehicles/new` | `VehicleDetail.dc.html` | `VEHICLES_VIEW` | 2 |
| 3 | Routes and load | `/routes` | `RoutesLoad.dc.html` | `ROUTES_VIEW` | 2 |
| 9 | Students | `/students` | `Students.dc.html` | `STUDENTS_VIEW` | 3 |
| 10 | One student | `/students/:id` | `StudentProfile.dc.html` | `STUDENTS_VIEW` | 3 |
| 6 | New admission | `/admissions/new` | `Admission.dc.html` | `ADMISSIONS_CREATE` | 3, fees in 8 |
| 1 | Bus status | `/bus-status` | `Main.dc.html` | `BUS_STATUS_VIEW` | 4 |
| 2 | One bus | `/bus-status/routes/:routeId` | `BusDetail.dc.html` | `BUS_STATUS_VIEW` | 4 |
| M2 | Today's four jobs | `/trip` | `MobileToday.dc.html` | `TRIPS_RECORD` | 5 |
| M3 | Morning pickup | `/trip/pickup` | `MobilePickup.dc.html` | `TRIPS_RECORD` | 5 |
| M4 | No network (a state of M3, M6, M7) | — | `MobileOffline.dc.html` | — | 5 |
| M5 | Reached school | `/trip/school` | `MobileSchool.dc.html` | `TRIPS_RECORD` | 5 |
| M6 | Evening boarding | `/trip/evening` | `MobileEvening.dc.html` | `TRIPS_RECORD` | 5 |
| M7 | Home drop | `/trip/drop` | `MobileDrop.dc.html` | `TRIPS_RECORD` | 5 |
| — | Messages | `/messages` | none | `MESSAGES_VIEW` | 6 |
| 4 | Enquiry list | `/enquiries` | `Enquiries.dc.html` | `ENQUIRIES_VIEW` | 7 |
| 5 | Add an enquiry | `/enquiries/new` | `AddEnquiry.dc.html` | `ENQUIRIES_EDIT` | 7 |
| — | One enquiry | `/enquiries/:id` | none | `ENQUIRIES_VIEW` | 7 |
| — | Fee setup | `/settings/fees` | none | `SETTINGS_EDIT` | 8 |
| 7 | Analytics | `/analytics` | `Analytics.dc.html` | `ANALYTICS_VIEW` | 9 |

`MobileLogin.dc.html` (M1) shows a username and password. **That design is old.** Login is now phone number and OTP for everyone. Use M1 only for its look (dark top block, big fields, big button).

Screens with "none" have no design. Build them from the shared components in `docs/03-design-system.md`, in the same style, and keep them plain.

---

## L. Login — `/login`

Two steps on one page. Details in `docs/05-auth-permissions.md`.

| Call | When |
|---|---|
| `POST /auth/otp/request` | "Send code" |
| `POST /auth/otp/verify` | "Log in" |
| `GET /auth/me` | When the app opens with a saved token |

## 8. Users and roles — `/users`

| Part of the screen | Data |
|---|---|
| "What each role can do" table | `GET /roles` |
| "The menu each person sees" examples | fixed text, as in the design |
| "People with a login" table | `GET /users` |
| "Add user" button → dialog | `POST /users` with `phone`, `role`, optional `name`, and `staffId` when the role is Attendant |
| "Edit" on a row → dialog | `PUT /users/{id}` (phone, name, role, on or off) |

- The add dialog has only: phone, role, name (optional). For role Attendant it also asks "Which attendant?" from `GET /staff` (type ATTENDANT).
- Errors to show: `PHONE_ALREADY_USED`, `LAST_OWNER`, `CANNOT_DISABLE_SELF`.
- The dialog is not in the design. Use `Dialog` with `Field`s.

## 11. Vehicles and staff — `/vehicles`

| Part | Data |
|---|---|
| "Papers need attention" box | `GET /vehicles/attention`. Hidden when the list is empty. |
| Vehicles table | `GET /vehicles` |
| Drivers, attendants and helpers table | `GET /staff` |
| "Add a vehicle" | goes to `/vehicles/new` |
| "Add a person", "Edit" on a person → dialog | `POST /staff`, `PUT /staff/{id}` |

- The "Papers" cell: green "All valid", amber "Insurance ends 28 Oct", red "Fitness ended 30 Sep".
- "Open" goes to `/vehicles/:id`.
- Buttons that change things show only with `VEHICLES_EDIT`.

## 12. One vehicle — `/vehicles/:id` and `/vehicles/new`

| Part | Data |
|---|---|
| Vehicle details form | `GET /vehicles/{id}`; save with `PUT /vehicles/{id}` or `POST /vehicles` |
| Papers (four dates) | in the same GET; save with `PUT /vehicles/{id}/documents` |
| People on this vehicle | in the same GET (driver, attendant, helper today) |
| "Change driver / attendant", "Add a person" → inline form | `POST /vehicles/{id}/assignments` |
| Who worked on this vehicle | `GET /vehicles/{id}/assignments` |
| "Remove this vehicle" | `DELETE /vehicles/{id}` after a confirm dialog |

- The change form has: new person (from `GET /staff`, showing "free now" or "now on Van 1"), from date, reason, and "only till a date" or "from now on".
- Errors to show in the form: `STAFF_BUSY`, `WRONG_STAFF_TYPE`, `LICENCE_ENDED`. On delete: `VEHICLE_IN_USE`.
- `/vehicles/new` shows only the details form and papers. The people box appears after the first save.
- Without `VEHICLES_EDIT` the page is read-only: no buttons, inputs shown as plain text.

## 3. Routes and load — `/routes`

| Part | Data |
|---|---|
| Six tiles and the route list with seat bars | `GET /routes/load-board` |
| The three numbers (months, bus fee, collected %) | `GET /settings`; save with `PUT /settings` (only with `SETTINGS_EDIT`; others see them read-only) |
| Selected route panel | `GET /routes/{id}`. The selected route is in the URL: `/routes?route=4`. |
| Save route name and vehicle | `PUT /routes/{id}` |
| Stops: add, remove, reorder | `PUT /routes/{id}/stops` with the whole ordered list |
| "Add route" | `POST /routes` |
| "Delete this route" | `DELETE /routes/{id}` |
| "What this page is telling you" | sentences built from the load-board numbers |

- The seat bar (`SeatMeter`): blue up to the seat line at the middle, red after it. Width of red = (children − seats) ÷ seats, at most one full half.
- The child count per stop is read-only. It comes from the student list.
- Errors: `VEHICLE_HAS_ROUTE`, `STOP_HAS_STUDENTS`, `ROUTE_HAS_STUDENTS`.
- The sentences at the bottom are made by one pure function from the numbers. Example: when the children without a seat are many and empty seats are 0, say "the problem is too few seats".

## 9. Students — `/students`

| Part | Data |
|---|---|
| Search and filters | in the URL: `?q=&className=&bus=&village=&page=` |
| Table | `GET /students` with those filters |
| "New admission" | goes to `/admissions/new` |
| "Open" | goes to `/students/:id` |
| "Import from a sheet" → dialog (with `STUDENTS_EDIT`) | `POST /students/import`, first with `dryRun=true` |

- The square on the left shows the photo when `hasPhoto` is true (`GET /students/{id}/photo`), else the first letters of the name.
- Typing in search waits 300 ms before asking the server.
- The "Fee" column appears in web phase 8.
- The import dialog is not in the design: choose a file, "Check" (dry run) shows a list of lines with problems, "Import" saves.

## 10. One student — `/students/:id`

| Part | Data |
|---|---|
| Header, details | `GET /students/{id}` |
| Photo: add, change, remove | `POST`, `DELETE /students/{id}/photo` |
| "Edit" details → the box turns into a form | `PUT /students/{id}` |
| Parents and phone numbers | in the main GET |
| "Add a phone number" inline form | `POST /students/{id}/guardians` |
| "Edit" on a phone | `PUT /students/{id}/guardians/{guardianId}`; remove with `DELETE` |
| Transport box | bus now, in the main GET; history `GET /students/{id}/transport` |
| Save a bus change | `PUT /students/{id}/transport` |
| Fees this year (web phase 8) | `GET /students/{id}/fees` |
| Change history | `GET /students/{id}/history` |

- The transport box is closed by default and shows "Now: Route 4, Jakhal" or "Now: does not use the bus", with a "Change" button. The design shows it open.
- After a bus change, show the server's `ROUTE_FULL` warning in the red-border box. The save still happened.
- The "three things happen" list in the transport form is fixed text with the chosen route, date and fee.
- Errors: `PHONE_ALREADY_LINKED`, `LAST_GUARDIAN`, `STOP_NOT_ON_ROUTE`.
- Photo: accept JPEG or PNG up to 2 MB. Check the size before sending.
- "Edit" details also has "Mark as left the school" with a date and a confirm dialog.

## 6. New admission — `/admissions/new`

| Part | Data |
|---|---|
| Blue "started from an enquiry" box | only with `?enquiryId=`; `GET /enquiries/{id}/prefill` fills the form |
| Class list, occupation list | fixed lists in `types.ts` |
| Brother or sister search | `GET /students?q=` → sends `siblingStudentId` |
| Route and stop | `GET /routes` |
| "Route is already full" warning | from the route's children and seats in `GET /routes/load-board` |
| Fees part and Fee summary (web phase 8) | `GET /sessions`, `GET /sessions/{id}/class-fees` |
| "Save admission" | `POST /admissions` |

- In web phase 3 the form has parts 1 to 3. Part 4 (Fees) and the Fee summary are added in web phase 8.
- The Fee summary is calculated in the browser as the user types: school fee + bus fee − discount; paid today; still to pay; next payment.
- After saving, go to the new student's page and show a toast with the admission number.
- "Save as draft" is in the design but has no backend. Leave the button out. Note it in `docs/08-decisions.md`.

## 1. Bus status — `/bus-status`

| Part | Data |
|---|---|
| Five tiles | counted from `GET /bus-status` |
| "Needs attention now" | `GET /bus-status/attention`. Hidden when empty. |
| One row per route with the stop strip | `GET /bus-status?phase=` |
| The switch Morning pickup / At school / Evening drop | sets `?phase=` in the URL |

- Asks again every 30 seconds while the tab is visible. Shows "Live · updated 7:48 am" from the time of the last answer.
- If an update fails, keep showing the old data with "Last updated 7:48 am. Trying again."
- `StopStrip` states: `DONE` filled square and line, `NEXT` square with blue border, `LATER` grey border. The School square at the end is green when reached.
- A route in `NO_TAPS` has a red border; `LATE` has an amber border.
- "View children" goes to `/bus-status/routes/:routeId`.
- "Call attendant" needs the attendant's phone, which is not in the API yet (question C2 in `docs/08-decisions.md`). Until then, show the attendant's name only.

## 2. One bus — `/bus-status/routes/:routeId`

`GET /bus-status/routes/{routeId}?date=` gives everything: route state, stops, each child with the four events. Each child also has `sms` (the SMS state of the newest event). The "SMS to parent" column shows it in one short line: "Sent 7:42", "None for this event (Class 9)", "None (Class 11)", "Failed" in red, or a dash. The class rule note sits under the table.

## M2 to M7. Attendant app — `/trip/...`

See `docs/07-attendant-offline.md`. In short:

| Screen | Reads | Writes |
|---|---|---|
| M2 Today | `GET /trips/my-route` | — |
| M3 Morning pickup | `GET /trips/manifest` | `POST /trips/marks` (`BOARDED_MORNING`) |
| M5 Reached school | the same manifest | `POST /trips/marks` (`REACHED_SCHOOL` for every boarded child) |
| M6 Evening boarding | the same manifest | `POST /trips/marks` (`BOARDED_EVENING`) |
| M7 Home drop | the same manifest | `POST /trips/marks` (`REACHED_HOME`) |

## Messages — `/messages` (no design)

A `PageHeader`, a `TileRow` (queued, sent, failed for the chosen day, from `GET /messages/summary`), a `FilterBar` (date, status, search by child), and a `DataTable` from `GET /messages`: time, child, phone (already masked by the server), event, text, status, error. Status uses `StatusDot`: `SENT` green, `QUEUED` blue, `FAILED` red, `TEST_ONLY` grey with the words "Test only, not sent".

## 4. Enquiry list — `/enquiries`

| Part | Data |
|---|---|
| Seven stage tiles and "4 of 29 admitted · 14%" | `GET /enquiries/summary` |
| "Follow-ups are overdue" box | from the summary; hidden when 0 |
| Filters | in the URL: `?status=&village=&source=&overdue=&q=&page=` |
| Table | `GET /enquiries` |

- A stage tile is a button. Clicking it sets `?status=`. "Show only overdue" sets `?overdue=true`.
- "Open" goes to `/enquiries/:id`. "Add enquiry" goes to `/enquiries/new`.

## 5. Add an enquiry — `/enquiries/new`

`POST /enquiries`. Needed: parent name, phone, village, class wanted, source. "Referred by which parent" shows only when the source is Referral, and is then needed. `ENQUIRY_EXISTS` → show "This parent already has an open enquiry" with a link to it. "Save and add another" saves and clears the form.

## One enquiry — `/enquiries/:id` (no design)

Left: the same form as Add an enquiry, filled, saved with `PUT /enquiries/{id}`. Right: a `Panel` with the stage and buttons to move it (`POST /enquiries/{id}/status`; "Lost" asks for a reason), a `HistoryList` of follow-ups, an inline form "Add a call or visit note" with the next date (`POST /enquiries/{id}/follow-ups`), and the button "Start admission" → `/admissions/new?enquiryId=`.

## Fee setup — `/settings/fees` (no design)

Only the owner opens this page. He sets the school fee for each class, once a year.

| Part | Data |
|---|---|
| Session select | `GET /sessions` |
| Table of 15 classes, one money input each | `GET /sessions/{id}/class-fees` |
| "Save" | `PUT /sessions/{id}/class-fees` with the whole list |

- Example: Class 5 → `30000`. After saving, New admission for a Class 5 child starts with ₹30,000 in "School fee for the year".
- Plain page: a title, the session select, one `Panel` with the table, one "Save" button. Nothing else.
- An empty input means "not set yet". The admission form then starts empty for that class.

## 7. Analytics — `/analytics`

| Part | Data |
|---|---|
| Six filters | in the URL; sent to every call below |
| Five tiles | `GET /analytics/summary` |
| Fee collected each month | `GET /analytics/fee-collection-by-month` |
| Fee payment by father's occupation | `GET /analytics/payment-by-occupation` |
| Students in each class | `GET /analytics/students-by-class` |
| Students by village | `GET /analytics/students-by-village` |
| Students and families table | `GET /analytics/students` (paged, sortable) |
| "Download as Excel" | `GET /analytics/students.csv` with the same filters |

- All six calls use the same filter object, so the page can never show two different sets.
- Changing a filter keeps the old numbers on screen, a little faded, until the new ones arrive. No jumping.
- The download is a link with the token sent by `fetch`, then saved as a file. Do not put the token in the URL.
