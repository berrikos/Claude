"""AI-powered recommendation engine using Claude to analyze Uber Eats store data."""

import json
from typing import Optional

import anthropic

from uber_eats_agent.config import ANTHROPIC_API_KEY

SYSTEM_PROMPT = """You are an expert Uber Eats business consultant and food delivery optimization specialist. You analyze restaurant performance on Uber Eats and provide actionable, specific recommendations.

Your expertise includes:
- Menu engineering and pricing psychology for delivery platforms
- Uber Eats algorithm and ranking factors
- Customer behavior on food delivery apps
- Item naming and description best practices
- Modifier and upsell strategies
- Order issue reduction and quality control
- Competitive positioning on delivery platforms

When providing recommendations:
1. Be SPECIFIC — reference actual item names, prices, and data points
2. Prioritize by IMPACT — lead with changes that will move the needle most
3. Be ACTIONABLE — give concrete steps, not vague advice
4. Quantify when possible — estimate revenue impact where you can
5. Consider the Uber Eats platform specifically — ranking, visibility, promotions
"""


def generate_recommendations(
    store_summary: dict,
    menu_analysis: dict,
    order_analysis: dict,
    extra_reports: Optional[dict] = None,
) -> str:
    """Use Claude to generate comprehensive business recommendations."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    extra_section = ""
    if extra_reports:
        extra_section = f"""

## Additional Reports (Customer Feedback, Inaccurate Orders, Top Inaccurate Items, Downtime)
{json.dumps(extra_reports, indent=2, default=str)}
"""

    user_message = f"""Analyze this Uber Eats store data and provide detailed, actionable recommendations.

## Store Overview
{json.dumps(store_summary, indent=2, default=str)}

## Menu Analysis Findings
{json.dumps(menu_analysis, indent=2, default=str)}

## Order Analysis
{json.dumps(order_analysis, indent=2, default=str)}
{extra_section}

Based on this data, provide a comprehensive analysis with specific recommendations organized into these sections:

1. **Critical Issues** — Problems that need immediate attention (hurting revenue or ranking now)
2. **Menu Optimization** — Specific changes to item names, descriptions, pricing, and images
3. **Pricing Strategy** — Price adjustments with reasoning (increase/decrease specific items)
4. **Modifier & Upsell Opportunities** — How to increase average order value
5. **Order Issue Resolution** — How to reduce problems and improve ratings
6. **Competitive Positioning** — How to improve visibility and ranking on Uber Eats
7. **Quick Wins** — Easy changes that can be implemented today

For each recommendation, include:
- The specific change to make
- Why it matters
- Expected impact (high/medium/low)
"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    return response.content[0].text


def generate_item_recommendations(item_data: list[dict]) -> str:
    """Generate specific recommendations for individual menu items."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    user_message = f"""Review these menu items and suggest specific improvements for each one.
For each item, suggest better names, descriptions, pricing adjustments, and modifier ideas.

Items:
{json.dumps(item_data, indent=2, default=str)}

Format your response as a table-like list with:
- Current name → Suggested name (if change needed)
- Current price → Suggested price (with reasoning)
- Suggested description (if missing or could be improved)
- Modifier ideas (if applicable)
"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    return response.content[0].text
