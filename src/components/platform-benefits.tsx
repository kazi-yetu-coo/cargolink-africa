import {
  ArrowRight,
  Bell,
  Check,
  FileText,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

export function PlatformBenefits() {
  return (
    <section className="benefits-section" id="smarter-shipping">
      <div className="container section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              BUILT IN AFRICA. CONNECTED TO THE WORLD.
            </div>
            <h2>
              Less chasing.
              <br />
              More business moving.
            </h2>
          </div>
          <p>
            Helping African businesses trade with confidence — across the
            continent and beyond.
          </p>
        </div>
        <div className="benefits-grid">
          <article className="benefit-card">
            <div className="benefit-art rate-art" aria-hidden="true">
              <span className="art-caption">ONE INQUIRY · MORE OPTIONS</span>
              {[72, 48, 88].map((w, i) => (
                <div className="rate-demo" key={w}>
                  <ShieldCheck size={18} />
                  <span>Partner {i + 1}</span>
                  <i style={{ width: `${w}%` }} />
                </div>
              ))}
              <small>Illustrative comparison</small>
            </div>
            <div className="benefit-copy">
              <span>01 / BETTER CHOICES</span>
              <h3>Save time. Find competitive rates.</h3>
              <p>
                Reach verified vendors with one inquiry. Compare prices, transit
                times and included services, with differences in scope and
                currency made clear.
              </p>
              <Link to="/inquiry">
                Get quotations <ArrowRight size={15} />
              </Link>
            </div>
          </article>
          <article className="benefit-card">
            <div className="benefit-art chat-art" aria-hidden="true">
              <span className="art-caption">
                <MessageCircle size={16} /> WHATSAPP → INQUIRY
              </span>
              <div className="sample-bubble">
                I need to move 12 pallets from Dar to Kigali.
              </div>
              <div className="sample-extraction">
                <Sparkles size={17} />
                <div>
                  Route captured<small>12 pallets · Road freight</small>
                </div>
                <Check size={17} />
              </div>
              <small>Illustration · connection coming soon</small>
            </div>
            <div className="benefit-copy">
              <span>02 / LESS DATA ENTRY</span>
              <h3>Your words. A ready-to-review inquiry.</h3>
              <p>
                Our planned WhatsApp assistant will capture shipment details
                from your chat. Create an account, review your draft and submit
                when you’re ready.
              </p>
              <Link to="/automation">
                Explore WhatsApp shipping <ArrowRight size={15} />
              </Link>
            </div>
          </article>
          <article className="benefit-card">
            <div className="benefit-art notice-art" aria-hidden="true">
              <div className="sample-notice">
                <Bell size={21} />
                <div>
                  New quotation received
                  <small>Your next option is ready to review</small>
                </div>
                <span className="status-dot" />
              </div>
              <div className="sample-stages">
                <span>Inquire</span>
                <i />
                <span>Compare</span>
                <i />
                <span>Award</span>
              </div>
              <small>Illustrative notification</small>
            </div>
            <div className="benefit-copy">
              <span>03 / STAY IN THE LOOP</span>
              <h3>Opportunities, without the chasing.</h3>
              <p>
                Get in-app notifications when providers bid. Keep quotations,
                conversations and shipment updates together. Email alerts are
                planned once connected.
              </p>
              <Link to="/customer/notifications">
                See your notifications <ArrowRight size={15} />
              </Link>
            </div>
          </article>
          <article className="benefit-card">
            <div className="benefit-art document-art" aria-hidden="true">
              <div className="sample-document">
                <FileText size={23} />
                <b>Shipment preparation</b>
                {[
                  "Invoice details",
                  "Packing information",
                  "Transport documents",
                ].map((x) => (
                  <span key={x}>
                    <Check size={13} />
                    {x}
                  </span>
                ))}
              </div>
              <small>Requirements depend on route and cargo</small>
            </div>
            <div className="benefit-copy">
              <span>04 / ARRIVE PREPARED</span>
              <h3>A clearer path through paperwork.</h3>
              <p>
                Open a preparation checklist after submitting an inquiry. Plan
                documents and next steps with your CFA; tailored AI guidance and
                email delivery will follow connection.
              </p>
              <Link to="/automation">
                Explore shipment preparation <ArrowRight size={15} />
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export function Automation() {
  return (
    <main className="container section automation-page">
      <div className="eyebrow">A SIMPLER WAY TO SHIP</div>
      <h1>
        From a conversation
        <br />
        to your next shipment.
      </h1>
      <p>Built in Africa for businesses trading around the world.</p>
      <section className="panel">
        <h2>WhatsApp shipping — coming soon</h2>
        <p>
          We’re preparing a flow that turns a WhatsApp conversation into a
          structured inquiry. The WhatsApp Business connection is not available
          yet.
        </p>
        <ol>
          <li>Describe your route, cargo and shipment date in a chat.</li>
          <li>The assistant asks for missing details and prepares a draft.</li>
          <li>
            Sign up, review the draft and submit it to eligible providers.
          </li>
          <li>
            Compare quotations and receive bid notifications in your account.
          </li>
        </ol>
        <p>You can create and submit an inquiry on the website today.</p>
        <Link className="button primary" to="/inquiry">
          Create an inquiry <ArrowRight size={16} />
        </Link>
      </section>
      <section className="panel" id="preparation">
        <h2>Prepare before your cargo moves</h2>
        <p>
          Submitted inquiries include a practical preparation checklist. Save
          your progress and ask your selected CFA to confirm the documents and
          procedures for your specific route and goods.
        </p>
        <p>
          AI-generated route guidance and automated email delivery require
          service connections. Saving an email preference does not send an
          email.
        </p>
        <Link to="/customer/rfqs">
          Open your inquiries <ArrowRight size={15} />
        </Link>
      </section>
    </main>
  );
}
