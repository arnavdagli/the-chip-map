import events from "@/data/events.json";
import { streamGroqChat } from "@/lib/groq";
import {
  rateLimit,
  rateLimitResponse,
  sanitizeMessages,
} from "@/lib/apiGuards";

const eventById = new Map(events.map((e) => [e.id, e]));

export async function POST(request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 }
    );
  }

  if (!rateLimit(request)) return rateLimitResponse();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Events are looked up server-side so clients can't inject arbitrary
  // prompt content through title/description fields.
  const event = eventById.get(body?.id);
  if (!event) {
    return Response.json({ error: "Unknown event id" }, { status: 400 });
  }

  const messages = sanitizeMessages(body?.messages);
  if (!messages) {
    return Response.json(
      { error: "Invalid or missing messages" },
      { status: 400 }
    );
  }

  const systemPrompt = `You are an educational assistant answering follow-up questions about a semiconductor industry event. The reader is technically literate but not an expert.

Event: ${event.title} (${event.year})
Context: ${event.shortDescription}

Rules:
- Use neutral, factual language only.
- Base answers on the event context above. Do not invent statistics, quotes, or outcomes.
- If you are unsure or the question goes beyond the context, say you cannot confirm from this entry.
- Keep answers to 2-4 sentences.
- If asked something unrelated to this event or semiconductors, briefly redirect.`;

  try {
    const result = await streamGroqChat({
      apiKey,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      maxTokens: 250,
    });

    if (result.error) {
      console.error("Groq API error:", result.status, result.error);
      return Response.json(
        { error: "The AI service returned an error. Please try again." },
        { status: 502 }
      );
    }

    return result.stream;
  } catch (err) {
    console.error("Failed to reach Groq API:", err);
    return Response.json(
      { error: "Could not reach the AI service. Please try again." },
      { status: 502 }
    );
  }
}
