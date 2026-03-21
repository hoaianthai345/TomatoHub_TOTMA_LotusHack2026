# UI/UX Enhancement Master Plan

Updated on: 2026-03-22
Owner: frontend + design + product

## 1) Objectives

Upgrade the entire website UI/UX to a unified, maintainable standard and reduce:
- Misaligned layouts, inconsistent spacing, and uneven page structure.
- Inconsistent color usage across screens.
- Temporary status markers shown as plain characters (`+`, `-`, `x`).
- Inconsistent border, divider, and label styles.

Expected outcomes:
- All screens follow one shared design token system.
- Statuses are represented by clear icons (no test characters in UI).
- Layout, border, divider, and label patterns are consistent across Public, Supporter, and Organization workspaces.

---

## 2) Scope

In-scope:
- All frontend routes in public and role-based workspaces.
- All shared components: card, form, button, badge, table, panel, empty/loading/error states.
- Header, sidebar, section title, action area, and list items.

Out-of-scope:
- Backend business logic changes.
- Large data-flow refactors that are not related to UI/UX.

---

## 3) UI Standardization Rules

### 3.1 Design Tokens (mandatory)

Standardize in `globals.css` (or one central token file):
- Colors: page, surface, border, text, muted, primary, success, warning, danger.
- Spacing: 4/8/12/16/20/24/32/40.
- Radius: sm/md/lg/xl.
- Shadow: card, popover, focus.
- Typography: heading/body/caption and line-height.

Rule:
- Do not hardcode hex colors inside components; use tokens.
- Do not add new tokens without a clear reason.

### 3.2 Layout Grid and Spacing

Shared rules:
- Container max-width must be consistent per layout level.
- Section spacing must follow the spacing scale.
- Form fields must use consistent vertical rhythm.
- Cards in the same context should have consistent minimum height when comparison matters.

### 3.3 Border / line / label system

Mandatory rules:
- Border colors must use one primary border token set + emphasis border token.
- Divider lines must use one shared style (thickness + color + margin).
- Form labels must follow one pattern: text + required mark + helper + error.
- Input states must be consistent: default / focus / error / disabled / readonly.

### 3.4 Replace test characters (+ - x) with icons

Do not use test characters (`+`, `-`, `x`) to represent statuses in the UI.

Icon policy:
- Success: Circle check icon.
- Warning: Triangle alert icon.
- Error/Fail: Circle x icon.
- Info: Circle info icon.
- Neutral/Pending: Dot/Clock icon.

Rule:
- Icons must be paired with clear text labels.
- Icon colors must follow semantic tokens.
- Icon sizes must follow the scale 14/16/18/20.

---

## 4) Route Inventory by Role (UI Audit)

## Public
- [ ] `/`
- [ ] `/campaigns`
- [ ] `/campaigns/[id]`
- [ ] `/organizations`
- [ ] `/organizations/[id]`
- [ ] `/login`
- [ ] `/signup/supporter`
- [ ] `/signup/supporter/support-types`
- [ ] `/signup/organization`
- [ ] `/donate`

## Supporter
- [ ] `/supporter`
- [ ] `/supporter/registrations`
- [ ] `/supporter/tasks`
- [ ] `/supporter/profile`
- [ ] `/supporter/register`
- [ ] `/supporter/scan`
- [ ] `/supporter/contributions`

## Organization
- [ ] `/organization`
- [ ] `/organization/campaigns`
- [ ] `/organization/campaigns/create`
- [ ] `/organization/campaigns/[id]/edit`
- [ ] `/organization/checkpoints`
- [ ] `/organization/supporters`
- [ ] `/organization/beneficiaries`
- [ ] `/organization/donations`
- [ ] `/organization/transparency`
- [ ] `/organization/profile`

Each route must be reviewed for:
- [ ] Color usage follows design tokens.
- [ ] Layout alignment and spacing follow the shared system.
- [ ] Border/divider/label follow the standard pattern.
- [ ] No test characters (`+ - x`) remain in UI.
- [ ] Loading/empty/error states use shared components.
- [ ] Responsive behavior works well on mobile/tablet/desktop.

---

## 5) Implementation Plan by Phase

### Phase 1 - Foundation (Design System Hardening)
- [ ] Finalize color, typography, spacing, radius, and shadow token sets.
- [ ] Finalize border/divider/label rules for forms and panels.
- [ ] Choose one shared icon library (recommended: lucide-react).
- [ ] Add a short frontend guideline in docs.
- Reference: `docs/frontend-ui-guideline.md`

Output:
- Tokens and utility classes are centralized in one source.
- Semantic icon mapping is fully defined to replace `+ - x`.

### Phase 2 - Shared Components Cleanup
- [ ] Refactor shared components: Button, Input, Select, Textarea, Badge, Card, Alert, PanelHeader.
- [ ] Create shared state components: LoadingPanel, EmptyPanel, ErrorPanel.
- [ ] Standardize navbar, sidebar, section title, and action bar.

Output:
- Components are reusable across all roles.
- Duplicate styling across pages is reduced.

### Phase 3 - Page-by-page Visual Alignment
- [ ] Public pages first.
- [ ] Supporter workspace second.
- [ ] Organization workspace third.
- [ ] Fix pages with inconsistent color, border, and line-height styles.

Output:
- All pages meet baseline visual consistency.

### Phase 4 - UX Polish + Accessibility
- [ ] Verify text/background contrast.
- [ ] Verify keyboard focus behavior and tab order.
- [ ] Verify aria-label coverage for important icon buttons.
- [ ] Verify user-facing error messages are clear and non-technical.

Output:
- UI is easier to use and more accessible.

---

## 6) Definition of Done (DoD)

The initiative is complete only when:
- [ ] No UI status uses test characters `+ - x`.
- [ ] 100% of in-scope routes are audited using this checklist.
- [ ] Border/divider/label styles are consistent across Public, Supporter, and Organization.
- [ ] Colors and typography follow tokens without arbitrary hardcoding.
- [ ] Responsive behavior passes across 3 core breakpoints.
- [ ] No lint/type-check errors are introduced after refactor.

---

## 7) QA checklist

Functional visual QA:
- [ ] Layout does not break with long text.
- [ ] Layout does not break with empty data.
- [ ] Layout does not break in API error states.
- [ ] Semantic icons match their intended statuses.

Technical QA:
- [ ] `npm run lint` pass.
- [ ] `npx tsc --noEmit` pass.
- [ ] Capture before/after screenshots for key pages for review.

---

## 8) Suggested Tracking

Create a tracking table on the issue board with columns:
- Route
- Owner
- Status (Todo / In Progress / Review / Done)
- Visual score (Before / After)
- Notes

Status labels per route:
- `Done UI`: Tokens + layout + border/divider/label + icon policy complete.
- `Done UX`: State handling/loading/error/empty + responsive + accessibility complete.

---

## 9) Risks and Mitigation

Risks:
- Styling refactors may break existing pages.
- Quick temporary fixes may bypass standards and create inconsistency.
- Missing ownership for each role workspace.

Mitigation:
- Implement in phases and merge in small route-based batches.
- Enforce UI checklist review in PR templates.
- Do not merge if UI still contains test characters `+ - x`.

---

## 10) Priority Order

Suggested order for highest impact:
1. Public campaign pages (`/campaigns`, `/campaigns/[id]`, `/`).
2. Auth pages (`/login`, `/signup/*`).
3. High-traffic organization workspace pages (`/organization`, `/organization/campaigns*`).
4. Supporter workspace pages (`/supporter*`).
5. Remaining lower-traffic pages and features.
