"use client";

import { useState, useEffect, useRef } from "react";
import { CATEGORY_COLORS, COUNTRY_FLAGS, COUNTRY_LABELS } from "@/lib/constants";

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

export default function SidePanel({ event, onClose }) {
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetched, setFetched] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const abortRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    setExplanation("");
    setError(null);
    setFetched(false);
    setLoading(false);
    setChatMessages([]);
    setChatInput("");
    setChatLoading(false);
    closeButtonRef.current?.focus();

    // Cancel any in-flight AI request when switching events or unmounting,
    // so a stale stream can't paint onto the wrong event.
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [event?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, explanation]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!event) return null;

  const colors = CATEGORY_COLORS[event.category];

  async function fetchExplanation() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setExplanation("");
    setChatMessages([]);
    setFetched(true);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: event.title,
          year: event.year,
          shortDescription: event.shortDescription,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get explanation");
      }

      const text = await readStream(res, setExplanation);
      setChatMessages([{ role: "assistant", content: text }]);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  async function sendChatMessage(e) {
    e.preventDefault();
    const question = chatInput.trim();
    if (!question || chatLoading || !explanation) return;

    const userMessage = { role: "user", content: question };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);

    const assistantPlaceholder = { role: "assistant", content: "" };
    setChatMessages([...updatedMessages, assistantPlaceholder]);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: event.title,
          year: event.year,
          shortDescription: event.shortDescription,
          messages: updatedMessages,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get answer");
      }

      await readStream(res, (text) => {
        setChatMessages([...updatedMessages, { role: "assistant", content: text }]);
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      setChatMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: `Sorry, something went wrong: ${err.message}`,
        },
      ]);
    } finally {
      if (!controller.signal.aborted) setChatLoading(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:bg-black/40"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-panel-title"
        className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-white/10 bg-[#111111] shadow-2xl sm:w-[420px] lg:w-[480px] animate-slide-in"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-white/10 p-6">
          <div className="flex-1 pr-4">
            <p className="font-mono text-sm text-white/40">{event.year}</p>
            <h2
              id="side-panel-title"
              className="font-serif text-2xl leading-tight text-white"
            >
              {event.title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close panel"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs ${colors.bg} ${colors.border} ${colors.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
              {colors.label}
            </span>
            <span className="font-mono text-xs text-white/50">
              {COUNTRY_FLAGS[event.country]} {COUNTRY_LABELS[event.country]}
            </span>
          </div>

          <p className="mb-8 text-sm leading-relaxed text-white/60">
            {event.shortDescription}
          </p>

          {!fetched && (
            <button
              onClick={fetchExplanation}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 font-mono text-sm text-white transition-all hover:border-white/40 hover:bg-white/10"
            >
              What happened?
            </button>
          )}

          {loading && !explanation && (
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-wider text-white/30">
                Analyzing…
              </p>
              <div className="space-y-2">
                <div className="h-3 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-4/6 animate-pulse rounded bg-white/10" />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="font-mono text-sm text-red-400">{error}</p>
              <button
                onClick={fetchExplanation}
                className="mt-3 font-mono text-xs text-red-300 underline hover:text-red-200"
              >
                Try again
              </button>
            </div>
          )}

          {explanation && (
            <div className="space-y-6">
              <div>
                <p className="mb-1 font-mono text-xs uppercase tracking-wider text-white/30">
                  AI-generated summary
                </p>
                <p className="mb-3 font-mono text-[10px] text-white/25">
                  Verify independently · based on this event entry only
                </p>
                <p className="text-sm leading-relaxed text-white/80">
                  {explanation}
                </p>
              </div>

              {chatMessages.length > 1 && (
                <div className="space-y-4 border-t border-white/10 pt-6">
                  <p className="font-mono text-xs uppercase tracking-wider text-white/30">
                    Follow-up
                  </p>
                  {chatMessages.slice(1).map((msg, i) => (
                    <div
                      key={i}
                      className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "ml-4 border border-white/10 bg-white/5 text-white/90"
                          : "mr-4 text-white/70"
                      }`}
                    >
                      {msg.content}
                      {chatLoading &&
                        msg.role === "assistant" &&
                        !msg.content && (
                          <span className="inline-block h-4 w-0.5 animate-pulse bg-white/60" />
                        )}
                    </div>
                  ))}
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {explanation && !loading && (
          <form
            onSubmit={sendChatMessage}
            className="shrink-0 border-t border-white/10 p-4"
          >
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-white/30">
              Ask about this event
            </p>
            <p className="mb-2 font-mono text-[10px] text-white/25">
              AI-generated · may contain errors
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="e.g. Who benefited most?"
                disabled={chatLoading}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-xs text-white placeholder:text-white/25 outline-none focus:border-white/25"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="shrink-0 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 font-mono text-xs text-white transition-all hover:border-white/40 disabled:opacity-40"
              >
                Ask
              </button>
            </div>
          </form>
        )}
      </aside>
    </>
  );
}
