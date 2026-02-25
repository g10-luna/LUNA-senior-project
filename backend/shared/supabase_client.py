"""
Supabase client for LUNA backend.
Uses service role key for server-side operations (bypasses RLS when needed).
"""
import os

from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env so SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are available
load_dotenv()

_supabase: Client | None = None


def get_supabase() -> Client:
    """Get or create Supabase client. Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env."""
    global _supabase
    if _supabase is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment"
            )
        _supabase = create_client(url, key)
    return _supabase
