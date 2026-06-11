import events from "@/data/events.json";
import { streamGroqChat } from "@/lib/groq";
import { rateLimit, rateLimitResponse } from "@/lib/apiGuards";

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

  const systemPrompt = `You are an educational assistant summarizing semiconductor industry history. Use only the event context provided. Write in neutral, factual language for a technically literate reader. Do not speculate, editorialize, or add facts not supported by the context. If uncertain, say so briefly. Keep answers to 3-4 sentences.`;

  const userPrompt = `Event: ${event.title} (${event.year})\nContext: ${event.shortDescription}\n\nSummarize why this event is noted in semiconductor industry history.`;

  try {
    const result = await streamGroqChat({
      apiKey,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
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
