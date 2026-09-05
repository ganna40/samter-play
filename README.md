# Samter Public Demo

UI update: shared portal styling, searchable navigation, input dialogs, and persistent application/selection feedback. See [UI update and validation scope](UI_UX_UPDATE.md). GitHub Pages publishes the root of the `new` branch.

Public GitHub Pages demo for the Samter public-work cooperative platform.

Play: https://ganna40.github.io/samter-play/

Demo accounts:
- Admin: `admin@samter.kr` / `Samter1234!`
- Worker: `worker@samter.kr` / `Worker1234!`
- Consumer: `consumer@samter.kr` / `Consumer1234!`
- Agency A: `agency@samter.kr` / `Agency1234!`
- Agency B: `agency2@samter.kr` / `Agency1234!`

## P15A / P15B public demo

Aligned with the private development `samter-mvp` P15B baseline `347590e99d004bec22ab390cad429b9abe1bd0d0` (2026-09-05). Existing root-level HTML, styles, and P8–P14 demos are retained. GitHub Pages publishes the root of `new`.

- **P15A:** producer service registration/editing, seller verification, administrator approval/rejection, pause/resume/archive, consumer ordering, producer acceptance/performance, inspection/revision, direct-transfer acknowledgement, cancellation and dispute resolution.
- **P15B:** two fictional agency accounts, explicit project/account assignment, agency activation, project progress (excluding cancelled tasks), published evidence/review visibility, and administrator publication/revocation controls.
- Consumer walkthrough: log in as consumer and order → log out and use worker to accept/start/fulfill → consumer inspection approval/payment acknowledgement → worker payment confirmation. Revision, cancellation and dispute actions appear only at eligible states. Admin manages services and disputes through **서비스 마켓**.
- Agency walkthrough: use **발주기관 관리** as admin to change assignments/publications → log in as either agency → inspect its linked projects and public summaries. **결과보고서 인쇄 / PDF 저장** opens browser printing; choose Save as PDF. Evidence download produces a clearly labelled fictional text file.
- Public-demo limits: no real authentication, money movement, server APIs, account creation, original evidence storage, or server-generated PDF. Browser roles/agency filtering demonstrate the workflow and are **not security boundaries**. All bundled data is fictional and visible in the public source. Only the two seeded agency accounts can log in; newly registered agencies can be assigned either seeded account.
- P15 uses `samter_public_demo_phase15_v1` in localStorage. Reset affects only this key; P10/P13/P14 data is retained. Completed marketplace amounts never create cooperative finance entries or count toward public-interest metrics.

Validation from repository root:

```sh
node --test tests/*.test.mjs phase13_demo.test.mjs
node --check phase15_model.js
node --check phase15_demo.js
```

For browser smoke tests, install Playwright in your development environment and run `node tests/phase15_browser.cjs` with a local static server on port 8765 (or set `DEMO_URL`). Tests use an isolated browser context and fictional data.

The public demo now simulates PHASE 8 through PHASE 14 flows in-browser, including membership onboarding/roster, public-interest and contribution compliance, governance, the PHASE 13 money-flow workspace (`거래·결산`), and the PHASE 14 disclosure workspace (`경영공시`).

PHASE 14 demo highlights:
- year-specific disclosure package and document metadata
- P10/P12/P13/project-result snapshots
- readiness checklist and non-blocking warnings
- dependency on PHASE 13 fiscal-year close before READY
- `DRAFT → READY → FINALIZED → SUBMITTED` lifecycle
- immutable finalized/submitted snapshots and documents
- summary PDF flow and ZIP package-structure simulation
- external submission date/reference memo recording

The public demo uses browser localStorage and does not submit anything to government systems. Uploaded document controls store metadata only; the private FastAPI/PostgreSQL implementation performs actual file storage and PDF/ZIP generation.

Do not enter real personal or financial information in the public demo. This repository contains only the static browser demo; the FastAPI/PostgreSQL source remains in the private source repository.
