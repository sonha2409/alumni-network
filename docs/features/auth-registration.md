# Feature: Authentication (Signup, Login, Logout)

**Feature #2** | Completed: 2026-03-08

## Overview

Email/password authentication using Supabase Auth with a companion `public.users` table for app-specific fields (role, verification status). Includes signup, login, logout, and forgot-password flows.

## Architecture

### Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Proxy as Proxy (proxy.ts)
    participant SA as Server Action
    participant Supabase as Supabase Auth
    participant DB as Postgres

    Note over User,DB: Signup Flow
    User->>Browser: Fill signup form
    Browser->>SA: signup(formData)
    SA->>SA: Zod validation
    SA->>Supabase: auth.signUp({email, password})
    Supabase->>DB: INSERT auth.users
    DB->>DB: Trigger: handle_new_user()
    DB->>DB: INSERT public.users (role=user, status=unverified)
    Supabase-->>SA: { user, session }
    SA-->>Browser: ActionResult<{userId}>
    Browser->>Browser: redirect(/dashboard)

    Note over User,DB: Login Flow
    User->>Browser: Fill login form
    Browser->>SA: login(formData)
    SA->>SA: Zod validation
    SA->>Supabase: auth.signInWithPassword()
    Supabase-->>SA: { session }
    SA->>SA: redirect(/dashboard)

    Note over User,DB: Every Request
    Browser->>Proxy: HTTP request
    Proxy->>Supabase: getUser() (refresh JWT)
    Proxy->>Proxy: Check route protection
    Proxy-->>Browser: Response or redirect
```

### Component Tree

```mermaid
graph TD
    RL[Root Layout] --> AL[Auth Layout - centered, max-w-md]
    RL --> ML[Main Layout - navbar, content area]

    AL --> LP[Login Page - Server Component]
    AL --> SP[Signup Page - Server Component]
    AL --> FP[Forgot Password Page - Server Component]

    LP --> LF[LoginForm - Client Component]
    SP --> SF[SignupForm - Client Component]
    FP --> FF[ForgotPasswordForm - Client Component]

    ML --> DP[Dashboard Page - Server Component]
    DP --> LB[LogoutButton - Client Component]

    LF --> |uses| Actions[Server Actions - actions.ts]
    SF --> |uses| Actions
    FF --> |uses| Actions
    LB --> |uses| Actions
```

### ER Diagram

```mermaid
erDiagram
    AUTH_USERS {
        uuid id PK
        text email
        text encrypted_password
        timestamptz created_at
    }
    PUBLIC_USERS {
        uuid id PK,FK
        text email
        text role "user | moderator | admin"
        text verification_status "unverified | pending | verified | rejected"
        boolean is_active
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }
    AUTH_USERS ||--|| PUBLIC_USERS : "trigger creates"
```

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/00001_create_users_table.sql` | Schema, triggers, RLS policies |
| `src/proxy.ts` | Auth session refresh + route protection |
| `src/app/(auth)/actions.ts` | Server Actions: signup, login, logout, resetPassword |
| `src/app/(auth)/login/login-form.tsx` | Login form (client component) |
| `src/app/(auth)/signup/signup-form.tsx` | Signup form (client component) |
| `src/app/(auth)/forgot-password/forgot-password-form.tsx` | Password reset form |
| `src/app/auth/callback/route.ts` | Code exchange for email flows |
| `src/app/(auth)/actions.test.ts` | Unit tests (13 tests) |

## RLS Policies

| Policy | Table | Effect |
|--------|-------|--------|
| `users_select_own` | public.users | Users can always read their own row |
| `users_select_active` | public.users | Authenticated users can read active users |
| `users_update_own` | public.users | Users can update their own row |
| `admins_select_all` | public.users | Admins can read all users (including inactive) |
| `admins_update_all` | public.users | Admins can update any user |

## Design Decisions

- **No email confirmation in dev**: Simplifies local development. Can be enabled in Supabase dashboard for production.
- **Reset password always returns success**: Prevents email enumeration attacks.
- **Proxy over middleware**: Next.js 16 uses `proxy.ts` convention (default export named `proxy`).
- **`public.users` separate from `profiles`**: Auth/role concerns are distinct from profile data. Profiles (Feature #4) will be a separate table.
- **Trigger-based user creation**: Guarantees `public.users` row exists for every authenticated user, even if signup flow is interrupted.

## Test Coverage

- Signup: validation (email, password length, password match), success, duplicate email, generic errors
- Login: validation (email, password), success (redirect), invalid credentials
- Reset password: validation, success regardless of email existence (anti-enumeration)
