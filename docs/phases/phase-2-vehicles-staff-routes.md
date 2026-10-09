# Phase 2 — Vehicles, staff, routes

## Goal

The office can see and manage vehicles, their papers, drivers, attendants and helpers, change who is on which vehicle, and manage routes with stops and the load numbers.

## Screens

| Screen | Design |
|---|---|
| Vehicles and staff `/vehicles` | `Vehicles.dc.html` |
| One vehicle `/vehicles/:id`, `/vehicles/new` | `VehicleDetail.dc.html` |
| Routes and load `/routes` | `RoutesLoad.dc.html` |

## Read first

- `docs/04-screens.md` → screens 11, 12, 3
- `docs/backend/api.md` → Vehicles and staff, Routes

## API used

`GET/POST /vehicles`, `GET/PUT/DELETE /vehicles/{id}`, `PUT /vehicles/{id}/documents`, `GET/POST /vehicles/{id}/assignments`, `GET /vehicles/attention`, `GET/POST /staff`, `PUT/DELETE /staff/{id}`, `GET/POST /routes`, `GET/PUT/DELETE /routes/{id}`, `PUT /routes/{id}/stops`, `GET /routes/load-board`, `GET/PUT /settings`.

## Behaviour

1. **Papers cell.** One line per vehicle: green "All valid", or the worst problem: amber "Insurance ends 28 Oct", red "Fitness ended 30 Sep".
2. **Attention box** on top of Vehicles and staff lists ended papers first, then ending ones, each with "in 21 days". Hidden when nothing needs attention.
3. **Change a person** is an inline form inside the people box. It asks: new person, from date, reason, and "only till a date" or "from now on".
   Example: choose Surender, 12 Oct, On leave, only till 16 Oct → after saving, the box shows Surender with "till 16 Oct, then Jagdish is back".
4. The person list in that form shows where each person is now: "Surender · free now", "Rajpal · now on Van 1". The server decides if the choice is allowed; show `STAFF_BUSY`, `WRONG_STAFF_TYPE`, `LICENCE_ENDED` in the form.
5. **Read-only for view roles.** Office admin sees these three screens without any change buttons and with plain text instead of inputs.
6. **Routes and load.** The left list has one row per route with the seat bar. Clicking a row selects it (`?route=4`) and fills the right panel.
7. **Seat bar.** Blue from the left up to the seat line in the middle; red after it. 19 children on 14 seats → blue is full, red is 5 ÷ 14 of the right half.
8. **Stops editor.** Add a stop at the end, remove a stop, move a stop up or down with two small buttons. Saving sends the whole ordered list. The child count per stop cannot be typed.
9. **The three numbers** (months, bus fee, collected %) are inputs only for a user with `SETTINGS_EDIT`. Others see them as text.
10. **"What this page is telling you"** is made by a pure function from the load-board numbers. With the sample data it says: 105 children without a seat, 0 seats empty, so the problem is too few seats.
11. Money is shown as `₹3,33,300`. A loss is red with a minus sign.

## Tasks

Mock first:

- [x] 2.1 Types: `Vehicle`, `VehicleDocument`, `Staff`, `Assignment`, `Route`, `RouteStop`, `LoadBoardRow`, `Settings`.
- [x] 2.2 Mock data: 9 vehicles, 19 staff, assignments, 9 routes with stops, children counts (255 in total, as in `docs/06-api-and-mocks.md`).
- [x] 2.3 Mock handlers for all calls above, with the business errors and the load maths.

Shared components:

- [x] 2.4 `TileRow`, `Tile`.
- [x] 2.5 `DateInput`, `MoneyInput`, `ChoiceGroup`.
- [x] 2.6 `InlineForm`, `HistoryList`.
- [x] 2.7 `SeatMeter` with tests for under, exactly full, and over.

Vehicles and staff:

- [x] 2.8 API hooks for vehicles, staff, assignments.
- [x] 2.9 `VehiclesPage`: attention box, vehicles table, staff table.
- [x] 2.10 Add and edit a person (dialog).
- [x] 2.11 `VehicleDetailPage`: details form, papers form.
- [x] 2.12 People box with the change form (behaviour 3, 4) and the history list.
- [x] 2.13 `/vehicles/new` and "Remove this vehicle".
- [x] 2.14 Read-only mode (behaviour 5).

Routes and load:

- [x] 2.15 API hooks for routes, load board, settings.
- [x] 2.16 `RoutesPage`: tiles, settings row, route list with `SeatMeter`.
- [x] 2.17 Selected route panel: name, vehicle, stops editor, the six numbers.
- [x] 2.18 Add route, delete route.
- [ ] 2.19 `loadBoardInsights(rows)` pure function and the bottom box.

Finish:

- [ ] 2.20 Playwright flow: open Van 4, change the driver for 12 to 16 Oct, see the new driver; open Routes and load, add a stop to Route 4, save.
- [ ] 2.21 **Switch to the real backend** (needs backend Phase 2).

## Tests that must pass

- `papersCellShowsWorstProblem`
- `attentionBoxIsHiddenWhenEmpty`
- `changeDriverFormShowsStaffBusyMessage`
- `temporaryChangeShowsReturnDate`
- `officeAdminSeesNoChangeButtons`
- `seatMeterShowsRedOnlyWhenOverSeats`
- `selectingARoutePutsItInTheUrl`
- `stopsAreSentInTheOrderShown`
- `stopWithChildrenCannotBeRemovedShowsServerMessage`
- `settingsAreReadOnlyWithoutSettingsEdit`
- `insightsSayTooFewSeatsWhenNoSpareSeats`
- `lossIsRedWithMinusSign`

## Done when

- The three screens in mock mode look like their designs, side by side.
- After 2.21: against the real backend with its dev data, Routes and load shows 9 routes and 150 seats.
- `/check-phase 2` passes.

## Differences found

(Fill this in during task 2.21.)

## Out of scope

- Uploading scans of papers.
- A calendar view of who is on leave.
- Drag and drop for stops. Up and down buttons are enough.
