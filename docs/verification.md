# Verification evidence

## Automated checks

- `npm run lint`: passed, no warnings/errors.
- `npm run typecheck`: passed for application, API and unit test source.
- `npm test`: 47 tests passed in two suites. No test records retained and no paid AI requests.
- `npm run build`: passed; Vite production assets generated successfully, with routes split into separate page modules.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilities reported.
- A CI activation template is supplied in `docs/ci-workflow.yml`. The GitHub connection lacks workflow scope, so it has not been installed or run remotely; local checks passed.

### Domain/API tests (17)

Location name/country/code search; port/airport/inland terminal types; missing required shipment details; identical routes and invalid dates/volume; warehousing without a transport destination; scope comparison warning; mixed-currency/validity warning; itemised total; decimal currency precision; and explicit AI-unconfigured response are covered across nine test cases (some cases check multiple invariants).

### Database tests (19)

The checked-in migration is actually executed inside a fresh PGlite PostgreSQL instance, starting from a fixture matching the original CargoLink tables and relevant policies. Tests switch to the real `authenticated` database role and set test JWT subjects so RLS executes as it would for clients.

1. Idempotent company onboarding and blocked self-created memberships.
2. Incomplete draft persistence, rejected invalid publication and validated publication.
3. Denied unrelated RFQ editing and administrator operations.
4. Trucking provider blocked from quoting on ocean freight.
5. Verified forwarder can quote on an inquiry belonging to a cargo owner.
6. Charge totals and forged bid statuses rejected.
7. Quotation/message participant privacy and notifications.
8. Only the cargo owner can award, with a verified provider check and duplicate award rejection.
9. Only the awarded provider can update milestones and finish delivery.
10. Administrator moderation blocks suspended providers.
11. Persistent assistant usage limit: first ten allowed, eleventh rejected.
12. Verification documents visible only to the owner and administrators.
13. Unverified bidding and forged verification review timestamps blocked; admin-only approval succeeds.
14. Direct invalid RFQ creation and expired quotations blocked.
15. Notification field permissions restrict updates to read state.

Eight additional domain tests cover door addresses, sea equipment/counts, air package/weight normalization, trucking addresses, mode-filtered suggestions, mode switching and adaptive step labels. Four additional database tests enforce door addresses, sea quantities, air packages/no sea equipment, trucking addresses and rejection of standalone clearance. Hosted Auth/Storage service implementations are separate from these local SQL tests.

## Browser checks performed

Using the actual in-app browser against the locally served application:

- Homepage renders with local cargo photograph, service tabs, route suggestions and inquiry action.
- 390px mobile viewport: homepage, RFQ editor, demonstration dashboard and comparison have document width equal to viewport width. Wide data tables scroll within their own card. A discovered overflow from absolutely positioned table label text was fixed and rechecked.
- 768px tablet viewport: comparison, registration and public pages fit without horizontal page overflow.
- 1440px desktop viewport: quotation comparison fits without page overflow.
- RFQ flow: homepage route selection transfers to the editor; cargo step blocks missing cargo, weight and date; a future date can be selected; additional services transfer to the review; signed-out submit redirects to sign-in and preserves the draft.
- Demonstration RFQ links open details; quotation tab opens; selecting both providers reveals the full charge comparison and explicit differing-scope warning. Sample records are labelled.
- Account registration displays both role choices and working navigation to sign-in, policies and demonstration workspace.
- Direct visits to customer, provider marketplace and administrator accounts redirect signed-out users to sign-in with an internal return URL.
- Rendered heading checks pass for services, routes, business/provider introduction, resources, about, help, contact, terms and privacy. These pages show no horizontal overflow at the tested tablet size.

Saved screenshots in the handoff outputs show the homepage and desktop/mobile quote comparison. Authenticated dashboard visuals and live mutations still require configured disposable staging accounts; no actual user's session was used for testing.

## Integration checks and limits

