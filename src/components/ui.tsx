import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Link2,
  Loader2,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { FreightLocation } from "../lib/types";
import { locationLabel, searchLocations } from "../lib/locations";
export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="CargoLink Africa home">
      <span className="logo-symbol">
        <Link2 size={28} strokeWidth={3} />
      </span>
      <span>
        CargoLink<span className="logo-africa"> Africa</span>
      </span>
    </Link>
  );
}
export function Button({
  children,
  variant = "",
  busy = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={`button ${variant} ${className}`}
    >
      {busy ? <Loader2 size={17} className="spin" /> : null}
      {children}
    </button>
  );
}
export function ButtonLink({
  children,
  to,
  variant = "",
  className = "",
}: {
  children: ReactNode;
  to: string;
  variant?: string;
  className?: string;
}) {
  return (
    <Link className={`button ${variant} ${className}`} to={to}>
      {children}
    </Link>
  );
}
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Status({ value }: { value: string }) {
  return (
    <Badge
      tone={
        ["awarded", "completed", "verified"].includes(value)
          ? "green"
          : value === "draft"
            ? "gray"
            : value === "rejected" || value === "closed"
              ? "red"
              : value === "open"
                ? "green"
                : "blue"
      }
    >
      <span className="status-dot" />
      {value.replaceAll("_", " ")}
    </Badge>
  );
}
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`panel ${className}`}>{children}</section>;
}
export function PageTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}
export function Alert({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success" | "info" | "warning";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`alert ${tone}`}
    >
      {tone === "success" ? (
        <CheckCircle2 size={19} />
      ) : (
        <AlertCircle size={19} />
      )}
      <div>{children}</div>
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="icon-tile">
        <Package size={27} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <Loader2 className="spin" />
      <span>Loading your workspace…</span>
    </div>
  );
}
export function Field({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      ) : hint ? (
        <small>{hint}</small>
      ) : null}
    </div>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="select-wrap">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        >
          {options.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <ChevronDown size={16} />
      </div>
    </div>
  );
}
export function TextArea({
  label,
  value,
  onChange,
  placeholder = "",
  required = false,
  maxLength = 4000,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
      />
    </div>
  );
}
export function LocationInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value?: FreightLocation;
  onChange: (l: FreightLocation | undefined) => void;
  error?: string;
}) {
  const id = useId(),
    [query, setQuery] = useState(value ? locationLabel(value) : ""),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const results = searchLocations(query);
  useEffect(() => {
    if (value) setQuery(locationLabel(value));
  }, [value]);
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  function choose(l: FreightLocation) {
    onChange(l);
    setQuery(locationLabel(l));
    setOpen(false);
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
            open && results[active] ? `${id}-${active}` : undefined
          }
          value={query}
          placeholder="Port, airport, terminal or city"
          autoComplete="off"
          aria-invalid={!!error}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(undefined);
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
              setOpen(true);
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            }
            if (e.key === "Enter" && open && results[active]) {
              e.preventDefault();
              choose(results[active]);
            }
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {value && <Check size={15} className="selected-check" />}
      </div>
      {error && <small className="field-error">{error}</small>}
      {open && (
        <div className="location-options" id={`${id}-list`} role="listbox">
          {results.length ? (
            results.map((l, i) => (
              <button
                key={`${l.name}-${l.type}`}
                id={`${id}-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                className={i === active ? "active" : ""}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(l)}
              >
                <MapPin size={16} />
                <span>
                  <strong>{l.name}</strong>
                  <small>
                    {l.country} · {l.type}
                  </small>
                </span>
                {l.code && <code>{l.code}</code>}
              </button>
            ))
          ) : (
            <p>No match in this directory. Try a nearby city or terminal.</p>
          )}
          <small className="directory-note">
            Curated location directory · verify exact terminals with your
            provider
          </small>
        </div>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="between">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Verified() {
  return (
    <span className="verified">
      <ShieldCheck size={15} />
      Verified provider
    </span>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="input-icon search-input">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="stepper">
      {steps.map((s, i) => (
        <li
          key={s}
          className={i === current ? "active" : i < current ? "done" : ""}
        >
          <span>{i < current ? <Check size={14} /> : i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}
export function NextArrow() {
  return <ArrowRight size={17} />;
}
