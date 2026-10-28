import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import {
  googlePlacesConfigured,
  loadPlaces,
  type PlacePrediction,
} from "../lib/google-places";
import { searchLocations } from "../lib/locations";
import type { FreightLocation } from "../lib/types";
export function RoadLocationInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value?: FreightLocation;
  onChange: (value: FreightLocation | undefined) => void;
  error?: string;
}) {
  const id = useId(),
    [query, setQuery] = useState(value?.name || ""),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(0),
    [predictions, setPredictions] = useState<PlacePrediction[]>([]),
    [busy, setBusy] = useState(false),
    [unavailable, setUnavailable] = useState(false);
  const token = useRef<object | undefined>(undefined),
    selection = useRef(0),
    wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setQuery(value?.name || "");
  }, [value?.name]);
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    let cancelled = false;
    setPredictions([]);
    if (!open || query.trim().length < 3 || !googlePlacesConfigured) {
      setBusy(false);
      return;
    }
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const library = await loadPlaces();
        token.current ||= new library.AutocompleteSessionToken();
        const result =
          await library.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            sessionToken: token.current,
            language: "en",
          });
        if (!cancelled) {
          setPredictions(
            result.suggestions.flatMap((s) =>
              s.placePrediction ? [s.placePrediction] : [],
            ),
          );
          setUnavailable(false);
        }
      } catch {
        if (!cancelled) setUnavailable(true);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      cancelled = true;
    };
  }, [query, open]);
  const fallback = predictions.length
    ? []
    : searchLocations(query, ["City", "Inland terminal", "Address"]);
  const count = predictions.length + fallback.length + 1;
  function chooseAddress(name: string, placeId?: string) {
    setQuery(name);
    onChange({
      name,
      country: "Not specified",
      type: "Address",
      code: "",
      ...(placeId ? { placeId } : {}),
    });
    setOpen(false);
    token.current = undefined;
  }
  async function choose(index: number) {
    const prediction = predictions[index];
    if (prediction) {
      const request = ++selection.current;
      setOpen(false);
      setBusy(true);
      try {
        const place = prediction.toPlace();
        await place.fetchFields({ fields: ["formattedAddress"] });
        if (request === selection.current)
          chooseAddress(
            place.formattedAddress || prediction.text.toString(),
            prediction.placeId,
          );
      } catch {
        if (request === selection.current) {
          chooseAddress(query);
          setUnavailable(true);
        }
      } finally {
        if (request === selection.current) setBusy(false);
      }
      return;
    }
    const local = fallback[index - predictions.length];
    chooseAddress(local ? `${local.name}, ${local.country}` : query.trim());
  }
  return (
    <div className="field location-field" ref={wrapper}>
      <label htmlFor={id}>{label}</label>
      <div className="input-icon">
        <MapPin size={17} />
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={
            open ? `${id}-${Math.min(active, count - 1)}` : undefined
          }
          aria-invalid={!!error}
          autoComplete="off"
          maxLength={500}
          value={query}
          placeholder="Address, business or town"
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            if (
              !e.currentTarget.parentElement?.parentElement?.contains(
                e.relatedTarget,
              )
            )
              setOpen(false);
          }}
          onChange={(e) => {
            selection.current++;
            setQuery(e.target.value);
            onChange(
              e.target.value.trim()
                ? {
                    name: e.target.value,
                    country: "Not specified",
                    type: "Address",
                    code: "",
                  }
                : undefined,
            );
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, count - 1));
              setOpen(true);
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            }
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && open) {
              e.preventDefault();
              void choose(active);
            }
          }}
        />
      </div>
      {error && <small className="field-error">{error}</small>}
      {open && (
        <div className="location-options" id={`${id}-list`} role="listbox">
          {busy && <p role="status">Finding locations…</p>}
          {predictions.map((p, i) => (
            <button
              id={`${id}-${i}`}
              type="button"
              role="option"
              aria-selected={active === i}
              key={p.placeId}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void choose(i)}
            >
              <MapPin size={15} />
              <span>{p.text.toString()}</span>
            </button>
          ))}
          {predictions.length > 0 && (
            <small className="google-attribution">Google Maps</small>
          )}
          {fallback.map((p, i) => (
            <button
              id={`${id}-${i}`}
              type="button"
              role="option"
              aria-selected={active === i}
              key={p.name}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void choose(i)}
            >
              <MapPin size={15} />
              <span>
                {p.name}, {p.country}
                <small>Location directory</small>
              </span>
            </button>
          ))}
          <button
            id={`${id}-${count - 1}`}
            type="button"
            role="option"
            aria-selected={active === count - 1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => chooseAddress(query.trim())}
          >
            <span>
              <strong>
                {query.trim()
                  ? `Use “${query.trim()}”`
                  : "Type your pickup or delivery address"}
              </strong>
              <small>
                Your entered address is accepted even without a match.
              </small>
            </span>
          </button>
          {(!googlePlacesConfigured || unavailable) && (
            <small className="directory-note">
              Live address search unavailable. You can still type any location.
            </small>
          )}
        </div>
      )}
    </div>
  );
}
