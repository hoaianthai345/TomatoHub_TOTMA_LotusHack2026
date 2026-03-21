TomatoHub Next Feature Checklist

Context after latest pull
- `organization/campaigns`, `organization/supporters`, and `organization/beneficiaries` are already connected to backend data.
- `organization/transparency` can read live logs from backend, but only in read-only mode.
- supporter registration flow already works at `frontend/app/supporter/register/page.tsx`.
- supporter registrations and tasks pages already read backend data.
- the biggest remaining product gaps are now donation flow, profile editing, transparency authoring, dashboard detail realism, and test coverage.

Use this file as the review checklist for the next implementation round.

Priority 1: Public Donation Flow

Current status
- `frontend/app/(public)/donate/page.tsx` is still a prototype form.
- campaign detail currently links out to `/donate` instead of submitting directly against one campaign context.

Goal
- Make donation submission work against the real backend create endpoint.

Checklist
- [ ] Replace the prototype form in `frontend/app/(public)/donate/page.tsx` with a real submit flow.
- [ ] Decide whether `/donate` should accept `campaignId` by query param or redirect from a campaign-specific CTA.
- [ ] Reuse `frontend/lib/api/donations.ts#createDonation`.
- [ ] Support anonymous donation.
- [ ] Support authenticated linked donation using `currentUser.id` only.
- [ ] Pre-fill donor name when authenticated.
- [ ] Validate amount, payment method, and note before submit.
- [ ] Show success, error, and submitting states.
- [ ] After submit, redirect back to campaign detail or show follow-up CTA.
- [ ] Confirm campaign detail numbers refresh correctly after new donation is created.

Done when
- A user can submit a donation from the frontend and the backend stores it correctly.

Review notes
- Frontend must never allow arbitrary `donor_user_id`.
- If payment gateway is not in scope yet, keep this as a donation record flow only.

Priority 2: Campaign Detail Support Experience

Current status
- `frontend/app/(public)/campaigns/[id]/page.tsx` shows backend summary metrics.
- support CTA still jumps to separate `/donate` and `/supporter/register` pages.

Goal
- Make campaign detail the main support entry point instead of just a jump page.

Checklist
- [ ] Decide whether donate and register forms should be embedded in the campaign detail page or opened as campaign-aware drawers/modals.
- [ ] Pass campaign context cleanly into the donation flow.
- [ ] Pass campaign context cleanly into the volunteer registration flow.
- [ ] Keep support CTA visible without making the page too crowded on mobile.
- [ ] Refresh activity summary after successful donate or register actions.
- [ ] Keep loading and error handling isolated so campaign detail itself does not fully rerender on submit.

Done when
- Users can take the main support actions from a campaign detail page without losing context.

Review notes
- Keep the current backend-driven campaign snapshot section intact while enhancing the action area.

Priority 3: Profile Edit Flow

Current status
- `frontend/app/supporter/profile/page.tsx` and `frontend/app/organization/profile/page.tsx` are read-only.
- buttons exist visually but do not save anything.

Goal
- Let both supporter and organization accounts update profile data from the frontend.

Checklist
- [ ] Confirm or add backend update endpoints for supporter and organization profile data.
- [ ] Decide which fields are editable in MVP:
  - supporter: name, location, support types
  - organization: organization name, representative name, location, description
- [ ] Reuse `VietnamLocationFields` where structured location is needed.
- [ ] Reuse auth user types from `frontend/types/user.ts`.
- [ ] Update `AuthContext.refreshCurrentUser()` after successful save.
- [ ] Show inline validation and submit feedback.
- [ ] Handle location serialization cleanly if backend still expects one string field.

Done when
- Profile pages can switch from read-only view to a working save flow.

Review notes
- Keep organization name and representative name separated correctly.

Priority 4: Transparency Authoring and Management

Current status
- `frontend/app/organization/transparency/page.tsx` only reads aggregated logs from backend.
- backend transparency endpoint is read-only and derives events from system data.

