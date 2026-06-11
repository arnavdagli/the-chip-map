const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_TRACKED_IPS = 5_000;

// Best-effort, per-instance rate limiting. On serverless platforms each
// instance keeps its own counters, so this is a damper rather than a hard
// guarantee — pair it with platform-level protection (e.g. Vercel WAF).
const hits = new Map();

export function rateLimit(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const now = Date.now();

  if (hits.size > MAX_TRACKED_IPS) {
    for (const [key, timestamps] of hits) {
      if (timestamps.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(ip, recent);
    return false;
  }

  recent.push(now);
  hits.set(ip, recent);
  return true;
}

export function rateLimitResponse() {
  return Response.json(
    { error: "Too many requests. Please wait a minute and try again." },
    { status: 429 }
  );
}

const MAX_MESSAGES = 16;
const MAX_USER_CONTENT_LENGTH = 1_000;
const MAX_ASSISTANT_CONTENT_LENGTH = 4_000;

// Only user/assistant roles pass through, with bounded lengths, so clients
// cannot inject system prompts or use the endpoint as a generic LLM proxy.
export function sanitizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  if (messages.length > MAX_MESSAGES) return null;

  const clean = [];
  for (const m of messages) {
    if (!m || typeof m.content !== "string") return null;
    if (m.role !== "user" && m.role !== "assistant") return null;
    const maxLength =
      m.role === "user"
        ? MAX_USER_CONTENT_LENGTH
        : MAX_ASSISTANT_CONTENT_LENGTH;
    if (m.content.length === 0 || m.content.length > maxLength) return null;
    clean.push({ role: m.role, content: m.content });
  }
  return clean;
}
