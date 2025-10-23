import json
from typing import Dict, Any
from repositories import ProjectRepository, ClusterRepository, ObjectRepository
from .cache_service import CacheService


class ProjectService:
    """Service for project-related business logic"""
    
    def __init__(self, project_repo: ProjectRepository, cache_service: CacheService, 
                 supabase_client, config, cluster_repo: ClusterRepository = None, 
                 object_repo: ObjectRepository = None):
        self.project_repo = project_repo
        self.cache_service = cache_service
        self.supabase = supabase_client
        self.config = config
        self.cluster_repo = cluster_repo
        self.object_repo = object_repo
    
    def get_user_projects(self, user_id: int) -> Dict[str, Any]:
        """Get all projects for a user with caching"""
        cache_key = f"user_projects:{user_id}"
        
        # Try cache first
        cached_result = self.cache_service.get(cache_key)
        if cached_result:
            print("Cache hit for user projects!")
            cached_data = json.loads(cached_result)
            return {
                'data': cached_data['projects'],
                'count': cached_data['count'],
                'cached': True
            }
        
        print("Cache miss, fetching user projects from database...")
        
        # Fetch from database
        result = self.project_repo.find_by_user_id(user_id)
        
        # Cache the result
        cache_data = {
            'projects': result['projects'],
            'count': result['count']
        }
        
        self.cache_service.set(
            cache_key, 
            json.dumps(cache_data), 
            self.config.USER_PROJECTS_CACHE_TTL
        )
        
        return {
            'data': result['projects'],
            'count': result['count'],
            'cached': False
        }
    
    def get_project_by_id(self, project_id: int) -> Dict[str, Any]:
        """Get project by ID with caching"""
        cache_key = f"project:{project_id}"
        
        # Try cache first
        cached_result = self.cache_service.get(cache_key)
        if cached_result:
            print("Cache hit for project!")
            cached_data = json.loads(cached_result)
            return {
                'data': cached_data,
                'cached': True
            }
        
        print("Cache miss, fetching project from database...")
        
        # Fetch from database
        project = self.project_repo.find_by_id(project_id)
        if not project:
            raise ValueError("Project not found")
        
        # Cache the result
        self.cache_service.set(
            cache_key,
            json.dumps(project),
            self.config.PROJECT_CACHE_TTL
        )
        
        return {
            'data': project,
            'cached': False
        }
    
    def get_project_with_statistics(self, project_id: int) -> Dict[str, Any]:
        """Get project with statistics (clusters and tags)"""
        # Get basic project info
        project_result = self.get_project_by_id(project_id)
        
        # Get statistics if repositories are available
        statistics = {
            'clusters': [],
            'tags': []
        }
        
        if self.cluster_repo:
            try:
                statistics['clusters'] = self.cluster_repo.get_cluster_statistics(project_id)
            except Exception as e:
                print(f"Failed to get cluster statistics: {e}")
        
        if self.object_repo:
            try:
                statistics['tags'] = self.object_repo.get_tag_statistics(project_id)
            except Exception as e:
                print(f"Failed to get tag statistics: {e}")
        
        # Add statistics to the response
        result = project_result.copy()
        result['statistics'] = statistics
        
        return result
    
    def create_project(self, user_id: int, project_name: str) -> Dict[str, Any]:
        """Create a new project"""
        # Check if project name already exists for user
        existing_project = self.project_repo.find_by_name_and_owner(project_name, user_id)
        if existing_project:
            raise ValueError("Project name already exists")
        
        # Create project
        project = self.project_repo.create_project(user_id, project_name)
        proj_id = project['id']
        
        # Create storage bucket
        bucket_response = self.supabase.storage.create_bucket(
            str(proj_id),
            options={
                "public": False,
                "allowed_mime_types": ["image/png"],
                "file_size_limit": 5 * 1024 * 1024,
            }
        )
        
        # Invalidate cache
        self.cache_service.invalidate_project_cache(proj_id, user_id)
        
        return {
            "project": project,
            "bucket": bucket_response
        }
    
    def update_project(self, project_id: int, project_name: str) -> Dict[str, Any]:
        """Update project name"""
        project = self.project_repo.update_project(project_id, project_name)
        
        # Invalidate cache
        self.cache_service.invalidate_project_cache(project_id)
        
        return project
    
    def delete_project(self, project_id: int) -> None:
        """Delete project and all associated data"""
        # Get project info before deletion
        project = self.project_repo.find_by_id(project_id)

        if not project:
            raise ValueError("Project not found")
        user_id = project['owner']

        # Manual cascade deletion: Delete related data in correct order
        print(f"Starting cascade deletion for project {project_id}")
        
        # Step 1: Get all clusters for this project
        if self.cluster_repo and self.object_repo:
            try:
                clusters_result = self.cluster_repo.find_by_project_id(project_id)
                clusters = clusters_result.get('clusters', [])
                print(f"Found {len(clusters)} clusters to delete")
                
                # Step 2: Delete all objects in each cluster
                total_objects_deleted = 0
                for cluster in clusters:
                    cluster_id = cluster['id']
                    try:
                        deleted_objects = self.object_repo.delete_by_cluster_id(cluster_id)
                        objects_count = len(deleted_objects) if deleted_objects else 0
                        total_objects_deleted += objects_count
                        print(f"Deleted {objects_count} objects from cluster {cluster_id}")
                    except Exception as e:
                        print(f"Warning: Failed to delete objects from cluster {cluster_id}: {e}")
                
                print(f"Total objects deleted: {total_objects_deleted}")
                
                # Step 3: Delete all clusters for this project
                try:
                    deleted_clusters = self.supabase.table("cluster").delete().eq("project_id", project_id).execute()
                    clusters_count = len(deleted_clusters.data) if deleted_clusters.data else 0
                    print(f"Deleted {clusters_count} clusters")
                except Exception as e:
                    print(f"Warning: Failed to delete clusters: {e}")
                    
            except Exception as e:
                print(f"Warning: Error during cascade deletion: {e}")
                # Continue with project deletion even if cascade fails

        # Delete storage bucket (if it exists)
        try:
            self.supabase.storage.empty_bucket(str(project_id))
            self.supabase.storage.delete_bucket(str(project_id))
            print(f"Storage bucket {project_id} deleted successfully")
        except Exception as e:
            print(f"Warning: Could not delete storage bucket {project_id}: {e}")
            # Continue with project deletion even if bucket deletion fails
       
        # Finally, delete the project itself
        try:
            self.project_repo.delete_project(project_id)
            print(f"Project {project_id} deleted successfully")
        except Exception as e:
            print(f"Error deleting project {project_id}: {e}")
            raise e
 
        # Invalidate cache
        self.cache_service.invalidate_project_cache(project_id, user_id)
