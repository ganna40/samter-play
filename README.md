# Samter Public Demo

UI update: shared portal styling, searchable navigation, input dialogs, and persistent application/selection feedback. See [UI update and validation scope](UI_UX_UPDATE.md). GitHub Pages publishes the root of the `new` branch.

Public GitHub Pages demo for the Samter public-work cooperative platform.

## 기관 안내와 삼터 브랜드

공개 사이트에는 기관소개, 연혁, 기관장 소개, 오시는 길, 이용약관 초안, 개인정보 처리 안내 페이지가 포함됩니다. 현재 확정된 기관 정보는 기관명 `ㅇㅇ사회적협동조합`과 대표자 `염광선`뿐입니다. 주소, 사업자등록번호, 연락처, 설립일, 연혁, 대표자 약력은 임의로 채우지 않고 `정보 준비 중`으로 표시합니다.

삼터 심볼은 Codex 내장 이미지 생성 도구로 새로 만들었으며, 이미지 옆에 실제 텍스트 `삼터`를 함께 표시합니다. 원본 정보, 생성 프롬프트와 사용 원칙은 [BRAND_ASSET.md](./BRAND_ASSET.md)에 기록했습니다.

정책 페이지는 공개 데모와 정식 서비스를 구분합니다. 이 GitHub Pages 데모의 입력값과 파일은 브라우저 `localStorage`와 `IndexedDB`에 저장되며 실제 인증 또는 권한 경계가 아닙니다. 실제 개인정보와 업무 문서를 입력하거나 업로드하면 안 됩니다.

Play: https://ganna40.github.io/samter-play/

Demo accounts:
- Admin: `admin@samter.kr` / `Samter1234!`
- Worker: `worker@samter.kr` / `Worker1234!`
- Consumer: `consumer@samter.kr` / `Consumer1234!`
- Agency A: `agency@samter.kr` / `Agency1234!`
- Agency B: `agency2@samter.kr` / `Agency1234!`

## P15A / P15B public demo

Aligned with the private development `samter-mvp` P15B baseline `347590e99d004bec22ab390cad429b9abe1bd0d0` (2026-09-05). Existing root-level HTML, styles, and P8–P14 demos are retained. GitHub Pages publishes the root of `new`.

- **P15A:** structured producer service registration/editing (category, long description, scope, location, schedule, price, and multiple attachments), editorial service details, seller verification, administrator approval/rejection, pause/resume/archive, consumer ordering, producer acceptance/performance, inspection/revision, direct-transfer acknowledgement, cancellation and dispute resolution.
- **P15B:** structured commissioned-project registration by an administrator (linked agency, category, long description, scope, location, period, budget, and multiple attachments), editorial project details, per-attachment agency publication controls, two fictional agency accounts, explicit project/account assignment, agency activation, project progress (excluding cancelled tasks), published evidence/review visibility, and administrator publication/revocation controls. Newly uploaded procurement originals remain internal until an administrator explicitly publishes each attachment.
- Consumer walkthrough: log in as consumer and order → log out and use worker to accept/start/fulfill → consumer inspection approval/payment acknowledgement → worker payment confirmation. Revision, cancellation and dispute actions appear only at eligible states. Admin manages services and disputes through **서비스 마켓**.
- Agency walkthrough: use **발주기관 관리** as admin to change assignments/publications → log in as either agency → inspect its linked projects and public summaries. **결과보고서 인쇄 / PDF 저장** opens browser printing; choose Save as PDF. Evidence download produces a clearly labelled fictional text file.
- Public-demo limits: no real authentication, money movement, server APIs, account creation, server-generated PDF, or cross-browser file sharing. Uploaded service/project attachments are stored only in browser IndexedDB; seeded attachments download as clearly labelled fictional text. Browser roles/agency filtering demonstrate the workflow and are **not security boundaries**. All bundled data is fictional and visible in the public source. Only the two seeded agency accounts can log in; newly registered agencies can be assigned either seeded account.
- P15 uses `samter_public_demo_phase15_v1` in localStorage. Reset affects only this key; P10/P13/P14 data is retained. Completed marketplace amounts never create cooperative finance entries or count toward public-interest metrics.

## 문서함 public demo

Every signed-in role has a menu named **문서함**. The demo keeps document metadata and version/review/publication history in `samter_public_demo_documents_v2` localStorage, and stores uploaded file blobs in the browser's `samter_public_demo_files_v1` IndexedDB database.

- A worker can submit a quotation (`견적서`), work plan (`작업계획서`), or work result (`작업결과서`) only for an explicitly assigned public task or an order that exists in the P15 marketplace demo. The submission form opens as a modal and requires the linked task/order and a file.
- A consumer sees only documents for public tasks explicitly linked to that demo account and marketplace orders owned by that account. The latest submitted version can be accepted or returned for revision.
- For linked public work, consumer acceptance and cooperative administrator approval are separate steps. Public work without a linked consumer uses administrator review. Only the latest version can be reviewed or published, and another version of the same document type can be submitted only after a revision request.
- An administrator can supervise all versions, request revision, grant final approval, and explicitly publish a selected final-approved public-work version to the agency linked to its project. Marketplace order documents remain private. Publishing a newer approved version revokes the prior published version; merely submitting a revision leaves the currently published version unchanged.
- An agency account sees only active publications for projects currently linked to that agency. It can open or download those exact versions. Revocation removes the version from the agency view.
- This is a browser-only workflow demonstration, not real authentication, authorization, multi-user synchronization, or server storage. Data does not move between browsers or devices. Do not upload real personal or work documents.

Validation from repository root:

```sh
node --test tests/*.test.mjs phase13_demo.test.mjs
node --check phase15_model.js
node --check phase15_demo.js
node --check document_model.js
node --check document_demo.js
```

For browser smoke tests, install Playwright in your development environment and run `node tests/phase15_browser.cjs`, `node tests/detail_browser.cjs`, and `node tests/document_browser.cjs` with a local static server on port 8765 (or set `DEMO_URL`). Tests use an isolated browser context and fictional data.

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

The public demo uses browser localStorage and does not submit anything to government systems. PHASE 14 disclosure upload controls store metadata only; the document box and attachment demos keep selected file blobs in browser IndexedDB. The private FastAPI/PostgreSQL implementation performs actual server-side file storage and PDF/ZIP generation.

Do not enter real personal or financial information in the public demo. This repository contains only the static browser demo; the FastAPI/PostgreSQL source remains in the private source repository.
