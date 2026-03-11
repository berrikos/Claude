import os
from dotenv import load_dotenv

load_dotenv()

UBER_EATS_CLIENT_ID = os.getenv("UBER_EATS_CLIENT_ID", "")
UBER_EATS_CLIENT_SECRET = os.getenv("UBER_EATS_CLIENT_SECRET", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

UBER_EATS_AUTH_URL = "https://login.uber.com/oauth/v2/token"
UBER_EATS_API_BASE = "https://api.uber.com/v1/eats"

# Scopes needed for merchant operations
UBER_EATS_SCOPES = "eats.store eats.store.orders.read eats.report"
