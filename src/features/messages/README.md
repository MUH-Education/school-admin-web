Messages (web phase 6): `/messages`.

- `api.ts`: `useMessages(filters)` and `useMessageSummary(date)`.
- `types.ts`: the shapes (a guess, see `docs/08-decisions.md` part D). Also `ChildSms`, used by One bus.
- `labels.ts`: event words, status filter words, the test-mode sentence.
- `pages/MessagesPage.tsx` and `pages/useMessageFilters.ts` (day, status, name search and page live in the address).
- `components/`: `MessagesTable`, `MessageStatusCell`.
- The SMS column of One bus is `SmsCell` in `src/features/busStatus/components/`.
