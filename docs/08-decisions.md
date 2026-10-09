# 8. Decisions and open questions

This file is the memory of the web project. When something is decided, write one line here with the date.

## A. Decided by the owner

| # | Decision | Date |
|---|---|---|
| A1 | The frontend is React. | 7 Oct 2026 |
| A2 | The web app is built at the same time as the backend. | 7 Oct 2026 |
| A3 | The look is the approved design canvas (19 screens). | 7 Oct 2026 |
| A4 | Login is phone number and OTP. No passwords. | 7 Oct 2026 |
| A5 | No parent app and no parent pages. | 7 Oct 2026 |
| A6 | The attendant app is in Hindi, with big buttons. | 7 Oct 2026 |

## B. Decided while planning (change any of these if you disagree)

| # | Decision | Why | Cost to change later |
|---|---|---|---|
| B1 | One React project holds the admin web app and the attendant app. | Same login, same API client, one build, one deploy. | Medium |
| B2 | A separate Git repo from the backend. | Two Claude Code sessions can work without touching each other's files. | Low |
| B3 | TypeScript, not plain JavaScript. | The compiler catches a wrong field name before the browser does. Claude Code writes it anyway. | High |
| B4 | Vite, React Router (data mode), TanStack Query. No Redux. | The standard small set. Server data is cached in one place. | High |
| B5 | Tailwind CSS with our own tokens. No ready-made UI kit. | The design is custom (square, flat). A kit would fight it. | High |
| B6 | No chart library. Bars are built by hand. | The four charts are simple. One less dependency. | Low |
| B7 | A mock API (MSW) with sample data that matches the designs. | The web app does not wait for the backend. | Low |
| B8 | The backend's API document is the contract. This repo keeps a copy in `docs/backend/`. | One source of truth. | — |
| B9 | The web app has no copy of the role table. It reads `permissions` from the login answer. | A role change on the server needs no web release. | — |
| B10 | The token is kept in `localStorage`. | The attendant must stay logged in for 30 days. | Low |
| B11 | The admin web app is English only. Only the attendant app and the login page have Hindi. | Half the work. Office staff read English screens. | Medium |
| B12 | Only the attendant app works offline. The admin web app needs the internet. | Offline for 20 admin screens is a big cost with no need. | Medium |
| B13 | Offline taps are kept in IndexedDB and sent by the app's own loop, not by Background Sync. | Works the same on every Android browser and is easy to test. | Low |
| B14 | Filters and paging live in the URL. | A link can be shared. Back button works. | — |
| B15 | Forms are roomy: one or two columns, 48px inputs, never squeezed into a side panel. | The owner asked for this after the first enquiry design. | — |
| B16 | The built files are served from inside the Spring Boot jar. | One address, one deploy, no CORS. | Low |
| B17 | Unit and page tests with Vitest; only a few Playwright flows. | Fast tests that run on every task. | Low |
| B18 | "Save as draft" on New admission is left out. | The backend has no drafts. | Low |

## C. Open questions for the owner

| # | Question | Needed by | Until answered |
|---|---|---|---|
| C1 | The M1 Login design shows username and password. Should the design canvas be updated to phone and OTP? | Phase 1 | Build phone and OTP in the look of M1. |
| C2 | "Call attendant" on Bus status needs the attendant's phone number. The API does not give it. Add `attendantPhone` to the bus status answer in the backend? | Phase 4 | Show the attendant's name only. |
| C3 | "ऑफ़िस को फ़ोन करें" needs the office phone number. Add a setting `school.office_phone` in the backend? | Phase 5 | Read it from `VITE_OFFICE_PHONE`. |
| C4 | Screens with no design (Login, Messages, One enquiry, small dialogs): is a plain version in the same style enough? | Phases 1, 6, 7 | Yes, plain. |
| C5 | Where does the owner set the school fee per class? The API exists; no screen is designed. | Phase 8 | A small page "Fee setup" under Settings, owner only. |
| C6 | Will the web app be served from inside the backend jar (B16), or from its own address? | Phase 10 | Inside the jar. |
| C7 | Which Android phones do the attendants have (model, Android version)? | Phase 5 | Test on Chrome on a low-cost Android. |

## D. Decisions made while building

