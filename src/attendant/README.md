The phone app: pages, offline queue, sync. Built in Phase 5. Read `docs/07-attendant-offline.md` first.

| File                        | What it does                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `types.ts`                  | Manifest, Tap, MarkResult, MyRoute                                                  |
| `phoneDb.ts`, `tapStore.ts` | IndexedDB (`idb`): `manifest`, `tapQueue`, `tapProblems`, `session`                 |
| `tap.ts`                    | `addTap`: builds the tap with the phone's time and writes it, then tells the screen |
| `viewState.ts`              | The saved manifest with the queue on top; the counts of the four jobs               |
| `sync.ts`, `useSync.ts`     | The send loop (one run at a time) and when it starts                                |
| `localState.ts`             | A copy of IndexedDB in memory that the screens read                                 |
| `day.ts`                    | Makes sure today's list is on the phone (new day, no route, no network)             |
| `components/`               | Shell, header, sending strip, child row, stop lines, dialogs                        |
| `pages/`                    | Today, Pickup, School, Evening, Drop and the layout around them                     |
