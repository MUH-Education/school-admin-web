# 6. API client and mock API

## Why there is a mock

The backend is being built at the same time. The mock lets the web app run today, alone, with sample data that looks like the designs.

Real-life picture: a shopkeeper is building a new shop. The cash machine has not arrived. He practises with a toy cash machine that has the same buttons. When the real one arrives, he already knows every step. The mock API is the toy cash machine.

The mock is **inside the browser**. A tool called MSW catches the app's network calls and answers them itself. No extra server runs.

## Two modes

| Command | Mode | Who answers `/api/v1/...` |
|---|---|---|
| `npm run dev` | mock | MSW, with sample data |
| `npm run dev:real` | real | the Spring Boot backend on `localhost:8080`, through the Vite proxy |

In mock mode a small label "Sample data" shows in the corner of the app.

The production build never contains the mock. Check this in Phase 10.

## The client (`src/api/client.ts`)

One function:

```ts
api<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T>
```

It does these things and nothing else:

1. Builds the URL: `VITE_API_BASE` + path.
2. Adds the token header when a token exists.
3. Sends JSON, reads JSON.
4. On a non-2xx answer, throws `ApiError { status, code, message, fields, retryAfterSeconds }` from the body `{ error, message, fields }`.
5. On 401 (not on the OTP URLs), tells the auth module to log out.
6. When there is no network, throws `ApiError` with `code: 'NETWORK'`.

Two special helpers next to it: `apiUpload(path, file)` for the photo and the import file, and `apiDownload(path)` for the CSV.

## Types

Each feature has `types.ts`. The names are the names in `docs/backend/api.md`.

```ts
// features/vehicles/types.ts
export type VehicleType = 'SMALL_VAN' | 'MID_BUS' | 'BIG_BUS';

export interface Vehicle {
  id: number;
  name: string;
  registrationNo: string;
  vehicleType: VehicleType;
  seats: number;
  monthlyCost: number;
  ownedBy: 'SCHOOL' | 'CONTRACTOR';
  active: boolean;
}
```

Words shown to the user for these codes live in one place per feature, for example `vehicleTypeLabel('SMALL_VAN') → 'Small van'`. Never show a code like `SMALL_VAN` on screen.

## Sample data (`src/mocks/data/`)

The sample data must match the designs, so a screen in mock mode looks like its design.

| Thing | Sample |
|---|---|
| Vehicles | 9: Van 1 to Van 7 (small van, 14 seats), Bus 8 and Bus 9 (mid bus, 26 seats), ₹30,300 a month each |
| Routes | 9, with the stops from `design/screens/Main.dc.html` |
| Children on buses | 255 in total. Route 4 has 19: Sadhanwas 5, Jakhal 7, Kanheri 4, Tohana town 3. |
| Staff | 9 drivers, 9 attendants, 1 free driver (Surender) |
| Users | one for each role: Sourabh (Owner), Neelam (Office admin), Jaswant (Transport in-charge), Priya (Admissions desk), Balwan (Attendant, Route 4) |
| Morning taps | the 7:48 picture from the Bus status design: 5 on the way, 2 reached school, Route 3 with no taps, Route 5 late by 16 minutes |
| Enquiries | 29 across the stages, 4 of them overdue |
| Fees | a mix of on time, delayed and defaulted |

All names are made up. All phone numbers are fake.

### Logging in to the mock

The mock accepts any registered sample phone with the code `000000`. The login page in mock mode shows a small list "Sample logins" with one button per role, so you can switch role in one click. This list is never in the production build.

The mock keeps "now" fixed at **7:48 am on Wednesday 7 October 2026**, so Bus status always looks like the design.

## What a mock handler must do

A handler is not only a fixed answer. It follows the rules of the contract, so the screens can be tested against wrong cases too.

| Rule | Example |
|---|---|
| Check the token and role | Admissions desk calls `GET /vehicles` → 403 |
| Check input | vehicle with 0 seats → 400 with `fields.seats` |
| Return the business errors | change driver to a busy person → 409 `STAFF_BUSY` |
| Change the in-memory data | after `POST /vehicles`, `GET /vehicles` includes it |
| Wait a little | answer after 150 to 400 ms, so loading states are visible |
| Paging and filters | `GET /students?village=Jakhal&page=1` filters and pages |

Add `?mockError=500` to the page URL to make every call fail once. This is how you look at error states by hand.

## The same handlers in tests

`src/mocks/server.ts` starts the same handlers in Node for Vitest. A page test can replace one handler to test one case:

```ts
server.use(http.get('/api/v1/vehicles', () => HttpResponse.json({ error: 'X', message: 'Boom' }, { status: 500 })));
```

(Check the MSW 3 docs for the exact import paths before writing this.)

## Switching a screen to the real backend

Do this at the end of each web phase, when the matching backend phase is done.

1. Start the backend with its dev data: `./gradlew bootRun` in the backend repo.
2. Start the web app with `npm run dev:real`.
3. Log in with a real phone number of the backend's dev data (the OTP is printed in the backend console).
4. Walk through every screen of the phase. Do every action once: list, open, add, change, a wrong input, a business error.
5. For every difference between mock and real (a field name, a missing field, a different error code), write one line in the phase file under "Differences found".
6. Decide each difference with the owner: fix the web app, or fix the backend and its doc. Then fix the mock too, so mock and real stay the same.

## When the backend document changes

1. Copy `docs/04-login-otp-jwt.md`, `05-roles-permissions.md`, `06-api.md` from the backend repo over the three files in `docs/backend/`.
2. Look at the Git diff of `docs/backend/`.
3. For each changed URL or field: update `types.ts`, the mock handler, the sample data, and the screens that use it.
4. Run all tests.

Never edit `docs/backend/` by hand to "make it fit".
