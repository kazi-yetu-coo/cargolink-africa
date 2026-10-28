import { useState } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import type { FreightLocation } from "../lib/types";
// Illustrative design data only. Replace with an approved public tariff feed, never private bids.
export const popularRoutes = [
  [
    "Dar es Salaam",
    "Tanzania",
    "Shanghai",
    "China",
    "Dar – China",
    "USD 1,850",
    "/ 20ft container",
  ],
  [
    "Shanghai",
    "China",
    "Dar es Salaam",
    "Tanzania",
    "China – Dar",
    "USD 2,450",
    "/ 20ft container",
  ],
  [
    "Mombasa",
    "Kenya",
    "Kampala",
    "Uganda",
    "Mombasa – Kampala",
    "USD 1,200",
    "/ 10t truck",
  ],
  [
    "Dar es Salaam",
    "Tanzania",
    "Kigali",
    "Rwanda",
    "Dar – Kigali",
    "USD 1,650",
    "/ 10t truck",
  ],
  [
    "Nairobi",
    "Kenya",
    "Arusha",
    "Tanzania",
    "Nairobi – Arusha",
    "USD 450",
    "/ 3t truck",
  ],
].map(
  ([origin, country, destination, destinationCountry, label, rate, scope]) => ({
    origin: {
      name: origin,
      country,
      type:
        country === "China" || destinationCountry === "China" ? "Port" : "City",
      code: "",
    } as FreightLocation,
    destination: {
      name: destination,
      country: destinationCountry,
      type:
        country === "China" || destinationCountry === "China" ? "Port" : "City",
      code: "",
    } as FreightLocation,
    service:
      country === "China" || destinationCountry === "China"
        ? "Ocean Freight"
        : "Trucking",
    label,
    rate,
    scope,
  }),
);
export function PopularRoutes({
  onSelect,
}: {
  onSelect: (route: (typeof popularRoutes)[number]) => void;
}) {
  const [paused, setPaused] = useState(false);
  return (
    <section
      className={`rate-marquee ${paused ? "is-paused" : ""}`}
      aria-label="Popular routes with illustrative example rates"
    >
      <div className="marquee-label">
        <strong>Popular Routes:</strong>
        <small>EXAMPLE RATES</small>
      </div>
      <div className="marquee-window">
        <div className="marquee-belt">
          {[0, 1].map((copy) => (
            <div
              className="marquee-group"
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {popularRoutes.map((r) => (
                <button
                  key={r.label}
                  tabIndex={copy === 1 ? -1 : 0}
                  onClick={() => onSelect(r)}
                  className="marquee-item"
                  title="Example only, not a live offer. Freight only; duties, insurance and local charges excluded. Request a current quotation."
                >
                  <span className="marquee-route">{r.label}</span>
                  <strong>{r.rate}</strong>
                  <span className="marquee-scope">{r.scope}</span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="icon-button"
        aria-label={paused ? "Play route marquee" : "Pause route marquee"}
        onClick={() => setPaused((p) => !p)}
      >
        {paused ? <Play size={14} /> : <Pause size={14} />}
      </button>
    </section>
  );
}
