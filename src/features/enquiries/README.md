Enquiries (web phase 7): `/enquiries`, `/enquiries/new`, `/enquiries/:id`.

- `api.ts`: `useEnquiries(filters)`, `useEnquirySummary()`, `useEnquiry(id)`, `useEnquiryPrefill(id)`, and the changes `useCreateEnquiry()`, `useUpdateEnquiry(id)`, `useAddFollowUp(id)`, `useChangeStatus(id)`. After a change the list and the tiles are fetched again.
- `types.ts`: the shapes (a guess, see `docs/08-decisions.md` part D) and the words of stages, sources and relations.
- `labels.ts`: the colour of each stage square, the short class ("Class 6" → "6") and the words of the Next step column.
- `form.ts`: the Zod schema of the form, `toRequest`, `fromEnquiry`, and the helpers that put server errors under the right input.
- `pages/EnquiriesPage.tsx` and `pages/useEnquiryFilters.ts` (stage, overdue, search, village, source and page live in the address).
- `pages/AddEnquiryPage.tsx`: "Save enquiry" and "Save and add another"; `ENQUIRY_EXISTS` shows an amber box with "Open it".
- `pages/EnquiryDetailPage.tsx`: the form on the left; `StagePanel`, `FollowUpsPanel` and "Start admission" on the right.
- `components/`: `EnquiryForm` (shared by Add and One enquiry, roomy: 52px inputs), `StageTiles`, `OverdueBox`, `EnquiryFilterRow`, `EnquiriesTable`, `StagePanel`, `FollowUpsPanel`.
- New admission with `?enquiryId=` uses `useEnquiryPrefill` (see `src/features/admissions/components/EnquiryNotice.tsx`).
- The transport in-charge has no `ENQUIRIES_VIEW`: no menu item, and the routes show "You cannot open this page".
