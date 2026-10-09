# Phase 4 — Bus status

## Goal

The office sees where every bus is right now, which buses need attention, and for one bus every child with the four events of the day.

## Screens

| Screen | Design |
|---|---|
| Bus status `/bus-status` | `Main.dc.html` |
| One bus `/bus-status/routes/:routeId` | `BusDetail.dc.html` |

## Read first

- `docs/04-screens.md` → screens 1 and 2
- `docs/backend/api.md` → Trips and bus status (the `GET /bus-status` example)

## API used

`GET /bus-status?phase=&date=`, `GET /bus-status/attention`, `GET /bus-status/routes/{routeId}?date=`.

## Behaviour

1. **Live.** The page asks again every 30 seconds while its browser tab is visible. It stops when the tab is hidden and asks at once when the tab is shown again.
2. The header shows "Live · updated 7:48 am", the time of the last good answer.
3. If an update fails, keep the old data on screen and show "Last updated 7:48 am. Trying again." in amber. Never replace a full screen of buses with an error because one update failed.
4. **Phase switch.** Morning pickup / At school / Evening drop. The choice is in the URL (`?phase=EVENING`). Without it the server decides by the time of day.
5. **Tiles** are counted from the route list: on the way, reached school, children boarded "118 of 255", marked absent, needs attention.
6. **Attention box** is on top, red top border, hidden when empty. One block per problem with the server's text. Example: "Route 3 has no taps yet. The first stop, Pirthala, was due at 7:15."
7. **Route row.** Left: route name, vehicle, attendant. Middle: `StopStrip`. Right: state with `StatusDot`, "11 of 19 boarded", "1 absent", link "View children".
8. **`StopStrip`.** One square per stop and a last square for School.
   - `DONE`: filled blue square, blue line after it, the tap time under the name.
   - `NEXT`: white square with a blue border, "due 7:55".
   - `LATER`: white square with a grey border, grey text.
   - School reached: green square with the time.
   - A late stop shows its time in amber with the word "late".
9. **Row border.** `NO_TAPS` red border, `LATE` amber border, others normal.
10. **State words.** `ON_THE_WAY` "On the way" (blue), `REACHED_SCHOOL` "Reached school 7:46" (green), `LATE` "Late by 16 minutes" (amber), `NO_TAPS` "No taps yet" (red), `NOT_STARTED` "Not started · starts 7:50" (grey).
11. **One bus.** Header with route, vehicle, attendant, state. Five tiles. Stops as tiles in order. A table of all children: name, class, stop, four event columns, and "SMS to parent" (empty until Phase 6).
12. In the event columns: a time means done; "Absent" in red; "Waiting" in grey; a dash for events that have not come yet.
13. On a narrow screen the stop strip stays readable: stop names may wrap to two lines; the row's three parts stack.

## Tasks

Mock first:

- [x] 4.1 Types: `BusStatusRoute`, `StopState`, `RouteState`, `AttentionItem`, `BusChildRow`.
- [x] 4.2 Mock data: the 7:48 picture from `Main.dc.html` for all 9 routes, and the 19 children of Route 4 from `BusDetail.dc.html`.
- [x] 4.3 Mock handlers. `?phase=EVENING` returns an evening picture (some routes boarding, some on the way, one child missing).

Components:

- [ ] 4.4 `StopStrip` with tests for every stop state.
- [ ] 4.5 `routeStateLabel(state, lateMinutes, time)` pure function (behaviour 10).
- [ ] 4.6 `BusRouteRow`.
- [ ] 4.7 `AttentionBox`.
- [ ] 4.8 Phase switch (segmented buttons with `aria-pressed`).

Pages:

- [ ] 4.9 API hooks with the 30-second refresh and the visible-tab rule (behaviour 1).
- [ ] 4.10 `BusStatusPage`: header with live time, tiles, attention box, the route rows (behaviour 2 to 10).
- [ ] 4.11 Stale-data handling (behaviour 3).
- [ ] 4.12 `BusDetailPage` (behaviour 11, 12).

Finish:

- [ ] 4.13 Playwright flow: open Bus status as the owner, see 9 routes, open Route 4, see 19 children.
- [ ] 4.14 **Switch to the real backend** (needs backend Phase 4).

## Tests that must pass

- `stopStripShowsDoneNextLater`
- `schoolSquareIsGreenWhenReached`
- `noTapsRowHasRedBorderAndRedState`
- `lateRowShowsMinutes`
- `tilesAreCountedFromTheRoutes`
- `attentionBoxIsHiddenWhenEmpty`
- `pageRefetchesEvery30Seconds` (fake timers)
- `pageDoesNotRefetchWhileTabIsHidden`
- `failedRefreshKeepsOldDataAndShowsStaleNote`
- `phaseSwitchWritesToTheUrl`
- `oneBusShowsFourEventColumns`
- `transportInchargeCanOpenAdmissionsDeskCannot`

## Done when

- Bus status in mock mode, side by side with `Main.dc.html`, shows the same nine rows with the same states.
- With the network switched off in the browser tools, the page keeps the buses and shows the stale note.
- After 4.14: against the real backend's dev data the page shows real states.
- `/check-phase 4` passes.

## Differences found

(Fill this in during task 4.14.)

## Out of scope

- A map.
- Sound or push alerts.
- "Call attendant" as a working phone link (question C2). Show the name only.
- Correcting a tap from the web. The permission exists; the screen is later.
