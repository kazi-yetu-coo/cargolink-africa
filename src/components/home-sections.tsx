import { WhatsAppFeature } from "./whatsapp-feature";
import {
  ArrowRight,
  CheckCircle2,
  Globe2,
  Plane,
  Ship,
  Truck,
  TrainFront,
  ShieldCheck,
  Users,
  PackageCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ButtonLink } from "./ui";
import { PlatformBenefits } from "./platform-benefits";
export function HomeSections() {
  return (
    <>
      <WhatsAppFeature />
      <section className="container tuship-how" id="how-it-works">
        <div>
          <div className="eyebrow">HOW TUSHIP WORKS</div>
          <h2>
            Simple, transparent
            <br />
            and reliable.
          </h2>
          <p>A modern way to ship, designed for businesses of all sizes.</p>
          <ol className="tuship-steps">
            {[
              ["Request a quote", "Share your shipment details in minutes."],
              [
                "Compare bids",
                "Review detailed quotations from verified providers.",
              ],
              [
                "Choose and ship",
                "Select the right partner and get connected.",
              ],
              [
                "Track with confidence",
                "Follow provider-reported milestones through delivery.",
              ],
            ].map(([title, body], i) => (
              <li key={title}>
                <span>{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="how-photo">
          <img
            src="/assets/tuship-business-owner.png"
            alt="Business owner planning a shipment at her laptop"
          />
          <div className="floating-quotes">
            <strong>More choice. One inquiry.</strong>
            {[
              "Compare the full price",
              "Check what’s included",
              "Choose with confidence",
            ].map((x) => (
              <div key={x}>
                <ShieldCheck size={18} />
                <span>{x}</span>
                <CheckCircle2 size={14} />
              </div>
            ))}
          </div>
          <div className="floating-progress">
            <strong>Shipment milestones</strong>
            {[
              "Picked up",
              "In transit",
              "Arrived at port",
              "Out for delivery",
            ].map((x, i) => (
              <span key={x} className={i < 2 ? "complete" : ""}>
                <i />
                {x}
              </span>
            ))}
            <small>Illustrative provider updates</small>
          </div>
        </div>
      </section>
      <section className="shipping-solutions">
        <div className="container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">ALL SHIPPING MODES</div>
              <h2>Solutions for every shipment.</h2>
            </div>
            <Link to="/services">
              Explore all solutions <ArrowRight size={16} />
            </Link>
          </div>
          <div className="solution-grid">
            {[
              [
                Plane,
                "Air Freight",
                "Fast and reliable for time-sensitive cargo.",
                "air",
              ],
              [
                Ship,
                "Sea Freight",
                "Cost-effective options for larger volumes.",
                "sea",
              ],
              [
                Truck,
                "Road Freight",
                "Flexible connections across regions.",
                "road",
              ],
              [
                TrainFront,
                "Rail Freight",
                "Explore rail options for high-volume routes.",
                "rail",
              ],
            ].map(([I, title, body, style]) => {
              const Icon = I as typeof Ship;
              return (
                <Link
                  to="/inquiry"
                  className="solution-card"
                  key={String(title)}
                  onClick={() =>
                    sessionStorage.setItem(
                      "cargolink-inquiry",
                      JSON.stringify({
                        service:
                          title === "Sea Freight"
                            ? "Ocean Freight"
                            : title === "Road Freight"
                              ? "Trucking"
                              : title,
                        details: {},
                        resumeStep: 0,
                      }),
                    )
                  }
                >
                  <div className={`solution-image ${style}`}>
                    <Icon size={44} />
                  </div>
                  <span className="solution-icon">
                    <Icon size={18} />
                  </span>
                  <h3>{String(title)}</h3>
                  <p>{String(body)}</p>
                  <ArrowRight size={18} />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <PlatformBenefits />
      <section className="global-network">
        <div className="container global-network-inner">
          <div>
            <div className="eyebrow">A GLOBAL NETWORK</div>
            <h2>
              Connecting
              <br />
              markets worldwide.
            </h2>
            <p>
              Built in Africa, open to the world. Find logistics partners for
              regional corridors and international trade routes.
            </p>
            <div className="network-facts">
              <span>
                <Globe2 />
                <b>Across borders</b>
                <small>Africa and beyond</small>
              </span>
              <span>
                <ShieldCheck />
                <b>Verified partners</b>
                <small>Reviewed before bidding</small>
              </span>
              <span>
                <PackageCheck />
                <b>One workspace</b>
                <small>From inquiry to delivery</small>
              </span>
            </div>
          </div>
          <div
            className="world-connections"
            aria-label="Illustrative trade connections between Dar es Salaam, Shanghai, Rotterdam, Dubai and São Paulo"
          >
            <img className="world-globe" src="/assets/world-map.svg" alt="" />
            <svg viewBox="0 0 600 360" aria-hidden="true">
              <path d="M365 192 Q290 90 307 76 M365 192 Q440 50 502 118 M365 192 Q420 155 392 130 M365 192 Q270 260 223 226" />
            </svg>
            {[
              ["Rotterdam", "rotterdam"],
              ["Shanghai", "shanghai"],
              ["Dubai", "dubai"],
              ["Dar es Salaam", "dar"],
              ["São Paulo", "saopaulo"],
            ].map(([name, cls]) => (
              <span className={`world-label ${cls}`} key={name}>
                <i />
                {name}
              </span>
            ))}
            <small>
              Illustrative connections · availability confirmed by providers
            </small>
          </div>
        </div>
      </section>
      <section className="container audience-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">BUILT FOR EVERYONE IN GLOBAL TRADE</div>
            <h2>
              Whether you ship or provide
              <br />
              shipping services, tuShip is for you.
            </h2>
          </div>
        </div>
        <div className="audience-grid">
          <article>
            <div className="audience-symbol">
              <Users size={64} />
            </div>
            <div>
              <span>For shippers</span>
              <h3>
                Get the best shipping
                <br />
                solutions for your business.
              </h3>
              <p>
                Compare quotations, save time and connect with trusted
                providers.
              </p>
              <ButtonLink to="/inquiry" variant="secondary">
                Start shipping <ArrowRight size={16} />
              </ButtonLink>
            </div>
          </article>
          <article>
            <div className="audience-symbol">
              <Truck size={70} />
            </div>
            <div>
              <span>For logistics providers</span>
              <h3>
                Grow your business
                <br />
                with more opportunities.
              </h3>
              <p>
                Receive shipment requests, submit competitive bids and connect
                with customers.
              </p>
              <ButtonLink to="/auth/sign-up" variant="secondary">
                Join as a provider <ArrowRight size={16} />
              </ButtonLink>
            </div>
          </article>
        </div>
      </section>
      <section className="tuship-final-cta">
        <h2>Ready to move your business forward?</h2>
        <p>A simpler way to connect, compare and ship with tuShip.</p>
        <div>
          <ButtonLink to="/inquiry">
            Get a quote <ArrowRight size={17} />
          </ButtonLink>
          <ButtonLink to="/contact" variant="secondary">
            Talk to us
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
