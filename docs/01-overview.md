# 1. Overview

## What we are building

One React project with two faces.

| Face | For whom | Device | Language | Screens |
|---|---|---|---|---|
| Admin web app | Owner, office admin, transport in-charge, admissions desk | Laptop | English | 12 designed + 3 small ones |
| Attendant app | Bus attendants | Cheap Android phone | Hindi (English switch) | 7 |

It is one project because both use the same login, the same API client and the same build. The phone part is loaded only on the phone, so it stays light.

Example: Neelam (office) opens the site on her laptop, logs in, and sees the sidebar with Bus status, Students and so on. Balwan (attendant) opens the same address on his phone, logs in, and sees only "आज के चार काम" (today's four jobs). The role decides.

Parents have no screen at all. They get SMS from the backend.

## Where the design is

The approved designs are in `design/screens/`, one HTML file per screen. `docs/04-screens.md` lists every screen with its file.

## Working in parallel with the backend

The backend is built in its own repo, in phases. The web app does not wait for it.

How: the web app has a **mock API** inside it. It answers like the real backend, using sample data. So a screen can be built and tested before the backend part exists. When the backend part is ready, we switch that screen to the real backend and check that both fit.

Real-life picture: two teams build a bridge from both sides of a river. They agree first on the exact meeting point. Our meeting point is the API document, `docs/backend/api.md`.

| Web phase | Screens | Uses backend phase | Can start before the backend is ready? |
|---|---|---|---|
| 0 Setup | — | — | Yes |
| 1 Shell, login, users | Login, Users and roles | 1 | Yes, with mock |
| 2 Vehicles, staff, routes | Vehicles and staff, One vehicle, Routes and load | 2 | Yes, with mock |
| 3 Students and admission | Students, One student, New admission | 3 | Yes, with mock |
| 4 Bus status | Bus status, One bus | 4 | Yes, with mock |
| 5 Attendant app | M1 to M7 | 4 | Yes, with mock |
| 6 Messages | Messages, SMS column | 5 | Yes, with mock |
| 7 Enquiries | Enquiry list, Add an enquiry, One enquiry | 6 | Yes, with mock |
| 8 Fees | Fees in admission and student page | 7 | Yes, with mock |
| 9 Analytics | Analytics | 8 | Yes, with mock |
| 10 Go live | — | all | No. Needs the real backend. |

Each web phase ends with a task "switch to the real backend". That task waits until the matching backend phase is done. Everything before it does not wait.

## The rule that keeps both sides fitting

1. The backend repo owns the API document.
2. This repo holds a **copy** in `docs/backend/`.
3. When the backend document changes, copy the three files here again and run `/next-task` or ask Claude "what changed in the API docs and which screens are affected?".
4. If a screen needs a field that is not in the document, the document changes first. Nobody invents a field on one side.

## What is out

- A parent app or parent pages.
- A live map.
- Online payment pages.
- Dark mode.
- Hindi for the admin web app (only the attendant app has Hindi).
- iPhone-specific work. The attendant phones are Android.

## Size

About 22 screens. One developer with Claude Code. No part of this needs a big framework or a complex state library.
