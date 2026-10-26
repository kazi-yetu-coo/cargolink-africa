# Verification evidence

## Automated checks

- `npm run lint`: passed, no warnings/errors.
- `npm run typecheck`: passed for application, API and unit test source.
- `npm test`: 24 tests passed in two suites. No production writes or paid AI requests.
- `npm run build`: passed; Vite production assets generated successfully, with routes split into separate page modules.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilities reported.
- A CI activation template is supplied in `docs/ci-workflow.yml`. The GitHub connection lacks workflow scope, so it has not been installed or run remotely; local checks passed.

### Domain/API tests (9)

Location name/country/code search; port/airport/inland terminal types; missing required shipment details; identical routes and invalid dates/volume; warehousing without a transport destination; scope comparison warning; mixed-currency/validity warning; itemised total; decimal currency precision; and explicit AI-unconfigured response are covered across nine test cases (some cases check multiple invariants).

### Database tests (15)

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

These are local PostgreSQL tests. They do not claim the hosted migration is applied or exercise Supabase's hosted Auth/Storage implementations.

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

Read-only inspection of the existing Supabase project confirmed the original tables with RLS, discovered bid eligibility/award bugs, confirmed Google OAuth disabled, email authentication enabled with email confirmation, and zero assigned administrator accounts. A tracked migration fixes the database issues, but remote application of that migration was rejected by automatic approval review due to shared schema/permission changes. It remains unapplied.

The existing Vercel project and prior production deployment were found. This implementation was not promoted to production. OpenAI credentials have not been provisioned, so no successful live AI response is claimed. The assistant's missing-key behavior is tested.

Live end-to-end sign-up/onboarding, upload, verification, bid, message, award and notification testing must follow the deployment checklist after migration approval and service configuration. Until then this is a tested implementation and review package, not a completed live production rollout.
