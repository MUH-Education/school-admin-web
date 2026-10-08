# 7. The attendant app: Hindi, offline, install

## The person and the place

Balwan is the attendant of Route 4. He stands in a moving van with 19 children. His phone is a cheap Android. Half the villages have no signal. He is not a computer user.

So the app must be: **big, simple, in Hindi, and never lose a tap.**

## The five screens

| URL | Design | What he does |
|---|---|---|
| `/trip` | `MobileToday.dc.html` | Sees the four jobs of the day and opens the next one |
| `/trip/pickup` | `MobilePickup.dc.html` | Morning: taps "चढ़ गए" or "नहीं आए" for each child, stop by stop |
| `/trip/school` | `MobileSchool.dc.html` | One big button: "all 17 children got off at school" |
| `/trip/evening` | `MobileEvening.dc.html` | Evening: taps each child who boards. Sees who is missing. |
| `/trip/drop` | `MobileDrop.dc.html` | Taps "उतर गए" as each child gets off |

`MobileOffline.dc.html` is not a page. It shows how the pickup page looks with no signal.

## Data he needs

At the start of the day, with signal, the app loads **one thing**: the manifest.

`GET /trips/manifest?routeId=4&date=2026-10-07` → stops in order, children at each stop, taps so far.

The app saves the manifest in IndexedDB. After that, all five screens work from the saved copy plus the tap queue. No screen needs the network to open.

## A tap, step by step

Example: Balwan taps "चढ़ गए" for Aryan at 7:42, with no signal.

1. Build the tap: `{ id: <random>, studentId: 118, eventType: 'BOARDED_MORNING', outcome: 'DONE', serviceDate: '2026-10-07', occurredAt: '2026-10-07T07:42:10+05:30' }`.
2. **Write it to IndexedDB** (store `tapQueue`). Wait until the write is finished.
3. Only then change the screen: the row turns green, the count goes from 10 to 11.
4. Ask the sync loop to run.
5. No signal → nothing is sent. The strip turns amber: "1 टैप फ़ोन में सेव है".
6. 7:55, signal returns → the loop sends all waiting taps in one `POST /trips/marks`.
7. The server answers `ok: true` for each → delete those taps from `tapQueue`. The strip turns green.

What the row shows is always: **the manifest's saved state, with the queue's taps on top.** So a tap shows at once, sent or not.

## The sync loop

Runs when: a tap is added, the phone comes online (`online` event), the app comes to the front, and every 20 seconds while taps are waiting.

1. If no token or no network → stop.
2. Take all taps from `tapQueue`, oldest first, at most 100.
3. `POST /trips/marks`.
4. For each result:
   - `ok: true` → delete the tap from the queue and update the saved manifest.
   - `ok: false` → move the tap to a second store, `tapProblems`, with the error code. Do not send it again.
5. Network error or 5xx → keep the taps, try again later.
6. 401 → keep the taps, go to login. After login the loop runs again.

Only one loop runs at a time.

## When the server refuses a tap

Rare, but it must be visible. Example: the office moved a child to another route at noon; the evening tap is refused with `NOT_YOUR_ROUTE`.

Show a red line under the strip: "1 टैप ऑफ़िस ने नहीं लिया। ऑफ़िस को बताएँ।" with a button that lists the child and the reason in simple Hindi. The attendant can clear the list after reading it.

## Undo and change

- Tapping the same button again removes the answer. This adds a tap with `outcome: 'CLEARED'` to the queue.
- Tapping the other button changes the answer. This adds a new tap with a later time. The server keeps the newest one.
- If the first tap is still in the queue (not sent yet), replace it in the queue. Do not send both.

## The five rules of each screen

**Today (`/trip`)** — shows the count for each job from the saved manifest and queue. The job that should be done now has the blue border. "ऑफ़िस को फ़ोन करें" is a `tel:` link.

**Morning pickup** — the stop that has children without an answer is open. Stops before it are one grey line each ("✓ साधनवास · 5 चढ़े · 7:26"). The bottom button goes to the next stop. After the last stop it goes to "Reached school".

