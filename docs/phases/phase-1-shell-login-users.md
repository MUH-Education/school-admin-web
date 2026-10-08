# Phase 1 — Shell, login, users

## Goal

A person can log in with a phone number and a code, sees a sidebar with only the pages their role allows, and the owner can manage users on the Users and roles screen.

This phase also builds most of the shared components. Later phases reuse them.

## Screens

| Screen | Design |
|---|---|
| Login `/login` | none. Look of `MobileLogin.dc.html`, fields for phone and OTP. |
| Admin shell (sidebar + content) | the sidebar in any admin design, for example `Roles.dc.html` |
| Users and roles `/users` | `Roles.dc.html` |
| "You cannot open this page", "Page not found" | none, plain |

## Read first

- `docs/05-auth-permissions.md` (all of it)
- `docs/backend/login-otp-jwt.md`
- `docs/backend/roles-permissions.md`
- `docs/03-design-system.md` → Shared components
- `.claude/rules/design.md`

## API used

`POST /auth/otp/request`, `POST /auth/otp/verify`, `GET /auth/me`, `POST /auth/logout`, `GET /users`, `POST /users`, `PUT /users/{id}`, `GET /roles`, `GET /staff` (only the attendants, for the add-user dialog).

## Behaviour

1. Login is two steps on one page. The first step never says whether a number is registered.
2. The resend link counts down from 60 seconds.
3. After login the user lands on their first allowed page; an attendant lands on `/trip` (a placeholder page until Phase 5).
4. The sidebar shows only allowed items. A group with no items is hidden.
5. A typed URL without permission shows the "cannot open" page.
6. A 401 on any call logs the user out and brings them back to the same URL after login.
7. Users and roles: the role table comes from `GET /roles`, not from text in the code.
8. Add user asks for phone and role only. Name is optional. Role Attendant also asks which attendant (a staff member).
9. Turning a user off asks "Turn off Kuldeep's login?" first.
10. Server errors `PHONE_ALREADY_USED`, `LAST_OWNER`, `CANNOT_DISABLE_SELF` are shown in the dialog with the server's message.

## Tasks

Mock first:

- [ ] 1.1 Types for auth and users (`User`, `Role`, `Permission`, `LoginResponse`).
- [ ] 1.2 Mock data: the five sample users from `docs/06-api-and-mocks.md`, and the role table.
- [ ] 1.3 Mock handlers for the nine calls above, with the rules: code `000000`, role checks, the three business errors.

Shared components (`src/ui/`), each with a small test:

- [ ] 1.4 `Button`, `LinkButton` (all variants and the "Saving…" state).
- [ ] 1.5 `Field`, `TextInput`, `PhoneInput`, `Select`.
- [ ] 1.6 `Panel`, `PageHeader`, `Breadcrumb`.
- [ ] 1.7 `DataTable`, `StatusDot`.
- [ ] 1.8 `LoadingBlock`, `ErrorState`, `EmptyState`.
- [ ] 1.9 `Dialog`, `ConfirmDialog`, `Toast` (with focus kept inside an open dialog and Escape to close).

Auth:

- [ ] 1.10 Token storage, `AuthProvider`, `useAuth()`, `usePermissions().can()`.
- [ ] 1.11 `LoginPage` with both steps, the countdown, the four error messages, and the "Sample logins" list in mock mode.
- [ ] 1.12 `RequireLogin`, `RequirePermission`, the "cannot open" page, the landing rule.
- [ ] 1.13 401 handling in the client: log out, remember the URL, return after login.

Shell:

- [ ] 1.14 `Sidebar` and `AdminShell` exactly as in the designs, with the menu-by-permission table from `docs/05-auth-permissions.md`. The sidebar moves above the content on a narrow screen.
- [ ] 1.15 All admin routes exist in the router with their permission and a placeholder page ("Coming in phase N").

Users and roles:

- [ ] 1.16 Role table from `GET /roles` (Full, View, dash) as in the design.
- [ ] 1.17 "The menu each person sees" block.
- [ ] 1.18 Users table from `GET /users`.
- [ ] 1.19 Add user dialog and edit user dialog (behaviour 8 to 10).

Finish:

- [ ] 1.20 Playwright flow: log in as the owner, add a user with phone and role, see them in the table, log out.
- [ ] 1.21 **Switch to the real backend** (needs backend Phase 1 done). Follow "Switching a screen to the real backend" in `docs/06-api-and-mocks.md`. Write what you find under "Differences found".

## Tests that must pass

Everything listed under "Tests that prove it works" in `docs/05-auth-permissions.md`, and:

- `usersPageShowsRoleTableFromTheApi`
- `addUserNeedsOnlyPhoneAndRole`
- `attendantRoleAsksForAStaffMember`
- `duplicatePhoneShowsTheServerMessageInTheDialog`
- `turningOffAUserAsksFirst`
- `officeAdminDoesNotSeeUsersInTheMenu`
- Each shared component: renders, is reachable by keyboard, has the right role and label.

## Done when

- In mock mode you can log in as each of the five sample roles and each sees the right menu.
- The Users and roles screen, side by side with `Roles.dc.html`, looks the same (apart from the sample names).
- After task 1.21: you log in against the real backend with your own phone number, reading the code from the backend console.
- `/check-phase 1` passes.

## Differences found

(Fill this in during task 1.21.)

## Out of scope

- Any other screen. They are placeholders.
- A password or "remember me" option.
- Editing which role has which permission.
