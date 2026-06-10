import events from "@/data/events.json";
import { streamGroqChat } from "@/lib/groq";

const timelineContext = [...events]
  .sort((a, b) => a.year - b.year)
  .map((e) => `${e.year}: ${e.title} — ${e.shortDescription}`)
  .join("\n");

export async function POST(request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question, messages } = body;

  if (!question?.trim() && !messages?.length) {
    return Response.json(
      { error: "Missing required field: question" },
      { status: 400 }
    );
  }

  const conversation = messages?.length
    ? messages
    : [{ role: "user", content: question.trim() }];

  const systemPrompt = `You are an educational assistant answering questions about semiconductor industry history. The reader is technically literate but not an expert.

You have access to this curated timeline (1947–present):

${timelineContext}

Rules:
- Use neutral, factual language only.
- Prefer events and descriptions from the timeline above. Do not invent facts, statistics, or quotes.
- If a question cannot be answered from the timeline, say that clearly and avoid speculation.
- Keep answers to 3-5 sentences.
- If asked something outside semiconductors, briefly redirect.`;

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...conversation.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    const result = await streamGroqChat({
      apiKey,
      messages: groqMessages,
      maxTokens: 350,
    });

    if (result.error) {
      return Response.json(
        { error: "Groq API error", details: result.error },
        { status: result.status }
      );
    }

    return result.stream;
  } catch (err) {
    return Response.json(
      { error: "Failed to reach Groq API", details: err.message },
      { status: 502 }
    );
  }
}
