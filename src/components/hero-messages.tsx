import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  BadgeCheck,
  Clock3,
  ListChecks,
  PackageCheck,
  Pause,
  Play,
} from "lucide-react";

export const heroMessages = [
  {
    first: "Better shipping",
    last: "starts",
    accent: "here.",
    label: "One simple inquiry",
    Icon: PackageCheck,
  },
  {
    first: "Clear costs.",
    last: "More",
    accent: "confidence.",
    label: "Compare the full breakdown",
    Icon: ListChecks,
  },
  {
    first: "Less chasing.",
    last: "More",
    accent: "time.",
    label: "One request. Multiple bids.",
    Icon: Clock3,
  },
  {
    first: "Trusted partners.",
    last: "Less",
    accent: "stress.",
    label: "Verified logistics providers",
    Icon: BadgeCheck,
  },
  {
    first: "Let providers",
    last: "compete for",
    accent: "you.",
    label: "Your shipment. Your choice.",
    Icon: ArrowRightLeft,
  },
];
export function useHeroMessages() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      if (!paused && !motion.matches && !document.hidden) {
        timer = setInterval(
          () => setIndex((i) => (i + 1) % heroMessages.length),
          5500,
        );
      }
    };
    sync();
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [paused]);
  return { index, paused, setPaused };
}
export function HeroHeadline({
  index,
  paused,
  onToggle,
}: {
  index: number;
  paused: boolean;
  onToggle: () => void;
}) {
  const message = heroMessages[index];
  return (
    <>
      <h1 className="rotating-headline">
        <span key={index} className="headline-message">
          {message.first}
          <br />
          {message.last} <em>{message.accent}</em>
        </span>
      </h1>
      <div className="hero-message-controls">
        <div aria-hidden="true" className="hero-message-dots">
          {heroMessages.map((m, i) => (
            <span key={m.label} className={i === index ? "current" : ""} />
          ))}
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label={paused ? "Play hero headlines" : "Pause hero headlines"}
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
        </button>
      </div>
    </>
  );
}
export function HeroValueIcon({ index }: { index: number }) {
  const { Icon, label } = heroMessages[index];
  return (
    <div
      key={index}
      className={`hero-value-icon hero-value-position-${index}`}
      aria-hidden="true"
    >
      <span>
        <Icon size={25} />
      </span>
      <strong>{label}</strong>
    </div>
  );
}
