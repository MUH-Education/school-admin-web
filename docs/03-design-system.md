# 3. Design system

Everything here was taken from the approved designs in `design/screens/`. If this file and a design disagree, the design wins; fix this file.

The look in one line: a school register on paper. Flat, square, ruled lines, ink-blue text, one blue for actions, numbers in a typewriter font.

## Colours

Define these as tokens in `src/styles/index.css` under `@theme`. Use the token name in classes (`bg-paper`, `text-ink-soft`, `border-rule`).

| Token | Hex | Used for |
|---|---|---|
| `paper` | `#EEF1F4` | Page background |
| `panel` | `#FFFFFF` | Boxes, table background, inputs |
| `ink` | `#16222E` | Main text, sidebar background, dark buttons |
| `ink-soft` | `#5A6B7A` | Small text, labels, hints |
| `rule` | `#D3DBE2` | Borders between things |
| `rule-strong` | `#7F8E9B` | Borders of inputs and plain buttons |
| `rule-mid` | `#A9B5C0` | "Later" stop squares, chart axis |
| `canal` | `#1D6E8B` | Main action colour, links, selected things |
| `canal-soft` | `#E3EEF3` | Selected background |
| `canal-tint` | `#F4F8FA` | Background of an open inline form |
| `dust` | `#C8873A` | Amber fills and borders |
| `dust-text` | `#8A5A14` | Amber **text** (dark enough to read) |
| `dust-light` | `#E0A45C` | Amber on the dark sidebar |
| `dust-soft` | `#FBF1E2` | "No network" banner background |
| `good` | `#2E7D5B` | Done, valid, reached |
| `good-soft` | `#EDF5F0` | Row background of a done tap |
| `bad` | `#B4332B` | Problems |
| `bad-soft` | `#F8ECEB` | Row background of an absent tap |
| `side-text` | `#C9D3DC` | Sidebar links, disabled button background |
| `side-label` | `#8FA0AF` | Sidebar group labels |
| `side-rule` | `#34424F` | Sidebar divider |
| `chart-1` | `#1479A6` | First chart series, "On time" |
| `chart-2` | `#C27C1C` | Second chart series, "Delayed" |
| `chart-3` | `#A8332B` | Third chart series, "Defaulted" |
| `chart-grid` | `#E3E8ED` | Chart grid lines |

Rules:
- Amber text always uses `dust-text`. `dust` on white is too pale to read.
- White text is allowed only on `canal`, `good`, `bad`, `ink`.
- The three chart colours were checked for colour-blind readers. Do not swap them.

## Fonts

| Token | Font | Weights | Used for |
|---|---|---|---|
| `font-sans` | Archivo, then system-ui | 400, 500, 600, 700 | All admin text |
| `font-mono` | IBM Plex Mono, then ui-monospace | 400, 500, 600 | Numbers, times, phone numbers, codes, small capital labels |
| `font-hindi` | Mukta, then Noto Sans Devanagari, then system-ui | 400, 500, 600, 700 | The attendant app |

Load them from Google Fonts with `display=swap`. Put the font files in the PWA cache so the attendant app has them offline.

## Text sizes

| Use | Size / weight | Extra |
|---|---|---|
| Page title (h1) | 30px / 700 | letter-spacing −0.02em, line-height 1.1 |
| Section title (h2) | 15px / 600 | |
| Box title | 17px / 600 | |
| Form section title | 19px / 600 | |
| Body | 14px / 400 | line-height 1.4 |
| Form label | 15px / 600 | |
| Form input text | 16px | |
| Small text | 12.5px to 13.5px | colour `ink-soft` |
| Capital label | 11px mono | uppercase, letter-spacing 0.08em, `ink-soft` |
| Tile number | 24px mono / 600 | |
| Attendant: child name | 21px / 600 | |
| Attendant: button text | 17px to 20px / 700 | |

## Shape and space

