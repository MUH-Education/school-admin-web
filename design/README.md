# Design files

These are the approved screens, exported from the design canvas "School Admin Web App — Screens". One file per screen.

## How to read a file

- Each file is plain HTML. Every element has an inline `style="..."` with the exact colour, size and spacing. That is the information you need.
- The files do **not** open correctly in a browser by themselves. They need the design tool's runtime (`support.js`), which is not here. Read them as text.
- Some files end with a small script (`class Component extends DCLogic`). It holds the sample rows for lists drawn with `<sc-for>`. Read it to see the sample data and how colours depend on status.
- `{{name}}` in the markup is a placeholder filled from that script.

If you want pictures too: open the design canvas, export each screen as PNG, and put the images in `design/images/` with the same names. Pictures help, but the HTML has the exact numbers.

## The files

### Admin web app (laptop, width 1440)

| File | Screen | App URL |
|---|---|---|
| `Main.dc.html` | 1. Bus status | `/bus-status` |
| `BusDetail.dc.html` | 2. One bus (Route 4) | `/bus-status/routes/:routeId` |
| `RoutesLoad.dc.html` | 3. Routes and load | `/routes` |
| `Enquiries.dc.html` | 4. Enquiry list | `/enquiries` |
| `AddEnquiry.dc.html` | 5. Add an enquiry | `/enquiries/new` |
| `Admission.dc.html` | 6. New admission | `/admissions/new` |
| `Analytics.dc.html` | 7. Analytics | `/analytics` |
| `Roles.dc.html` | 8. Users and roles | `/users` |
| `Students.dc.html` | 9. Students | `/students` |
| `StudentProfile.dc.html` | 10. One student | `/students/:id` |
| `Vehicles.dc.html` | 11. Vehicles and staff | `/vehicles` |
| `VehicleDetail.dc.html` | 12. One vehicle (Van 4) | `/vehicles/:id` |

### Attendant app (phone, 390 × 844, Hindi)

| File | Screen | App URL |
|---|---|---|
| `MobileLogin.dc.html` | M1. Login — **old: shows username and password** | `/login` |
| `MobileToday.dc.html` | M2. Today's four jobs | `/trip` |
| `MobilePickup.dc.html` | M3. Morning pickup | `/trip/pickup` |
| `MobileOffline.dc.html` | M4. No network (a state, not a page) | — |
| `MobileSchool.dc.html` | M5. Reached school | `/trip/school` |
| `MobileEvening.dc.html` | M6. Evening boarding | `/trip/evening` |
| `MobileDrop.dc.html` | M7. Home drop | `/trip/drop` |

## Known differences between the designs and the app

| Design shows | App does | Why |
|---|---|---|
| M1 login with username and password | Phone number, then a 6-digit code | The owner chose OTP login after the design was made |
| "Save as draft" on New admission | No such button | The backend has no drafts |
| "Call attendant" buttons on Bus status | Shown only when the API gives the attendant's phone | Not in the API yet |
| Sidebar on every admin design shows all items | Items depend on the user's permissions | The designs are drawn as the owner |
| The same sidebar repeated in each file | One `Sidebar` component | Designs are flat files |
| Transport box open on One student | Closed until "Change" is pressed | The design shows the edit state |
| "Add a phone number" form open | Closed until the button is pressed | The design shows the edit state |
| "Change the driver" form open on One vehicle | Closed until "Change driver" is pressed | The design shows the edit state |
| Sample names, numbers, dates | Data from the API or the mock | — |

## Screens with no design

Login (web), Messages, One enquiry, Fee setup, and the small dialogs (Add user, Add a person, Record a payment, Import students). Build them from the shared components in `docs/03-design-system.md`. Keep them plain. Do not invent a new look.
