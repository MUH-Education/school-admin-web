# 5. Login and permissions in the web app

The backend rules are in `docs/backend/login-otp-jwt.md` and `docs/backend/roles-permissions.md`. This file says what the React app does with them.

## The login page

One page, `/login`, for everyone. Two steps. No password field anywhere.

**Step 1: phone**

- One input: "Mobile number", and the button "Send code".
- Check in the browser: 10 digits after removing spaces, `+91` or a leading `0`.
- Call `POST /auth/otp/request`.
- The answer is always the same message, also for an unknown number. So always go to step 2 and say: "If this number is registered, a code was sent on WhatsApp or SMS."

**Step 2: code**

- Six boxes or one input for 6 digits (`inputmode="numeric"`, `autocomplete="one-time-code"`), and the button "Log in".
- Under it: "Send the code again" with a countdown from `resendAfterSeconds` (60). The link is off until the countdown ends.
- "Change number" goes back to step 1.
- Call `POST /auth/otp/verify`.

Example: Neelam types `98123 40002`, presses "Send code", reads `482913` on WhatsApp, types it, presses "Log in". She lands on Bus status.

**Messages for errors**

| `error` from the server | Show |
|---|---|
| `VALIDATION` | "Enter a 10-digit mobile number." |
| `OTP_INVALID` | "The code is wrong or too old. Try again or send a new code." |
| `OTP_LOCKED` | "Too many wrong tries. Send a new code." Clear the input. |
| `OTP_TOO_MANY_REQUESTS` | "Please wait before asking again." with a countdown from `retryAfterSeconds` |

**Look**

There is no web design for login. Use the look of `design/screens/MobileLogin.dc.html`: a dark `ink` block on top with the school name, then the form on `paper`. On a laptop, show it as a centred column 420px wide. On a phone it fills the screen. The attendant sees it in Hindi, because the language choice is remembered on the phone; the first time it is English with a "हिंदी" button in the top corner.

## The token

- The login answer has `token`, `expiresAt` and `user`.
- Save the token in `localStorage` under one key. Reason: the attendant must stay logged in for 30 days, also after closing the browser.
- Keep `user` in memory (the auth context). On app start with a saved token, call `GET /auth/me` to get it again.
- Every API call sends `Authorization: Bearer <token>`.
- A 401 from any call (except the two OTP calls): delete the token, remember the current URL, go to `/login`. After login, go back to that URL.
- "Log out" calls `POST /auth/logout`, deletes the token, clears the query cache, goes to `/login`.
- The attendant's unsent taps are **not** deleted on logout or on 401. See `docs/07-attendant-offline.md`.

Because the token sits in `localStorage`, the app must never put text from the server into the page as HTML. React does this safely by default. Never use `dangerouslySetInnerHTML`.

## `useAuth()` and `can()`

```ts
const { user, isLoading, logout } = useAuth();
const { can } = usePermissions();

can('VEHICLES_EDIT')   // true or false, from user.permissions
```

- `user.permissions` comes from the server. The web app has **no copy** of the role table. If the backend gives a role a new permission, the web app follows without a code change.
- Use `can()` for three things only: menu items, route guards, and showing or hiding buttons.

## The menu by permission

| Menu item | Shown when the user has |
|---|---|
| Bus status | `BUS_STATUS_VIEW` |
| Routes and load | `ROUTES_VIEW` |
| Vehicles and staff | `VEHICLES_VIEW` |
| Messages | `MESSAGES_VIEW` |
| Enquiries | `ENQUIRIES_VIEW` |
| New admission | `ADMISSIONS_CREATE` |
| Students | `STUDENTS_VIEW` |
| Analytics | `ANALYTICS_VIEW` |
| Users and roles | `USERS_MANAGE` |
| Fee setup (added in phase 8) | `SETTINGS_EDIT` |

A group heading (Transport, Admissions, Reports, Settings) is hidden when all its items are hidden.

Examples, matching the "Users and roles" design:
- Priya (Admissions desk) sees: Enquiries, New admission, Students, Analytics.
- Jaswant (Transport in-charge) sees: Bus status, Routes and load, Vehicles and staff, Messages, Students.
- Balwan (Attendant) sees no sidebar. He is sent to `/trip`.

## Where a user lands after login

1. Has `TRIPS_RECORD` and no other page permission → `/trip`.
2. Else the first menu item they may open, top to bottom.

## Guards

- `RequireLogin` wraps everything except `/login`. No user → `/login`.
- `RequirePermission permission="VEHICLES_VIEW"` wraps a route. Without it → the "You cannot open this page" page.
- An attendant who types `/students` gets that page. An office user who types `/trip` gets it too.

## View-only users

Some roles may see a page but not change it. Example: Office admin has `VEHICLES_VIEW` but not `VEHICLES_EDIT`.

- Hide the buttons that change things ("Add a vehicle", "Change driver", "Save").
- Show form values as plain text, not as disabled inputs. Disabled inputs look broken.
- If the server still answers 403 (for example the role changed a minute ago), show "You cannot do this" and refresh `GET /auth/me`.

## Tests that prove it works

- Typing a phone and a right code logs in and lands on the right first page for each of the five roles.
- A wrong code shows the `OTP_INVALID` message and keeps the user on step 2.
- The resend link is off for 60 seconds.
- With a saved token, a reload does not show the login page.
- A 401 on any call sends the user to `/login` and back after login.
- Each role sees exactly the menu items in the table above.
- A role without the permission gets the "cannot open" page on a typed URL.
- A view-only role sees no change buttons on Vehicles and staff.
