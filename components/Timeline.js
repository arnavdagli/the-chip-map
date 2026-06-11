"use client";

import { useState, useMemo } from "react";
import events from "@/data/events.json";
import AskBar from "./AskBar";
import FilterBar from "./FilterBar";
import TimelineNode from "./TimelineNode";
import SidePanel from "./SidePanel";

export default function Timeline() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeCountry, setActiveCountry] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => !activeCategory || e.category === activeCategory)
      .filter((e) => !activeCountry || e.country === activeCountry)
      .sort((a, b) => a.year - b.year);
  }, [activeCategory, activeCountry]);

  // Hide the panel if its event gets filtered out of the timeline
  const visibleSelectedEvent =
    selectedEvent && filteredEvents.some((e) => e.id === selectedEvent.id)
      ? selectedEvent
      : null;

  return (
    <div className="flex h-dvh max-w-[100vw] flex-col overflow-x-hidden overflow-y-hidden bg-[#0a0a0a] md:h-screen">
      <header className="shrink-0 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-5">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 sm:text-xs">
                1947 — Present
              </p>
              <h1 className="font-serif text-xl text-white sm:text-3xl">
                The Chip Map
              </h1>
            </div>
            <p className="hidden shrink-0 font-mono text-xs text-white/30 sm:block">
              scroll →
            </p>
          </div>
          <p className="mt-1 hidden max-w-2xl text-sm leading-relaxed text-white/50 md:block">
            A curated educational timeline of semiconductor inventions,
            companies, trade disputes, and policy milestones.
          </p>
          <AskBar />
        </div>
      </header>

      <FilterBar
        activeCategory={activeCategory}
        activeCountry={activeCountry}
        onCategoryChange={setActiveCategory}
        onCountryChange={setActiveCountry}
      />

      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        {filteredEvents.length === 0 ? (
          <p className="flex h-full items-center justify-center font-mono text-sm text-white/40">
            No events match the current filters.
          </p>
        ) : (
          <div className="timeline-scroll h-full w-full max-w-full overflow-x-auto overflow-y-hidden">
            <div className="relative flex h-full w-max items-center py-2 pl-4 pr-8 sm:py-4 sm:pl-10 sm:pr-12">
              <div className="pointer-events-none absolute left-4 right-8 top-1/2 h-px -translate-y-px bg-gradient-to-r from-white/5 via-white/25 to-white/5 sm:left-10 sm:right-12" />

              <div className="relative flex items-center">
                {filteredEvents.map((event, index) => (
                  <TimelineNode
                    key={event.id}
                    event={event}
                    index={index}
                    isActive={visibleSelectedEvent?.id === event.id}
                    onClick={setSelectedEvent}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="shrink-0 border-t border-white/10 px-4 py-2 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-[10px] leading-relaxed text-white/25 sm:text-xs">
            Educational project · inspired by{" "}
            <span className="text-white/40">Chip War</span> — Chris Miller
          </p>
        </div>
      </footer>

      {visibleSelectedEvent && (
        <SidePanel
          // Remount per event so all panel state (explanation, chat) resets
          key={visibleSelectedEvent.id}
          event={visibleSelectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
