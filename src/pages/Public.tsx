import {
  HeroHeadline,
  HeroValueIcon,
  useHeroMessages,
} from "../components/hero-messages";
import { HeroWhatsApp } from "../components/whatsapp-feature";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Globe2,
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
  Panel,
  Select,
} from "../components/ui";
import type { ShipmentDetails } from "../lib/types";
import { PopularRoutes, popularRoutes } from "../components/popular-routes";
import {
  modes,
  defaultScope,
  normalizeTransportDetails,
  switchTransport,
  validateFirstStep,
} from "../lib/domain";
import { RouteFields, TransportFields } from "../components/shipment-fields";
import { supabase, checked } from "../lib/supabase";
import { HomeSections } from "../components/home-sections";
export function Home() {
  const hero = useHeroMessages();
  const [mode, setMode] = useState("Ocean Freight");
  const [details, setDetails] = useState<ShipmentDetails>({
    cargoType: "General cargo",
    scope: defaultScope("Ocean Freight"),
    quantity: 1,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  function update<K extends keyof ShipmentDetails>(
    key: K,
    value: ShipmentDetails[K],
  ) {
    setDetails((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }
  function changeMode(value: string) {
    setMode(value);
    setDetails((d) => switchTransport(d, value));
    setErrors({});
  }
  function start() {
    const problems = validateFirstStep(details, mode);
    setErrors(problems);
    if (Object.keys(problems).length) return;
    sessionStorage.setItem(
      "cargolink-inquiry",
      JSON.stringify({
        service: mode,
        details: normalizeTransportDetails(details, mode),
        entryStepCompleted: true,
        resumeStep: 1,
      }),
    );
    navigate("/inquiry");
  }
  return (
    <>
      <section className="hero tuship-hero">
        <div className="container tuship-hero-grid">
          <div className="hero-content">
            <div className="eyebrow">A GLOBAL FREIGHT MARKETPLACE</div>
            <HeroHeadline
              index={hero.index}
              paused={hero.paused}
              onToggle={() => hero.setPaused((p) => !p)}
            />
            <p>
              Request quotes, compare rates and connect with
              <br className="desktop-only" /> verified logistics providers — all
              in one place.
            </p>
            <div className="hero-buttons">
              <a className="button" href="#shipping-quotes">
                Get a quote <ArrowRight size={17} />
              </a>
              <a className="button secondary" href="#how-it-works">
                See how it works
              </a>
            </div>
            <div className="hero-trust">
              <span>
                <Globe2 size={22} />
                Multiple
                <br />
                providers
              </span>
              <span>
                <CheckCircle2 size={22} />
                Competitive
                <br />
                rates
              </span>
              <span>
                <ShieldCheck size={22} />
                Verified
                <br />
                partners
              </span>
              <span>
                <PackageCheck size={22} />
                End-to-end
                <br />
                connections
              </span>
            </div>
          </div>
          <div className="tuship-hero-art">
            <HeroWhatsApp />
            <HeroValueIcon index={hero.index} />
            <img
              src="/assets/tuship-hero.png"
              alt="Air, sea and road freight connecting global trade"
            />
          </div>
        </div>
      </section>
      <div className="container inquiry-container">
        <Panel className="quick-inquiry">
          <h2 id="shipping-quotes" className="quote-heading">
            Get shipping quotes in minutes
          </h2>
          <div className="service-tabs">
            {[
              ["Ocean Freight", Ship],
              ["Air Freight", Plane],
              ["Trucking", Truck],
              ["Warehousing", Warehouse],
            ].map(([s, I]) => {
              const Icon = I as typeof Ship;
              return (
                <button
                  key={String(s)}
                  onClick={() => changeMode(String(s))}
                  className={mode === s ? "active" : ""}
                >
                  <Icon size={18} />
                  {String(s)}
                </button>
              );
            })}
          </div>
          <form
            className="quick-form"
            onSubmit={(e) => {
              e.preventDefault();
              start();
            }}
            noValidate
          >
            <RouteFields
              compact
              service={mode}
              details={details}
              onChange={update}
              errors={errors}
            />
            <div className="quick-cargo-fields">
              <Select
                label="Cargo type"
                value={details.cargoType || "General cargo"}
                onChange={(v) => update("cargoType", v)}
                options={
                  mode === "Air Freight"
                    ? ["General cargo", "Perishables", "Hazardous", "Vehicles"]
                    : [
                        "General cargo",
                        "Containers",
                        "Project cargo",
                        "Perishables",
                        "Hazardous",
                        "Vehicles",
                      ]
                }
              />
              <TransportFields
                service={mode}
                details={details}
                onChange={update}
                errors={errors}
                quick
              />
            </div>
            {Object.values(errors).some(Boolean) && (
              <Alert>
                Please complete the highlighted shipment fields to continue.
              </Alert>
            )}
            <div className="quick-action">
              <p>
                Start with your route. Complete the cargo details in the next
                steps.
              </p>
              <Button type="submit">
                Get quotations <ArrowRight size={18} />
              </Button>
            </div>
          </form>
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
          <PopularRoutes
            onSelect={(route) => {
              changeMode(route.service);
              setDetails((d) => ({
                ...switchTransport(d, route.service),
                origin: route.origin,
                destination: route.destination,
                pickupAddress: route.origin.name,
                deliveryAddress: route.destination.name,
              }));
            }}
          />
        </Panel>
      </div>
      <HomeSections />
    </>
  );
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
    title: "Popular routes. Your next shipment.",
    eyebrow: "POPULAR ROUTES",
    description:
      "Choose a route to start an inquiry with your origin and destination already filled in. Your provider will confirm availability and a quotation.",
  },
  "for-businesses": {
    title: "More visibility. Better freight decisions.",
    eyebrow: "FOR CARGO OWNERS",
    description:
      "Bring your inquiries, quotations and provider conversations together. Make decisions with clear scopes and service terms.",
  },
  "for-providers": {
    title: "Grow your business with tuShip.",
    eyebrow: "FOR SERVICE PROVIDERS",
    description:
      "Build your verified business profile, discover relevant freight opportunities and send detailed quotations to cargo owners.",
  },
  resources: {
    title: "Insights to move your business forward.",
    eyebrow: "RESOURCE CENTRE",
    description:
      "Practical guidance for shipping, comparing quotations and working with logistics providers.",
  },
  about: {
    title: "Better shipping starts here.",
    eyebrow: "ABOUT TUSHIP",
    description:
      "tuShip connects cargo owners with logistics service providers through transparent inquiries, detailed quotations and direct communication.",
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
      "tuShip is a marketplace connecting independent cargo owners and logistics providers. These operational guidelines describe how to use the platform.",
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
      <div
        className={`content-heading tuship-content-heading ${["for-providers", "for-businesses", "about", "services"].includes(page) ? "with-art" : ""}`}
      >
        <div className="eyebrow">{c.eyebrow}</div>
        <h1>{c.title}</h1>
        <p>{c.description}</p>
        {["for-providers", "for-businesses", "about", "services"].includes(
          page,
        ) && (
          <img
            src={
              page === "for-businesses"
                ? "/assets/tuship-business-owner.png"
                : "/assets/tuship-hero.png"
            }
            alt="Global shipping with tuShip"
          />
        )}
      </div>
      {page === "services" ? (
        <div className="three-columns">
          {modes.map((m, i) => {
            const Icon = [Ship, Plane, Truck, TrainFront, Globe2, Warehouse][i];
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
          {popularRoutes.map((route) => (
            <Panel key={route.label}>
              <Badge>{route.service}</Badge>
              <h2 className="route-title">
                {route.origin.name}
                <ArrowRight size={20} />
                {route.destination.name}
              </h2>
              <p>
                {route.origin.country} to {route.destination.country}
              </p>
              <Link
                to="/inquiry"
                className="button secondary"
                onClick={() => {
                  sessionStorage.setItem(
                    "cargolink-inquiry",
                    JSON.stringify({
                      service: route.service,
                      details: {
                        origin: route.origin,
                        destination: route.destination,
                        ...(route.service === "Trucking"
                          ? {
                              pickupAddress: route.origin.name,
                              deliveryAddress: route.destination.name,
                            }
                          : {}),
                      },
                      resumeStep: 0,
                    }),
                  );
                }}
              >
                Get a quote for this route <ArrowUpRight size={15} />
              </Link>
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
        <p>Send a question to the tuShip operations team.</p>
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
          Back to tuShip <ArrowRight size={17} />
        </ButtonLink>
      </div>
    </main>
  );
}
