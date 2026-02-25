"""
Supabase client initialization for Auth service.
Uses the shared Supabase client configured with service role key.
"""
from shared.supabase_client import get_supabase

__all__ = ["get_supabase"]
