# tuShip visual refresh — 28 October 2026

The supplied tuShip boards guide the new visual identity: dark navy typography, emerald/mint accents, pale blue surfaces, rounded forms, photographic logistics imagery and airy spacing. Existing inquiry fields, roles, authorization, storage keys and service connections remain unchanged.

Homepage order: hero and existing form; inline route/rate marquee; Simple, transparent and reliable; shipping modes; retained Less chasing / More business moving; global network; shipper/provider panels; closing CTA; footer. Public informational pages, authentication and shared dashboard components inherit the updated brand and theme.

The marquee uses explicitly labeled example tariffs, not real provider bids or live market data. Items show route, USD amount and shipment unit. Scope/exclusions are described in each item’s tooltip. Example values must be replaced with operator-approved public prices before marketing them as offers. No claimed price movements or platform volume statistics are fabricated. Selecting an ocean corridor prefills ocean ports; road corridors prefill road addresses. The ticker supports pause, focus/hover pause and reduced-motion scrolling.

New photographs were generated for the project: `tuship-hero.png`, `tuship-business-owner.png`, `tuship-rail.png`. `world-map.svg` derives from Natural Earth 1:110m country outlines (public domain), fetched from https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson . Map connections are illustrative, not live carrier coverage.

The brand is tuShip / tuShip.com. Existing GitHub, Supabase and Vercel project names are retained to preserve integration continuity. No domain purchase or DNS configuration is included in this visual update.

## Authentication image and contrast fix

Login/sign-up side panel uses white copy on solid navy (#062b40), with a separate lower photo area so busy image details cannot reduce text contrast. The photo is by Bent Van Aeken on Unsplash, marked free under the Unsplash License: https://unsplash.com/photos/an-aerial-view-of-a-cargo-ship-in-the-ocean-0A7YwYhZhWw . Downloaded source: https://images.unsplash.com/photo-1724597500306-a4cbb7d1324e . Saved as `tuship-auth-ocean.jpg`. Existing authentication logic is unchanged.

## WhatsApp homepage feature

Added an anchored hero WhatsApp card and a mint feature section with a CSS phone illustration. The copy explains message → AI-organised draft → account/review/submission → provider quotations. The existing homepage sections and freight fields remain intact. Both links use `/automation` until `VITE_WHATSAPP_NUMBER` contains an international number (digits, country code, no leading zero). Once configured and rebuilt, links open `https://wa.me/<number>` with a generic greeting; no shipment or account details are transmitted automatically. This enables a chat link only, not the AI/WhatsApp backend. Planned automation remains explicitly labeled coming soon. The operator supplied +255757490145 as the public chat destination. This is the default contact; an environment override can change it. Opening a chat does not send the greeting automatically.
