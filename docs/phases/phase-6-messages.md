# Phase 6 — Messages

## Goal

The office can see every SMS that was sent to parents, find one parent's messages, and see on the One bus screen which SMS went out for each child.

## Screens

| Screen | Design |
|---|---|
| Messages `/messages` | none. Plain, from shared components. |
| One bus → "SMS to parent" column | `BusDetail.dc.html` |

## Read first

- `docs/04-screens.md` → Messages
- `docs/backend/api.md` → Messages

## API used

`GET /messages?date=&status=&studentId=&phone=&page=`, `GET /messages/summary?date=`, `GET /bus-status/routes/{routeId}` (now with SMS state per child and event).

## Behaviour

1. **Layout of Messages:** `PageHeader` ("Messages", "Every SMS sent to parents") → three tiles for the chosen day (Sent, Waiting, Failed) → `FilterBar` (date, status, search a child by name) → `DataTable` → `Pagination`.
2. The date filter starts at today. It is in the URL.
3. **Table columns:** time, child, phone, event, text, status.
4. The phone comes already hidden from the server (`+91XXXXXX4321`). Show it as it comes.
5. **Status** with `StatusDot`:
   - `SENT` green "Sent 7:43"
   - `QUEUED` blue "Waiting"
   - `FAILED` red "Failed", with the error text under it
   - `TEST_ONLY` grey "Test only, not sent"
6. The Hindi text column uses `font-hindi` and wraps.
7. If any row of the day is `TEST_ONLY`, show an amber box on top: "Test mode. Messages are not going to parents' phones."
8. **Event words:** `BOARDED_MORNING` "Boarded morning bus", `REACHED_SCHOOL` "Reached school", `BOARDED_EVENING` "Boarded evening bus", `REACHED_HOME` "Reached home stop".
9. **One bus, SMS column:** per child, one short line for the newest event: "Sent 7:42", "None for this event (Class 9)", "None (Class 11)", "Failed" in red, or a dash.
10. A parent says "I got no message": the clerk types the child's name, sees the day's rows for that child and the reason.

## Tasks

- [x] 6.1 Types: `Message`, `MessageStatus`, `MessageSummary`.
- [x] 6.2 Mock data: the morning's messages for the fixed day, with a few `FAILED` and the Class 9 and Class 11 cases.
- [x] 6.3 Mock handlers with filters and paging.
- [x] 6.4 API hooks.
- [x] 6.5 `MessagesPage` (behaviour 1 to 8).
- [x] 6.6 SMS column on `BusDetailPage` (behaviour 9).
- [ ] 6.7 **Switch to the real backend** (needs backend Phase 5).

## Tests that must pass

- `messagesPageStartsWithToday`
- `failedRowShowsTheErrorText`
- `testOnlyRowsShowTheTestModeBox`
- `searchingAChildFiltersTheRows`
- `phoneIsShownAsTheServerSendsIt`
- `oneBusShowsSmsStateForClass3Class9Class11`
- `admissionsDeskCannotOpenMessages`

## Done when

- In mock mode, Messages shows the morning's rows, and One bus shows the SMS column like the design.
- After 6.7: tap a child in the attendant app against the real backend; within a few seconds the row appears on Messages.
- `/check-phase 6` passes.

## Differences found

(Fill this in during task 6.7.)

## Out of scope

- Writing and sending a message to many parents.
- Editing templates on a screen.
- Resending a failed message by hand.
