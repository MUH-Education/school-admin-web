# Start here

This folder is the full plan for the React app. There is no React code in it yet. It tells you (and Claude Code) what to build, in what order, how it must look, and how to know each part is finished.

It is the partner of the backend plan (`school-admin-backend`). The two are built at the same time.

## What is decided

| Topic | Decision |
|---|---|
| One project, two faces | Admin web app (laptop, English) and attendant app (phone, Hindi) |
| Stack | React 19, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS |
| Look | The approved designs, copied exactly. They are inside this folder. |
| Login | Phone number, then a 6-digit code. No password. |
| No waiting for the backend | A mock API with sample data is built into the app |
| Offline | Only the attendant app. A tap is saved on the phone first, then sent. |

Example of "no waiting": on day one you run `npm run dev`, log in as "Neelam, Office admin" with the code `000000`, and see Bus status with 9 sample buses. The Spring Boot app is not even started.

## What is in this folder

```
school-admin-web/
├── START-HERE.md            this file
├── CLAUDE.md                rules Claude Code reads every time
├── .claude/
│   ├── rules/               design, API, attendant and testing rules
│   └── skills/              two commands: /next-task and /check-phase
├── design/
│   ├── README.md            which file is which screen
│   └── screens/             the 19 approved screens, as HTML with exact sizes and colours
└── docs/
    ├── 01-overview.md           what we build; how web and backend phases match
    ├── 02-architecture.md       folders, URLs, data, forms, errors
    ├── 03-design-system.md      colours, fonts, sizes, shared components
    ├── 04-screens.md            every screen: URL, design, permission, API calls
    ├── 05-auth-permissions.md   login pages, token, menu by role
    ├── 06-api-and-mocks.md      API client, mock API, switching to the real backend
    ├── 07-attendant-offline.md  the phone app: Hindi, offline taps, install
    ├── 08-decisions.md          decisions made, and 7 questions for you
    ├── backend/                 copies of the backend's API, roles and login docs
    └── phases/
        ├── README.md            the phase list and status
        └── phase-0 … phase-10   one file per phase, with tick boxes
```

## The 11 phases

| Phase | You build | Uses backend phase |
|---|---|---|
| 0 | Empty project with colours, fonts, tests, mock | — |
| 1 | Login, sidebar, Users and roles, shared components | 1 |
| 2 | Vehicles and staff, One vehicle, Routes and load | 2 |
| 3 | Students, One student, New admission | 3 |
| 4 | Bus status, One bus | 4 |
| 5 | Attendant phone app, offline | 4 |
| 6 | Messages | 5 |
| 7 | Enquiries | 6 |
| 8 | Fees | 7 |
| 9 | Analytics | 8 |
| 10 | Go live | all |

Each phase is built with the mock first. Its last task is "switch to the real backend". Only that task waits for the backend.

## How to begin

1. Make a new GitHub repo, for example `school-admin-web`. Keep it separate from the backend repo.
2. Put everything from this folder in the repo root. Check that the hidden folder `.claude` was copied too.
3. Open the repo in Claude Code and paste the first prompt below.

## Prompt for the first session (Phase 0)

