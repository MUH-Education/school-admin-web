# 2. Architecture

## Folders

```
school-admin-web/
├── index.html
├── vite.config.ts
├── public/                    icons, manifest images, MSW worker file
├── e2e/                       Playwright flows
└── src/
    ├── main.tsx               starts React, starts the mock when needed
    ├── app/
    │   ├── router.tsx         every URL of the app
    │   ├── providers.tsx      QueryClient, auth, toasts
    │   ├── AdminShell.tsx     sidebar + content area
    │   └── guards.tsx         RequireLogin, RequirePermission
    ├── api/
    │   ├── client.ts          the one place that calls fetch
    │   ├── errors.ts          ApiError
    │   └── types.ts           Page<T> and other shared shapes
    ├── auth/                  login pages, token, useAuth(), can()
    ├── ui/                    shared components (Button, Field, DataTable, Tile, ...)
    ├── lib/                   formatInr, formatDate, formatTime, maskPhone
    ├── styles/index.css       Tailwind import and the design tokens
    ├── features/
    │   ├── users/             Users and roles
    │   ├── vehicles/          Vehicles and staff, One vehicle
    │   ├── routes/            Routes and load
    │   ├── students/          Students, One student
    │   ├── admissions/        New admission
    │   ├── busStatus/         Bus status, One bus
    │   ├── messages/          Messages
    │   ├── enquiries/         Enquiry list, Add an enquiry, One enquiry
    │   ├── fees/              fee boxes and payment dialog
    │   └── analytics/         Analytics
    ├── attendant/             the phone app (pages, offline queue, sync)
    ├── i18n/                  hi.json, en.json, setup
    └── mocks/                 MSW handlers and sample data
```

Inside one feature:

```
features/vehicles/
├── types.ts            Vehicle, VehicleDocument, Assignment  (match docs/backend/api.md)
├── api.ts              useVehicles(), useVehicle(id), useCreateVehicle(), ...
├── pages/
│   ├── VehiclesPage.tsx
│   └── VehicleDetailPage.tsx
└── components/
    ├── PapersForm.tsx
    └── ChangeAssignmentForm.tsx
```

Rule: a feature does not import another feature's pages or components. If two features need the same thing, it moves to `src/ui/` or `src/lib/`.

## The three kinds of state

| Kind | Example | Where it lives |
|---|---|---|
| Data from the server | the vehicle list | TanStack Query cache |
| What the URL says | page 3 of students, filter "Jakhal" | the URL (`?page=3&village=Jakhal`) |
| Small screen state | is the "Add a phone number" form open | `useState` in that component |

There is no global store. If you feel you need Redux, the data probably belongs in one of the first two rows.

Why filters live in the URL: the owner filters Analytics to "Jakhal, Delayed" and sends the link to the clerk. She opens it and sees the same thing.

## Routing

React Router in data mode. All routes are in `src/app/router.tsx`. The exact list is in `docs/04-screens.md`.

```
/login                          open
/                               sends you to your first page (attendant → /trip)
(AdminShell, needs login)
  /bus-status                   BUS_STATUS_VIEW
  /bus-status/routes/:routeId   BUS_STATUS_VIEW
  /routes                       ROUTES_VIEW
  /vehicles                     VEHICLES_VIEW
  /vehicles/new                 VEHICLES_EDIT
  /vehicles/:id                 VEHICLES_VIEW
  /students                     STUDENTS_VIEW
  /students/:id                 STUDENTS_VIEW
  /admissions/new               ADMISSIONS_CREATE
  /enquiries                    ENQUIRIES_VIEW
  /enquiries/new                ENQUIRIES_EDIT
  /enquiries/:id                ENQUIRIES_VIEW
  /messages                     MESSAGES_VIEW
  /analytics                    ANALYTICS_VIEW
  /users                        USERS_MANAGE
  /settings/fees                SETTINGS_EDIT   (added in phase 8)
(AttendantShell, needs login)
  /trip                         TRIPS_RECORD
  /trip/pickup  /trip/school  /trip/evening  /trip/drop
```

