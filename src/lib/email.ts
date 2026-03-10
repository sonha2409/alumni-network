import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail =
  process.env.RESEND_FROM_EMAIL ?? "AlumNet <onboarding@resend.dev>";

let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resendApiKey) {
    return null;
  }
  if (!resend) {
    resend = new Resend(resendApiKey);
  }
  return resend;
}

/**
 * Send an email via Resend. Fire-and-forget — errors are logged but never thrown.
 * If RESEND_API_KEY is not set, silently skips (allows local dev without email).
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const client = getResendClient();

  if (!client) {
    console.warn("[Email] RESEND_API_KEY not configured — skipping email send");
    return;
  }

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[Email:send]", {
        to,
        subject,
        error: error.message,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email:send]", { to, subject, error: message });
  }
}
