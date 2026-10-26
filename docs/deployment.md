# Deployment and remaining integrations

## Existing infrastructure

- GitHub: `kazi-yetu-coo/cargolink-africa`, base branch `main`.
- Supabase project: `iacahumfwacpknggqjtd` (original project preserved).
- Vercel project: `cargolink-africa-git`, ID `prj_Pua02IlUZVFImLLOE21lUhWDkz1X`.
- Vercel team: `team_ktUbchfLZVfAGayPl3TNkLzE`.
- Existing production URL: https://cargolink-africa-git.vercel.app . This is the prior production deployment, not a claim that the new application is live.

## Required rollout order

1. **Completed:** the owner approved the database upgrade and both checked-in migrations were applied to the existing Supabase project. Hosted ledger versions are `20261026135933` and `20261026140803`. Do not reapply these migrations to that project.
2. **Completed:** a pre-upgrade schema snapshot was retained locally; post-upgrade checks confirm the original RFQ and company remain and the verification bucket is private.
3. **Completed:** a live authenticated database smoke test covered draft, missing door-address rejection, publication, verified provider bid, private message, award and milestone. The entire test was rolled back. Local tests additionally exercise mode-specific sea/air/trucking fields. For future schema changes, rehearse against staging and coordinate the frontend release.
4. Configure the environment variables below in the existing Vercel project, for Preview and Production as appropriate. The frontend has original publishable defaults, but setting variables explicitly is recommended. Never prefix a server secret with `VITE_`.
5. Configure Supabase Auth's site URL and callback allowlist for the chosen preview and production URLs. Allow `/auth/callback` and `/auth/update-password` destinations for each origin.
6. Enable Google in Supabase Auth and supply the operator's Google OAuth client ID/secret. Register Supabase's provider callback URL in Google Cloud. Google was confirmed **disabled** at handoff; the button is integrated but cannot complete OAuth until this is done. See [Supabase Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google).
7. Assign a designated, existing operator account to `public.platform_admins` through a trusted database session. There were **zero administrators** at handoff. The owner must identify which account receives this privilege; public sign-up cannot create administrators.
8. Configure a production email sender and verify sign-up confirmation and password recovery. Email auth is enabled and confirmation is required in the existing project. Enable appropriate password protection and review Supabase Auth security settings before commercial launch.
9. Build a Vercel preview from the implementation branch. `vercel.json` selects Vite, `npm run build`, `dist`, security headers and history fallback while retaining native `/api` functions. The API uses Vercel's Node.js named `POST` handler support: [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js).
10. Run the staging/live smoke checklist below with disposable cargo owner, provider and administrator accounts. Fix failures before merging/promoting to production. Retain the prior deployment and database backup for recovery.

## Variables

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Public browser configuration | Existing Supabase API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public, safe for browser | Publishable key; RLS authorizes records |
| `SUPABASE_URL` | Server | API URL used by inquiry endpoint |
| `SUPABASE_PUBLISHABLE_KEY` | Server | Verifies user JWT through Supabase Auth |
| `OPENAI_API_KEY` | **Server secret only** | Optional AI-assisted inquiry extraction |
| `OPENAI_MODEL` | Server | Defaults to `gpt-4.1-mini`; set an available structured-output model |

No OpenAI key has been provisioned or live paid request made. Without that key the endpoint returns 503 and the interface offers the structured form. The endpoint validates the session, caps conversation size, uses a durable per-user limit of ten requests per hour, requests strict structured output, does not store responses at OpenAI, and never submits an RFQ itself. See [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Hosted smoke checklist

- Cargo owner: confirm email, finish onboarding, save draft, reload, edit, publish, inspect received bids, compare, message, award exactly once.
- Provider: finish onboarding, upload a private PDF/image, submit verification, confirm bidding blocked while pending, receive administrator approval, discover eligible inquiries, submit itemised quote, send message, view awarded job, update milestones and complete delivery.
- Administrator: review only the intended company's private documents, approve/reject/reopen review, suspend/restore an account, close a draft/open inquiry, inspect audit records and resolve support requests.
- Authorization: cargo owners cannot become administrators through profile metadata; strangers cannot read bids/messages/private files; suspended users cannot mutate protected workflows; unverified providers cannot bid; unrelated providers cannot update shipments.
- Quotes: verify mixed currencies, different service scopes, missing/expired validity and exclusions remain explicit. Confirm no automatic price ranking or FX conversion.
- Notifications: confirm bid, award, message and milestone notices persist. Realtime subscriptions work if the tables are included in the project's publication; a 30-second visible-page refresh provides fallback.
- AI (if enabled): authenticate, extract a draft, confirm missing details, review matched locations and submit through the ordinary RFQ form. Test unavailable provider, rate limit and expired session.
- Responsive: repeat critical flows at 390px, 768px and desktop sizes; scroll tables within their cards. Verify mobile navigation and dialog focus.

## Continuous integration

The GitHub connection refused creation of an active workflow because its OAuth grant lacks workflow scope. `docs/ci-workflow.yml` supplies the complete activation template; a repository owner can copy it to `.github/workflows/ci.yml` using an authorised connection. The same quality commands already pass locally.

## Other operating dependencies

The location directory is curated, not a live complete worldwide logistics registry. Add an authoritative global location feed if broader coverage is required. Shipment progress uses provider-entered milestones, not carrier telemetry. The operator must complete the legal entity, support contact, jurisdiction, retention and approved policy language before public commercial launch. Payments, carrier bookings and WhatsApp are separate integrations and are not simulated as live features.

## Current inquiry behavior

The first step is completed on the homepage. Sea inquiries collect ports, scope, equipment and container/package count. Air inquiries collect airports, scope, boxes/packages and gross weight; sea equipment is not submitted. Door-to-door and one-sided door scopes reveal the appropriate exact addresses. Trucking accepts cities, inland terminals and entered street addresses (clearly marked as user-entered, not geocoded). The editor opens at cargo/schedule with the first step marked complete. Clearance remains an itemised provider quotation charge; no new standalone clearance inquiry can be submitted.
