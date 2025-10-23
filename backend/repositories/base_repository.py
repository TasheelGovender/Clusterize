from typing import Any
from supabase import Client


class BaseRepository:
    """Base repository class with common database operations"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
    
    def _handle_response(self, response, error_message: str = "Database operation failed"):
        """Handle Supabase response and extract data"""
        if hasattr(response, 'data'):
            return response.data
        raise Exception(f"{error_message}: {response}")
