import type { ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

// This is a chat deep link, not a claim that the AI/WhatsApp backend is connected.
const number = (import.meta.env.VITE_WHATSAPP_NUMBER || "255757490145").replace(
  /[\s+()-]/g,
  "",
);
const validNumber = /^[1-9]\d{7,14}$/.test(number);
const chatUrl = validNumber
  ? `https://wa.me/${number}?text=${encodeURIComponent("Hello tuShip! I would like help with a shipping quotation.")}`
  : "/automation";
function ChatLink({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return validNumber ? (
    <a
      href={chatUrl}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ) : (
    <Link to={chatUrl} className={className}>
      {children}
    </Link>
  );
}
export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M26 6a13 13 0 0 0-21 15L3 29l8-2A13 13 0 0 0 26 6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M11 9c-1 0-2 2-1 5 2 5 6 8 9 8 2 0 4-2 3-3l-3-2-2 2c-3-1-5-3-6-5l2-2-2-3Z"
        fill="currentColor"
      />
    </svg>
  );
}
export function HeroWhatsApp() {
  return (
    <ChatLink className="hero-whatsapp">
      <span className="whatsapp-symbol">
        <WhatsAppIcon />
      </span>
      <span>
        <strong>Prefer WhatsApp?</strong>
        <small>
          {validNumber
            ? "Chat with us about your shipment."
            : "A simpler way to request a quote. Coming soon."}
        </small>
      </span>
      <ChevronRight size={22} />
    </ChatLink>
  );
}
export function WhatsAppFeature() {
  return (
    <section
      className="container whatsapp-feature"
      aria-labelledby="whatsapp-heading"
    >
      <div className="whatsapp-showcase">
        <div className="whatsapp-pitch">
          <span className="whatsapp-label">
            COMING SOON · AI SHIPPING ASSISTANT
          </span>
          <h2 id="whatsapp-heading">
            Share it on WhatsApp.
            <br />
            <em>Let AI do the organising.</em>
          </h2>
          <p>
            A message is all it takes to get started. Our planned assistant will
            turn your shipment details into a clear inquiry, ready for your
            review and provider quotations.
          </p>
          <ChatLink className="button whatsapp-cta">
            <WhatsAppIcon />
            {validNumber ? "Chat on WhatsApp" : "Explore WhatsApp shipping"}
            <ArrowRight size={17} />
          </ChatLink>
          <small>
            {validNumber
              ? "Chat is available. Automated inquiry creation is still being connected."
              : "WhatsApp connection is being prepared. You can request quotes on the website today."}
          </small>
        </div>
        <div
          className="whatsapp-phone"
          aria-label="Illustration of the planned WhatsApp inquiry experience"
        >
          <div className="phone-camera" />
          <div className="phone-header">
            <span className="phone-avatar">tuS</span>
            <div>
              <strong>tuShip</strong>
              <small>Shipping assistant · preview</small>
            </div>
          </div>
          <div className="phone-chat">
            <div className="phone-bubble sent">
              I need to ship 2 pallets from Dar es Salaam to Rotterdam.
              <small>
                10:24 <Check size={10} />
              </small>
            </div>
            <div className="phone-bubble received">
              Let’s turn that into an inquiry. What’s the cargo weight and your
              preferred date?
            </div>
            <div className="phone-draft">
              <span>
                <Sparkles size={14} /> Your shipment draft
              </span>
              <dl>
                <dt>Route</dt>
                <dd>Dar → Rotterdam</dd>
                <dt>Cargo</dt>
                <dd>2 pallets</dd>
                <dt>Next</dt>
                <dd>Add weight & date</dd>
              </dl>
              <div>
                Review before submitting <ChevronRight size={13} />
              </div>
            </div>
            <p className="phone-caption">Illustrative conversation</p>
          </div>
        </div>
        <span className="phone-wa-badge">
          <WhatsAppIcon />
        </span>
      </div>
      <div className="whatsapp-explainer">
        <div className="eyebrow">LESS TYPING. MORE POSSIBILITIES.</div>
        <h2>
          From a quick message
          <br />
          to a clear shipping request.
        </h2>
        <p>
          Describe your shipment in your own words. Keep control of the details
          and the final decision.
        </p>
        <ol>
          {[
            [
              Sparkles,
              "Share your request",
              "Send your route, cargo and timing in a WhatsApp chat. AI will ask for anything missing.",
            ],
            [
              FileText,
              "Review your organised inquiry",
              "AI will structure the details. Sign up, check the draft and submit when you’re ready.",
            ],
            [
              ClipboardCheck,
              "Receive and compare rates",
              "Eligible providers submit quotations. Compare costs, scope and transit times, then choose your partner.",
            ],
          ].map(([I, title, body], i) => {
            const Icon = I as typeof Sparkles;
            return (
              <li key={String(title)}>
                <span className="whatsapp-step-icon">
                  <Icon size={22} />
                  <b>{i + 1}</b>
                </span>
                <div>
                  <h3>{String(title)}</h3>
                  <p>{String(body)}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <Link className="whatsapp-web-link" to="/inquiry">
          Prefer the website? Get a quote now <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
