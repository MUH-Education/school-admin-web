# Phase 5 — Attendant app

## Goal

A bus attendant can do the whole day on a phone, in Hindi, with or without signal, and no tap is ever lost.

This is the most delicate phase. Read `docs/07-attendant-offline.md` twice.

## Screens

| Page | Design |
|---|---|
| Today `/trip` | `MobileToday.dc.html` |
| Morning pickup `/trip/pickup` | `MobilePickup.dc.html` |
| No network (a state) | `MobileOffline.dc.html` |
| Reached school `/trip/school` | `MobileSchool.dc.html` |
| Evening boarding `/trip/evening` | `MobileEvening.dc.html` |
| Home drop `/trip/drop` | `MobileDrop.dc.html` |
| Login in Hindi | look of `MobileLogin.dc.html`, phone and OTP |

## Read first

- `docs/07-attendant-offline.md` (all of it)
- `.claude/rules/attendant.md`
- `docs/backend/api.md` → `GET /trips/my-route`, `GET /trips/manifest`, `POST /trips/marks`
- The current docs of `vite-plugin-pwa` and `idb`

## API used

`GET /trips/my-route`, `GET /trips/manifest?routeId=&date=`, `POST /trips/marks`.

## Behaviour

All of `docs/07-attendant-offline.md`. The most important points:

1. Write the tap to IndexedDB, then change the screen, then send.
2. The screen shows "saved manifest + queue".
3. The sync loop sends when online; deletes only confirmed taps; moves refused taps to the problems list.
4. A second tap on the same button is undo.
5. The evening "next" button is off until every child has an answer.
6. All text comes from `hi.json` / `en.json`. Hindi is the default.
7. The app opens with no signal after the first visit.

## Tasks

Foundations:

- [x] 5.1 i18n setup; `hi.json` and `en.json` with every text from the six designs and the strings in `docs/07-attendant-offline.md`. Language button and saved choice.
- [x] 5.2 Login page: Hindi texts, the "हिंदी / English" button.
- [x] 5.3 Types: `Manifest`, `ManifestStop`, `ManifestChild`, `Tap`, `MarkResult`, `MyRoute`.
- [x] 5.4 Mock data and handlers: Route 4's manifest for the fixed day; `POST /trips/marks` that applies the server rules (same tap twice saved once, older tap ignored, `NOT_YOUR_ROUTE` for a child of another route).

Offline core (pure TypeScript, no React, fully unit-tested):

- [x] 5.5 `tapStore`: IndexedDB stores `manifest`, `tapQueue`, `tapProblems` with `idb`.
- [x] 5.6 `addTap(...)`: builds the tap with the phone's time, replaces an unsent tap for the same child and event, writes it.
- [x] 5.7 `viewState(manifest, queue)`: the pure function that gives each child's shown answer and the counts.
- [x] 5.8 `syncOnce()`: the loop of `docs/07-attendant-offline.md`. One run at a time.
- [x] 5.9 `useSync()`: starts `syncOnce` on a new tap, on `online`, on app focus, and every 20 seconds while taps wait. Gives `{ waiting, problems, online }` to the UI.

Shell and shared parts:

- [ ] 5.10 `AttendantShell`: top bar (back, title, count), sending strip, bottom button area. `font-hindi`.
- [ ] 5.11 `ChildRow` with one or two answer buttons, at least 52px high.
- [ ] 5.12 `SendingStrip` with the four states.
- [ ] 5.13 `StopHeader`, `DoneStopLine`.

Pages:

- [ ] 5.14 `/trip` Today: four job cards with counts, the current one highlighted, "call the office", the "no route today" state.
- [ ] 5.15 `/trip/pickup` Morning pickup: current stop open, earlier stops as lines, next-stop button.
- [ ] 5.16 `/trip/school` Reached school: the big button with its one confirm, the absent list, "see names one by one".
- [ ] 5.17 `/trip/evening` Evening boarding: missing children on top, two answers, the gated bottom button.
- [ ] 5.18 `/trip/drop` Home drop: evening stop order, "all children of this stop got off".
- [ ] 5.19 Problems list (taps the server refused) with a clear button.
- [ ] 5.20 New-day handling and the "today's list did not load" banner.

Install and offline shell:

- [ ] 5.21 `vite-plugin-pwa`: manifest (name "स्कूल बस", start URL `/trip`, standalone, icons), service worker that keeps the app files and fonts, no API caching.
- [ ] 5.22 The "new version" bar. No automatic reload.
- [ ] 5.23 Code splitting check: opening `/trip` on a fresh browser does not download any admin chunk.

Finish:

- [ ] 5.24 Playwright flows from `docs/07-attendant-offline.md` (offline taps survive a reload; they are sent with the original times when online).
- [ ] 5.25 Try it on a real low-cost Android phone on mobile data: install to the home screen, switch on flight mode, tap, switch off, watch the strip turn green.
- [ ] 5.26 **Switch to the real backend** (needs backend Phase 4). Log in as an attendant of the dev data and tap a morning.

## Tests that must pass

All "Tests that prove it works" in `docs/07-attendant-offline.md`, and:

- `tapKeepsThePhoneTimeNotTheSendTime`
- `unsentTapForSameChildIsReplacedNotDuplicated`
- `onlyOneSyncRunsAtATime`
- `tapsSurviveLogoutAndAreSentAfterLogin`
- `reachedSchoolAsksOnceThenQueuesOneTapPerBoardedChild`
- `homeDropUsesReversedStopOrder`
- `everyVisibleTextComesFromTheLanguageFile` (switching to English leaves no Hindi UI text, and the other way)
- `allAnswerButtonsAreAtLeast52pxHigh`
- `noRouteTodayShowsTheCallOfficeMessage`

## Done when

- In mock mode you can do a whole day as Balwan: pickup at four stops, reached school, evening boarding with one child "नहीं जाएँगे", home drop.
- With the network off the whole time, every tap is shown and kept; with the network on, the strip turns green.
- The six pages, side by side with their designs at 390px width, look the same.
- Task 5.25 was done on a real phone.
- `/check-phase 5` passes.

## Differences found

(Fill this in during task 5.26.)

## Out of scope

- Push notifications.
- GPS.
- Showing parents' phone numbers.
- A separate app in the Play Store.
- iPhone testing.
