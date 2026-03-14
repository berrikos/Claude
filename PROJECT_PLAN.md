# Square Online Ordering App — Project Plan

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Competitive Landscape & Key Insights](#2-competitive-landscape--key-insights)
3. [Our Differentiators](#3-our-differentiators)
4. [Square API Integration Architecture](#4-square-api-integration-architecture)
5. [Payment Processing — Stripe](#5-payment-processing--stripe)
6. [Feature Specification](#6-feature-specification)
7. [Merchant Portal (Admin Backend)](#7-merchant-portal-admin-backend)
8. [UI/UX Design System](#8-uiux-design-system)
9. [Technical Architecture](#9-technical-architecture)
10. [Development Phases](#10-development-phases)
11. [Database Schema (High-Level)](#11-database-schema-high-level)
12. [Security & Compliance](#12-security--compliance)

---

## 1. Executive Summary

We are building a **white-label online ordering web application** that integrates deeply with Square POS for restaurants. The app pulls menus and locations from Square, presents them in a beautiful mobile-first interface, processes payments through **Stripe** (supporting cards, Apple Pay, and Google Pay), and pushes completed orders directly to the restaurant's Square POS/KDS via the Square Orders API. It includes customer accounts with built-in Square Loyalty integration, and a **full-featured merchant portal** where restaurant owners can self-serve everything — from connecting their Square account, to customizing their storefront branding, toggling features, managing menu display, configuring loyalty, and viewing analytics.

**Why this matters:** The current market is broken. Square's own online ordering doesn't truly integrate with in-person POS. Competitors like ChowNow ($139/mo), Owner.com ($499/mo), and Toast (3.5% fees + lock-in contracts) are either too expensive, too locked-in, or too limited. There is a clear gap for a well-designed, fairly-priced solution that *actually works* with Square POS.

**Payment & Pricing Strategy:** We use **Stripe** for payment processing (2.9% + $0.30, with native Apple Pay and Google Pay). Square charges a 1% per-transaction surcharge when their Orders API is used with a non-Square processor. We absorb this cost into the merchant's flat monthly subscription fee — transparent, predictable, no surprise per-order fees for the merchant.

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
| **Stripe** | Process card payments (cards, Apple Pay, Google Pay) via Stripe Payment Element | N/A (Stripe API keys) |
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
6. **1% surcharge for non-Square payments** — we use Stripe for payments, so Square charges 1% on Orders API transactions. This cost is absorbed into the merchant's monthly subscription fee (hybrid pricing model)
7. **Rate limits are undocumented** — implement exponential backoff with jitter for all API calls
8. **MENU_CATEGORY vs REGULAR_CATEGORY** — must handle both category types from catalog
9. **Square Orders API payment recording** — after Stripe processes payment, we record an "external" payment on the Square order so it appears as paid in the POS

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
Customer selects pickup time & pays (Stripe Payment Element → PaymentIntent)
        ↓
Stripe processes payment (cards / Apple Pay / Google Pay)
        ↓
CreateOrder API (with fulfillment + line items + customer_id)
        ↓
Record external payment on Square order (marks order as paid for POS)
        ↓
AccumulateLoyaltyPoints API (with order_id → auto-calculates points)
        ↓
Order appears on Square POS / KDS ✓
        ↓
Webhooks → order.fulfillment.updated → real-time status to customer
```

---

## 5. Payment Processing — Stripe

### Why Stripe (Not Square Payments)

| Factor | Stripe | Square Payments |
|--------|--------|-----------------|
| **Online fee** | 2.9% + $0.30 | 2.9% + $0.30 (Plus $49/mo) or 3.3% + $0.30 (Free) |
| **Apple Pay** | Automatic via Payment Element | Via Web Payments SDK |
| **Google Pay** | Automatic via Payment Element | Via Web Payments SDK |
| **Next.js DX** | Best in class — `@stripe/react-stripe-js` | Adequate |
| **Documentation** | Industry-leading | Decent |
| **Saved cards** | SetupIntent + Customer objects | Card on File |
| **Tips** | Overcapture (authorize, then capture auth + tip) | Native |
| **Partial refunds** | Full support, multiple partials allowed | Supported |
| **Community** | 425k+ stores, 300+ integrations | Square ecosystem only |

### Stripe Integration Architecture

```
Customer Browser                    Our Server                     Stripe            Square
      │                                 │                            │                  │
      │  1. Checkout initiated          │                            │                  │
      │ ──────────────────────────────▶ │                            │                  │
      │                                 │  2. Create PaymentIntent   │                  │
      │                                 │ ─────────────────────────▶ │                  │
      │                                 │  ◀───── client_secret ──── │                  │
      │  3. Render Payment Element      │                            │                  │
      │  ◀───── client_secret ───────── │                            │                  │
      │                                 │                            │                  │
      │  4. Customer pays               │                            │                  │
      │  (card / Apple Pay / Google Pay)│                            │                  │
      │ ──────────────────────────────────────────────────────────▶ │                  │
      │                                 │                            │                  │
      │                                 │  5. Webhook: payment_intent│                  │
      │                                 │     .succeeded             │                  │
      │                                 │  ◀──────────────────────── │                  │
      │                                 │                            │                  │
      │                                 │  6. CreateOrder (with fulfillment)            │
      │                                 │ ────────────────────────────────────────────▶ │
      │                                 │                            │                  │
      │                                 │  7. Record external payment on order          │
      │                                 │ ────────────────────────────────────────────▶ │
      │                                 │                            │                  │
      │                                 │  8. AccumulateLoyaltyPoints                   │
      │                                 │ ────────────────────────────────────────────▶ │
      │                                 │                            │                  │
      │  9. Order confirmation          │                      Order appears on POS ✓   │
      │  ◀───────────────────────────── │                            │                  │
```

### Key Implementation Details

- **Stripe Payment Element**: Single embeddable UI that auto-detects device capabilities and shows cards, Apple Pay, Google Pay — no separate integration per method
- **PaymentIntent flow**: Server creates PaymentIntent → client confirms with Payment Element → Stripe webhook notifies success → server creates Square order
- **Apple Pay domain verification**: Register each merchant's custom domain in Stripe Dashboard (automatable via Stripe API)
- **Tips**: Use Stripe's overcapture — authorize the order amount, then capture authorized + tip amount (up to 50% or $50 above authorization)
- **Saved cards**: Stripe SetupIntent + Customer objects for card-on-file. Tokenized, PCI-compliant
- **Refunds**: Stripe handles refunds directly. Partial refunds supported. Square order status updated separately
- **Stripe Connect (future)**: For multi-merchant platform, Stripe Connect enables per-merchant payouts with platform application fees

### Cost Model (Hybrid Approach)

```
Per $30 order:
  Stripe fee:           2.9% + $0.30 = $1.17  (paid by merchant via Stripe)
  Square Orders API 1%: $0.30                  (absorbed into our subscription fee)

Monthly at $50k volume (~1,667 orders):
  Stripe fees:          ~$1,950  (merchant's processing cost)
  Square 1% surcharge:  ~$500    (absorbed into our platform subscription)

Our subscription pricing factors in the 1% Square surcharge so merchants
see a single predictable monthly fee with no per-order surprises.
```

---

## 6. Feature Specification

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
- **Payment** — Stripe Payment Element: cards, Apple Pay, Google Pay (auto-detected per device)
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

### 6.2 Restaurant/Merchant Features

See **Section 7: Merchant Portal** below for the complete admin backend specification.

---

## 7. Merchant Portal (Admin Backend)

The merchant portal is a **full self-service admin backend** where restaurant owners manage every aspect of their online ordering presence. This is modeled after the best elements of Square Dashboard, ChowNow, Toast, DoorDash Merchant Portal, and Owner.com — while fixing their key limitations.

### 7.1 Onboarding Wizard

A guided, step-by-step setup flow that gets a restaurant live in under 30 minutes.

```
Step 1: Welcome & Account Creation
  → Create admin account (email + password)
  → Business name, contact info

Step 2: Connect Square
  → "Connect Your Square Account" button → Square OAuth flow
  → Automatically requests all needed scopes:
    ITEMS_READ, MERCHANT_PROFILE_READ, ORDERS_READ, ORDERS_WRITE,
    CUSTOMERS_READ, CUSTOMERS_WRITE, LOYALTY_READ, LOYALTY_WRITE
  → Success confirmation with merchant name + connected locations shown

Step 3: Select Locations
  → All Square locations displayed (pulled via Locations API)
  → Toggle which locations to enable for online ordering
  → Set primary location if multiple
  → For each location: confirm address, phone, hours

Step 4: Review Menu
  → Full menu auto-pulled from Square Catalog API
  → Preview exactly how customers will see it
  → Option to hide items/categories before going live
  → Flag any items missing images or descriptions

Step 5: Branding Setup
  → Upload logo (square + wide formats)
  → Choose primary color (color picker + presets)
  → Choose accent color
  → Upload hero/banner image (optional)
  → Restaurant description / tagline
  → Live preview of storefront with branding applied

Step 6: Configure Ordering
  → Enable pickup (on/off) + curbside sub-toggle
  → Set pickup lead time (e.g., 15, 20, 30 minutes)
  → Set online ordering hours (default: match Square business hours)
  → Enable scheduled orders (on/off)
  → Enable tipping (on/off) + configure preset amounts

Step 7: Payment Setup
  → Stripe Connect onboarding (for receiving payouts)
  → Or confirm existing Stripe account connection
  → Review processing fee structure

Step 8: Review & Launch
  → Full summary of all settings
  → "Preview Storefront" button to see customer view
  → "Go Live" button to publish
  → Storefront URL generated (e.g., order.ourplatform.com/restaurant-name)
```

### 7.2 Dashboard Home

The first screen merchants see after login — a command center overview.

```
┌─────────────────────────────────────────────────────────────────┐
│  Logo    [Restaurant Name ▼]     Notifications 🔔    Profile    │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│  📊 Home │  Today's Snapshot                                    │
│          │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  🍽 Menu  │  │ Orders   │ │ Revenue  │ │ Avg Order│ │New     │ │
│          │  │   47     │ │ $1,842   │ │  $39.20  │ │Cust: 12│ │
│  📦 Orders│  │ +12% ▲  │ │ +8% ▲   │ │ +$2.10 ▲ │ │+3 ▲   │ │
│          │  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│  👥 Cust. │                                                     │
│          │  Recent Orders                                       │
│  ⭐ Loyalty│  ┌─────────────────────────────────────────────┐    │
│          │  │ #1047  John D.   3 items  $42.50  Preparing │    │
│  📣 Promo │  │ #1046  Sarah M.  1 item   $12.99  Ready     │    │
│          │  │ #1045  Guest     5 items  $67.80  Completed │    │
│  📈 Analytics│  └─────────────────────────────────────────────┘ │
│          │                                                      │
│  ⚙ Settings│  Popular Items Today          Hourly Orders Chart  │
│          │  1. Margherita Pizza (23)      [bar chart visual]   │
│  🎨 Brand │  2. Caesar Salad (18)                               │
│          │  3. Garlic Bread (15)                                │
│  📍 Locations│                                                   │
│          │  ⚠ Alerts                                            │
│          │  • 2 items low on stock (set in Square)             │
│          │  • Peak hours approaching — consider order throttle  │
└──────────┴──────────────────────────────────────────────────────┘
```

### 7.3 Menu Management

Merchants control how their Square menu appears to online customers — without changing the Square catalog itself.

#### Menu Display Controls
- **Category management** — reorder categories for online display (independent of Square ordering), hide/show categories, rename display names
- **Item visibility** — show/hide individual items from online ordering (item remains in Square catalog)
- **Item display overrides** — override item name, description, or image for online display only (original Square data preserved)
- **86 items** — one-click "Mark as Unavailable" with optional auto-restore timer (e.g., "back in 2 hours")
- **Dietary tags** — add/edit dietary labels per item (V, VG, GF, DF, spicy level) — stored in our DB, not Square
- **Featured items** — mark items as "Featured" to highlight them at the top of the menu
- **Item sort order** — drag-and-drop reorder items within categories

#### Menu Scheduling (Dayparting)
- **Time-based menus** — set which categories/items are available during which hours
  - Example: "Breakfast" category only visible 7am–11am, "Lunch" 11am–3pm, "Dinner" 5pm–10pm
- **Day-of-week rules** — different menus for different days (e.g., "Weekend Brunch" only Sat/Sun)
- **Limited-time offers** — schedule items to appear/disappear on specific date ranges

#### Menu Sync
- **Auto-sync indicator** — show when menu was last synced from Square, with freshness badge
- **Manual sync button** — "Sync from Square Now" to force re-pull
- **Sync conflict resolution** — if an item was modified in both Square and our overrides, show a merge UI
- **New item alerts** — notify merchant when new items appear in Square catalog that aren't yet configured for online

### 7.4 Storefront Customization

Merchants control the look and feel of their customer-facing ordering page.

#### Branding
- **Logo** — upload and crop (square format for header, wide format for hero)
- **Color scheme** — primary color, accent color, text color via color pickers
- **Font selection** — choose from curated restaurant-appropriate font pairs (5-8 options)
- **Hero section** — upload hero/banner image, set overlay text, CTA button text
- **Favicon** — auto-generated from logo or custom upload

#### Layout Options
- **Menu layout** — choose between:
  - Grid view (image cards in 2-3 columns)
  - List view (horizontal cards with image left, details right)
  - Compact view (text-only with small thumbnails)
- **Category display** — horizontal scrollable tabs vs. vertical sidebar (desktop)
- **Show/hide sections** — toggle visibility of: hero banner, featured items, restaurant info/about section, location map, operating hours display

#### Restaurant Info
- **About section** — rich text editor for restaurant story/description
- **Contact info** — phone, email (displayed to customers)
- **Social media links** — Instagram, Facebook, Twitter/X, TikTok, Yelp
- **Custom announcements** — top-of-page banner for temporary messages (e.g., "Holiday hours in effect", "New menu items available!")

#### Live Preview
- **Split-screen preview** — see changes in real-time on mobile and desktop views
- **Preview before publish** — stage changes without affecting live storefront
- **Publish button** — push staged changes live

### 7.5 Order Management

Real-time order monitoring and management (supplements, not replaces, Square POS).

#### Order Feed
- **Live order stream** — real-time list of incoming orders with auto-refresh
- **Order status** — Pending → Confirmed → Preparing → Ready → Completed / Cancelled
- **Order details** — expand to see full line items, modifiers, special instructions, customer info
- **Status controls** — manually advance order status (also synced from Square POS via webhooks)
- **Audio alerts** — configurable sound notification for new orders

#### Order Actions
- **Accept/reject** — accept or reject incoming orders with reason selection for rejection
- **Adjust prep time** — update estimated ready time for individual orders
- **Cancel order** — with reason, triggers Stripe refund automatically
- **Refund** — full or partial refund via Stripe, with Square order status update
- **Print** — print order ticket (browser print)
- **Contact customer** — click-to-call or click-to-email from order detail

#### Order Filters & Search
- **Filter by status** — pending, preparing, ready, completed, cancelled
- **Filter by date range** — today, yesterday, this week, custom
- **Filter by location** — for multi-location merchants
- **Search** — by order number, customer name, phone, or email

### 7.6 Feature Toggles & Settings

A centralized settings page where merchants enable/disable platform features.

#### Ordering Settings
| Toggle | Description |
|--------|-------------|
| **Online ordering** | Master on/off switch for the entire storefront |
| **Pickup** | Enable/disable pickup orders |
| **Curbside pickup** | Sub-toggle under pickup — adds vehicle info field at checkout |
| **Scheduled orders** | Allow customers to order for a future date/time |
| **ASAP orders** | Allow immediate orders (can disable during busy periods) |
| **Order throttling** | Limit orders per 15/30/60 minute window |
| **Large order alerts** | Notify when order exceeds $ or item threshold |
| **Special instructions** | Allow/disallow free-text notes per item |
| **Minimum order amount** | Set minimum $ for online orders |

#### Tipping Settings
| Toggle | Description |
|--------|-------------|
| **Enable tipping** | Master on/off |
| **Preset amounts** | Configure 3 preset tip percentages (default: 15%, 20%, 25%) |
| **Custom tip** | Allow custom dollar/percentage entry |
| **Default selection** | Which preset is pre-selected (or none) |

#### Loyalty Settings
| Toggle | Description |
|--------|-------------|
| **Enable loyalty display** | Show/hide loyalty throughout ordering experience |
| **Auto-enrollment prompt** | Prompt unregistered customers to join at checkout |
| **Points preview** | Show "Earn X points" in cart |
| **Reward redemption** | Allow reward redemption during online checkout |
| **Loyalty banner** | Show loyalty promo banner on storefront |

#### Notification Settings
| Setting | Description |
|---------|-------------|
| **New order alerts** | Email, push, or both for new orders |
| **Daily summary email** | End-of-day order/revenue summary |
| **Weekly report email** | Weekly analytics digest |
| **Low stock alerts** | When Square marks items out of stock |
| **Alert recipients** | Add multiple email addresses for notifications |

### 7.7 Operating Hours

- **Online ordering hours** — set per-location, independent of Square business hours
- **Same as Square hours** — toggle to auto-sync with Square business hours
- **Custom hours** — set different hours for different days of the week
- **Holiday closures** — schedule future closures with dates and optional message
- **Temporary closure** — "Pause Online Ordering" button with optional auto-resume time
- **Prep time** — configure default lead time for orders (15, 20, 30, 45, 60 minutes)
- **Busy mode** — temporarily extend prep times during rush periods

### 7.8 Promotions & Discounts

- **Create promotions** — percentage off, dollar off, free item, BOGO
- **Promo codes** — generate unique or generic discount codes
- **Auto-apply discounts** — discounts that apply automatically at cart threshold (e.g., "Free delivery over $30")
- **Schedule promotions** — set start/end dates, recurring schedules
- **Targeted promotions** — first-time customers, returning customers, customers who haven't ordered in X days
- **Promotion analytics** — track usage, revenue impact, redemption rates
- **Promotion display** — choose where promos appear: storefront banner, checkout, or both

### 7.9 Customer Management

- **Customer directory** — searchable list of all customers who've ordered
- **Customer profiles** — order history, total spend, average order value, loyalty points, last order date
- **Customer segments** — auto-generated: new, returning, lapsed, VIP (top 10% by spend)
- **Export** — download customer list as CSV (name, email, phone, order count, total spend)
- **Notes** — add internal notes to customer profiles

### 7.10 Analytics & Reporting

#### Dashboard Metrics (Real-Time)
- Orders today / this week / this month (with % change vs. prior period)
- Revenue today / this week / this month
- Average order value (AOV) with trend
- New vs. returning customer ratio
- Top 5 items today

#### Reports (Filterable by Date Range & Location)
- **Sales report** — revenue, order count, AOV, tips, refunds, net revenue
- **Product mix report** — items ranked by quantity sold, revenue, and margin
- **Hourly breakdown** — orders and revenue by hour of day (identify peak times)
- **Day-of-week breakdown** — busiest days
- **Customer report** — new customers, repeat rate, customer lifetime value
- **Loyalty report** — enrollments, points accrued, rewards redeemed, program ROI
- **Promotion report** — promo code usage, revenue from promotions, discount costs

#### Export & Download
- Export any report as CSV or PDF
- Schedule automated report emails (daily, weekly, monthly)

### 7.11 Multi-Location Management

For merchants with multiple Square locations:

- **Location switcher** — dropdown in header to switch between locations or view "All Locations"
- **Per-location settings** — each location can have its own hours, menu overrides, branding, and feature toggles
- **Shared settings** — option to apply changes to all locations at once
- **Cross-location reporting** — compare performance across locations side by side
- **Centralized menu** — manage a base menu that applies to all locations, with per-location overrides (e.g., different pricing, different available items)

### 7.12 User Roles & Permissions

| Role | Access |
|------|--------|
| **Owner** | Full access to everything, billing, user management |
| **Manager** | Everything except billing and user management |
| **Staff** | Order management and menu 86-ing only |
| **Viewer** | Read-only access to dashboard and analytics |

- Invite team members by email
- Each user has their own login
- Activity log showing who changed what and when

### 7.13 Billing & Subscription

- **Current plan** — display plan name, price, billing cycle
- **Usage stats** — orders processed this month, Square API surcharge absorbed
- **Payment method** — update credit card on file
- **Invoices** — view and download past invoices
- **Plan upgrade/downgrade** — self-service plan changes
- **Cancel subscription** — with retention flow (pause option, feedback collection)

### 7.14 Merchant Portal Navigation Structure

```
Sidebar Navigation:
├── 📊 Dashboard (Home)
├── 🍽  Menu Management
│   ├── Menu Items
│   ├── Categories
│   ├── Menu Scheduling
│   └── Sync Settings
├── 📦 Orders
│   ├── Live Orders
│   ├── Order History
│   └── Refunds
├── 👥 Customers
│   ├── Directory
│   ├── Segments
│   └── Export
├── ⭐ Loyalty
│   ├── Program Settings
│   ├── Points & Rewards
│   └── Loyalty Report
├── 📣 Promotions
│   ├── Active Promotions
│   ├── Create Promotion
│   └── Promo Codes
├── 📈 Analytics
│   ├── Overview
│   ├── Sales Reports
│   ├── Product Mix
│   ├── Customer Insights
│   └── Scheduled Reports
├── 🎨 Storefront
│   ├── Branding
│   ├── Layout
│   ├── Restaurant Info
│   └── Preview
├── ⚙️  Settings
│   ├── Ordering
│   ├── Tipping
│   ├── Operating Hours
│   ├── Notifications
│   ├── Feature Toggles
│   └── Integrations (Square connection status)
├── 📍 Locations (multi-location only)
├── 👤 Team & Permissions
└── 💳 Billing
```

---

## 8. UI/UX Design System

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
  → Stripe Payment Element (auto-detects cards, Apple Pay, Google Pay)
  → Tip selector (preset percentages + custom)
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

## 9. Technical Architecture

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
| **Payments** | Stripe (`@stripe/react-stripe-js` + Payment Element) | PCI-compliant tokenization, auto Apple Pay/Google Pay, best DX |
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
│  Stripe      │     │  │  Customer Pages (SSR/RSC):         │  │
│  Payment     │     │  │   /[restaurant]                    │  │
│  Element     │     │  │   /[restaurant]/menu               │  │
│              │     │  │   /[restaurant]/checkout            │  │
└──────┬──────┘     │  │   /[restaurant]/order/[id]          │  │
       │            │  │   /account                          │  │
       │            │  │                                    │  │
       │            │  │  Merchant Portal:                   │  │
       │            │  │   /admin/dashboard                  │  │
       │            │  │   /admin/menu                       │  │
       │            │  │   /admin/orders                     │  │
       │            │  │   /admin/customers                  │  │
       │            │  │   /admin/analytics                  │  │
       │            │  │   /admin/storefront                 │  │
       │            │  │   /admin/settings                   │  │
       │            │  │   /admin/loyalty                    │  │
       │            │  │   /admin/promotions                 │  │
       │            │  │                                    │  │
       │            │  │  API Routes:                        │  │
       │            │  │   /api/stripe/payment-intent        │  │
       │            │  │   /api/square/catalog               │  │
       │            │  │   /api/square/orders                │  │
       │            │  │   /api/square/loyalty               │  │
       │            │  │   /api/webhooks/stripe              │  │
       │            │  │   /api/webhooks/square              │  │
       │            │  │   /api/auth/[...nextauth]           │  │
       │            │  │   /api/admin/*                      │  │
       │            │  └──────────┬─────────────────────────┘  │
       │            └─────────────┼─────────────────────────────┘
       │                          │
       ▼                          │
┌──────────────┐    ┌─────────────┼─────────────────────────────┐
│   Stripe     │    │             ▼                              │
│              │    │  ┌──────────────┐    ┌──────────────────┐ │
│  - Cards     │    │  │  PostgreSQL   │    │  Redis (Upstash) │ │
│  - Apple Pay │    │  │  (Supabase)   │    │  - Menu cache    │ │
│  - Google Pay│    │  │  - Merchants  │    │  - Sessions      │ │
│              │    │  │  - Users      │    │  - Rate limits   │ │
│  Webhooks ──────▶│  │  - Orders     │    └──────────────────┘ │
│              │    │  │  - Admin cfg  │                         │
└──────────────┘    │  │  - Promos     │                         │
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
                    │  │  - Orders API    (create + pay)      │ │
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

## 10. Development Phases

### Phase 1: Foundation & Merchant Onboarding (Weeks 1–3)
**Goal:** Project scaffold, Square OAuth, merchant portal foundation, menu display

- [ ] Next.js project setup with TypeScript, Tailwind, Prisma, Radix UI
- [ ] PostgreSQL database schema & initial migrations (full schema including admin tables)
- [ ] NextAuth.js setup for both merchant admin and customer auth
- [ ] Merchant registration & login flow
- [ ] **Onboarding wizard** — Steps 1-3: account creation, Square OAuth connect, location selection
- [ ] Square OAuth flow — full scope request, token storage (encrypted), auto-refresh job
- [ ] Locations API integration — pull and display restaurant locations in onboarding
- [ ] Catalog API integration — pull menu with categories, items, modifiers, images
- [ ] **Onboarding wizard** — Steps 4-5: menu review/preview, branding setup (logo, colors)
- [ ] Redis caching layer for catalog data
- [ ] Menu display UI — responsive grid, category tabs, item cards (customer-facing)
- [ ] Item detail modal — modifiers, quantity, add-to-cart
- [ ] Basic responsive layout (mobile + desktop) for both storefront and admin

### Phase 2: Cart, Payments & Ordering (Weeks 4–6)
**Goal:** Full ordering flow from cart through Stripe to Square POS

- [ ] Cart state management (Zustand store)
- [ ] Sticky cart UI — floating button (mobile), sidebar (desktop)
- [ ] Cart editing — quantities, modifiers, remove items
- [ ] Pickup time selector with restaurant hours validation
- [ ] Square CalculateOrder API — preview pricing with taxes
- [ ] Guest checkout flow — name, email, phone, tip selection
- [ ] **Stripe integration** — Payment Element with automatic Apple Pay / Google Pay detection
- [ ] Stripe PaymentIntent creation (server-side API route)
- [ ] Stripe webhook handler (`payment_intent.succeeded`) → triggers Square order creation
- [ ] CreateOrder API (with fulfillment + line items) → record external payment → order on POS
- [ ] Stripe tip handling via overcapture flow
- [ ] Order confirmation page with order number and estimated time
- [ ] Square webhook handler for order.fulfillment.updated events
- [ ] Real-time order tracking page
- [ ] **Onboarding wizard** — Steps 6-8: ordering config, Stripe Connect setup, review & launch

### Phase 3: Customer Accounts & Loyalty (Weeks 7–9)
**Goal:** User auth, profiles, loyalty integration

- [ ] Customer registration & login (email/password, "Remember me")
- [ ] Customer profile page — name, email, phone, saved addresses
- [ ] Square Customers API integration — search before create (dedup), link profiles
- [ ] Order history page with past orders
- [ ] One-tap reorder (Clone Order API)
- [ ] Favorite items
- [ ] Square Loyalty API integration:
  - [ ] Loyalty program detection (RetrieveLoyaltyProgram)
  - [ ] Auto-enrollment prompt at checkout (phone number lookup)
  - [ ] Points balance display in header and at checkout
  - [ ] Points preview ("Earn X points with this order" via CalculateLoyaltyPoints)
  - [ ] Available rewards display at checkout
  - [ ] One-tap reward redemption (CreateLoyaltyReward + auto-redeem on payment)
  - [ ] Points/rewards history in account
- [ ] Post-checkout account creation prompt with loyalty incentive (guests)
- [ ] Saved payment methods (Stripe SetupIntent + Customer objects)
- [ ] **Merchant portal — Loyalty settings** — toggles for loyalty display, enrollment prompts, rewards

### Phase 4: Merchant Portal — Full Build (Weeks 10–13)
**Goal:** Complete self-service merchant admin backend

- [ ] **Dashboard home** — today's snapshot (orders, revenue, AOV, new customers), recent orders feed, popular items, alerts
- [ ] **Menu management** — category reordering, item show/hide, display overrides, 86 items with auto-restore timer, dietary tags, featured items, drag-and-drop sort
- [ ] **Menu scheduling** — dayparting (time-based category visibility), day-of-week rules, limited-time offers with date ranges
- [ ] **Menu sync** — auto-sync indicator, manual sync button, new item alerts, conflict resolution
- [ ] **Storefront customization** — branding (logo, colors, fonts), layout options (grid/list/compact), hero section, show/hide sections, restaurant info, social links, custom announcements banner
- [ ] **Live preview** — split-screen mobile/desktop preview, stage changes before publishing
- [ ] **Order management** — live order stream with auto-refresh, status controls, accept/reject, adjust prep time, cancel (auto-refund via Stripe), print, contact customer, filters & search
- [ ] **Audio alerts** — browser notification sound for new orders
- [ ] **Feature toggles** — all ordering, tipping, loyalty, and notification settings (see Section 7.6)
- [ ] **Operating hours** — per-location hours, holiday closures, temporary pause, prep time config, busy mode
- [ ] **Promotions** — create/edit promotions, promo codes, auto-apply discounts, scheduling, targeting, analytics
- [ ] **Customer management** — directory, profiles with order history & spend, segments, export CSV, notes
- [ ] **Analytics & reporting** — sales, product mix, hourly/daily breakdowns, customer insights, loyalty report, promotion report, CSV/PDF export, scheduled report emails
- [ ] **Multi-location management** — location switcher, per-location settings, shared settings, cross-location reporting
- [ ] **User roles & permissions** — Owner, Manager, Staff, Viewer roles, invite by email, activity log
- [ ] **Billing & subscription** — plan display, usage stats, payment method, invoices, upgrade/downgrade, cancellation flow

### Phase 5: Polish & Performance (Weeks 14–15)
**Goal:** Performance optimization, accessibility, final polish

- [ ] Image optimization pipeline — WebP/AVIF, responsive images, lazy loading, CDN
- [ ] Performance audit — target sub-3-second LCP on mobile (both storefront and admin)
- [ ] WCAG 2.1 AA accessibility audit & fixes (full keyboard nav, screen reader, contrast)
- [ ] SEO optimization — meta tags, structured data (Restaurant schema), sitemap
- [ ] Error handling & edge cases across all flows
- [ ] Loading states & skeleton screens
- [ ] Empty states for all list views
- [ ] Mobile responsiveness QA on storefront + merchant portal

### Phase 6: Launch Prep (Weeks 16–17)
**Goal:** Testing, security, deployment

- [ ] End-to-end testing — full order flow (Stripe Sandbox + Square Sandbox)
- [ ] Payment edge cases — declined cards, refunds, partial refunds, failed webhooks
- [ ] Stripe ↔ Square reconciliation testing — ensure orders always appear on POS after payment
- [ ] Webhook reliability — retry handling, missed event recovery (Stripe + Square)
- [ ] Merchant portal testing — full onboarding flow, all settings, all reports
- [ ] Security audit — OWASP top 10, CSP headers, input sanitization, token encryption
- [ ] Rate limiting on all API routes (Redis-based)
- [ ] Monitoring & alerting setup (Vercel Analytics + Sentry)
- [ ] Production Square application approval
- [ ] Production Stripe account setup
- [ ] Production deployment on Vercel
- [ ] DNS & SSL setup for custom domains
- [ ] Launch checklist & smoke tests

### Future Phases (Post-Launch)
- Delivery fulfillment (when Square opens beta or via third-party driver integration)
- PWA with push notifications for order updates
- Stripe Connect for multi-merchant payouts with platform application fees
- Multi-language support
- Advanced analytics with benchmarking
- Branded mobile app (React Native)
- Table-side QR code ordering (dine-in)
- Kitchen display integration improvements
- AI-powered upselling suggestions
- Abandoned cart email/SMS recovery
- Group ordering
- Inventory tracking integration

---

## 11. Database Schema (High-Level)

```
═══════════════════════════════════════
  MERCHANT & ADMIN TABLES
═══════════════════════════════════════

merchants
  id                  UUID PK
  square_merchant_id  TEXT UNIQUE
  name                TEXT
  slug                TEXT UNIQUE (URL-friendly name, e.g., "joes-pizza")
  email               TEXT
  phone               TEXT
  subscription_plan   TEXT (free, starter, pro, enterprise)
  subscription_status TEXT (active, past_due, cancelled)
  stripe_customer_id  TEXT (for billing)
  stripe_subscription_id TEXT
  created_at          TIMESTAMP
  updated_at          TIMESTAMP

merchant_tokens
  id                UUID PK
  merchant_id       UUID FK → merchants
  access_token      TEXT (encrypted AES-256-GCM)
  refresh_token     TEXT (encrypted AES-256-GCM)
  expires_at        TIMESTAMP
  scopes            TEXT[]
  last_refreshed_at TIMESTAMP

merchant_users (admin portal users)
  id                UUID PK
  merchant_id       UUID FK → merchants
  email             TEXT UNIQUE
  password_hash     TEXT
  given_name        TEXT
  family_name       TEXT
  role              TEXT (owner, manager, staff, viewer)
  is_active         BOOLEAN DEFAULT true
  last_login_at     TIMESTAMP
  created_at        TIMESTAMP

merchant_branding
  id                UUID PK
  merchant_id       UUID FK → merchants (UNIQUE)
  logo_url          TEXT
  logo_wide_url     TEXT
  hero_image_url    TEXT
  hero_text         TEXT
  primary_color     TEXT DEFAULT '#E23744'
  accent_color      TEXT DEFAULT '#FF8A00'
  text_color        TEXT DEFAULT '#1F2937'
  font_pair         TEXT DEFAULT 'inter-system'
  menu_layout       TEXT DEFAULT 'grid' (grid, list, compact)
  category_display  TEXT DEFAULT 'tabs' (tabs, sidebar)
  show_hero         BOOLEAN DEFAULT true
  show_featured     BOOLEAN DEFAULT true
  show_about        BOOLEAN DEFAULT true
  show_map          BOOLEAN DEFAULT true
  show_hours        BOOLEAN DEFAULT true
  about_text        TEXT
  announcement_text TEXT
  announcement_active BOOLEAN DEFAULT false
  social_instagram  TEXT
  social_facebook   TEXT
  social_twitter    TEXT
  social_tiktok     TEXT
  social_yelp       TEXT
  updated_at        TIMESTAMP

locations
  id                  UUID PK
  merchant_id         UUID FK → merchants
  square_location_id  TEXT UNIQUE
  name                TEXT
  address             JSONB
  coordinates         POINT
  phone               TEXT
  business_hours      JSONB
  online_ordering     BOOLEAN DEFAULT true
  pickup_enabled      BOOLEAN DEFAULT true
  curbside_enabled    BOOLEAN DEFAULT false
  scheduled_orders    BOOLEAN DEFAULT true
  asap_orders         BOOLEAN DEFAULT true
  pickup_lead_time    INTEGER DEFAULT 20 (minutes)
  min_order_amount    INTEGER DEFAULT 0 (cents)
  order_throttle_max  INTEGER (orders per window, nullable = no limit)
  order_throttle_window INTEGER DEFAULT 30 (minutes)
  tipping_enabled     BOOLEAN DEFAULT true
  tip_presets         JSONB DEFAULT '[15, 20, 25]'
  tip_default_index   INTEGER DEFAULT 1
  tip_custom_enabled  BOOLEAN DEFAULT true
  busy_mode           BOOLEAN DEFAULT false
  busy_mode_extra_time INTEGER DEFAULT 15 (minutes)
  is_active           BOOLEAN DEFAULT true

online_ordering_hours (separate from Square business hours)
  id                UUID PK
  location_id       UUID FK → locations
  day_of_week       INTEGER (0=Sun, 6=Sat)
  open_time         TIME
  close_time        TIME
  use_square_hours  BOOLEAN DEFAULT true

holiday_closures
  id                UUID PK
  location_id       UUID FK → locations
  date              DATE
  message           TEXT
  created_at        TIMESTAMP

═══════════════════════════════════════
  MENU DISPLAY OVERRIDES
═══════════════════════════════════════

menu_category_overrides
  id                  UUID PK
  merchant_id         UUID FK → merchants
  location_id         UUID FK → locations (nullable = all locations)
  square_category_id  TEXT
  display_name        TEXT (nullable = use Square name)
  sort_order          INTEGER
  is_visible          BOOLEAN DEFAULT true
  available_start     TIME (nullable = all day)
  available_end       TIME (nullable = all day)
  available_days      INTEGER[] (nullable = all days)
  created_at          TIMESTAMP

menu_item_overrides
  id                  UUID PK
  merchant_id         UUID FK → merchants
  location_id         UUID FK → locations (nullable = all locations)
  square_item_id      TEXT
  display_name        TEXT (nullable = use Square name)
  display_description TEXT (nullable = use Square description)
  display_image_url   TEXT (nullable = use Square image)
  sort_order          INTEGER
  is_visible          BOOLEAN DEFAULT true
  is_featured         BOOLEAN DEFAULT false
  is_unavailable      BOOLEAN DEFAULT false
  unavailable_until   TIMESTAMP (nullable = manual restore)
  dietary_tags        TEXT[] (V, VG, GF, DF, N)
  spicy_level         INTEGER (0-3)
  available_start     TIME
  available_end       TIME
  available_days      INTEGER[]
  created_at          TIMESTAMP
  updated_at          TIMESTAMP

═══════════════════════════════════════
  PROMOTIONS
═══════════════════════════════════════

promotions
  id                UUID PK
  merchant_id       UUID FK → merchants
  location_id       UUID FK → locations (nullable = all locations)
  name              TEXT
  type              TEXT (percentage_off, dollar_off, free_item, bogo)
  value             INTEGER (percentage or cents)
  free_item_id      TEXT (square_catalog_id, for free_item type)
  min_order_amount  INTEGER (cents, nullable = no minimum)
  promo_code        TEXT (nullable = auto-apply)
  target_audience   TEXT (all, new, returning, lapsed)
  max_uses          INTEGER (nullable = unlimited)
  times_used        INTEGER DEFAULT 0
  starts_at         TIMESTAMP
  ends_at           TIMESTAMP (nullable = no end)
  is_active         BOOLEAN DEFAULT true
  display_on_storefront BOOLEAN DEFAULT true
  display_on_checkout   BOOLEAN DEFAULT true
  created_at        TIMESTAMP

═══════════════════════════════════════
  CUSTOMER TABLES
═══════════════════════════════════════

users (customers)
  id                  UUID PK
  email               TEXT UNIQUE
  password_hash       TEXT
  given_name          TEXT
  family_name         TEXT
  phone               TEXT
  square_customer_id  TEXT
  stripe_customer_id  TEXT (for saved payment methods)
  created_at          TIMESTAMP
  updated_at          TIMESTAMP

user_addresses
  id                UUID PK
  user_id           UUID FK → users
  label             TEXT (home, work, etc.)
  address           JSONB
  is_default        BOOLEAN

user_saved_cards
  id                UUID PK
  user_id           UUID FK → users
  stripe_payment_method_id TEXT
  last_four         TEXT
  brand             TEXT (visa, mastercard, amex, etc.)
  exp_month         INTEGER
  exp_year          INTEGER
  is_default        BOOLEAN

═══════════════════════════════════════
  ORDER TABLES
═══════════════════════════════════════

orders
  id                  UUID PK
  user_id             UUID FK → users (nullable for guests)
  merchant_id         UUID FK → merchants
  location_id         UUID FK → locations
  square_order_id     TEXT
  stripe_payment_intent_id TEXT
  status              TEXT (pending, confirmed, preparing, ready, completed, cancelled)
  fulfillment_type    TEXT (pickup, curbside)
  pickup_at           TIMESTAMP
  subtotal            INTEGER (cents)
  tax                 INTEGER (cents)
  tip                 INTEGER (cents)
  total               INTEGER (cents)
  loyalty_points_earned INTEGER
  loyalty_reward_id   TEXT
  promotion_id        UUID FK → promotions (nullable)
  discount_amount     INTEGER (cents)
  guest_name          TEXT
  guest_email         TEXT
  guest_phone         TEXT
  vehicle_info        TEXT (for curbside)
  special_instructions TEXT
  refund_amount       INTEGER (cents, 0 = no refund)
  refund_reason       TEXT
  cancelled_reason    TEXT
  created_at          TIMESTAMP
  updated_at          TIMESTAMP

order_items
  id                  UUID PK
  order_id            UUID FK → orders
  square_catalog_id   TEXT
  name                TEXT
  quantity            INTEGER
  base_price          INTEGER (cents)
  modifier_total      INTEGER (cents)
  modifiers           JSONB
  special_instructions TEXT

favorite_items
  id                UUID PK
  user_id           UUID FK → users
  merchant_id       UUID FK → merchants
  square_catalog_id TEXT
  created_at        TIMESTAMP

═══════════════════════════════════════
  LOYALTY SETTINGS
═══════════════════════════════════════

merchant_loyalty_settings
  id                      UUID PK
  merchant_id             UUID FK → merchants (UNIQUE)
  loyalty_enabled         BOOLEAN DEFAULT true
  show_points_in_header   BOOLEAN DEFAULT true
  show_points_preview     BOOLEAN DEFAULT true
  auto_enrollment_prompt  BOOLEAN DEFAULT true
  reward_redemption       BOOLEAN DEFAULT true
  loyalty_banner          BOOLEAN DEFAULT false
  loyalty_banner_text     TEXT

═══════════════════════════════════════
  NOTIFICATION & ACTIVITY
═══════════════════════════════════════

merchant_notification_settings
  id                    UUID PK
  merchant_id           UUID FK → merchants (UNIQUE)
  new_order_email       BOOLEAN DEFAULT true
  new_order_sound       BOOLEAN DEFAULT true
  daily_summary_email   BOOLEAN DEFAULT false
  weekly_report_email   BOOLEAN DEFAULT false
  low_stock_alerts      BOOLEAN DEFAULT true
  alert_recipients      TEXT[] (email addresses)

admin_activity_log
  id                UUID PK
  merchant_id       UUID FK → merchants
  merchant_user_id  UUID FK → merchant_users
  action            TEXT (e.g., 'menu.item.hidden', 'settings.hours.updated')
  details           JSONB
  created_at        TIMESTAMP
```

---

## 12. Security & Compliance

### Authentication & Authorization
- Passwords hashed with bcrypt (cost factor 12)
- JWT session tokens with HTTP-only, Secure, SameSite=Strict cookies
- CSRF protection on all state-changing endpoints
- OAuth tokens encrypted at rest (AES-256-GCM)

### Payment Security
- **PCI DSS compliance** via Stripe Payment Element — card numbers never touch our server (SAQ-A eligible)
- PaymentIntents are server-side; client only handles the Payment Element UI
- No card data stored in our database — only Stripe payment method references
- Stripe webhook signature verification for payment confirmations

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

This plan delivers a **modern, mobile-first online ordering app** with a **full-featured merchant portal** that solves the biggest pain points in the current market:

- **Actually integrates with Square POS** (orders appear immediately, not as orphan drafts)
- **Stripe payments** with native Apple Pay and Google Pay (best-in-class checkout experience)
- **Full merchant portal** — self-service onboarding, branding, menu management, feature toggles, analytics, promotions, multi-location support, user roles
- **Beautiful, fast UI** rivaling DoorDash/Uber Eats (not a clunky template)
- **Square Loyalty built-in** with points visible throughout the experience
- **Guest-friendly** with smart post-purchase account conversion
- **Accessible and performant** from day one
- **17-week delivery** from scaffold to production (6 phases)

The tech stack (Next.js + Tailwind + Stripe + Square APIs + PostgreSQL + Redis + Vercel) is modern, scalable, and developer-friendly — optimized for rapid iteration and low operational overhead.

**Cost model:** Merchants pay a flat monthly subscription (which absorbs the 1% Square Orders API surcharge) plus standard Stripe processing fees (2.9% + $0.30). No per-order commissions, no hidden fees — transparent and predictable.
