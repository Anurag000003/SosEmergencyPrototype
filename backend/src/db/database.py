from supabase import create_client, Client
from config.settings import settings

def get_supabase_client() -> Client | None:
    if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return None

supabase = get_supabase_client()
