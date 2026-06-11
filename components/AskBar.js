"use client";

import { useState, useRef } from "react";

const SUGGESTIONS = [
  "When was TSMC founded?",
  "What is the CHIPS Act?",
  "What happened with Huawei and export controls?",
];

async function readStream(res, onChunk) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onChunk(text);
  }

  return text;
}

export default function AskBar() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  async function ask(question) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setOpen(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Keep within the server's conversation-length limit
        body: JSON.stringify({ messages: updatedMessages.slice(-12) }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get answer");
      }

      await readStream(res, (text) => {
        setMessages([...updatedMessages, { role: "assistant", content: text }]);
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message);
      setMessages(updatedMessages);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    ask(input);
  }

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-lg py-1 text-left transition-colors hover:text-white"
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-violet-400/80">
          Ask the timeline
        </span>
        <span className="font-mono text-xs text-white/30">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open && (
        <div className="mt-3 max-h-48 overflow-y-auto sm:max-h-56">
          <p className="mb-2 font-mono text-[10px] text-white/30">
            AI-generated answers · verify independently
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Ask anything about chip geopolitics…"
              disabled={loading}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white placeholder:text-white/25 outline-none focus:border-violet-500/40 sm:text-sm"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 font-mono text-xs text-violet-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/20 disabled:opacity-40 sm:px-4 sm:text-sm"
            >
              Ask
            </button>
          </form>

          {messages.length === 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] text-white/40 transition-colors hover:border-white/20 hover:text-white/60 sm:text-xs"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-3 font-mono text-xs text-red-400">{error}</p>
          )}

          {lastAssistant && (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-white/30">
                AI-generated answer
              </p>
              <p className="text-sm leading-relaxed text-white/75">
                {lastAssistant.content}
                {loading && !lastAssistant.content && (
                  <span className="inline-block h-4 w-0.5 animate-pulse bg-white/60" />
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
