# Bug & API Hardening Plan (Post-Sprint)

## 0) Current confirmed issues
- `404` noise on `GET /dashboards/supporter/{user_id}/participations` in frontend (backend runtime does not expose this route consistently in your current environment).
- `Campaigns You Joined` has multiple fallback paths, causing duplicated logic and difficult debugging.
- Volunteer join flow currently exists in multiple places (`campaign detail action bar`, `supporter/register` page), creating behavior drift.
- `listPublishedCampaigns(200)` is still called in many screens even though backend max is `100` (frontend now clamps, but callsites are still inconsistent).
- `frontend/mocks/*` still exists and can cause confusion, even when runtime screens are API-backed.

## 1) Immediate stabilization (Priority P0)
- [ ] Keep joined-campaign source of truth to **one API path** in frontend dashboard.
- [ ] Remove runtime call to `/participations` until backend contract is confirmed.
- [ ] Ensure dashboard joined cards are always built from real registrations (`/volunteer-registrations?user_id=...`) if dashboard payload is empty.
- [ ] Add explicit UI error state when join failed (auth/role/campaign support-mode) with backend message.
- [ ] Restart backend + re-test full join flow:
  - campaign detail -> join
  - `/supporter/registrations`
  - `/supporter` (`Campaigns You Joined`)

## 2) Contract alignment frontend/backend (Priority P1)
- [ ] Freeze dashboard API contract in one place (`backend/app/schemas/dashboard.py` + OpenAPI).
- [ ] Generate/update frontend typed API interfaces from backend schema (manual or codegen), remove drift-prone duplicated interfaces.
- [ ] Decide final status for endpoint `/dashboards/supporter/{user_id}/participations`:
  - implement and test officially, or
  - remove from README/docs + frontend usage.
- [ ] Add response-field compatibility tests for `SupporterDashboardRead` (must include `participation_cards`, `contribution_items`, `task_items`).

## 3) Remove duplicate/legacy logic (Priority P1)
- [ ] Decide product direction for `/supporter/register`:
  - keep as advanced/manual registration page, or
  - remove from nav and redirect to campaign detail join action.
- [ ] Consolidate volunteer registration status label/style mapping into shared util (used by dashboard/registrations/register pages).
- [ ] Consolidate campaign list query limits and filters into one shared helper (avoid repeating hardcoded `200`).
- [ ] Keep only one join implementation path in frontend API layer (avoid parallel “quick join vs create join” drift if backend only supports one).

## 4) Clean non-production artifacts (Priority P2)
- [ ] Mark `frontend/mocks/*` as deprecated (README note) or move to `frontend/dev-fixtures/*`.
- [ ] Remove old docs lines implying mock-first runtime if current UI already API-backed.
- [ ] Keep seed script for demo data (`backend/scripts/seed_demo_data.py`) but document that it is seed data, not frontend runtime source.

## 5) Test coverage and regression gates (Priority P1)
- [ ] Backend tests:
  - join registration success/pending/re-join after cancelled
  - authorization on registration list by `user_id`
  - supporter dashboard payload includes joined cards from real data
- [ ] Frontend tests (minimum):
  - dashboard renders joined card after a successful join (mock API integration test)
  - no request to removed/unsupported endpoint paths
  - campaign detail join button updates status + CTA
- [ ] Add pre-merge checklist:
  - `frontend`: `npx tsc --noEmit` + `npm run lint`
  - `backend`: unit tests + schema import check

## 6) Suggested execution order
1. P0 stabilization for joined campaigns (1 day)
2. Contract alignment for dashboard API (1 day)
3. Remove duplicate join/register logic (1-2 days)
4. Cleanup mock/legacy docs and folder semantics (0.5 day)
5. Add regression tests and release checklist (1-2 days)

## Definition of done
- User can join from campaign detail and immediately see joined campaign in:
  - `/supporter/registrations`
  - `/supporter` section `Campaigns You Joined`
- No `404` dashboard requests in browser console for unsupported routes.
- No dependency on frontend mock data for supporter/organization core flows.
- API contract and frontend typed mapping are synchronized and covered by tests.
