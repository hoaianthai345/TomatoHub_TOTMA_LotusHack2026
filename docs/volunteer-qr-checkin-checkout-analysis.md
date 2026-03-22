# Volunteer QR Check-in/Check-out Analysis

Updated on: `2026-03-22`
Owner: `engineering`

## 1) Goal

Target flow requested:
- Volunteer arrives at checkpoint and scans QR `check_in` -> campaign volunteer status is updated to `arrived` automatically.
- Volunteer finishes shift and scans QR `check_out` -> campaign volunteer status is updated to `completed` automatically.

## 2) Source Audit Scope

Backend:
- `backend/app/api/endpoints/campaign_checkpoints.py`
- `backend/app/services/checkpoint_qr_service.py`
- `backend/app/schemas/campaign_checkpoint.py`
- `backend/app/models/volunteer_registration.py`

Frontend:
- `frontend/app/organization/checkpoints/page.tsx`
- `frontend/app/supporter/scan/page.tsx`
- `frontend/components/campaign/campaign-volunteer-checkin-panel.tsx`
- `frontend/lib/api/campaign-checkpoints.ts`
- `frontend/app/supporter/tasks/page.tsx`

## 3) Current Behavior (Verified)

### 3.1 Backend QR and scan processing
- Endpoint to generate QR token exists:
  - `POST /campaign-checkpoints/{checkpoint_id}/qr`
  - Supports `scan_type`: `check_in` / `check_out` (for volunteer checkpoints).
- Endpoint to process scan exists:
  - `POST /campaign-checkpoints/scan`
- Token validation includes:
  - signature validation
  - token expiration (`exp`)
  - metadata validation (`checkpoint_id`, `campaign_id`, `organization_id`)
  - duplicate nonce rejection per user + scan_type + nonce

### 3.2 Volunteer status transition in backend
- On successful volunteer `check_in` scan:
  - Creates `volunteer_attendances` row with `check_in_at`
  - Updates `volunteer_registrations.attendance_status = arrived`
- On successful volunteer `check_out` scan:
  - Completes open attendance session (`check_out_at`, `duration_minutes`)
  - Updates `volunteer_registrations.attendance_status` by rule:
    - `completed` if checkout time >= shift end or no shift end
    - `left_early` if checkout time < shift end

### 3.3 Frontend current scan UX
- Organization can generate check-in/check-out QR token in:
  - `/organization/checkpoints`
- Supporter can submit scan in:
  - `/supporter/scan`
- Important: supporter page currently scans by pasting token text, not by camera QR scanner.
- After successful scan on supporter page:
  - attendance history is refetched in scan page itself.

### 3.4 Campaign detail volunteer panel
- Volunteer list in campaign detail shows registration + attendance badges.
- Organization can update registration/attendance manually in popup.
- Data reflects backend attendance status if the list is reloaded/refetched.

## 4) Gap Analysis vs Requested UX

### Gap A: No real camera QR scanning in app
- Current flow requires token paste.
- This does not match "volunteer arrives and scans QR directly" user expectation.

### Gap B: Organization page shows token text, not visual QR code
- Org can generate token, but no QR image is rendered for volunteers to scan directly.

### Gap C: Some pages do not present "arrived/completed" progression clearly
- `supporter/tasks` computes phase mainly from time windows, not attendance status.
- A volunteer may have scanned check-in/out, but task wording may still focus on schedule.

### Gap D: Business rule mismatch possibility for checkout
- Current backend may set `left_early` on checkout if before shift end.
- Requested wording implies "check_out => completed".
- Need final product decision:
  - keep strict rule (`left_early` vs `completed`)
  - or always force `completed` after check-out

### Gap E: Missing automated tests for checkpoint QR flow
- No backend tests currently cover checkpoint endpoints and QR attendance transitions.

## 5) Proposed Sprint 11 Implementation Plan

## Epic Q1 - True QR Experience (Org display + Supporter camera scan)
- Render actual QR image for generated token in `/organization/checkpoints`.
- Add supporter camera scanner in `/supporter/scan`:
  - decode QR payload
  - submit directly to `POST /campaign-checkpoints/scan`
  - keep manual paste as fallback.

Deliverables:
- QR image render for check-in/check-out token.
- Camera-based scan flow with success/error handling.

## Epic Q2 - Auto status visibility in volunteer-facing pages
- After scan success:
  - refetch volunteer registration state for related campaign.
  - surface clear status label:
    - after check_in: `Arrived`
    - after check_out: `Completed` or `Left early` (depending business rule).
- Update supporter task page logic to prioritize `attendance_status` over only shift-time inference.

Deliverables:
- Status progression visible without confusion on key screens.

## Epic Q3 - Business rule finalization for checkout status
- Decision point:
  1. Strict attendance outcome:
     - before shift end -> `left_early`
     - otherwise -> `completed`
  2. Simplified product outcome:
     - any successful check_out -> `completed`
- Implement selected rule consistently in:
  - QR scan endpoint
  - manual attendance endpoint
  - dashboard/task labels

## Epic Q4 - Regression and security test coverage
- Add backend tests for:
  - valid check_in/check_out transitions
  - duplicate token nonce rejection
  - check_out without active check_in
  - unapproved registration rejection
  - inactive checkpoint rejection
  - wrong campaign/organization token metadata rejection
- Add frontend smoke checklist:
  - org generate QR
  - supporter camera scan check_in
  - supporter camera scan check_out
  - status updates in campaign detail and supporter task surfaces

## 6) Acceptance Criteria (for requested flow)

- Volunteer can scan checkpoint QR directly from camera (no manual token copy required).
- On successful check-in:
  - backend stores attendance session
  - registration attendance status becomes `arrived`
  - UI reflects `Arrived` promptly.
- On successful check-out:
  - attendance session is closed
  - registration attendance status becomes final state (`completed` or selected policy)
  - UI reflects final state promptly.
- Organization can inspect scan logs for audit and troubleshooting.

## 7) Open Decisions To Lock Before Implementation

- Checkout policy:
  - keep `left_early` branch, or force `completed` on any check-out.
- QR expiration default:
  - keep 60 minutes current org UI default, or shorten for operational safety.
- Mobile UX:
  - dedicated scan screen only, or allow deep-link to campaign detail after scan success.

## 8) Conclusion

Core backend attendance transition logic for QR already exists and is functional.
Main remaining work to satisfy the requested user experience is frontend productization:
- true camera QR scan
- clear automatic status presentation across relevant pages
- locked business rule for checkout final status
- test coverage for checkpoint QR flows.
