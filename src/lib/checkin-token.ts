import crypto from "crypto";

function getSecret(): string {
  const secret = process.env.QR_CHECKIN_SECRET;
  if (!secret) {
    throw new Error(
      "QR_CHECKIN_SECRET environment variable is required for check-in tokens"
    );
  }
  return secret;
}

interface TokenPayload {
  eventId: string;
  nonce: string;
  issuedAt: number;
  signature: string;
}

const TOKEN_TTL_SECONDS = 90;

export function signCheckinToken(eventId: string): {
  token: string;
  expiresAt: number;
} {
  const secret = getSecret();
  const nonce = crypto.randomBytes(8).toString("hex");
  const issuedAt = Math.floor(Date.now() / 1000);
  const message = `${eventId}:${nonce}:${issuedAt}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("base64url");

  const payload: TokenPayload = { eventId, nonce, issuedAt, signature };
  const token = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return { token, expiresAt: issuedAt + TOKEN_TTL_SECONDS };
}

export function verifyCheckinToken(
  token: string,
  expectedEventId: string
): { valid: true } | { valid: false; error: string } {
  const secret = getSecret();

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(token, "base64url").toString());
  } catch {
    return { valid: false, error: "malformed_token" };
  }

  const { eventId, nonce, issuedAt, signature } = payload;

  if (
    typeof eventId !== "string" ||
    typeof nonce !== "string" ||
    typeof issuedAt !== "number" ||
    typeof signature !== "string"
  ) {
    return { valid: false, error: "malformed_token" };
  }

  if (eventId !== expectedEventId) {
    return { valid: false, error: "event_mismatch" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - issuedAt > TOKEN_TTL_SECONDS) {
    return { valid: false, error: "token_expired" };
  }

  const message = `${eventId}:${nonce}:${issuedAt}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("base64url");

  if (
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return { valid: false, error: "invalid_signature" };
  }

  return { valid: true };
}
