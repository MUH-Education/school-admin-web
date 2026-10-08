# School Admin Web — instructions for Claude

React app for MUH Jain Global School (Tohana, Haryana). One project holds two things:

1. **Admin web app** — for office staff on a laptop. English.
2. **Attendant app** — for bus attendants on a cheap Android phone. Hindi. Works with no signal.

The backend is a separate Spring Boot repo (`school-admin-backend`). Parents have no app.

## How to talk to the owner

- The owner is a backend developer. He is **not strong in English** and is new to React.
- Use **simple English, short sentences, and a real example** for every idea.
  Example: do not say "the list is paginated". Say "the list shows 25 students at a time, with Next and Back buttons".
- After each task, say in 3 to 5 lines: what you built, how to see it in the browser, what is next.

## Stack (do not change without asking)

| Thing | Choice |
|---|---|
| Runtime | Node 24 LTS |
| Build | Vite 8 |
| UI | React 19 with TypeScript 7, function components only |
| Routing | React Router 8, data mode (`createBrowserRouter`, `RouterProvider`) |
| Server data | TanStack Query 5 |
| Forms | React Hook Form 7 + Zod 4 |
| Styling | Tailwind CSS 4, tokens in `src/styles/index.css` |
| Hindi text | i18next + react-i18next (attendant app only) |
| Mock API | MSW 3 |
| Tests | Vitest 5 + Testing Library; Playwright for a few full flows |
| Offline | vite-plugin-pwa 2 + `idb` (IndexedDB) |

Not used: Redux, Axios, a UI kit (MUI, Ant Design, shadcn), a chart library, CSS-in-JS, class components.

**These versions are new.** React Router 8, MSW 3, Vitest 5, TypeScript 7 and vite-plugin-pwa 2 may differ from what you remember. Before you use an API from one of them, read its current docs or the README inside `node_modules`. Do not write from memory.

## Commands

```bash
npm run dev            # start with the mock API (no backend needed)
npm run dev:real       # start against the real backend on localhost:8080
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm test               # Vitest, all unit and page tests
npm run e2e            # Playwright flows, against the mock API
npm run build          # production build into dist/
```

A task is finished only when `lint`, `typecheck`, `test` and `build` all pass.

## Where the plan lives

| File | What it answers |
|---|---|
| `docs/01-overview.md` | What we build; how web phases match backend phases |
| `docs/02-architecture.md` | Folders, routing, data fetching, forms, errors |
| `docs/03-design-system.md` | Colours, fonts, sizes, shared components |
| `docs/04-screens.md` | Every screen: URL, design file, permission, API calls, states |
| `docs/05-auth-permissions.md` | Login screens, token, menu by role |
| `docs/06-api-and-mocks.md` | API client, mock server, switching to the real backend |
| `docs/07-attendant-offline.md` | Phone app: Hindi, offline taps, install |
| `docs/08-decisions.md` | Decisions made, open questions |
| `docs/backend/` | **Copies** of the backend's API, roles and login docs. The backend repo is the source of truth. |
| `design/screens/*.dc.html` | The approved screen designs. The exact look. |
| `docs/phases/` | The phase list and one file per phase |

## How to work

1. Open `docs/phases/README.md`. Find the phase marked **In progress**.
2. Open that phase file. Do the **first task that is not ticked**. Do only that task.
3. Before building a screen, open its design file in `design/screens/` and its row in `docs/04-screens.md`.
4. Order inside a screen: types → mock handler and sample data → API hooks → components → page → tests.
5. Run `npm run lint && npm run typecheck && npm test && npm run build`. Fix until all pass.
6. Tick the task box (`- [x]`) in the phase file.
7. If you decided something the docs do not cover, add one line to `docs/08-decisions.md` part D.
8. If a design, a doc and the backend docs disagree, stop and ask. Do not silently pick one.

## Architecture rules

- **Feature folders.** `src/features/<feature>/` holds `api.ts`, `types.ts`, `pages/`, `components/`. A feature never imports from another feature's `components/` or `pages/`. Shared things go to `src/ui/` or `src/lib/`.
- **Server data lives in TanStack Query**, never in `useState` or a global store. Example: the vehicle list comes from `useVehicles()`. After "Add vehicle" succeeds, invalidate the `['vehicles']` query. Do not push into a local array.
- **All HTTP goes through `src/api/client.ts`.** No `fetch` in components.
- **Types for API data are written once**, in the feature's `types.ts`, and must match `docs/backend/api.md`.
- **Forms** use React Hook Form with a Zod schema. Show the server's field errors (`fields` in the error body) under the right input.
- **Every page handles four states:** loading, error (with a Retry button), empty, and data.
- **Permissions:** hide what the user cannot do with `can('PERMISSION')`. The server still checks. Never assume a hidden button is security.
- **No `any`.** No `// @ts-ignore`. No disabled lint rules without a comment that says why.
- **Money** is shown with `formatInr()` → `₹8,67,900`. **Phones** from the server are shown as they come; never log them.
- **Dates** from the API are ISO text. Show with `formatDate()` and `formatTime()` from `src/lib/format.ts`, in the zone `Asia/Kolkata`.

## Design rules (short; full list in `.claude/rules/design.md`)

- The files in `design/screens/` are the look. Match colours, sizes and spacing exactly. Use the tokens, never a raw hex in a component.
- Square corners. No shadows. No gradients. No emoji.
- A status is always **text plus a small square**, never colour alone.
- Numbers and codes use the mono font.
- Do not redesign a screen. If a design is missing something, build the smallest thing in the same style and note it in `docs/08-decisions.md`.

## Attendant app rules (short; full list in `.claude/rules/attendant.md`)

- A tap is written to IndexedDB **before** the screen changes. Then it is sent.
- A tap is never lost and never shown as "sent" unless the server said so.
- All text comes from `src/i18n/hi.json` and `en.json`. Hindi is the default.
- Buttons are at least 52px high.

## Do not

- Do not call the real backend from a test.
- Do not add a library without saying why in `docs/08-decisions.md`.
- Do not edit files in `docs/backend/` by hand. They are copies. If the API must change, tell the owner; the backend repo changes first.
- Do not build things marked "Out of scope" in a phase file.
- Do not store anything except the login token and the offline tap queue in the browser.