| Date | Phase | Decision | Why |
|---|---|---|---|
| 8 Oct 2026 | 0 | Stay on TypeScript 6.0 for now (7.0 is out). | typescript-eslint 8 does not accept TypeScript 7 yet; `npm install` fails. Move up when it does. |
| 8 Oct 2026 | 0 | MSW 2.15 is the newest MSW on npm, not 3. | Nothing newer exists. Imports are `msw`, `msw/node`, `msw/browser`. |
| 8 Oct 2026 | 0 | Removed `oxlint` that the Vite template added. | The plan says ESLint. |
| 8 Oct 2026 | 0 | `dev` uses `vite --mode mock`; `dev:real` uses `--mode real`. Mode files `.env.mock`, `.env.real`, `.env.production` set `VITE_API_MODE`. | The production build is always `real`, so MSW is never in `dist/`. |
| 8 Oct 2026 | 0 | A small Vite plugin deletes `mockServiceWorker.js` from `dist/` after the build. | `public/` copies it into `dist/`. It must not ship. |
| 8 Oct 2026 | 0 | Playwright reads optional `PW_CHROMIUM_PATH` to use an installed Chromium. | Lets the e2e test run where `playwright install` is not possible. |
| 8 Oct 2026 | 1 | `User`, `Role` and the `GET /roles` and `GET /users` row shapes are my guess (`Role = { role, permissions[] }`; `User` = id, name, phone, role, active, route). | `docs/backend/api.md` gives no JSON for them. Confirm with the backend repo in task 1.21. |
| 8 Oct 2026 | 1 | `GET /staff?type=ATTENDANT` returning `{ id, name, type, route }[]` is my guess. | `docs/backend/api.md` only says `GET /staff` lists staff. Confirm in task 1.21. |
| 8 Oct 2026 | 1 | The users table shows "Mobile number" where the design shows "Username". | Login is by phone (A4). The design was drawn before that. |
| 8 Oct 2026 | 1 | In the role table, Messages and Analytics show "View" for the owner too (design: "Full"). | No permission separates "see" from "change" on those pages, and the web app keeps no copy of the role table (B9). |
| 8 Oct 2026 | 1 | The login page is English only for now. The "हिंदी" button comes with the attendant app (phase 5). | Hindi text lives in `hi.json`, built in phase 5. |
| 8 Oct 2026 | 1 | The mock has 8 sample users (the 5 from the doc plus Ramesh, Mahender, Kuldeep) and mock phones `+91981234000N`. | The Users design shows 8 people. |
| 8 Oct 2026 | 1 | Unknown addresses show "Page not found" inside the admin shell, so a person who is not logged in goes to `/login` first. | One guard for everything except `/login`. |
| 8 Oct 2026 | 1 | After "Log out" the login page does not return to the old page. After a 401 it does. | Logging out is on purpose; a 401 is not. |
| 8 Oct 2026 | 1 | `Dialog` is built by hand (focus trap, Escape) instead of the `<dialog>` tag. | jsdom has no `showModal()`, so tests could not check it. No new library. |
| 9 Oct 2026 | 2 | JSON shapes for vehicles, staff, assignments, attention, routes, settings are my guess. See `src/features/vehicles/types.ts` and `src/features/routes/types.ts`. Papers come as `documents[]` with `validTill`, `status` (VALID, ENDING, ENDED) and `daysLeft` decided by the server. Settings are `{ busMonths, busFeePerChild, feeCollectedPercent }`. Load-board verdict is `OVER`, `OK` or `LOW`. | `docs/backend/api.md` gives JSON only for the assignment body and one load-board row. Confirm in task 2.21. |
| 9 Oct 2026 | 2 | The mock has 19 active people (10 drivers with Surender free, 9 attendants). Kuldeep (id 25) is an old attendant who left. Sunil from phase 1 is gone; Sunita takes Van 5. | The design shows 19 people and Sunita on Van 5. The Users test now picks Sunita. |
| 9 Oct 2026 | 2 | Business errors on vehicles and staff are HTTP 409: `STAFF_BUSY`, `WRONG_STAFF_TYPE`, `LICENCE_ENDED`, `VEHICLE_IN_USE`, `STAFF_ON_VEHICLE` (my name, for deleting a person still on a vehicle). | The docs name the codes but not all statuses. |
| 9 Oct 2026 | 2 | `/vehicles/new` sends `POST /vehicles`, then `PUT /vehicles/{id}/documents`. | The API has no papers in the add call. |
| 9 Oct 2026 | 2 | In the route panel the "Vehicle" choice lists real vehicles (Van 4), not vehicle types. Seats and cost per month are shown as read-only text. | `PUT /routes/{id}` changes only the name and the vehicle. Seats and cost belong to the vehicle (edit them on One vehicle). The design drew type, seats and cost as inputs. |
| 9 Oct 2026 | 2 | In the stops editor, saved stops show name and time as text. Only a new stop has a name box and a time box. | The design shows text. Renaming a saved stop is not needed yet. |
| 9 Oct 2026 | 2 | The three numbers (months, bus fee, collected %) save when the person leaves a box or presses Enter. A wrong number shows its message and is not sent. | The design has no Save button for them. |
| 9 Oct 2026 | 2 | `people` on `GET /vehicles/{id}` shows the latest change that has not ended, even if it starts in the future, with `upcoming: true`. | Behaviour 3: after saving "from 12 Oct", the box must show the new person at once. |
| 9 Oct 2026 | 2 | `GET /vehicles/attention` rows carry the label to show: "Bus 9" or "Driver Krishan". | The web app should not build the label from two fields. |
| 9 Oct 2026 | 2 | Added: "Turn off this person" in the Edit person dialog (`DELETE /staff/{id}`) and "Add a new driver" in the change form (opens the Add person dialog). | The API has the call; the design shows the "Add a new driver" choice. |
| 9 Oct 2026 | 2 | The session label "2026–27" on Routes and load is worked out from today's date (April to March). | There is no session API until phase 8. |

## E. Differences from the first plan document

The first plan ("School Transport App — Build Plan") said the React app has 8 office screens and 2 attendant screens, with username and password login. Now: 15 office screens and 5 attendant pages, phone and OTP login, and the screens are fixed by the design canvas.
