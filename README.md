# CargoLink Africa

A responsive freight marketplace built on the existing CargoLink Supabase project. React, TypeScript, Vite, Lucide and Supabase power public pages, customer/provider/admin workspaces and live marketplace workflows.

## Current handoff status

The application passes the checks described in `docs/verification.md`. **Both database migrations have been applied to the existing Supabase project with the owner's approval.** A live transaction-only smoke test verified drafts, address validation, publication, bidding, messaging, awarding and shipment updates; every temporary test change was rolled back and the original records were retained. The application is on a review branch and Vercel preview; the production frontend has not been promoted. Google OAuth is currently disabled, and the optional AI endpoint still requires a server-only key.

The freight inquiry adapts by transport mode: sea equipment and container counts; air boxes/packages and gross weight with no sea equipment; trucking cities, terminals or manually entered street addresses. Door service reveals exact pickup/delivery fields. The homepage completes step 1 and opens the RFQ editor at step 2 with a completion message. Customs clearance is not a standalone inquiry; CFAs can include clearance fees in their detailed quotations.

The existing `src.js` is preserved unchanged for reference; `index.html` now starts the typed React application. The original live Supabase project URL and publishable key remain the defaults. No privileged database or AI key is bundled in the browser.

## Run locally

Node.js 22 or 24 is supported.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open the printed local URL. `/demo` uses visibly labelled sample records and performs no marketplace writes. Live workspaces never silently substitute demonstration records. The ordinary Vite development server does not host `/api/inquiry`; use a Vercel preview or `vercel dev` for the optional AI endpoint.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

## Features

- White, emerald, teal and navy design tokens; shared navigation, cards, fields, dialogs, badges, tables, alerts, loading and empty states.
- Public marketing, services, trade corridors, provider directory/profile, resources, support and policy pages.
- Email/password registration and sign-in, Google OAuth integration, password recovery, PKCE callback, account onboarding, session refresh and role redirects.
- Cargo owner RFQ drafts, editing, validation, publishing, quotation review, side-by-side comparison, award confirmation, shipments, saved providers and private conversations.
- Provider marketplace, verification-gated bidding, itemised charges, inclusions, exclusions, validity, terms, awarded jobs and shipment milestone updates.
- Administrator verification review, private document access, company suspension/restoration, inquiry moderation, real record metrics, activity and support requests.
- Authenticated AI inquiry extraction through a server-only OpenAI Responses endpoint, structured outputs and a persistent hourly rate limit. Users confirm the structured form before publishing. The app reports the dependency clearly if AI is unavailable.
- Realtime message/notification subscriptions with a 30-second refresh fallback while the page is visible.

## Routes

See [the complete route inventory](docs/routes.md). Browser history routes require the included SPA fallback in `vercel.json`. `/api/*` and `/assets/*` bypass that fallback.

## Database architecture

The additive migrations are the five SQL files in `supabase/migrations/`: marketplace workflows, transport-specific inquiries and three administrator review workspace upgrades. All five are applied to the existing project. They target the **existing CargoLink schema** in project `iacahumfwacpknggqjtd`; it is not a fresh Supabase bootstrap. Do not deploy `tests/baseline.sql` to a real project: that file is an isolated in-memory test fixture with mock Auth and Storage schemas.

Existing tables, auth identities and records are retained. The migration extends RFQs, quotations and company profiles; adds saved providers, shipment events, support, activity and assistant usage; fixes provider eligibility and award validation; adds private verification storage and guards workflow actions. All new tables enable RLS. Trigger functions are not directly callable by client roles. Privileged workflow functions explicitly check authenticated ownership or administrator membership and use an empty search path; their restricted `authenticated` execution grants are intentional.

Authorization is enforced in Postgres policies and transactional functions. Browser route guards provide a friendly redirect and do not replace database authorization. Administrator status comes from `platform_admins`, never user-editable metadata. Awards lock the RFQ and confirm the selected provider is still verified, active and eligible. Only the awarded provider can update shipment milestones. Documents use private storage and short-lived signed access URLs.

The migrations are already applied to the existing project. Their filenames match the hosted migration ledger. Do not reapply them there. Future database changes should be staged and reviewed separately. A pre-upgrade schema snapshot was captured locally before applying the approved upgrade.

## Deployment

Follow [deployment and integration steps](docs/deployment.md). The existing Vercel project is `cargolink-africa-git`, connected to this GitHub repository. Build configuration is included; production has not been replaced by this implementation.

A CI activation template is supplied in `docs/ci-workflow.yml`; installing it requires GitHub workflow permission that the current connection does not have.

## Verification limits

Local tests exercise actual PostgreSQL execution through PGlite with a fixture of the original schema. They verify the migration and RLS/transaction logic, not the hosted Supabase Auth/Storage service implementation. Browser checks cover public pages, responsive demo records, RFQ preparation and signed-out protection. Hosted Auth sign-up/sign-in, document uploads, Google OAuth and paid AI calls still require configured services and disposable staging accounts. Bidding, messages, awards and milestones were verified directly under authenticated database roles inside a transaction which was fully rolled back. No test records were retained.

The location directory is curated and local, and clearly labelled; it is not a comprehensive live global ports API. Shipment status is provider-reported, not GPS telemetry. Payments, carrier booking, WhatsApp and legal contract execution are not represented as implemented integrations. Policy pages include operator setup requirements for the business identity, jurisdiction, retention and approved legal language before commercial launch.

Hero photography uses the image already referenced by the original application, copied into `public/assets/cargo-port.jpg` for dependable serving. Source: [Unsplash](https://images.unsplash.com/photo-1578575437130-527eed3abbec). Google Fonts supplies Manrope and DM Sans with system fallbacks.

## Inquiry progress and administrator review

The inquiry editor includes an animated, field-based completion line across four sections. Provider registration distinguishes Truck Owners / Road Haulage from Clearing & Forwarding Agents (CFAs). An authorized administrator can switch private Cargo Owner, CFA and Truck Owner review workspaces from the dashboard header; records persist separately from live marketplace listings. Server-side membership checks govern every switch. See `docs/deployment.md` for review workflow and messaging limits. The designated existing operator has administrator membership; passwords are unchanged.
