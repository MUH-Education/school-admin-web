# Phase 10 — Go live

## Goal

The web app runs on the real address against the real backend, with no mock inside, and real people can use it.

Do this phase once for the transport system (after Phases 5 and 6) and again after Phase 9.

## Read first

- `docs/08-decisions.md` → B16 and question C6 (where the files are served from)
- The backend repo's `docs/phases/phase-9-go-live.md`

## Tasks

### Nothing left on the mock

- [ ] 10.1 Every earlier phase has its "switch to the real backend" task ticked, and its "Differences found" list is empty or solved.
- [ ] 10.2 Run every Playwright flow once against the real backend on your laptop (`dev:real`), by hand or with a second Playwright config.
- [ ] 10.3 Copy the three backend docs into `docs/backend/` one more time. The Git diff must be empty.

### The build

- [ ] 10.4 `npm run build`. Search `dist/` for the word `msw` and for "Sample logins". Neither may be there.
- [ ] 10.5 Check the size: the first load of `/login` and `/trip` should be small enough for a slow phone. Write the numbers in `docs/08-decisions.md`. If `/trip` downloads admin code, fix the code splitting.
- [ ] 10.6 A version label (the Git commit, short) in the sidebar footer and on the attendant's Today page, so you can ask "which version do you see?".

### Serving the files

- [ ] 10.7 Default (B16): copy `dist/` into the backend's `src/main/resources/static/` during the backend build. Write the exact commands in `docs/deploy.md`.
- [ ] 10.8 The backend must answer every unknown non-API URL with `index.html`, so a reload on `/students/118` works. Ask for this in the backend repo if it is missing.
- [ ] 10.9 The site is only on HTTPS. The PWA does not install without it.
- [ ] 10.10 Cache rules: files with a hash in the name are cached for a year; `index.html` and the service worker file are never cached.

### Look and reach

- [ ] 10.11 Walk through all screens at 1440px, 1024px and 390px width. Nothing overlaps, no page scrolls sideways, every table scrolls inside its box.
- [ ] 10.12 Walk through all screens with the keyboard only. Every button and input can be reached and used; focus is always visible; dialogs keep focus inside.
- [ ] 10.13 Check text contrast on every screen with the browser's accessibility tools.
- [ ] 10.14 Final design pass: open each screen next to its file in `design/screens/` and list every difference. Fix or write down why it differs.

### Watching for trouble

- [ ] 10.15 Error tracking (for example Sentry) for JavaScript errors. Do not send phone numbers or names to it.
- [ ] 10.16 An "Update available" notice also for the admin web app when a new version is deployed.

### Real people

- [ ] 10.17 Install the attendant app on every attendant's phone: open the link in Chrome, "Add to Home screen", log in. 10 minutes per person.
- [ ] 10.18 Teach each attendant with one practice trip in the school yard, using the real app and three teachers as "children".
- [ ] 10.19 Sit with the office clerk for one morning while she uses Bus status and Students. Write down every place she stops or asks.
- [ ] 10.20 Fix what 10.18 and 10.19 found before all routes start.

## Done when

- The real address shows the login page on HTTPS, and no sample data anywhere.
- An attendant's phone opens the app from the home screen in flight mode.
- A reload on any admin URL works.
- Every item of 10.11 to 10.14 is done and written down.
- One real trip was recorded on a real phone and seen on Bus status in the office.

## Out of scope

- A Play Store app.
- Support for old browsers. Chrome on Android and a current Chrome, Edge or Firefox on the laptop are enough.
- A second language for the admin web app.
