import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import type { FreightLocation } from "../lib/types";
export const popularRoutes = [
  ["Dar es Salaam", "Tanzania", "Kigali", "Rwanda"],
  ["Mombasa", "Kenya", "Kampala", "Uganda"],
  ["Nairobi", "Kenya", "Arusha", "Tanzania"],
  ["Dar es Salaam", "Tanzania", "Lusaka", "Zambia"],
  ["Lagos", "Nigeria", "Accra", "Ghana"],
  ["Durban", "South Africa", "Johannesburg", "South Africa"],
].map(([origin, country, destination, destinationCountry]) => ({
  origin: { name: origin, country, type: "City", code: "" } as FreightLocation,
  destination: {
    name: destination,
    country: destinationCountry,
    type: "City",
    code: "",
  } as FreightLocation,
}));
export function PopularRoutes({
  onSelect,
}: {
  onSelect: (route: (typeof popularRoutes)[number]) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false),
    [interacting, setInteracting] = useState(false);
  function slide(direction: number) {
    const el = track.current;
    if (!el) return;
    const end = el.scrollWidth - el.clientWidth;
    const next =
      direction > 0 && el.scrollLeft >= end - 4
        ? 0
        : direction < 0 && el.scrollLeft <= 4
          ? end
          : el.scrollLeft + direction * 260;
    el.scrollTo({
      left: next,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  useEffect(() => {
    if (
      paused ||
      interacting ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = setInterval(() => {
      if (!document.hidden) slide(1);
    }, 4500);
    return () => clearInterval(timer);
  }, [paused, interacting]);
  return (
    <section
      className="popular-route-slider"
      aria-label="Popular freight routes"
      aria-roledescription="carousel"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false);
      }}
    >
      <div className="route-slider-heading">
        <strong>Popular routes</strong>
        <div>
          <button
            type="button"
            className="icon-button"
            aria-label="Previous routes"
            onClick={() => slide(-1)}
          >
            <ArrowLeft size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={
              paused ? "Play route slideshow" : "Pause route slideshow"
            }
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Next routes"
            onClick={() => slide(1)}
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
      <div className="route-slider-track" ref={track}>
        {popularRoutes.map((r) => (
          <button
            type="button"
            className="route-chip"
            key={r.origin.name + r.destination.name}
            onClick={() => onSelect(r)}
          >
            <span>{r.origin.name}</span>
            <ArrowRight size={14} />
            <span>{r.destination.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
