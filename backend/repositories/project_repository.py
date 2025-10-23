from typing import Dict, Optional, Any
from .base_repository import BaseRepository


class ProjectRepository(BaseRepository):
    """Repository for project-related database operations"""
    
    def find_by_user_id(self, user_id: int) -> Dict[str, Any]:
        """Find all projects for a user"""
        response = (
            self.supabase.table("projects")
            .select("*", count="exact")
            .eq('owner', user_id)
            .execute()
        )
        return {
            'projects': self._handle_response(response, "Failed to fetch user projects"),
            'count': response.count
        }
    
    def find_by_id(self, project_id: int) -> Optional[Dict[str, Any]]:
        """Find project by ID"""
        response = (
            self.supabase.table("projects")
            .select("*")
            .eq("id", project_id)
            .execute()
        )
        data = self._handle_response(response, "Failed to fetch project")
        return data[0] if data else None
    
    def find_by_name_and_owner(self, project_name: str, owner_id: int) -> Optional[Dict[str, Any]]:
        """Find project by name and owner"""
        response = (
            self.supabase.table("projects")
            .select("*")
            .eq('owner', owner_id)
            .eq('project_name', project_name)
            .execute()
        )
        data = self._handle_response(response, "Failed to find project by name")
        return data[0] if data else None
    
    def create_project(self, owner_id: int, project_name: str) -> Dict[str, Any]:
        """Create a new project"""
        response = (
            self.supabase.table("projects")
            .insert({
                "owner": owner_id,
                "project_name": project_name
            })
            .execute()
        )
        data = self._handle_response(response, "Failed to create project")
        return data[0] if data else None
    
    def update_project(self, project_id: int, project_name: str) -> Dict[str, Any]:
        """Update project name"""
        response = (
            self.supabase.table("projects")
            .update({
                "project_name": project_name
            })
            .eq('id', project_id)
            .execute()
        )
        data = self._handle_response(response, "Failed to update project")
        return data[0] if data else None
    
    def delete_project(self, project_id: int) -> Dict[str, Any]:
        """Delete project"""
        response = (
            self.supabase.table("projects")
            .delete()
            .eq("id", project_id)
            .execute()
        )
        data = self._handle_response(response, "Failed to delete project")
        return data[0] if data else None