- Corner radius: **0** everywhere.
- Border: 1px `rule`. Inputs and plain buttons: 1px `rule-strong`. Selected choice: 2px `canal`.
- Page title block: 2px `ink` line under it.
- Callout box: 3px top border (`dust`, `bad` or `ink`).
- Content area padding: 32px top, 40px sides, 56px bottom. Gap between sections: 24px.
- Box padding: 16px to 24px. Form section padding: 28px 32px 32px.
- Control heights: 44px in filters and tables, 48px to 52px in forms, 52px to 60px in the attendant app.

## Shared components (`src/ui/`)

Build each one once. Screens only compose them.

| Component | What it is | Seen in design |
|---|---|---|
| `Button` | variants `primary` (canal fill), `secondary` (white, canal border), `plain` (white, grey border), `danger` (white, red border), `dark` (ink fill) | everywhere |
| `LinkButton` | a link that looks like a `Button` | "Add enquiry", "New admission" |
| `Field` | label + input + hint + error text | all forms |
| `TextInput`, `Select`, `DateInput`, `MoneyInput`, `PhoneInput`, `TextArea` | inputs in the `Field` style | all forms |
| `ChoiceGroup` | big radio or checkbox boxes; the chosen one has a 2px canal border and canal-soft fill | "Gender", "Uses the school bus", "Source" |
| `PageHeader` | capital label, h1, one-line description, action slot, 2px ink underline | every admin page |
| `Panel` | white box with 1px border; optional `tone` for the 3px top border | everywhere |
| `TileRow` + `Tile` | grid of summary numbers with 1px gaps | Bus status, Routes and load, Analytics |
| `DataTable` | header row in capital labels, rows with a top rule, scrolls sideways in its box | Students, Enquiries, Vehicles, Users |
| `Pagination` | "Showing 10 of 290" + Back / Next | Students, Enquiries |
| `StatusDot` | 8px square + text; tones `canal`, `good`, `dust`, `bad`, `muted` | all status cells |
| `FilterBar` | a `Panel` with inputs in one wrapping row | Students, Analytics, Enquiries |
| `Breadcrumb` | "Students / Ishaan Sharma" | detail pages |
| `InlineForm` | open form inside a box: 2px canal border, canal-tint fill | "Add a phone number", "Change the driver" |
| `DefinitionGrid` | small grey label above a value, in 2 or 3 columns | Student details |
| `HistoryList` | date, text, who | Change history, Who worked on this vehicle |
| `EmptyState`, `ErrorState`, `LoadingBlock` | the three non-data states | every page |
| `Toast` | short message after a save | every save |
| `ConfirmDialog` | "Turn off this vehicle?" | destructive actions |
| `Dialog` | a centred box over the page for small forms | Add user, Add a person, Record a payment |
| `SeatMeter` | bar: blue up to the seat line, red after it | Routes and load |
| `StopStrip` | stops as squares on a line: done, next, later | Bus status |
| `BarColumns`, `StackedBar`, `BarList` | the three chart shapes | Analytics |
| `Sidebar` | dark menu with groups; shows only what `can()` allows | every admin page |

Charts are small and simple. They are built with `div`s (or plain SVG), not with a chart library. Each bar has a `title` so the value shows on hover, and every chart has its numbers in text nearby.

## Admin shell

- Sidebar: `ink` background, 232px wide on a laptop, groups Transport, Admissions, Reports, Settings. The current page is white text on `canal`.
- Bottom of the sidebar: the user's name and role, and "Log out".
- Below about 800px width the sidebar sits above the content and the content takes the full width.

## Attendant shell

- Phone width 360px to 430px. No sidebar.
- Top bar: `ink` background, back button (44px square), title, the count on the right.
- Under it: the sending strip (green or amber).
- Bottom: one main button, 56px high.
- Rows: 68px to 76px high, name on the left, answer buttons on the right.

## Things that are never done

- Rounded corners, shadows, gradients, glass effects.
- Emoji as icons.
- A coloured left border on a card.
- A status shown by colour only.
- A new colour or font that is not in this file.
