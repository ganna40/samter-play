# Samter Public Demo

Public GitHub Pages demo for the Samter public-work cooperative platform.

Play: https://ganna40.github.io/samter-play/

Demo accounts:
- Admin: `admin@samter.kr` / `Samter1234!`
- Worker: `worker@samter.kr` / `Worker1234!`

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