```text
This repo holds the full plan for a React web app. The plan files are in the repo root: CLAUDE.md, START-HERE.md, .claude/, docs/, design/. There is no React code yet.

Before you write anything, read these files fully:
1. CLAUDE.md
2. START-HERE.md
3. docs/02-architecture.md
4. docs/03-design-system.md
5. docs/phases/README.md
6. docs/phases/phase-0-setup.md

Then do Phase 0 only. Follow the tasks in docs/phases/phase-0-setup.md in order.

Create the project in the repo root, next to the plan files, not in a sub-folder. Do not delete or overwrite CLAUDE.md, START-HERE.md, .claude/, docs/ or design/.

Several tools have new major versions (React Router 8, MSW 3, Vitest 5, TypeScript 7, vite-plugin-pwa 2). Before you configure one, read its current getting-started page. Do not write from memory.

Rules while you work:
- Do the tasks one after another, without waiting for me between tasks.
- After each task run: npm run lint && npm run typecheck && npm test && npm run build. Fix until all pass. Tick the task box in the phase file. Make one git commit with a clear message.
- If Node 24 is missing, stop and tell me. Do not switch to another framework or to plain JavaScript.
- Small choice the docs do not cover: pick the simplest option that fits the docs, write one line in docs/08-decisions.md part D, and continue.
- Do not start Phase 1.

At the end, go through "Done when" in the phase file and tell me pass or fail for each line. Set Phase 0 to Done and Phase 1 to In progress in docs/phases/README.md only if every line passes. Push the commits.

Talk to me in simple English with short sentences and one example for each idea. Tell me: what now works, the exact command to see it, and what is next.
```

## Prompt for every later session (change the phase number)

```text
Do Phase 1 of this project, the whole phase, in this session.

Read first, fully: CLAUDE.md, docs/phases/README.md, the Phase 1 file in docs/phases/, and every doc that file lists under "Read first".

How to work:
- Do the tasks in order, one after another, without waiting for me between tasks.
- Before you build a screen, open its design file in design/screens/ and its part of docs/04-screens.md. Match the design exactly: colours, sizes, spacing. Use the tokens, never a raw colour.
- For each screen: types, then the mock handler and sample data, then the API hooks, then components, then the page, then tests.
- After each task: run npm run lint && npm run typecheck && npm test && npm run build, fix until all pass, tick the task box, make one git commit.
- Take your time. Correct, tested and matching the design is more important than fast. Never skip, delete or weaken a test to make the build pass.

Sample data:
- The mock data must make each screen look like its design: 9 routes, 150 seats, 255 children on buses, Route 4 with 19 children.
- Also cover the hard cases of this phase. Example: a vehicle with an ended paper, a user who is turned off, a route that is full, an empty list.
- Made-up names and fake phone numbers only.

Decisions:
- Small choice the docs do not cover: pick the simplest option that fits the docs, write one line in docs/08-decisions.md part D, and continue.
- Stop and ask me only when: the design, docs/04-screens.md and docs/backend/api.md disagree; a field a screen needs is not in docs/backend/api.md; or a tool is missing.
- The task "Switch to the real backend": do it only if I tell you the backend phase is running on localhost:8080. Otherwise leave it unticked and say so at the end.

Limits:
- Build nothing that the phase file lists under "Out of scope". Add no library that is not in the plan.
- Do not edit files in docs/backend/.
- Do not start the next phase.

At the end:
- Start the app and open every screen of this phase. Compare each with its design file and list any visible difference.
- Go through "Done when" in the phase file. Tell me pass or fail for each line.
- Only if all pass (except the real-backend task when it had to wait): set this phase to Done and the next to In progress in docs/phases/README.md.
- Push the commits.
- Tell me in simple English, with short sentences and one example each: which URLs to open, which sample login to use, what you skipped and why, and what I must decide before the next phase.
```

## Three things to check first

1. `docs/08-decisions.md` part C: 7 questions for you. Two of them ask for small additions to the backend (the attendant's phone on Bus status, and the office phone number).
2. `design/README.md`: the list "Known differences between the designs and the app". The biggest one: the phone login design still shows username and password; the app will use phone number and code.
3. `docs/phases/README.md`: how the web and backend phases run side by side.

## When the backend API document changes

Copy three files from the backend repo into `docs/backend/` here:

| From the backend repo | To this repo |
|---|---|
| `docs/04-login-otp-jwt.md` | `docs/backend/login-otp-jwt.md` |
| `docs/05-roles-permissions.md` | `docs/backend/roles-permissions.md` |
| `docs/06-api.md` | `docs/backend/api.md` |

Then tell Claude Code: "The files in docs/backend changed. Show me what changed and which screens, types and mock handlers must follow."
