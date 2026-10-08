# Phase 9 — Analytics

## Goal

The owner picks filters and sees tiles, four charts and a list of students with fee status, and can download the list.

## Screens

| Screen | Design |
|---|---|
| Analytics `/analytics` | `Analytics.dc.html` |

## Read first

- `docs/04-screens.md` → screen 7
- `docs/03-design-system.md` → chart colours, `BarColumns`, `StackedBar`, `BarList`
- `docs/backend/api.md` → Analytics

## API used

`GET /analytics/summary`, `/analytics/fee-collection-by-month`, `/analytics/payment-by-occupation`, `/analytics/students-by-class`, `/analytics/students-by-village`, `/analytics/students`, `/analytics/students.csv`, plus `GET /sessions` and `GET /routes` for the filter lists.

## Behaviour

1. **One filter object.** The six filters (session, class, village, bus route, father's occupation, fee payment) live in the URL. One hook, `useAnalyticsFilters()`, reads them. Every query gets the same object.
   Example: `/analytics?village=Jakhal&feeStatus=DELAYED` shows only late payers from Jakhal in every tile, chart and row.
2. Under the filters: "Showing 37 of 290 students." and "Clear filters" when any filter is set.
3. **Changing a filter** keeps the old numbers on screen, slightly faded, until the new ones arrive. Charts keep their height. Nothing jumps.
4. **Tiles:** students; using the bus with %; school fee collected %; bus fee collected %; fee pending (red).
5. **Chart 1, fee collected each month:** two bars per month, side by side: school fee (`chart-1`) and bus fee (`chart-2`). Y axis 0%, 50%, 100% with thin grid lines. A legend. One sentence under the chart with the newest month's two numbers.
6. **Chart 2, fee payment by father's occupation:** one stacked bar per occupation: on time, delayed, defaulted (`chart-1`, `chart-2`, `chart-3`), 2px gaps between parts. On the right of each name: "82 students · 56% on time". A legend.
7. **Chart 3, students in each class:** 15 bars in class order, one colour, Y axis 0, 15, 30 (the top value rounds up from the data). A sentence with the biggest and smallest class.
8. **Chart 4, students by village:** horizontal bars, biggest first, top 8, the number at the end of each bar, and "The other 76 villages have 110 students together."
9. **Chart rules:** bars start at zero. Text is `ink` or `ink-soft`, never the bar's colour. Every bar has a `title` with its exact value. No number printed on every bar of charts 1 and 3. An empty result shows "No students match these filters" in place of the chart, at the same height.
10. **Table:** student, class, village, father's occupation, bus, school fee status, bus fee status, pending. Sort by name, class or pending by clicking the column name; the sort is in the URL. 25 per page.
11. **Download as Excel:** fetch `/analytics/students.csv` with the same filters and the token in the header, then save the file as `students-2026-10-07.csv`. While it downloads the button says "Preparing…".
12. A role without `ANALYTICS_VIEW` cannot open the page.

## Tasks

- [ ] 9.1 Types for the six answers and `AnalyticsFilters`.
- [ ] 9.2 Mock data and handlers. The mock really filters its sample students, so the numbers change when a filter changes.
- [ ] 9.3 `useAnalyticsFilters()` and the `FilterBar` with the six selects (behaviour 1, 2).
- [ ] 9.4 `BarColumns` (grouped and single), with axis and grid (used by charts 1 and 3).
- [ ] 9.5 `StackedBar` (chart 2).
- [ ] 9.6 `BarList` (chart 4).
- [ ] 9.7 API hooks with "keep previous data while loading" (behaviour 3).
- [ ] 9.8 Tiles and the four chart panels (behaviour 4 to 9).
- [ ] 9.9 The table with sorting and paging (behaviour 10).
- [ ] 9.10 The download (behaviour 11).
- [ ] 9.11 If backend question C4 ("student average graph") was answered and the backend added an endpoint, add that chart here.
- [ ] 9.12 Playwright flow: open Analytics, choose village Jakhal, see the count line and the table change, download the file.
- [ ] 9.13 **Switch to the real backend** (needs backend Phase 8).

## Tests that must pass

- `allQueriesUseTheSameFilterObject`
- `filterChangeKeepsOldDataUntilNewArrives`
- `clearFiltersResetsTheUrl`
- `groupedBarsHaveHeightsFromTheData`
- `stackedBarPartsAddUpTo100Percent`
- `barListIsSortedBiggestFirst`
- `emptyResultShowsMessageNotAnEmptyChart`
- `everyBarHasATitleWithItsValue`
- `sortIsWrittenToTheUrl`
- `downloadSendsTheTokenInTheHeaderNotInTheUrl`
- `transportInchargeCannotOpenAnalytics`

## Done when

- Analytics in mock mode, side by side with `Analytics.dc.html`, looks the same.
- For any filter, the "Showing N students" line, the sum of the class bars, and the table's total are the same number.
- The downloaded file opens in Excel with the names readable.
- After 9.13: the page works against the real backend.
- `/check-phase 9` passes.

## Differences found

(Fill this in during task 9.13.)

## Out of scope

- Comparing two sessions.
- Printing or exporting charts as pictures.
- Saving a set of filters with a name.
