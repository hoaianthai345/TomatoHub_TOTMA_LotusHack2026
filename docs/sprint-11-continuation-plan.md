# Sprint 11 Continuation Plan

Updated on: `2026-03-22`
Owner: `engineering`

## 1) Audit Summary (Current Baseline)

### Quality checks
- [x] `frontend`: `npm run lint` passes (0 errors, 0 warnings).
- [x] `frontend`: `npx tsc --noEmit` passes.
- [x] `backend`: `python -m unittest discover tests` passes (`49` tests).
- [x] `backend`: `alembic current` is at `202603220003 (head)`.

### Runtime contract checks
- [x] `PATCH /volunteer-registrations/{registration_id}/attendance` exists in OpenAPI.
- [x] `GET /campaigns/{campaign_id}/volunteers` exists in OpenAPI.
- [x] `POST /campaign-checkpoints/{checkpoint_id}/manual-attendance` exists in OpenAPI.
- [x] `GET /organizations/` and `GET /campaigns/by-organization/{organization_id}` exist in OpenAPI.

## 2) Hotfixes Completed During This Audit

### A) Backend publish campaign unit-test regression
- [x] Added safe actor id resolver in campaign endpoint credit-event calls.
- [x] Updated `backend/tests/test_campaign_endpoints.py` mock setup to include realistic `current_user.id` and isolated credit-event patching.
- [x] Result: backend tests are green again.

Files:
- `backend/app/api/endpoints/campaigns.py`
- `backend/tests/test_campaign_endpoints.py`

### B) Frontend navbar performance/lint issue
- [x] Replaced raw `<img>` with `next/image` in public navbar logo.

File:
- `frontend/components/common/navbar.tsx`

### C) Supporter task page text/UX cleanup
- [x] Rewrote task phase labels in English.
- [x] Added robust shift-range formatter for partial shift data (`start` only / `end` only).

File:
- `frontend/app/supporter/tasks/page.tsx`

## 3) Remaining Gaps to Carry Into Sprint 11

## Epic 11A - Backend Phase Standardization
- [ ] Add backend-shared campaign phase utility (`upcoming/live/ended`) and use it across dashboard builders.
- [ ] Replace legacy dashboard status wording (`Draft/Running/Closed`) where phase-level semantics are expected.
- [ ] Ensure supporter/dashboard task messages are English-consistent end-to-end.

Definition of Done:
- [ ] One backend utility source-of-truth for phase.
- [ ] Dashboard endpoints return phase-consistent labels.
- [ ] No mixed-language fallback strings in dashboard responses.

## Epic 11B - Checkpoint/Auth Regression Coverage
- [ ] Add endpoint-level tests for checkpoint create/update/auth boundaries.
- [ ] Add tests for manual attendance edge-cases:
  - rejected/cancelled registration update denied
  - pending registration attendance update path
  - non-owner organization forbidden
- [ ] Add regression tests for volunteer registration schedule fields (`role`, `shift_start_at`, `shift_end_at`).

Definition of Done:
- [ ] Test coverage includes happy-path + authorization + conflict/validation cases.
- [ ] CI test suite remains green after merges.

## Epic 11C - Organization Operations Completeness
- [ ] Implement create/update flow in organization beneficiary page (currently list-only UI).
- [ ] Implement manual authoring flow for organization transparency logs (currently summary/read-only).

Definition of Done:
- [ ] Organization can create and update beneficiary records from UI.
- [ ] Organization can write transparency entries without external tooling.

## Epic 11D - Campaign Detail Final Hardening
- [ ] Add end-to-end smoke checklist automation/manual script for:
  - public browse ORG -> ORG detail -> campaign detail
  - supporter volunteer registration with schedule
  - org attendance update in campaign detail popup
  - supporter/guest read-only visibility
- [ ] Confirm no `404/403` on core campaign-detail actions with valid auth.

Definition of Done:
- [ ] Smoke checklist documented and repeatable.
- [ ] Core flows verified on fresh database + migrated database.

## 4) Sprint 11 Priority Order
1. `11A` Backend phase standardization.
2. `11B` Checkpoint/auth regression coverage.
3. `11D` Campaign detail hardening.
4. `11C` Beneficiary/transparency authoring.

## 5) Risk Notes
- Legacy docs file `docs/sprint-next-detailed-plan.md` has partial mojibake text in old sections; keep this Sprint 11 file as source of truth for active execution.
- Any additional attendance-state changes must preserve existing OpenAPI route contracts to avoid frontend regressions.

## 6) Sprint 11 Kickoff Checklist
- [ ] Freeze API contract delta list.
- [ ] Create task tickets per epic (`11A`..`11D`).
- [ ] Assign owners and target test coverage for each ticket.
- [ ] Run full quality gate before each merge:
  - `frontend`: lint + type-check
  - `backend`: unit tests + migration verification