Goal
- Decide whether transparency in MVP stays system-generated only, or whether organizations can publish manual transparency updates too.

Checklist
- [ ] Product decision: keep transparency auto-generated only, or add manual posts.
- [ ] If manual posts are needed, define backend schema and write endpoint first.
- [ ] Add organization-side UI for creating a transparency update.
- [ ] Separate system-generated logs from manual updates visually if both exist.
- [ ] Add campaign filter on the organization transparency page if the list grows.
- [ ] Add empty, loading, and error states consistent with workspace pages.

Done when
- Transparency behavior is clearly defined and supported by both backend and frontend.

Review notes
- Current backend transparency is event-derived, not a CMS-style content system.

Priority 5: Dashboard Detail Realism

Current status
- dashboard KPI cards are live.
- some richer detail panels on dashboards still use sample frontend experience data.

Goal
- Reduce or eliminate sample-only dashboard panels where backend data is available.

Checklist
- [ ] Audit `frontend/app/supporter/page.tsx` for sample-only sections.
- [ ] Audit `frontend/app/organization/page.tsx` for sample-only sections.
- [ ] Decide which sample panels should remain as UX placeholders and which should become real.
- [ ] Replace supporter joined-campaign timeline with actual donations/registrations if feasible.
- [ ] Replace organization campaign pipeline/activity feed with real campaign, donation, and registration data if feasible.
- [ ] Keep graceful empty states when there is little or no real activity.

Done when
- Dashboards rely on real data wherever the repo already has enough backend coverage.

Review notes
- It is acceptable to keep one or two clearly-labeled placeholder panels if backend coverage is still missing, but they should be intentional.

Priority 6: Shared API Page States

Current status
- many API-backed pages still hand-roll their own loading, empty, and error blocks.

Goal
- Make frontend data pages feel consistent and cheaper to maintain.

Checklist
- [ ] Audit current pages for repeated loading/error/empty markup.
- [ ] Add small shared components for:
  - loading panel
  - error panel
  - empty panel
- [ ] Apply them to organization pages first.
- [ ] Apply them to supporter pages second.
- [ ] Keep visual tone aligned with existing `card-base` styles.

Done when
- API-backed pages no longer repeat the same state UI by copy-paste.

Review notes
- Keep this lightweight; do not introduce a large state library just for page states.

Priority 7: Backend Authorization and Endpoint Tests

Current status
- permission helper coverage exists, but endpoint-level coverage is still thin.

Goal
- Add tests for the flows most likely to regress.

Checklist
- [ ] Add endpoint tests for campaign create.
- [ ] Add endpoint tests for campaign publish.
- [ ] Add endpoint tests for linked donation authorization.
- [ ] Add endpoint tests for linked volunteer registration authorization.
- [ ] Add endpoint tests for dashboard access restrictions.
- [ ] Add endpoint tests for organization-scoped reads where auth matters.

Done when
- Main auth-sensitive reads and writes have automated regression coverage.

Review notes
- Prioritize authorization and ownership checks over broad snapshot-style tests.

Priority 8: Workflow and Docs Refresh

Current status
- `docs/workflow` still contains outdated gap notes from before the latest pull.

Goal
- Keep docs aligned so future work does not restart completed tasks.

Checklist
- [ ] Update `docs/workflow` known gaps to match the latest repo state.
- [ ] Keep `docs/next-feature-checklist.md` aligned with the newest pull before each sprint.
- [ ] Mark which pages are:
  - live backend
  - mixed live plus sample
  - still prototype
- [ ] Document any backend dependency that blocks a frontend task.

Done when
- Team can read docs and know what is actually incomplete without scanning the whole repo.

Suggested execution order
1. Public donation flow
2. Campaign detail support experience
3. Profile edit flow
4. Transparency authoring decision and implementation
5. Dashboard detail realism
6. Shared API page states
7. Backend tests
8. Docs refresh at the end of each sprint
