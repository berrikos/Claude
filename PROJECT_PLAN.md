# Square Online Ordering App — Project Plan

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Competitive Landscape & Key Insights](#2-competitive-landscape--key-insights)
3. [Our Differentiators](#3-our-differentiators)
4. [Square API Integration Architecture](#4-square-api-integration-architecture)
5. [Feature Specification](#5-feature-specification)
6. [UI/UX Design System](#6-uiux-design-system)
7. [Technical Architecture](#7-technical-architecture)
8. [Development Phases](#8-development-phases)
9. [Database Schema (High-Level)](#9-database-schema-high-level)
10. [Security & Compliance](#10-security--compliance)

---

## 1. Executive Summary

We are building a **white-label online ordering web application** that integrates deeply with Square POS for restaurants. The app pulls menus and locations from Square, presents them in a beautiful mobile-first interface, processes orders and payments through Square, and pushes completed orders directly to the restaurant's Square POS/KDS. It includes customer accounts with built-in Square Loyalty integration.

**Why this matters:** The current market is broken. Square's own online ordering doesn't truly integrate with in-person POS. Competitors like ChowNow ($139/mo), Owner.com ($499/mo), and Toast (3.5% fees + lock-in contracts) are either too expensive, too locked-in, or too limited. There is a clear gap for a well-designed, fairly-priced solution that *actually works* with Square POS.

---

## 2. Competitive Landscape & Key Insights

### Major Competitors Analyzed

| Platform | Price | Pros | Cons |
|----------|-------|------|------|
| **Square Online** | Free–$60/mo + 2.9%+$0.30 | Unified ecosystem, easy setup, no contracts | Online/in-person orders don't truly integrate, weak order throttling, terrible reporting, no 24/7 support |
| **ChowNow** | $139/mo | Commission-free, 45+ POS integrations, branded apps | Confusing UI, POS integration bugs via Otter middleware, slow support |
| **GloriaFood** | Free–$59/mo add-ons | Genuinely free tier, no commissions | No native Square integration, limited to one tablet, delivery fee calc broken |
| **Toast** | $0–$69/mo + 3.5% online | Purpose-built for restaurants, great hardware | 2-year contracts, costs escalate fast, declining reliability |
| **Owner.com** | $499/mo + 5% to customer | AI upselling, SEO boost, 25% sales increase | Extremely expensive, lock-in through app/rewards, reported sales drops on switch |
| **Sauce** | Flat fee (unlisted) | Commission-free, delivery driver network | Newer platform, limited customization |
| **Bbot (DoorDash)** | Quote-based | QR ordering, multi-vendor support | Now DoorDash-owned, uncertain future |
| **Menufy** | $1.75/order or $99/mo | Fast setup, discovery listing | 12.5% delivery fee, no branded app |

### Top 10 Pain Points Across the Market (Our Opportunities)

1. **Online + in-person orders don't integrate** — Square's #1 complaint; orders placed via POS don't show in Order Manager
2. **Order throttling is per-order, not per-item** — A 10-pizza order is treated the same as a 1-pizza order
3. **No raw ingredient inventory tracking** — Everyone punts to third-party tools
4. **Hidden/opaque pricing** — Costs escalate unexpectedly at scale
5. **Customer support is universally bad** — Even Toast's 24/7 support is declining
6. **Menu management is tedious** — Modifiers and conditional options are painful everywhere
7. **Reporting lacks depth** — No custom reports, drill-down stops at category level
8. **Lock-in tactics breed resentment** — Contracts, proprietary apps, payment processor exclusivity
9. **Commission-free is now table stakes** — Per-order commissions are a competitive disadvantage
10. **Small restaurants are underserved** — Gap between free (too basic) and $500+/mo (too expensive)

---

## 3. Our Differentiators

Based on competitor weaknesses and user feedback, our app will focus on:

| Differentiator | What It Means |
|----------------|---------------|
| **True POS Integration** | Orders appear in Square POS immediately with fulfillment + payment attached (not as orphaned drafts) |
| **Beautiful Mobile-First UI** | Rivaling DoorDash/Uber Eats quality — not a clunky white-label template |
| **Transparent, Simple Pricing** | Flat monthly fee, no commissions, no hidden costs |
| **Smart Menu Sync** | Auto-pull from Square Catalog with categories, modifiers, images, dietary tags — real-time updates |
| **Built-in Square Loyalty** | Points display throughout ordering flow, not buried in a separate section |
| **Guest Checkout + Accounts** | Never force registration; offer it post-purchase with loyalty incentive |
| **One-Tap Reorder** | Order history with instant reorder — the #1 retention feature |
| **Real-Time Order Status** | Webhook-driven status updates from kitchen to customer |
| **Sub-3-Second Load Times** | Optimized images (WebP/AVIF), lazy loading, CDN delivery |
| **WCAG 2.1 AA Accessible** | Full keyboard navigation, screen reader support, proper contrast ratios |

---

## 4. Square API Integration Architecture

### APIs We Will Use

| API | Purpose | OAuth Scopes |
|-----|---------|--------------|
| **Catalog API** | Pull menu items, categories, modifiers, images, pricing | `ITEMS_READ` |
| **Locations API** | Pull restaurant locations, hours, addresses, coordinates | `MERCHANT_PROFILE_READ` |
| **Orders API** | Create orders with line items, fulfillments, send to POS | `ORDERS_READ`, `ORDERS_WRITE` |
| **Payments API** | Process card payments via Web Payments SDK | `PAYMENTS_READ`, `PAYMENTS_WRITE` |
| **Customers API** | Create/search customer profiles, link to orders | `CUSTOMERS_READ`, `CUSTOMERS_WRITE` |
| **Loyalty API** | Look up loyalty accounts, accrue/redeem points, create rewards | `LOYALTY_READ`, `LOYALTY_WRITE` |
| **Webhooks** | Real-time order status updates, catalog changes | (subscription-based) |
| **OAuth** | Merchant onboarding, token management | — |

### Critical Integration Rules

1. **Orders must have both a fulfillment AND a payment** to appear in Square POS — DRAFT orders are invisible
2. **Only one fulfillment per order** — all items fulfilled from same location
3. **Delivery fulfillment is closed beta** — we start with Pickup and integrate delivery later
4. **Customer dedup is manual** — must `SearchCustomers` before `CreateCustomer` to avoid duplicates
5. **Access tokens expire in 30 days** — auto-renew every 7 days proactively
6. **1% fee if using non-Square payments** — we use Square Payments to avoid this
7. **Rate limits are undocumented** — implement exponential backoff with jitter for all API calls
8. **MENU_CATEGORY vs REGULAR_CATEGORY** — must handle both category types from catalog

### Order Flow

```
Customer browses menu (Catalog API data)
        ↓
Customer adds items to cart (client-side)
        ↓
Customer enters info / logs in (Customers API search/create)
        ↓
CalculateOrder API → preview pricing with taxes/discounts
        ↓
Customer selects pickup time & pays (Web Payments SDK → tokenize)
        ↓
CreateOrder API (with fulfillment + line items + customer_id)
        ↓
CreatePayment API (with order_id + payment token)
        ↓
AccumulateLoyaltyPoints API (with order_id → auto-calculates points)
        ↓
Order appears on Square POS / KDS ✓
        ↓
Webhooks → order.fulfillment.updated → real-time status to customer
```

---

## 5. Feature Specification

### 5.1 Customer-Facing Features

#### Menu & Browsing
- **Location selector** — multi-location support with address, hours, distance sorting
- **Category navigation** — sticky horizontal scrollable tabs (mobile), sidebar (desktop)
- **Menu items** — high-quality images, name, description, price, dietary tags (V, VG, GF, DF, spicy level)
- **Item detail modal** — full description, modifier groups (required first, optional second), real-time price updates as modifiers selected
- **Search** — search menu items by name or keyword
- **Menu availability** — respect Square catalog item availability and location-specific pricing

#### Cart & Checkout
- **Sticky cart** — floating button (mobile) showing item count + total; sidebar (desktop)
- **Cart editing** — modify quantities, modifiers, remove items inline
- **Order type selection** — Pickup (initially), with scheduled time picker
- **Guest checkout** — no forced registration; email captured early for recovery
- **Account checkout** — saved addresses, saved payment methods, one-tap reorder
- **Transparent pricing** — subtotal, tax, tip (optional), total — all visible before payment
- **Tip selection** — preset percentages (15%, 20%, 25%) + custom amount
- **Payment** — Square Web Payments SDK: cards, Apple Pay, Google Pay, Cash App Pay
- **Order confirmation** — summary page with order number, estimated ready time

#### Customer Accounts
- **Registration** — email + password, or post-checkout conversion with loyalty incentive
- **Login** — email/password + "Remember me"
- **Profile** — name, email, phone, saved addresses, saved payment methods
- **Order history** — list of past orders with date, items, total, status
- **One-tap reorder** — reorder any past order with a single tap (using Clone Order API)
- **Favorites** — save favorite items for quick access

#### Square Loyalty Integration
- **Loyalty status visible throughout** — points balance shown in header/account area and at checkout
- **Points preview** — "You'll earn X points with this order" shown in cart
- **Reward redemption at checkout** — available rewards displayed with one-tap apply
- **Progress visualization** — progress bar toward next reward tier/reward
- **Auto-enrollment** — prompt to join loyalty program at checkout if not enrolled (phone number lookup)
- **Points history** — view accrual and redemption history in account

#### Real-Time Order Tracking
- **Order status page** — PROPOSED → RESERVED → PREPARED → COMPLETED
- **Push notifications** — (future: via PWA service worker) when order status changes
- **Estimated ready time** — based on fulfillment data from Square

### 5.2 Restaurant/Merchant Features (Admin)

#### Onboarding
- **Square OAuth connect** — one-click authorization to link Square account
- **Location selection** — choose which locations to enable for online ordering
- **Menu review** — preview synced menu before going live
- **Branding setup** — upload logo, set primary/accent colors, restaurant description

#### Dashboard
- **Order management** — view incoming orders, update status (handled primarily through Square POS)
- **Menu overrides** — temporarily 86 items, adjust availability hours
- **Basic analytics** — order volume, revenue, popular items, average order value
- **Settings** — operating hours for online ordering, pickup lead times, order throttling

---

## 6. UI/UX Design System

### Design Principles

1. **Mobile-first** — 75%+ of orders will come from mobile; design for thumb zones first
2. **Speed over flash** — sub-3-second loads; no heavy animations that block interaction
3. **Transparent pricing** — all costs visible at all times; no surprise fees
4. **Progressive disclosure** — show essentials first, reveal complexity on demand
5. **Accessibility-native** — WCAG 2.1 AA from day one, not retrofitted

### Layout Architecture

#### Mobile (< 768px)
```
┌─────────────────────────┐
│  Logo    Location  Acct  │  ← Fixed header
├─────────────────────────┤
│ [Cat 1] [Cat 2] [Cat 3] │  ← Sticky horizontal category tabs
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │ 🖼  Item Name     │  │  ← Menu item card
│  │     $12.99  ⓥ ⓖⓕ │  │     (image, name, price, tags)
│  │     Short desc... │  │
│  │          [+ Add]  │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ 🖼  Item Name     │  │
│  │     $9.99         │  │
│  │     Short desc... │  │
│  │          [+ Add]  │  │
│  └───────────────────┘  │
│                         │
│         ...             │
│                         │
├─────────────────────────┤
│  🛒 View Cart (3) $34.97│  ← Sticky floating cart button
└─────────────────────────┘
```

#### Desktop (≥ 1024px)
```
┌──────────────────────────────────────────────────────┐
│  Logo        Location Selector       Account  Cart   │
├────────┬─────────────────────────────┬───────────────┤
│        │                             │               │
│ Cat 1  │  ┌─────┐ ┌─────┐ ┌─────┐  │  Your Cart    │
│ Cat 2  │  │ 🖼  │ │ 🖼  │ │ 🖼  │  │               │
│ Cat 3  │  │Item │ │Item │ │Item │  │  Item 1  $12  │
│ Cat 4  │  │$12  │ │$10  │ │$15  │  │  Item 2   $9  │
│ Cat 5  │  │[Add]│ │[Add]│ │[Add]│  │  ──────────── │
│        │  └─────┘ └─────┘ └─────┘  │  Subtotal $21 │
│        │                             │  Tax      $2  │
│        │  ┌─────┐ ┌─────┐ ┌─────┐  │  ──────────── │
│        │  │ 🖼  │ │ 🖼  │ │ 🖼  │  │  Total   $23  │
│        │  │Item │ │Item │ │Item │  │               │
│        │  │$8   │ │$14  │ │$11  │  │ [Checkout →]  │
│        │  │[Add]│ │[Add]│ │[Add]│  │               │
│        │  └─────┘ └─────┘ └─────┘  │               │
└────────┴─────────────────────────────┴───────────────┘
```

### Item Detail Modal
```
┌─────────────────────────┐
│         [✕ Close]       │
│  ┌───────────────────┐  │
│  │                   │  │
│  │   Food Image      │  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  Margherita Pizza       │
│  $14.99  ⓥ             │
│  Fresh mozzarella,      │
│  San Marzano tomatoes,  │
│  basil, olive oil       │
│                         │
│  ── Size (Required) ──  │
│  ○ Small  (+$0)         │
│  ● Medium (+$3)         │
│  ○ Large  (+$6)         │
│                         │
│  ── Extra Toppings ──   │
│  ☐ Mushrooms   +$1.50  │
│  ☑ Olives      +$1.50  │
│  ☐ Peppers     +$1.00  │
│                         │
│  ── Special Instructions │
│  ┌───────────────────┐  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│   [- 1 +]               │
│                         │
│  [Add to Cart — $19.49] │
└─────────────────────────┘
```

### Checkout Flow
```
Step 1: Cart Review
  → Edit items, apply rewards, see loyalty points preview

Step 2: Customer Info
  → Guest: name, email, phone
  → Logged in: pre-filled, select saved info

Step 3: Pickup Details
  → Location confirmation, pickup time selector

Step 4: Payment
  → Square Web Payments SDK card form
  → Apple Pay / Google Pay buttons
  → Tip selector
  → "Place Order" button with final total

Step 5: Confirmation
  → Order number, estimated ready time
  → Real-time status tracker
  → "Create Account & Earn Points" prompt (guest only)
```

### Color & Typography System

```
Primary Colors (customizable per restaurant):
  --color-primary:    #E23744  (default warm red — appetite-stimulating)
  --color-primary-dark: #C62D38
  --color-accent:     #FF8A00  (orange for CTAs)

Neutral Palette:
  --color-bg:         #FFFFFF
  --color-surface:    #F8F9FA
  --color-border:     #E5E7EB
  --color-text:       #1F2937
  --color-text-secondary: #6B7280

Semantic Colors:
  --color-success:    #10B981
  --color-warning:    #F59E0B
  --color-error:      #EF4444

Typography:
  Font Family:  Inter (headings), system-ui stack (body)
  Scale:        14px body, 16px emphasis, 20px subheading, 28px heading, 36px hero
  Line Height:  1.5 body, 1.3 headings

Spacing:
  Base unit: 4px
  Scale: 4, 8, 12, 16, 24, 32, 48, 64px

Border Radius:
  Cards: 12px
  Buttons: 8px
  Inputs: 8px
  Modals: 16px

Shadows:
  Card:   0 1px 3px rgba(0,0,0,0.1)
  Modal:  0 20px 60px rgba(0,0,0,0.3)
  Float:  0 4px 12px rgba(0,0,0,0.15)
```

### Dietary & Allergen Tag System
```
Tags (shown as small colored pills on menu items):
  V   = Vegetarian   (green)
  VG  = Vegan        (dark green)
  GF  = Gluten-Free  (amber)
  DF  = Dairy-Free   (blue)
  N   = Contains Nuts (red outline)
  🌶  = Spicy level  (1-3 chili icons)
```

---

## 7. Technical Architecture

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14+ (App Router) | SSR for SEO, RSC for performance, excellent DX |
| **Styling** | Tailwind CSS + Radix UI primitives | Utility-first, accessible components out of the box |
| **State Management** | Zustand (cart) + React Query (server state) | Lightweight, no boilerplate, excellent caching |
| **Backend** | Next.js API Routes + Server Actions | Co-located with frontend, serverless-ready |
| **Database** | PostgreSQL (via Supabase or Neon) | Relational data (merchants, users, sessions), serverless-compatible |
| **ORM** | Prisma | Type-safe queries, migrations, excellent DX |
| **Auth** | NextAuth.js (Auth.js v5) | Built-in credential + OAuth providers, session management |
| **Payments** | Square Web Payments SDK | PCI-compliant card tokenization in browser |
| **Image CDN** | Cloudflare Images or Next.js Image Optimization | Auto WebP/AVIF, responsive sizing, lazy loading |
| **Hosting** | Vercel | Edge network, serverless functions, excellent Next.js support |
| **Webhooks** | Vercel serverless functions | HTTPS endpoints for Square webhook events |
| **Caching** | Redis (Upstash) | Menu caching, session data, rate limit counters |

### System Architecture Diagram

```
┌─────────────┐     ┌──────────────────────────────────────────┐
│  Customer    │     │              Vercel Edge                 │
│  Browser     │────▶│                                          │
│  (Mobile/    │     │  ┌────────────────────────────────────┐  │
│   Desktop)   │     │  │         Next.js App                │  │
│              │◀────│  │                                    │  │
│  Square Web  │     │  │  Pages (SSR/RSC):                  │  │
│  Payments SDK│     │  │   /[restaurant]                    │  │
│              │     │  │   /[restaurant]/menu                │  │
└─────────────┘     │  │   /[restaurant]/checkout            │  │
                    │  │   /[restaurant]/order/[id]          │  │
                    │  │   /account                          │  │
                    │  │   /admin                            │  │
                    │  │                                    │  │
                    │  │  API Routes:                        │  │
                    │  │   /api/square/catalog               │  │
                    │  │   /api/square/orders                │  │
                    │  │   /api/square/payments              │  │
                    │  │   /api/square/loyalty               │  │
                    │  │   /api/webhooks/square              │  │
                    │  │   /api/auth/[...nextauth]           │  │
                    │  └──────────┬─────────────────────────┘  │
                    └─────────────┼─────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────────────────────┐
                    │             ▼                              │
                    │  ┌──────────────┐    ┌──────────────────┐ │
                    │  │  PostgreSQL   │    │  Redis (Upstash) │ │
                    │  │  (Supabase)   │    │  - Menu cache    │ │
                    │  │  - Merchants  │    │  - Sessions      │ │
                    │  │  - Users      │    │  - Rate limits   │ │
                    │  │  - Orders     │    └──────────────────┘ │
                    │  │  - Sessions   │                         │
                    │  └──────────────┘                         │
                    │           Data Layer                       │
                    └───────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────────────────────┐
                    │             ▼                              │
                    │  ┌──────────────────────────────────────┐ │
                    │  │          Square APIs                  │ │
                    │  │  - Catalog API   (menu sync)         │ │
                    │  │  - Locations API (store data)        │ │
                    │  │  - Orders API    (create orders)     │ │
                    │  │  - Payments API  (process payments)  │ │
                    │  │  - Customers API (profiles)          │ │
                    │  │  - Loyalty API   (points/rewards)    │ │
                    │  │  - Webhooks      (status updates)    │ │
                    │  └──────────────────────────────────────┘ │
                    │          Square Platform                   │
                    └───────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────────────────────┐
                    │             ▼                              │
                    │  ┌──────────────────────────────────────┐ │
                    │  │        Square POS / KDS              │ │
                    │  │    (Restaurant's physical terminal)  │ │
                    │  │                                      │ │
                    │  │    Order appears → Kitchen prepares  │ │
                    │  │    → Status updated → Customer       │ │
                    │  │      notified via webhook            │ │
                    │  └──────────────────────────────────────┘ │
                    │          Restaurant                        │
                    └───────────────────────────────────────────┘
```

### Menu Sync Strategy

```
1. On merchant onboarding:
   → Full catalog pull via ListCatalog API
   → Process: Categories → Items → Variations → Modifiers → Images
   → Cache in Redis with 15-minute TTL
   → Store catalog version hash in PostgreSQL

2. On customer page load:
   → Serve from Redis cache (fast)
   → If cache miss → fetch from Square → rebuild cache

3. Webhook-driven updates:
   → Subscribe to catalog.version.updated webhook
   → On event → invalidate Redis cache → lazy-rebuild on next request

4. Manual refresh:
   → Admin dashboard "Sync Menu" button for immediate re-pull
```

---

## 8. Development Phases

### Phase 1: Foundation (Weeks 1–3)
**Goal:** Project scaffold, Square OAuth, menu display

- [ ] Next.js project setup with TypeScript, Tailwind, Prisma
- [ ] PostgreSQL database schema & initial migrations
- [ ] Square OAuth flow — merchant connects their Square account
- [ ] Locations API integration — pull and display restaurant locations
- [ ] Catalog API integration — pull menu with categories, items, modifiers, images
- [ ] Menu display UI — responsive grid, category tabs, item cards
- [ ] Item detail modal — modifiers, quantity, add-to-cart
- [ ] Redis caching layer for catalog data
- [ ] Basic responsive layout (mobile + desktop)

### Phase 2: Cart & Ordering (Weeks 4–6)
**Goal:** Full ordering flow from cart to Square POS

- [ ] Cart state management (Zustand store)
- [ ] Sticky cart UI — floating button (mobile), sidebar (desktop)
- [ ] Cart editing — quantities, modifiers, remove items
- [ ] Pickup time selector with restaurant hours validation
- [ ] Square CalculateOrder API — preview pricing with taxes
- [ ] Guest checkout flow — name, email, phone, tip selection
- [ ] Square Web Payments SDK integration — card form, Apple Pay, Google Pay
- [ ] CreateOrder API → CreatePayment API → order pushed to POS
- [ ] Order confirmation page with order number and estimated time
- [ ] Square webhook handler for order status updates
- [ ] Real-time order tracking page

### Phase 3: Customer Accounts & Loyalty (Weeks 7–9)
**Goal:** User auth, profiles, loyalty integration

- [ ] NextAuth.js setup — email/password registration & login
- [ ] Customer profile page — name, email, phone, saved addresses
- [ ] Square Customers API integration — create/search/link profiles
- [ ] Order history page with past orders
- [ ] One-tap reorder (Clone Order API)
- [ ] Favorite items
- [ ] Square Loyalty API integration:
  - [ ] Loyalty program detection & enrollment prompt
  - [ ] Points balance display in header and checkout
  - [ ] Points preview ("Earn X points with this order")
  - [ ] Available rewards display at checkout
  - [ ] One-tap reward redemption
  - [ ] Points/rewards history in account
- [ ] Post-checkout account creation prompt (guests)
- [ ] Saved payment methods (Card on File via Square)

### Phase 4: Polish & Admin (Weeks 10–12)
**Goal:** Restaurant admin tools, branding, performance optimization

- [ ] Admin dashboard — onboarding wizard
- [ ] Branding setup — logo upload, color customization, restaurant info
- [ ] Menu override controls — 86 items, adjust availability
- [ ] Operating hours configuration for online ordering
- [ ] Basic analytics — order volume, revenue, popular items, AOV
- [ ] Image optimization pipeline — WebP/AVIF, responsive, lazy load
- [ ] Performance audit — target sub-3-second LCP on mobile
- [ ] WCAG 2.1 AA accessibility audit & fixes
- [ ] SEO optimization — meta tags, structured data (Restaurant schema)
- [ ] Error handling & edge cases
- [ ] Loading states & skeleton screens
- [ ] Empty states

### Phase 5: Launch Prep (Weeks 13–14)
**Goal:** Testing, security, deployment

- [ ] End-to-end testing — full order flow in Square Sandbox
- [ ] Payment edge cases — declined cards, refunds, partial payments
- [ ] Webhook reliability — retry handling, missed event recovery
- [ ] Security audit — OWASP top 10, CSP headers, input sanitization
- [ ] Rate limiting on API routes
- [ ] Monitoring & alerting setup (Vercel Analytics + Sentry)
- [ ] Production Square application approval
- [ ] Production deployment on Vercel
- [ ] DNS & SSL setup for custom domains
- [ ] Launch checklist & smoke tests

### Future Phases (Post-Launch)
- Delivery fulfillment (when Square opens beta or via third-party driver integration)
- PWA with push notifications for order updates
- Multi-language support
- Advanced analytics and reporting
- Branded mobile app (React Native)
- Table-side QR code ordering (dine-in)
- Kitchen display integration improvements
- AI-powered upselling suggestions
- Abandoned cart email/SMS recovery
- Group ordering

---

## 9. Database Schema (High-Level)

```
merchants
  id                UUID PK
  square_merchant_id TEXT UNIQUE
  name              TEXT
  logo_url          TEXT
  primary_color     TEXT
  accent_color      TEXT
  created_at        TIMESTAMP
  updated_at        TIMESTAMP

merchant_tokens
  id                UUID PK
  merchant_id       UUID FK → merchants
  access_token      TEXT (encrypted)
  refresh_token     TEXT (encrypted)
  expires_at        TIMESTAMP
  scopes            TEXT[]

locations
  id                UUID PK
  merchant_id       UUID FK → merchants
  square_location_id TEXT UNIQUE
  name              TEXT
  address           JSONB
  coordinates       POINT
  phone             TEXT
  business_hours    JSONB
  online_ordering   BOOLEAN DEFAULT true
  pickup_lead_time  INTEGER (minutes)
  is_active         BOOLEAN DEFAULT true

users
  id                UUID PK
  email             TEXT UNIQUE
  password_hash     TEXT
  given_name        TEXT
  family_name       TEXT
  phone             TEXT
  square_customer_id TEXT
  created_at        TIMESTAMP

user_addresses
  id                UUID PK
  user_id           UUID FK → users
  label             TEXT (home, work, etc.)
  address           JSONB
  is_default        BOOLEAN

user_saved_cards
  id                UUID PK
  user_id           UUID FK → users
  square_card_id    TEXT
  last_four         TEXT
  brand             TEXT
  exp_month         INTEGER
  exp_year          INTEGER
  is_default        BOOLEAN

orders
  id                UUID PK
  user_id           UUID FK → users (nullable for guests)
  merchant_id       UUID FK → merchants
  location_id       UUID FK → locations
  square_order_id   TEXT
  status            TEXT (pending, confirmed, preparing, ready, completed, cancelled)
  fulfillment_type  TEXT (pickup)
  pickup_at         TIMESTAMP
  subtotal          INTEGER (cents)
  tax               INTEGER (cents)
  tip               INTEGER (cents)
  total             INTEGER (cents)
  loyalty_points_earned INTEGER
  loyalty_reward_id TEXT
  guest_name        TEXT
  guest_email       TEXT
  guest_phone       TEXT
  created_at        TIMESTAMP
  updated_at        TIMESTAMP

order_items
  id                UUID PK
  order_id          UUID FK → orders
  square_catalog_id TEXT
  name              TEXT
  quantity          INTEGER
  base_price        INTEGER (cents)
  modifier_total    INTEGER (cents)
  modifiers         JSONB
  special_instructions TEXT

favorite_items
  id                UUID PK
  user_id           UUID FK → users
  merchant_id       UUID FK → merchants
  square_catalog_id TEXT
  created_at        TIMESTAMP
```

---

## 10. Security & Compliance

### Authentication & Authorization
- Passwords hashed with bcrypt (cost factor 12)
- JWT session tokens with HTTP-only, Secure, SameSite=Strict cookies
- CSRF protection on all state-changing endpoints
- OAuth tokens encrypted at rest (AES-256-GCM)

### Payment Security
- **PCI DSS compliance** via Square Web Payments SDK — card numbers never touch our server
- Payment tokens are single-use and short-lived
- No card data stored in our database — only Square card-on-file references

### API Security
- All API routes behind authentication middleware
- Rate limiting per IP and per user (Redis-based)
- Input validation on all endpoints (Zod schemas)
- SQL injection prevention via Prisma parameterized queries
- XSS prevention via React's built-in escaping + CSP headers
- CORS restricted to known origins

### Data Protection
- HTTPS everywhere (enforced via Vercel)
- Square webhook signature verification (HMAC-SHA256)
- Minimal PII collection — only what's needed for ordering
- Customer consent required before storing data (per Square API requirements)
- Environment variables for all secrets (never committed to repo)

### Accessibility (WCAG 2.1 AA)
- Color contrast ratios: 4.5:1 minimum for text, 3:1 for large text
- Full keyboard navigation for entire ordering flow
- `aria-live` regions for cart updates and order status
- `role="alert"` for form validation errors
- Alt text on all food images
- Skip navigation links
- Minimum tap targets: 44x44px on mobile
- No auto-playing media
- Logical tab order and focus management

---

## Summary

This plan delivers a **modern, mobile-first online ordering app** that solves the biggest pain points in the current market:

- **Actually integrates with Square POS** (orders appear immediately, not as orphan drafts)
- **Beautiful, fast UI** rivaling DoorDash/Uber Eats (not a clunky template)
- **Square Loyalty built-in** with points visible throughout the experience
- **Guest-friendly** with smart post-purchase account conversion
- **Accessible and performant** from day one
- **14-week delivery** from scaffold to production

The tech stack (Next.js + Tailwind + Square APIs + PostgreSQL + Redis + Vercel) is modern, scalable, and developer-friendly — optimized for rapid iteration and low operational overhead.
