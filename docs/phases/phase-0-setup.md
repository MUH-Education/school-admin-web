# Phase 0 — Project setup

## Goal

An empty React project that starts, shows one page in the right colours and fonts, and has lint, typecheck, tests, mock API and build all working.

## Screens

None. A "Hello" page that uses the tokens.

## Read first

- `CLAUDE.md`
- `docs/02-architecture.md`
- `docs/03-design-system.md`

## What you need on your laptop

| Tool | Version | Check with |
|---|---|---|
| Node | 24 LTS | `node -v` |
| Git | any | `git --version` |

Nothing else. The backend is not needed in this phase.

## Create the project

In the repo root, next to `CLAUDE.md`, `docs/`, `design/` and `.claude/`:

```bash
npm create vite@latest . -- --template react-ts
```

If the tool refuses because the folder is not empty, create the project in a temporary folder and move its files into the root. Do not delete or overwrite `CLAUDE.md`, `START-HERE.md`, `.claude/`, `docs/` or `design/`.

Then install, always the newest stable version of each:

| Package | For |
|---|---|
| `react-router` | Pages and URLs |
| `@tanstack/react-query` | Server data |
| `tailwindcss`, `@tailwindcss/vite` | Styling |
| `react-hook-form`, `zod`, `@hookform/resolvers` | Forms |
| `i18next`, `react-i18next` | Hindi and English text |
| `idb` | IndexedDB for offline taps |
| dev: `msw` | Mock API |
| dev: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` | Tests |
| dev: `@playwright/test` | Full-flow tests |
| dev: `vite-plugin-pwa` | Installable phone app |
| dev: `eslint` with the React and TypeScript plugins, `prettier` | Code quality |

These tools have new major versions (React Router 8, MSW 3, Vitest 5, TypeScript 7, vite-plugin-pwa 2). Read each tool's "getting started" page before you configure it.

## Tasks

- [x] 0.1 Create the Vite React TypeScript project in the repo root as described. `npm run dev` shows the Vite start page.
- [ ] 0.2 `.gitignore` (node_modules, dist, .env.local, test-results, playwright-report). First commit.
- [ ] 0.3 TypeScript in strict mode. Path alias `@/` → `src/`. Script `typecheck`.
- [ ] 0.4 ESLint and Prettier with scripts `lint` and `format`. Lint must fail on `any` and on unused variables.
- [ ] 0.5 Tailwind: add the Vite plugin, `@import "tailwindcss"` in `src/styles/index.css`, and **every token** from `docs/03-design-system.md` under `@theme` (colours, the three font families). Set the default radius to 0.
- [ ] 0.6 Fonts: load Archivo, IBM Plex Mono and Mukta from Google Fonts in `index.html` with `display=swap`. Body uses `font-sans`, `bg-paper`, `text-ink`, 14px.
- [ ] 0.7 Make the folder structure from `docs/02-architecture.md` (empty folders with a short `README.md` or an `index.ts` each).
- [ ] 0.8 `src/lib/format.ts` with `formatInr`, `formatDate`, `formatTime`, `formatLoad`, `daysFromToday`, `maskPhone`, and their unit tests (the examples in `docs/02-architecture.md`).
- [ ] 0.9 Vitest with jsdom and Testing Library. Script `test`. One sample component test passes.
- [ ] 0.10 MSW: `src/mocks/browser.ts`, `src/mocks/server.ts`, an empty `handlers/index.ts`. `main.tsx` starts the worker only when `VITE_API_MODE` is `mock`. Vitest starts the server in its setup file. One test proves a mocked `GET /api/v1/ping` answers.
- [ ] 0.11 `src/api/client.ts` and `errors.ts` as described in `docs/06-api-and-mocks.md`, with tests: adds the token header; turns `{error, message, fields}` into `ApiError`; network failure → code `NETWORK`.
- [ ] 0.12 Router skeleton: `/` shows a page "School admin" with one `Panel`-like box, a mono number and a primary button, all from tokens. Unknown URL shows "Page not found".
- [ ] 0.13 `vite.config.ts`: proxy `/api` → `http://localhost:8080`. Scripts `dev` (mock) and `dev:real`. `.env.example` with the two variables.
- [ ] 0.14 The "Sample data" label, shown only in mock mode.
- [ ] 0.15 Playwright: config that starts `npm run dev` and one test that opens `/` and sees "School admin". Script `e2e`.
- [ ] 0.16 GitHub Actions workflow: on every push run `lint`, `typecheck`, `test`, `build`.
- [ ] 0.17 `README.md`: how to run, test and build, in 10 lines.

## Tests that must pass

- `formatInr(867900)` → `₹8,67,900`; `formatInr(-174460)` → `−₹1,74,460`; `formatInr(0)` → `₹0`
- `formatTime('2026-10-07T07:42:10+05:30')` → `7:42`, also when the test machine's zone is UTC
- `formatLoad(1.357)` → `1.36×`
- `maskPhone('+919812345678')` → `+91XXXXXX5678`
- API client: token header, `ApiError` mapping, `NETWORK` error
- MSW answers a mocked URL in a Vitest test
- Playwright opens the home page

## Done when

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.
- `npm run dev` shows the sample page with the paper background, ink text, Archivo font, a mono number, a canal-blue square button, and the "Sample data" label.
- The built `dist/` does not contain the MSW worker code (search the files for `msw`).
- The project is in Git and the GitHub workflow is green.

## Out of scope

No login, no real screens, no shared components beyond what the sample page needs.
