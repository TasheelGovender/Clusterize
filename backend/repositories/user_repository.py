from typing import List, Dict, Optional, Any
from .base_repository import BaseRepository


class UserRepository(BaseRepository):
    """Repository for user-related database operations"""
    
    def find_by_auth0_id(self, auth0_id: str) -> Optional[Dict[str, Any]]:
        """Find user by Auth0 ID"""
        response = (
            self.supabase.table("users")
            .select("*")
            .eq('auth0_id', auth0_id)
            .execute()
        )
        data = self._handle_response(response, "Failed to find user")
        return data[0] if data else None
    
    def create_user(self, auth0_id: str, email: Optional[str]) -> Optional[Dict[str, Any]]:
        """Create a new user"""
        user_data = {
            "auth0_id": auth0_id
        }
        if email is not None:
            user_data["email"] = email

        response = (
            self.supabase.table("users")
            .insert(user_data)
            .execute()
        )
        data = self._handle_response(response, "Failed to create user")
        return data[0] if data else None
    
    def delete_user(self, auth0_id: str) -> List[Dict[str, Any]]:
        """Delete user by Auth0 ID"""
        response = (
            self.supabase.table("users")
            .delete()
            .eq('auth0_id', auth0_id)
            .execute()
        )
        return self._handle_response(response, "Failed to delete user")
