import events from "@/data/events.json";
import { streamGroqChat } from "@/lib/groq";
import {
  rateLimit,
  rateLimitResponse,
  sanitizeMessages,
} from "@/lib/apiGuards";

const timelineContext = [...events]
  .sort((a, b) => a.year - b.year)
  .map((e) => `${e.year}: ${e.title} — ${e.shortDescription}`)
  .join("\n");

const MAX_QUESTION_LENGTH = 1_000;

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

  const { question, messages } = body ?? {};

  let conversation;
  if (messages?.length) {
    conversation = sanitizeMessages(messages);
  } else if (
    typeof question === "string" &&
    question.trim() &&
    question.length <= MAX_QUESTION_LENGTH
  ) {
    conversation = [{ role: "user", content: question.trim() }];
  }

  if (!conversation) {
    return Response.json(
      { error: "Invalid or missing question" },
      { status: 400 }
    );
  }

  const systemPrompt = `You are an educational assistant answering questions about semiconductor industry history. The reader is technically literate but not an expert.

You have access to this curated timeline (1947–present):

${timelineContext}

Rules:
- Use neutral, factual language only.
- Prefer events and descriptions from the timeline above. Do not invent facts, statistics, or quotes.
- If a question cannot be answered from the timeline, say that clearly and avoid speculation.
- Keep answers to 3-5 sentences.
- If asked something outside semiconductors, briefly redirect.`;

  try {
    const result = await streamGroqChat({
      apiKey,
      messages: [{ role: "system", content: systemPrompt }, ...conversation],
      maxTokens: 350,
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