Both migrations were applied to the original Supabase project after the owner's explicit approval. Their checked-in versions match the hosted migration ledger. Post-upgrade checks confirm the original one RFQ and one company are preserved and verification storage is private.

A hosted transaction-only test created temporary test identities, set authenticated database roles, saved a draft, rejected a missing door pickup address, published the RFQ, submitted a verified provider quote, sent a private message, awarded the bid, and updated the shipment milestone. All assertions passed and **the entire transaction was rolled back**, retaining no test identities, records or notifications.

Browser checks verify sea door addresses/equipment, air airports/package count/weight with no sea equipment, and trucking city plus custom address entry. Homepage completion opens the success banner at step 2 with mode-specific progress labels. Mobile trucking form and the handoff have a 390px document width at a 390px viewport. The first-step data, including 12 air packages and 240kg, is preserved through navigation. An empty trucking delivery address is blocked before advancing.

Remaining service configuration: Google OAuth is disabled, administrator access is provisioned, and no AI key has been provisioned. The production frontend is not promoted. The existing Vercel protection remains enabled on review previews. Hosted Auth sign-in/sign-up, actual storage uploads and paid AI responses still need disposable staging-account verification.

## Database advisory review

The anonymous trigger-function execution warnings were removed by the upgrade. Remaining authenticated security-definer notices are expected for explicitly guarded ownership/admin workflow RPCs and policy helpers; inspect [Supabase's function execution advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). The assistant usage ledger deliberately has no client policies and no client table grants; only the guarded rate-limit function accesses it. See [the RLS-policy advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Supabase's existing leaked-password protection setting remains disabled and is an operator configuration dependency: [password protection setup](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Inquiry progress, provider choice and admin review

- Field-based inquiry progress advances within each section, completes optional services when visited, reaches Ready to submit at review and retains visited-section progress when going back. It does not claim the inquiry is published.
- Service provider registration requires Truck Owner / Road Haulage or Clearing & Forwarding Agent (CFA), preserves the preference through confirmation/onboarding and uses normal database registration checks.
- Eight new database cases cover switching denial for normal users, private workspace reuse and isolation, same-account private quotes, review/live bid separation, truck eligibility, active-company enforcement, award and milestone transitions, and return to admin. Three unit cases cover progress.
- The connected database passed customer review creation → CFA quotation → customer award → CFA milestone → admin return. The transaction was rolled back, retaining no smoke-test records.

Browser verification observed progress at 0%, 8% after one location, 25% after route/equipment, 50% after cargo/schedule, 63% after an optional service and 100% at review. Registration visibly reveals both required provider choices. No account or live inquiry was submitted in these public browser checks.

## Truck availability, benefits and preparation — 27 October 2026

- 51 local tests passed. New database coverage: truck owner publishing, unrelated edit rejection, shipper browsing, capacity/date rejection, private targeted RFQ visibility, unrelated bid rejection, selected truck bid acceptance, quote-request notification, preparation persistence/consent withdrawal/owner isolation, closed-listing hiding and direct mutation rejection.
- TypeScript, ESLint (no warnings), and production build passed.
- Browser checked homepage at 1440px, 768px and 390px: document width equals viewport, no page-level horizontal overflow. Route slider controls scroll; reduced-motion and pause controls are implemented.
- Browser entered two unmatched road addresses, weight and packaging; Get quotations moved to step 2 with first-step success and retained weight. Found and fixed an input handler error during verification; rechecked successfully.
- Benefits section screenshot saved in handoff outputs. All decorative comparisons/chats are labeled illustrative, and unavailable WhatsApp/email/AI checklist capabilities are labeled pending.
- New database migrations applied successfully. Original single RFQ remains. No sample truck listing or customer email was inserted into production during this update.
- Full authenticated browser truck publish → request → bid → checklist flow is not yet exercised with separate live users. Database integration tests cover its permissions and persistence. Google live suggestions, AI generation, WhatsApp ingestion and email delivery cannot be tested until their connections exist.
