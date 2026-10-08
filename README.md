# School Admin Web

React app for MUH Jain Global School: admin web app (English) and attendant app (Hindi, offline).
Needs Node 24 LTS. The plan is in `docs/` and `CLAUDE.md`.

```bash
npm install
npm run dev        # mock API, no backend needed
npm run dev:real   # real backend on localhost:8080
npm run lint && npm run typecheck && npm test
npm run e2e        # Playwright (first time: npx playwright install chromium)
npm run build      # production build into dist/
```
