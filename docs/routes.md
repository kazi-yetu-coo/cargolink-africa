# Route inventory

All routes are defined in `src/App.tsx`. Public/auth/customer/provider/admin layouts are separate. Dynamic `:id` segments refer to real UUIDs in live workspaces and explicit `demo-*` identifiers only within the sample workspace.

| Area | Route | Page / behavior |
| --- | --- | --- |
| Public | `/` | Homepage, route-first freight inquiry entry |
| Public | `/services` | Seven service categories |
| Public | `/routes` | Curated trade corridors |
| Public | `/for-businesses` | Cargo owner introduction |
| Public | `/for-providers` | Provider introduction |
| Public | `/resources` | Shipment and platform guidance |
| Public | `/about` | Platform overview |
| Public | `/help` | Help centre / FAQs |
| Public | `/contact` | Support request form |
| Public | `/terms` | Terms and marketplace responsibilities |
| Public | `/privacy` | Data-use information and operator launch requirements |
| Public | `/providers` | Verified provider directory |
| Public | `/providers/:id` | Provider profile / save provider |
| Public | `/inquiry` | Four-step RFQ editor, preserved pre-sign-in draft |
| Public | `/inquiry/assistant` | Conversational inquiry preparation; AI use requires sign-in |
| Auth | `/auth/sign-in` | Email/password and Google sign-in |
| Auth | `/auth/sign-up` | Registration and role choice |
| Auth | `/auth/forgot-password` | Reset email request |
| Auth | `/auth/update-password` | Secure password update |
| Auth | `/auth/callback` | OAuth/email confirmation callback |
| Auth | `/onboarding` | Cargo owner/provider company setup |
| Customer | `/customer` | Dashboard |
| Customer | `/customer/rfqs` | Inquiry list, search and status/service filters |
| Customer | `/customer/rfqs/new` | Create RFQ |
| Customer | `/customer/rfqs/:id` | RFQ details, quotations and activity |
| Customer | `/customer/rfqs/:id/edit` | Edit own draft |
| Customer | `/customer/rfqs/:id/compare` | Quote comparison entry |
| Customer | `/customer/quotes` | Received quotations |
| Customer | `/customer/shipments` | Awarded/completed shipments |
| Customer | `/customer/saved-providers` | Saved companies |
| Customer | `/customer/messages` | Private shipment conversations |
| Customer | `/customer/notifications` | Notifications and read state |
| Customer | `/customer/profile` | Company profile |
| Customer | `/customer/settings` | Account security and support |
| Provider | `/provider` | Provider dashboard |
| Provider | `/provider/marketplace` | Eligible open inquiries |
| Provider | `/provider/rfqs` | Redirect to marketplace |
| Provider | `/provider/rfqs/:id` | Inquiry, own quotation, activity |
| Provider | `/provider/rfqs/:id/bid` | Itemised quotation submission |
| Provider | `/provider/bids` | Submitted quotations and status |
| Provider | `/provider/jobs` | Awarded jobs |
| Provider | `/provider/verification` | Registration details, private uploads, review status |
| Provider | `/provider/messages` | Private conversations |
| Provider | `/provider/notifications` | Notification inbox |
| Provider | `/provider/profile` | Company services/profile |
| Provider | `/provider/settings` | Account settings |
| Admin | `/admin` | Actual marketplace metrics and charts |
| Admin | `/admin/verifications` | Review queue, documents, decisions |
| Admin | `/admin/accounts` | Company access moderation |
| Admin | `/admin/rfqs` | Marketplace records |
| Admin | `/admin/rfqs/:id` | Record inspection |
| Admin | `/admin/activity` | Audit activity and support requests |
| Admin | `/admin/messages` | Participant-scoped conversations (no message snooping) |
| Admin | `/admin/notifications` | Own notifications |
| Admin | `/admin/profile` | Administrator account overview |
| Admin | `/admin/settings` | Account settings |
| Demo | `/demo` | Labelled sample dashboard |
| Demo | `/demo/rfqs` | Sample RFQ list |
| Demo | `/demo/rfqs/:id` | Sample detail, comparison and safe award demonstration |
| Demo | `/demo/providers` | Sample provider directory |
| Shared | `/dashboard` | Role-based dashboard redirect |
| Shared | Unknown paths | Designed 404 page with working home navigation |
| Server | `POST /api/inquiry` | Session-verified, rate-limited structured AI inquiry |

Protected areas require an authenticated user, completed company onboarding and the appropriate role. Suspended companies receive an access notice. Administrators are assigned through the database, not the sign-up form.
