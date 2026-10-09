# Phases

The web app is built in 11 phases. Each phase ends with screens you can open in the browser.

## Status

Change the Status column as you go: **Not started** → **In progress** → **Done**. Only one phase is In progress at a time.

| Phase | Name | Screens that work at the end | Needs backend phase | Size | Status |
|---|---|---|---|---|---|
| 0 | [Project setup](phase-0-setup.md) | An empty page in the right colours and fonts | — | S | Done |
| 1 | [Shell, login, users](phase-1-shell-login-users.md) | Login, sidebar, Users and roles | 1 | M | Done |
| 2 | [Vehicles, staff, routes](phase-2-vehicles-staff-routes.md) | Vehicles and staff, One vehicle, Routes and load | 2 | M | Done |
| 3 | [Students and admission](phase-3-students-admission.md) | Students, One student, New admission | 3 | L | Done |
| 4 | [Bus status](phase-4-bus-status.md) | Bus status, One bus | 4 | M | Done |
| 5 | [Attendant app](phase-5-attendant-app.md) | The five phone pages, offline, installable | 4 | L | Done |
| 6 | [Messages](phase-6-messages.md) | Messages, SMS column on One bus | 5 | S | Done |
| 7 | [Enquiries](phase-7-enquiries.md) | Enquiry list, Add an enquiry, One enquiry | 6 | M | Done |
| 8 | [Fees](phase-8-fees.md) | Fees in admission and on the student page, Fee setup | 7 | M | Done |
| 9 | [Analytics](phase-9-analytics.md) | Analytics | 8 | M | In progress |
| 10 | [Go live](phase-10-go-live.md) | Everything on the real backend, on the real address | all | M | Not started |

Size: **S** is about one week, **M** about one and a half weeks, **L** about two weeks, at about 10 to 12 hours a week with Claude Code doing most of the typing. It is a guess, not a promise.

## How web phases and backend phases run side by side

"Needs backend phase" does **not** mean "wait for it". Every web phase is built against the mock API first. Only the last task of each phase, "switch to the real backend", waits.

```
Backend:  0 ─ 1 ──── 2 ──── 3 ────── 4 ────── 5 ──── 6 ── 7 ──── 8 ──── 9
Web:      0 ─ 1 ──── 2 ──── 3 ────── 4 ─ 5 ── 6 ──── 7 ── 8 ──── 9 ──── 10
                 ▲       ▲       ▲        ▲
                 └── at each ▲: start both, run "switch to the real backend"
```

A good rhythm: one Claude Code session per phase in the backend repo, one in this repo. When both sessions of the same number are finished, do the switch task.

If the backend is behind, the web app simply moves on to its next phase with the mock. Do the waiting switch tasks later, one after another.

## The order

- Phases 0 to 5 are the transport system. Do these first.
- Phase 7 (enquiries) needs only Phase 1. It can be moved earlier.
- Phase 8 (fees) needs Phase 3. Phase 9 (analytics) needs Phase 8.
- Phase 10 is done once for the transport system (after 5 and 6) and again after 9.

## What every phase file contains

| Section | Meaning |
|---|---|
| Goal | One sentence |
| Screens | With their design files |
| Read first | Docs to read before coding |
| API used | The calls the phase needs, to mock first |
| Behaviour | Rules, each with an example |
| Tasks | Tick boxes |
| Tests that must pass | Write these with the code |
| Done when | How you know the phase is finished |
| Differences found | Filled in during "switch to the real backend" |
| Out of scope | Things not to build now |

## How to work with Claude Code

1. Open this folder in Claude Code.
2. Type `/next-task`. Claude builds the next unticked task, runs lint, typecheck, tests and build, ticks the box, and tells you which URL to open.
3. Look at the screen in the browser next to its design. Then type `/next-task` again.
4. When all tasks of a phase are ticked, type `/check-phase`. Claude compares each screen with its design and goes through "Done when".
5. Commit to Git after every task.
