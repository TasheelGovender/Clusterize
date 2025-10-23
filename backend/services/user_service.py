from typing import Dict, List, Optional, Any
from repositories import UserRepository


class UserService:
    """Service for user-related business logic"""
    
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo
    
    def get_user_by_auth0_id(self, auth0_id: str) -> Optional[Dict[str, Any]]:
        """Get user by Auth0 ID"""
        return self.user_repo.find_by_auth0_id(auth0_id)
    
    def create_user(self, auth0_id: str, email: str) -> Dict[str, Any]:
        """Create a new user"""
        return self.user_repo.create_user(auth0_id, email)
    
    def delete_user(self, auth0_id: str) -> List[Dict[str, Any]]:
        """Delete user"""
        return self.user_repo.delete_user(auth0_id)
    
    def sign_in_or_create_user(self, auth0_id: str, email: str) -> Dict[str, Any]:
        """Sign in existing user or create new one"""
        existing_user = self.get_user_by_auth0_id(auth0_id)
        
        if existing_user:
            return {
                'message': 'User already exists',
                'user': existing_user,
                'is_new': False
            }
        
        new_user = self.create_user(auth0_id, email)
        return {
            'message': 'New user created',
            'user': new_user,
            'is_new': True
        }
