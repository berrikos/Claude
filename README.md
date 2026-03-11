# Uber Eats Business Analysis Agent

An AI-powered agent that analyzes your Uber Eats stores, menus, and orders to provide actionable business recommendations.

## What It Does

The agent connects to the Uber Eats API, pulls data from **all your stores**, and analyzes:

- **Store Health** — online status, availability, overall metrics
- **Menu Quality** — missing descriptions, images, pricing outliers, category balance
- **Pricing Strategy** — identifies over/underpriced items, unconventional price endings
- **Modifiers & Upsells** — finds missed upsell opportunities, free modifiers that could be charged
- **Order Issues** — tracks issue rates, problem items, common complaints
- **Customer Ratings** — monitors satisfaction trends
- **Item Performance** — identifies top sellers and underperformers
- **Special Instructions** — detects patterns that should become menu modifiers

Then it uses Claude AI to generate **specific, actionable recommendations** for each store, including item-by-item suggestions for names, descriptions, pricing, and modifiers.

## Setup

### 1. Prerequisites

- Python 3.10+
- An Uber Eats merchant account with API access
- An Anthropic API key

### 2. Get Your API Credentials

**Uber Eats API:**
1. Go to [developer.uber.com](https://developer.uber.com/)
2. Create an app and enable the Eats API
3. Get your Client ID and Client Secret
4. Ensure your app has these scopes: `eats.store`, `eats.store.orders.read`, `eats.report`

**Anthropic API:**
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an API key

### 3. Install & Configure

```bash
# Clone the repo and install dependencies
pip install -r requirements.txt

# Set up your credentials
cp .env.example .env
# Edit .env with your actual API keys
```

### 4. Run

```bash
python run.py
```

## Output

The agent produces:

1. **Store overview table** — all your stores with status
2. **Key metrics** — revenue, order counts, ratings, issue rates
3. **Menu analysis findings** — problems found with severity levels
4. **Order analysis findings** — order patterns and issues
5. **AI recommendations** — prioritized, specific recommendations organized by category
6. **Item-level recommendations** — per-item suggestions for names, descriptions, pricing, and modifiers

## Project Structure

```
├── run.py                          # Entry point
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment variable template
└── uber_eats_agent/
    ├── agent.py                    # Main agent orchestrator
    ├── config.py                   # Configuration and env loading
    ├── models/
    │   └── data_models.py          # Data classes (Store, MenuItem, Order, etc.)
    └── modules/
        ├── api_client.py           # Uber Eats API client with OAuth
        ├── store_analyzer.py       # Store-level analysis and summaries
        ├── menu_analyzer.py        # Menu quality and pricing analysis
        ├── order_analyzer.py       # Order patterns and issue analysis
        └── recommendation_engine.py # Claude-powered recommendation generation
```
