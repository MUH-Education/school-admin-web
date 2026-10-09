Analytics (web phase 9). Built on the mock API first. Screen: `/analytics`, permission `ANALYTICS_VIEW`.

- `types.ts`: the six filters (`AnalyticsFilters`), the table state, and the six answers (a guess, see `docs/08-decisions.md` part D).
- `useAnalyticsFilters.ts`: reads the six filters, the sort and the page from the address. The ONE filter object. Unknown words in a hand-made link are read as "not set". `clear()` empties the six filters and keeps the sort.
- `api.ts`: `analyticsQuery()` (the API names: `sessionId`, `className`, `village`, `routeId` or `bus`, `occupation`, `feeStatus`), one hook per call (all get the same filter object and keep the old data while loading), and `useDownloadStudents()`.
- `axis.ts`: the top line of the class chart rounds up to a multiple of 10.
- `components/`: `AnalyticsFilterBar` (six selects and "Showing 37 of 290 students."), `SummaryTiles`, `ChartPanel` (box, four states, fade), the four chart boxes, `StudentsListSection` (table, sort, paging).
- Charts have no library (decision B6): `BarColumns`, `StackedBar`, `BarList` and `ChartLegend` in `src/ui/`. Every bar has a `title` with its exact value.
- Rules: while a new filter loads, the old numbers stay, a little faded; boxes keep their height; "No students match these filters" replaces a chart at the same height.
- The count line, the Students tile, the class bars and the table total are always the same number (tests in `AnalyticsTable.test.tsx`).
- Download: `apiFile()` in `src/api/client.ts` sends the token in the header; the file is saved under the server's name (mock: `students-2026-10-07.csv`), with a byte order mark so Excel reads the names.
- Not built: the "student average graph" (question C4 has no answer), comparing sessions, printing charts, saved filter sets.
- Task 9.13 (switch to the real backend) is open.
