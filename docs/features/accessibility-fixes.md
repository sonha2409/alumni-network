# Feature: Accessibility Fixes (WCAG 2.1 AA)

**Date Implemented**: 2026-03-09
**Status**: Complete
**Related ADRs**: None

## Overview

Batch of accessibility improvements applied across all forms and banners to meet WCAG 2.1 AA compliance. Two categories:

1. **`aria-describedby` on form field errors** — connects error messages to their inputs so screen readers announce errors when the input is focused.
2. **`role` attributes on verification banners** — ensures screen readers announce banner content.

## Changes

### aria-describedby on Field Errors

**Pattern applied to all form inputs with validation errors:**

```tsx
// Before
<Input id="email" aria-invalid={hasError ? true : undefined} />
{hasError && <p className="text-sm text-destructive">{errorMsg}</p>}

// After
<Input
  id="email"
  aria-invalid={hasError ? true : undefined}
  aria-describedby={hasError ? "email-error" : undefined}
/>
{hasError && <p id="email-error" className="text-sm text-destructive">{errorMsg}</p>}
```

**Files modified:**

| File | Fields |
|------|--------|
| `src/app/(auth)/login/login-form.tsx` | email, password |
| `src/app/(auth)/signup/signup-form.tsx` | email, password, confirmPassword |
| `src/app/(auth)/forgot-password/forgot-password-form.tsx` | email |
| `src/app/(main)/onboarding/onboarding-form.tsx` | full_name, graduation_year, primary_industry_id, photo |
| `src/app/(main)/profile/edit/profile-edit-form.tsx` | full_name, graduation_year, bio, primary_industry_id, photo |
| `src/app/(main)/verification/verification-form.tsx` | graduation_year, degree_program, student_id, supporting_info |

### Banner Roles

| Banner | Role | Reason |
|--------|------|--------|
| Pending verification (yellow) | `role="status"` | Informational, not urgent |
| Rejected verification (red) | `role="alert"` | Requires user action |
| Unverified (blue) | `role="status"` | Informational prompt |

## Future Considerations

- **Skip navigation link**: Add a "Skip to main content" link at the top of the page for keyboard users (P2).
- **Focus management**: When form errors appear, consider programmatically moving focus to the first errored field.
- **Color contrast audit**: Run automated contrast checks across all color combinations (P2).
- **Keyboard navigation testing**: Verify all interactive elements are reachable and operable via keyboard.
