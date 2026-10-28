import { Children, useEffect, useRef, useState, type ReactNode } from "react";

/** Native scrolling pins the story only when both slides fit comfortably. */
export function ScrollStory({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const panels = [...element.querySelectorAll<HTMLElement>(".story-panel")];
      const fits =
        !media.matches &&
        window.innerWidth >= 1101 &&
        panels.every((panel) => panel.scrollHeight <= window.innerHeight - 160);
      setPinned(fits);
      // Start fading as soon as the stage reaches its sticky position.
      // A short native scroll completes the transition; no wheel interception.
      const progress = fits
        ? Math.min(
            1,
            Math.max(
              0,
              (80 - element.getBoundingClientRect().top) /
                (window.innerHeight * 0.28),
            ),
          )
        : 0;
      element.style.setProperty("--story-progress", String(progress));
      setActive(progress >= 0.5 ? 1 : 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    element
      .querySelectorAll(".story-panel")
      .forEach((panel) => observer.observe(panel));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", schedule);
    };
  }, []);
  return (
    <div
      ref={root}
      id="how-it-works"
      className={`scroll-story${pinned ? " is-pinned" : ""}`}
    >
      <div className="story-stage">
        {Children.map(children, (child, index) => (
          <div
            className={`story-panel${active === index ? " is-active" : ""}`}
            inert={pinned && active !== index}
            aria-hidden={pinned && active !== index ? true : undefined}
          >
            {child}
          </div>
        ))}
        {pinned && (
          <div className="story-position" aria-hidden="true">
            <span className={active === 0 ? "current" : ""} />
            <span className={active === 1 ? "current" : ""} />
            <small>
              {active === 0
                ? "How shipping works"
                : "Start with a conversation"}{" "}
              · Scroll to explore
            </small>
          </div>
        )}
      </div>
    </div>
  );
}
