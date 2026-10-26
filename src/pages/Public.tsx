import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Globe2,
  MapPin,
  PackageCheck,
  Plane,
  ShieldCheck,
  Ship,
  Sparkles,
  TrainFront,
  Truck,
  Warehouse,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Field,
  LocationInput,
  Panel,
  Select,
} from "../components/ui";
import type { FreightLocation } from "../lib/types";
import { locations } from "../lib/locations";
import { modes } from "../lib/domain";
import { supabase, checked } from "../lib/supabase";
export function Home() {
  const [mode, setMode] = useState("Ocean Freight"),
    [origin, setOrigin] = useState<FreightLocation>(),
    [destination, setDestination] = useState<FreightLocation>(),
    [cargo, setCargo] = useState("General cargo");
  const navigate = useNavigate();
  function start() {
    sessionStorage.setItem(
      "cargolink-inquiry",
      JSON.stringify({
        service: mode,
        details: { origin, destination, cargoType: cargo },
      }),
    );
    navigate("/inquiry");
  }
  return (
    <>
      <section className="hero">
        <div className="hero-art" />
        <div className="hero-content container">
          <Badge tone="outline">
            <span className="status-dot" />
            AFRICA’S FREIGHT & LOGISTICS MARKETPLACE
          </Badge>
          <h1>
            Move cargo across Africa.
            <br />
            <span>Faster. Safer. Smarter.</span>
          </h1>
          <p>
            One connected marketplace. Trusted logistics partners.
            <br />A better way to get your cargo where it needs to be.
          </p>
          <div className="hero-trust">
            <span>
              <ShieldCheck size={17} />
              Verified providers
            </span>
            <span>
              <CheckCircle2 size={17} />
              Competitive quotations
            </span>
            <span>
              <Globe2 size={17} />
              End-to-end connections
            </span>
          </div>
        </div>
        <div className="hero-caption">
          <span className="status-dot" /> Connecting African trade to the world
        </div>
      </section>
      <div className="container inquiry-container">
        <Panel className="quick-inquiry">
          <div className="service-tabs">
            {[
              ["Ocean Freight", Ship],
              ["Air Freight", Plane],
              ["Trucking", Truck],
              ["Customs Clearance", PackageCheck],
              ["Warehousing", Warehouse],
            ].map(([s, I]) => {
              const Icon = I as typeof Ship;
              return (
                <button
                  key={String(s)}
                  onClick={() => setMode(String(s))}
                  className={mode === s ? "active" : ""}
                >
                  <Icon size={18} />
                  {String(s)}
                </button>
              );
            })}
          </div>
          <div className="quick-fields">
            <LocationInput
              label={mode === "Warehousing" ? "Storage location" : "From"}
              value={origin}
              onChange={setOrigin}
            />
            {mode !== "Warehousing" && (
              <LocationInput
                label="To"
                value={destination}
                onChange={setDestination}
              />
            )}
            <Select
              label="Cargo type"
              value={cargo}
              onChange={setCargo}
              options={[
                "General cargo",
                "Containers",
                "Project cargo",
                "Perishables",
                "Hazardous",
                "Vehicles",
              ]}
            />
            <Button onClick={start}>
              Get quotations <ArrowRight size={18} />
            </Button>
          </div>
          <div className="quick-bottom">
            <span>
              <ShieldCheck size={15} />
              Free to request. You choose your provider.
            </span>
            <Link to="/inquiry/assistant">
              <Sparkles size={15} />
              Try the inquiry assistant <ArrowRight size={14} />
            </Link>
          </div>
          <div className="popular-routes">
            <strong>Popular routes</strong>
            {[
              ["Lagos", "Nairobi"],
              ["Mombasa", "Kampala"],
              ["Dar es Salaam", "Kigali"],
              ["Tema", "Accra"],
            ].map(([a, b]) => (
              <button
                key={a}
                onClick={() => {
                  setOrigin(locations.find((l) => l.name.startsWith(a)));
                  setDestination(locations.find((l) => l.name === b));
                }}
              >
                {a}
                <ArrowRight size={11} />
                {b}
              </button>
            ))}
          </div>
        </Panel>
      </div>
      <section className="container section how-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">LESS FRICTION. MORE MOVEMENT.</div>
            <h2>Your next shipment starts here.</h2>
          </div>
          <p>
            From your first inquiry to the final mile,
            <br />
            keep every conversation in one place.
          </p>
        </div>
        <div className="three-columns">
          {[
            [
              Ship,
              "01",
              "Tell us what’s moving",
              "Share your route, cargo details and the services you need. One inquiry reaches the right providers.",
            ],
            [
              FileIcon,
              "02",
              "Find your best fit",
              "Compare detailed quotations, delivery timelines and service terms with full visibility.",
            ],
            [
              ShieldCheck,
              "03",
              "Move with confidence",
              "Choose a verified logistics partner and coordinate your shipment directly.",
            ],
          ].map(([I, n, title, description]) => {
            const Icon = I as typeof Ship;
            return (
              <article className="how-card" key={String(n)}>
                <div className="between">
                  <span className="icon-tile">
                    <Icon size={25} />
                  </span>
                  <span className="step-number">{String(n)}</span>
                </div>
                <h3>{String(title)}</h3>
                <p>{String(description)}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="network-section">
        <div className="container network-grid">
          <div>
            <div className="eyebrow">A CONTINENT OF OPPORTUNITY</div>
            <h2>
              Local expertise.
              <br />
              Connected across borders.
            </h2>
            <p>
              Ocean, air, road or rail. Connect with logistics businesses that
              understand your routes, your cargo and your destination.
            </p>
            <ButtonLink to="/routes" variant="secondary">
              Explore trade routes <ArrowUpRight size={17} />
            </ButtonLink>
          </div>
          <div className="route-visual">
            <span className="map-grid" />
            <div className="route-label label-one">
              <MapPin size={16} />
              Lagos <small>Nigeria</small>
            </div>
            <div className="route-label label-two">
              <MapPin size={16} />
              Nairobi <small>Kenya</small>
            </div>
            <div className="route-label label-three">
              <MapPin size={16} />
              Dar es Salaam <small>Tanzania</small>
            </div>
            <svg viewBox="0 0 500 260" aria-hidden="true">
              <path d="M90 80 Q240 0 365 120 T300 220" />
              <circle cx="90" cy="80" r="7" />
              <circle cx="365" cy="120" r="7" />
              <circle cx="300" cy="220" r="7" />
            </svg>
            <Badge tone="green">
              <Globe2 size={14} />
              Built around African trade
            </Badge>
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="provider-cta">
          <div className="icon-tile">
            <Truck size={28} />
          </div>
          <div>
            <div className="eyebrow">FOR LOGISTICS PROVIDERS</div>
            <h2>Your next customer is looking for you.</h2>
            <p>
              Discover relevant freight inquiries and grow your business across
              Africa.
            </p>
          </div>
          <ButtonLink to="/for-providers">
            Become a provider <ArrowRight size={17} />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
function FileIcon({ size = 24 }: { size?: number }) {
  return <PackageCheck size={size} />;
}
const content: Record<
  string,
  { title: string; eyebrow: string; description: string }
> = {
  services: {
    title: "Every shipment. The right expertise.",
    eyebrow: "OUR SERVICES",
    description:
      "Find freight forwarding, transport, customs clearance and warehousing partners through one connected marketplace.",
  },
  routes: {
    title: "Connect your business across borders.",
    eyebrow: "TRADE ROUTES",
    description:
      "Explore a curated selection of African corridors and international gateways. Availability and pricing are confirmed by your selected provider.",
  },
  "for-businesses": {
    title: "More visibility. Better freight decisions.",
    eyebrow: "FOR CARGO OWNERS",
    description:
      "Bring your inquiries, quotations and provider conversations together. Make decisions with clear scopes and service terms.",
  },
  "for-providers": {
    title: "Move more cargo. Grow your business.",
    eyebrow: "FOR SERVICE PROVIDERS",
    description:
      "Build your verified business profile, discover relevant freight opportunities and send detailed quotations to cargo owners.",
  },
  resources: {
    title: "Make your next move a smarter one.",
    eyebrow: "RESOURCE CENTRE",
    description:
      "Practical guidance for shipping, comparing quotations and working with logistics providers.",
  },
  about: {
    title: "Connecting cargo. Connecting Africa.",
    eyebrow: "ABOUT CARGOLINK",
    description:
      "CargoLink Africa connects cargo owners with logistics service providers through transparent inquiries, detailed quotations and direct communication.",
  },
  help: {
    title: "How can we help?",
    eyebrow: "HELP CENTRE",
    description:
      "Find answers about your account, freight requests, quotations and provider verification.",
  },
  terms: {
    title: "Terms of use",
    eyebrow: "PLATFORM POLICIES",
    description:
      "CargoLink Africa is a marketplace connecting independent cargo owners and logistics providers. These operational guidelines describe how to use the platform.",
  },
  privacy: {
    title: "Your information, handled with care.",
    eyebrow: "PRIVACY",
    description:
      "We use your account and shipment details to operate the marketplace, connect you with providers and protect the platform.",
  },
};
export function ContentPage({ page: given }: { page?: string }) {
  const { slug } = useParams();
  const page = given || slug || "about",
    c = content[page] || content.about;
  return (
    <main className="container content-page">
      <div className="content-heading">
        <div className="eyebrow">{c.eyebrow}</div>
        <h1>{c.title}</h1>
        <p>{c.description}</p>
      </div>
      {page === "services" ? (
        <div className="three-columns">
          {modes.map((m, i) => {
            const Icon = [
              Ship,
              Plane,
              Truck,
              TrainFront,
              Globe2,
              PackageCheck,
              Warehouse,
            ][i];
            return (
              <Panel key={m}>
                <span className="icon-tile">
                  <Icon />
                </span>
                <h2>{m}</h2>
                <p>
                  Describe your requirements and connect with providers offering{" "}
                  {m.toLowerCase()} services.
                </p>
                <ButtonLink variant="secondary" to="/inquiry">
                  Request a quotation <ArrowRight size={16} />
                </ButtonLink>
              </Panel>
            );
          })}
        </div>
      ) : page === "routes" ? (
        <div className="three-columns">
          {[
            ["Lagos", "Nairobi", "West to East Africa"],
            ["Mombasa", "Kampala", "Northern Corridor"],
            ["Dar es Salaam", "Kigali", "Central Corridor"],
            ["Durban", "Lusaka", "Southern Africa"],
            ["Shanghai", "Dar es Salaam", "Asia to Africa"],
            ["Tema", "Ouagadougou", "West Africa"],
          ].map(([a, b, s]) => (
            <Panel key={a}>
              <Badge>{s}</Badge>
              <h2 className="route-title">
                {a}
                <ArrowRight size={20} />
                {b}
              </h2>
              <p>
                Request service options, transit estimates and a detailed
                quotation.
              </p>
              <ButtonLink to="/inquiry" variant="secondary">
                Plan this shipment <ArrowUpRight size={15} />
              </ButtonLink>
            </Panel>
          ))}
        </div>
      ) : page === "help" || page === "resources" ? (
        <div className="faq-list">
          {[
            [
              "How do I request a quotation?",
              "Create a cargo owner account, complete your company profile, and create an RFQ. Add route, cargo and shipment dates, then submit it to the marketplace.",
            ],
            [
              "Can I compare all quotations directly?",
              "Check currency, service scope, inclusions, exclusions and validity first. The comparison page flags differences; it does not convert currencies or rank incompatible quotes.",
            ],
            [
              "How do providers become verified?",
              "Submit business registration details and supporting documents from the verification page. An administrator reviews your application before quoting is enabled.",
            ],
            [
              "How do I contact a provider?",
              "Open an RFQ with a submitted quotation and use its conversation. Messages are private to the sender and recipient.",
            ],
            [
              "Where can I track my shipment?",
              "Open My shipments or Awarded jobs. The awarded provider updates shipment milestones; these are provider-reported updates rather than GPS tracking.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      ) : page === "terms" || page === "privacy" ? (
        <Panel className="prose">
          {(page === "terms"
            ? [
                [
                  "Marketplace responsibilities",
                  "Providers supply quotations and perform logistics services independently. Confirm contracts, insurance, permits, payment and dispute terms with your selected provider before awarding work.",
                ],
                [
                  "Accurate information",
                  "Submit accurate cargo descriptions, weights, dates and business documentation. Do not post prohibited cargo, misleading quotations or fraudulent documents.",
                ],
                [
                  "Quotations and awards",
                  "A quotation is valid only for its stated scope, currency and validity period. Awarding a quotation records your selection on the platform; it does not process payment or create carrier documentation.",
                ],
                [
                  "Account moderation",
                  "Administrators may review verification submissions, restrict accounts and close marketplace records when necessary. Contact support to request a review.",
                ],
              ]
            : [
                [
                  "Information we process",
                  "Account email, company information, cargo inquiries, quotations, verification submissions and messages are processed to provide the marketplace.",
                ],
                [
                  "Who can access your records",
                  "Open inquiries are visible to eligible signed-in providers. Quotations are restricted to the quoting provider and the cargo owner. Messages are restricted to participants. Verification submissions are accessible to the submitting company and administrators.",
                ],
                [
                  "Your choices",
                  "You can edit drafts, update your profile and sign out. Contact support to request access, correction or deletion of records, subject to applicable retention requirements.",
                ],
                [
                  "Before public launch",
                  "The operator must publish its legal entity, privacy contact, retention periods, applicable law and approved legal terms before opening commercial operations.",
                ],
              ]
          ).map(([h, p]) => (
            <div key={h}>
              <h2>{h}</h2>
              <p>{p}</p>
            </div>
          ))}
        </Panel>
      ) : (
        <div className="two-columns">
          <Panel>
            <ShieldCheck className="text-green" size={30} />
            <h2>
              {page === "for-providers"
                ? "Build trust with verification"
                : "Clear information at every step"}
            </h2>
            <p>
              {page === "for-providers"
                ? "Add your business information, submit registration documents and get reviewed before you start quoting."
                : "See shipment requirements, quotation details and provider verification status before choosing a partner."}
            </p>
            <ButtonLink to="/auth/sign-up">
              Create your account <ArrowRight size={16} />
            </ButtonLink>
          </Panel>
          <Panel>
            <Globe2 className="text-green" size={30} />
            <h2>Made for connected trade</h2>
            <p>
              Manage ocean, air, road, rail and multimodal inquiries, with
              customs and warehousing support in the same workflow.
            </p>
            <ButtonLink to="/services" variant="secondary">
              Explore services <ArrowRight size={16} />
            </ButtonLink>
          </Panel>
        </div>
      )}
    </main>
  );
}
export function Contact() {
  const [email, setEmail] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(""),
    [error, setError] = useState("");
  return (
    <main className="container content-page">
      <div className="content-heading">
        <div className="eyebrow">CONTACT & SUPPORT</div>
        <h1>Let’s keep your cargo moving.</h1>
        <p>Send a question to the CargoLink operations team.</p>
      </div>
      <Panel className="narrow">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await checked(
                supabase.from("support_requests").insert({ email, message }),
              );
              setResult(
                "Your request has been received. The operations team can review it in the administration workspace.",
              );
              setMessage("");
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Unable to send your request.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field
            label="Your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={254}
          />
          <div className="field">
            <label htmlFor="contact-message">How can we help?</label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              minLength={10}
              maxLength={4000}
            />
          </div>
          {error && <Alert>{error}</Alert>}
          {result && <Alert tone="success">{result}</Alert>}
          <Button type="submit" busy={busy}>
            Send request <ArrowRight size={16} />
          </Button>
        </form>
      </Panel>
    </main>
  );
}
export function NotFound() {
  return (
    <main className="container content-page">
      <div className="content-heading">
        <Badge>404</Badge>
        <h1>This route hasn’t been mapped yet.</h1>
        <p>
          The page may have moved. Return to the marketplace or your dashboard
          to continue.
        </p>
        <ButtonLink to="/">
          Back to CargoLink <ArrowRight size={17} />
        </ButtonLink>
      </div>
    </main>
  );
}
