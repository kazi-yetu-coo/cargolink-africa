import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";

export const heroMessages = [
  { first: "Less chasing.", second: "More time." },
  { first: "Better shipping.", second: "Starts here." },
  { first: "Clear costs.", second: "More confidence." },
  { first: "Trusted partners.", second: "Less stress." },
  { first: "One inquiry.", second: "More bids." },
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
          6500,
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
      <h1
        className={`rotating-headline${paused ? " typing-paused" : ""}`}
        aria-label={`${message.first} ${message.second}`}
      >
        <span key={index} className="headline-message" aria-hidden="true">
          {message.first}
          <br />
          <em className="typed-phrase">
            {[...message.second].map((letter, i) => (
              <span
                className="typed-letter"
                key={i}
                style={{ animationDelay: `${850 + i * 75}ms` }}
              >
                {letter === " " ? "\u00a0" : letter}
              </span>
            ))}
            <span
              className="typing-caret"
              style={{
                animationDelay: `${850 + message.second.length * 75}ms`,
              }}
            />
          </em>
        </span>
      </h1>
      <div className="hero-message-controls">
        <div aria-hidden="true" className="hero-message-dots">
          {heroMessages.map((m, i) => (
            <span key={m.first} className={i === index ? "current" : ""} />
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