- Each page is loaded lazily (its own chunk). The attendant never downloads admin code.
- A route without the needed permission shows a plain "You cannot open this page" page with a link home. It does not show a broken screen.
- An unknown URL shows "Page not found".

## Getting data

```
Page component
   └─ useVehicles()                    (features/vehicles/api.ts)
        └─ useQuery({ queryKey: ['vehicles'], queryFn: () => api('GET', '/vehicles') })
             └─ api()                  (src/api/client.ts)
                  └─ fetch('/api/v1/vehicles', Authorization: Bearer ...)
```

Defaults for the QueryClient:

| Setting | Value | Why |
|---|---|---|
| `staleTime` | 30 seconds | The office does not need fresher data for lists |
| retry | 1 time, never for 4xx | A 403 will not get better by asking again |
| refetch on window focus | on | Coming back to the tab shows fresh data |

Bus status asks again every 30 seconds (`refetchInterval`) while its tab is visible.

## Saving data

- Writes use `useMutation`. While saving, the button shows "Saving…" and is off.
- On success: invalidate the right queries, show a short toast ("Vehicle saved"), and close the form or go to the next page.
- On failure: keep the form open with what the user typed. Show the server's `message`. For a validation error (400 with `fields`), put each message under its input.
- A warning from the server is not an error. Example: the bus change answer carries `warning: ROUTE_FULL`. Save succeeded; show the warning in an amber box.

## Errors

`ApiError` has `status`, `code`, `message`, `fields`.

| Case | What the user sees |
|---|---|
| 400 with `fields` | Messages under the inputs |
| 401 | Sent to the login page. After login, back to where they were. |
| 403 | "You cannot do this." Nothing changes. |
| 404 | "Not found" inside the page, with a link back to the list |
| 409 | The server's message in a red box near the button. Example: "Rajpal drives Van 1 on these days." |
| 429 | The server's message and a countdown if `retryAfterSeconds` is given |
| No network | "No connection. Check the internet and try again." with a Retry button |
| Anything else | "Something went wrong. Try again." The details go to the error tracker, not to the user. |

One `ErrorBoundary` at the top catches crashes and shows a reload button.

## Forms

- React Hook Form + a Zod schema per form.
- Check on the client what is cheap to check: required, 10-digit phone, number above 0, date order. The server checks again.
- Phone inputs accept `98123 45678`, `09812345678`, `+91 98123 45678`. Send what the user typed; the server normalizes.
- Money inputs show Indian grouping as you type and send a plain number.
- Leaving a form with unsaved changes asks "Leave without saving?".

## Formats (`src/lib/format.ts`)

| Function | Input | Output |
|---|---|---|
| `formatInr(867900)` | number | `₹8,67,900` |
| `formatInr(-174460)` | number | `−₹1,74,460` |
| `formatDate('2026-10-07')` | ISO date | `7 Oct 2026` |
| `formatTime('2026-10-07T07:42:10+05:30')` | ISO time | `7:42` |
| `formatLoad(1.357)` | number | `1.36×` |
| `daysFromToday('2026-10-28')` | ISO date | `21` |

All in the zone `Asia/Kolkata`, whatever the laptop's zone is.

## Environment

| Variable | Values | Meaning |
|---|---|---|
| `VITE_API_MODE` | `mock` (default), `real` | Use the mock API or the real backend |
| `VITE_API_BASE` | `/api/v1` | Base path |

In development, Vite proxies `/api` to `http://localhost:8080`, so the browser sees one address and there is no CORS problem.

## Build and deploy

`npm run build` makes static files in `dist/`. Two ways to serve them (decide in Phase 10):

1. Copy `dist/` into the Spring Boot jar's `static` folder. One address, one deploy, no CORS.
2. Put `dist/` on a static host and point `/api` to the backend.

Option 1 is the default in this plan.
