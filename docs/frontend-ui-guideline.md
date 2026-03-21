# Frontend UI Guideline (Wave 1 Baseline)

Updated on: `2026-03-22`
Owner: `frontend`

## 1) Design Tokens First
- Use semantic tokens from `frontend/app/globals.css` for all colors, border, radius, shadow, and typography.
- Do not hardcode color hex values in page/component className or inline style.
- Use spacing scale only: `4/8/12/16/20/24/32/40`.
- Prefer shared utility classes (`card-base`, `btn-base`, `input-base`, `divider-line`, `state-panel*`) over ad-hoc styling.

## 2) Status + Icon Policy
- Use `lucide-react` for status and feedback icons.
- Use shared status API:
  - `getStatusMeta(kind, value)`
  - `<StatusBadge kind value size showIcon />`
- Required semantic mapping:
  - Success: check-circle pattern
  - Warning: alert/clock pattern
  - Error: x-circle pattern
  - Info: info-circle pattern
  - Neutral/Pending: dot/clock pattern
- Status must always be icon + text label (never icon-only unless explicitly decorative).

## 3) Form and State Components
- Use `<FormField />` for label + required + helper + error pattern.
- Use `<StatePanel />` for loading/empty/error/success/info/warning states.
- Keep input state behavior consistent: default, focus, error, disabled, readonly.

## 4) Missing Value Policy
- Public/Auth scope must not display bare `"-"` for missing values.
- Use `<MissingValue />` with:
  - default: `Not available`
  - compact tabular fallback when needed: `N/A`

## 5) Accessibility Checks (Minimum)
- Icon buttons must have `aria-label`.
- Error states should use `role="alert"` (already handled in `FormField` and `StatePanel` where applicable).
- Verify keyboard focus visibility on interactive elements.
