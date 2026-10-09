Bus status (web phase 4): `/bus-status` and `/bus-status/routes/:routeId`.

- `api.ts`: three hooks. They ask again every 30 seconds while the tab is visible.
- `types.ts`: the shapes (a guess, see `docs/08-decisions.md` part D).
- `labels.ts`, `summary.ts`, `detail.ts`: small pure functions with tests.
- `components/`: `BusRouteRow`, `AttentionBox`, `PhaseSwitch`, `FleetTiles`, `LiveNote`, `StopTiles`, `ChildrenTable`.
- `pages/`: `BusStatusPage`, `BusDetailPage`.
- `StopStrip` is shared and lives in `src/ui/`.