**Reached school** — the big button adds one `REACHED_SCHOOL` tap for every child who boarded in the morning. It asks once: "17 बच्चे स्कूल में उतर गए?" with हाँ / नहीं. This is the only confirm in the app, because one press sends many SMS. "एक-एक बच्चे का नाम देखें" opens the list to tap one by one.

**Evening boarding** — lists the children who came in the morning. Those without an evening answer are on top under the red banner "N बच्चे अभी बस में नहीं हैं". Answers: "चढ़ गए" or "नहीं जाएँगे" (`NOT_TRAVELLING`). The bottom button is off, with the text "बस चलाने से पहले N का जवाब दें", until N is 0.

**Home drop** — stops in evening order (the morning order reversed). One button per child: "उतर गए". "इस स्टॉप के सब बच्चे उतर गए" marks all children of the stop.

## The sending strip

| State | Colour | Text |
|---|---|---|
| Nothing waiting, online | green | सब जानकारी ऑफ़िस पहुँच गई |
| Taps waiting, online, sending | amber | N टैप भेज रहे हैं… |
| Taps waiting, offline | amber, big banner | नेटवर्क नहीं है · N टैप फ़ोन में सेव हैं। नेटवर्क आते ही अपने आप चले जाएँगे। |
| Problems | red line | N टैप ऑफ़िस ने नहीं लिया |

## A new day

- The manifest belongs to one date. At the first open after midnight, load the new day's manifest.
- Yesterday's unsent taps stay in the queue and are still sent. The server accepts yesterday.
- If the new manifest cannot be loaded (no signal in the morning), show yesterday's list of children with a clear banner "आज की सूची नहीं आई। नेटवर्क में जाकर दोबारा खोलें।" and allow tapping. The server will refuse a tap only if the child left the route.

## No route today

`GET /trips/my-route` returns no route (the attendant is not on any vehicle today). Show one message: "आज आपके नाम कोई रूट नहीं है। ऑफ़िस को फ़ोन करें।" and the call button.

## Installing on the phone (PWA)

- `vite-plugin-pwa` makes the service worker and the web app manifest.
- The service worker keeps the app's own files (HTML, JS, CSS, fonts, icons) on the phone, so the app opens with no signal.
- It does **not** cache API answers. The app's own IndexedDB code handles data.
- App name on the home screen: "स्कूल बस". Start URL `/trip`. Display `standalone`. Theme colour `ink`.
- When a new version is ready, show a small bar "नया वर्ज़न आ गया · अभी लें". Never reload by itself in the middle of a trip.
- First install is done once by the office: open the link in Chrome, "Add to Home screen", log in.

## Hindi and English

- `src/i18n/hi.json` and `en.json` hold every text of the attendant app and the login page.
- Default is Hindi on `/trip/...`. A small button switches to English. The choice is saved on the phone.
- Numbers and times stay in Latin digits (7:42, 11 / 19), as in the designs.
- Counts use i18next plural forms only where Hindi really changes.

## What is stored on the phone

| Where | What | Until |
|---|---|---|
| `localStorage` | login token, language | logout |
| IndexedDB `manifest` | today's manifest | replaced next day |
| IndexedDB `tapQueue` | taps not yet confirmed | the server confirms each |
| IndexedDB `tapProblems` | taps the server refused | the attendant clears the list |

No parents' phone numbers. No photos.

## Tests that prove it works

Unit (Vitest):
- A tap is in `tapQueue` before the UI state changes.
- The view is "manifest + queue": an unsent tap shows as answered.
- A second tap on the same button queues `CLEARED`, or removes the first tap if it was not sent.
- The loop deletes only taps with `ok: true`.
- A refused tap goes to `tapProblems` and is not sent again.
- A network error keeps every tap.
- The evening button is off while any child has no answer.

Full flow (Playwright, against the mock):
- Go offline, tap 5 children, close and reopen the app: 5 answers are still shown, the strip is amber with "5".
- Go online: within 20 seconds the strip is green and the mock has 5 taps with the original times.
- Log in as the Route 4 attendant, type `/students`: the "cannot open" page.
