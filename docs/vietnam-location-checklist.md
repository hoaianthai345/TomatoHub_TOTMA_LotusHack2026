Vietnam Location Checklist

Purpose
- Reuse one shared Vietnam administrative-location flow across supporter signup, organization signup, campaign creation, and later beneficiary forms.
- Avoid free-text province or district fields so data stays consistent.

Current repo decision
- Use `https://provinces.open-api.vn/api/v1` for now.
- Reason: the backend still stores user `location` as a string and campaign location as `province`, `district`, and `address_line`, so v1 matches the current schema better than v2.
- Revisit v2 only after backend models stop depending on legacy district fields.

Shared frontend files
- `frontend/lib/api/vietnam-location.ts`
- `frontend/components/location/VietnamLocationFields.tsx`
- `frontend/types/location.ts`

Checklist before using in a new form
1. Decide whether the form needs only `province + district`, or `province + district + ward`.
2. Decide whether the form needs `addressLine`.
3. Store codes and labels in local UI state through `VietnamLocationValue`.
4. Serialize to backend payload only at submit time.
5. For user profile-like fields, use `formatVietnamLocationLabel(...)` and save a single string.
6. For campaign-like fields, submit `provinceName`, `districtName`, and `addressLine` separately.
7. Do not call `depth=3`; fetch districts and wards lazily to reduce load and follow API guidance.
8. Show loading and error states in the shared component, not duplicated per page.
9. Keep the API base URL in env via `NEXT_PUBLIC_VN_ADMIN_API_BASE_URL`.
10. If backend migrates to post-07/2025 administrative data, switch the base URL and review every serializer first.

Next useful extensions
- Add a reverse-geocoding step if the product later needs GPS-based auto-detect.
- Add backend validation/enums if location needs stronger reporting consistency.
- Add tests around the shared location serializer and component interactions.
