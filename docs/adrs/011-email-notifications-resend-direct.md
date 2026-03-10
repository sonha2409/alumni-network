# ADR 011: Email Notifications via Resend (Direct Send)

## Status
Accepted

## Date
2026-03-10

## Context
Users miss important events (connection requests, messages, verification updates) when they're not actively using the app. Email notifications solve this by reaching users outside the platform.

We evaluated three approaches:
1. **Resend SDK (Direct Send)** — call `resend.emails.send()` from the existing `notifyUser()` helper
2. **Supabase Edge Function + Resend** — database webhook triggers an Edge Function that sends emails
3. **Resend SDK + pg_cron** — direct send for immediate emails, `pg_cron` for delayed/batched emails (e.g., "unread message after 15 min")

## Decision
**Option 1: Resend SDK (Direct Send)** for Phase 1.

### Why
- Minimal infrastructure: no Edge Functions, no webhooks, no cron jobs
- Natural fit: `notifyUser()` already fires for every notification event — adding email is one extra async call
- Resend free tier (100 emails/day) is sufficient for early adoption
- Fire-and-forget pattern: email failure never blocks the primary user action
- Graceful degradation: if `RESEND_API_KEY` is not configured, emails are silently skipped

### Trade-offs accepted
- No delayed emails (e.g., "email only if message unread after 15 min") — emails are sent immediately
- No retry mechanism on transient Resend failures
- No email delivery tracking in our database
- No weekly digest emails

## Architecture

```
User Action (e.g., send connection request)
  └─> Server Action
        └─> notifyUser(userId, type, title, body, link, emailContext)
              ├─> RPC create_notification() → in-app (unchanged)
              └─> sendEmailNotification() → async, fire-and-forget
                    ├─> Check notification_preferences (email_enabled?)
                    ├─> Look up user email from public.users
                    ├─> Build HTML template
                    └─> Resend API → email delivered
```

### Unsubscribe flow
- Every email includes an unsubscribe link with a base64url-encoded token (`userId:notificationType`)
- `GET /api/unsubscribe?token=...` → uses SECURITY DEFINER function to upsert preference (no login required)
- Users can also manage preferences at `/settings/notifications`

## Future Scaling Options

### Option 2: Supabase Edge Function + Resend (recommended for Phase 2)
When to switch: if email sending causes noticeable latency in Server Actions, or if we need delayed/batched emails.

```
notification INSERT trigger → Database Webhook → Edge Function
  └─> Check preferences
  └─> Build template
  └─> Resend API
```

**Pros**: Fully decoupled from Next.js request cycle. Edge Functions can be retried independently. Can add delay logic (check if notification is still unread after N minutes before sending).

**Cons**: Requires Supabase Edge Functions deployment pipeline. Harder to test locally. More infrastructure to maintain.

### Option 3: pg_cron + Resend (recommended for digest emails)
When to switch: when we need weekly digest emails or "unread after 15 min" delayed notifications.

```
pg_cron (every 15 min) → calls Edge Function / API route
  └─> Query: unread notifications older than 15 min where email not yet sent
  └─> For each: check preferences → build template → Resend API
  └─> Mark email_sent_at on the notification row
```

**Requires**: Adding `email_sent_at` column to `notifications` table. Setting up pg_cron extension in Supabase.

### Option 4: Resend + Webhooks for delivery tracking
When to switch: when we need to track bounces, opens, and clicks for deliverability monitoring.

- Resend webhooks POST to our API route on delivery/bounce/complaint events
- Store delivery status in a `email_delivery_log` table
- Auto-suppress emails to bouncing addresses

## Deployment Requirements

Email delivery is **not active in local dev** — `RESEND_API_KEY` is intentionally unset, and `sendEmail()` logs a warning and returns early. This is by design: local dev validates code paths without sending real emails.

To activate in production:
1. Verified sending domain on Resend (required for `re_live_` API keys)
2. `RESEND_FROM_EMAIL` must match the verified domain (e.g., `notifications@alumnet.app`)
3. `NEXT_PUBLIC_SITE_URL` must be the production URL (used in CTA links and unsubscribe URLs)

### Staging testing path
- Use `re_test_` API key — Resend accepts the call, logs it in the dashboard, but does not deliver
- Useful for verifying the full code path (preferences check → template build → API call) without spamming real inboxes
- Check Resend dashboard "Logs" tab to confirm emails were received by the API

### Known limitations to address before launch
- **No email rendering QA**: templates use inline CSS and should render correctly in most clients, but no cross-client testing has been done. Test in Gmail, Outlook, and Apple Mail.
- **Unsubscribe token is not signed**: the base64url token is decodable (not encrypted). This is acceptable because unsubscribing is a low-risk action (an attacker could only disable someone's email notifications, not enable them or access data). If this becomes a concern, add HMAC signing with `RESEND_UNSUBSCRIBE_SECRET`.
- **No duplicate suppression**: if `notifyUser()` is called multiple times for the same event (e.g., retry logic), multiple emails could be sent. Current call sites are not retried, so this is not an issue today.

## Consequences
- Email notifications work immediately for all notification types except announcements
- Users can opt out per notification type via settings page or one-click unsubscribe
- Local development works without Resend (emails silently skipped)
- Production requires `RESEND_API_KEY` and a verified sending domain
- Actual email delivery testing is deferred to staging/production deployment (Feature #35)
