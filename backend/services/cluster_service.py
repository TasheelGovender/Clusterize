from typing import List, Dict, Any
from repositories import ClusterRepository, ObjectRepository
from .cache_service import CacheService


class ClusterService:
    """Service for cluster-related business logic"""
    
    def __init__(self, cluster_repo: ClusterRepository, object_repo: ObjectRepository,
                 cache_service: CacheService, supabase_client):
        self.cluster_repo = cluster_repo
        self.object_repo = object_repo
        self.cache_service = cache_service
        self.supabase = supabase_client
    
    def get_project_clusters(self, project_id: int) -> Dict[str, Any]:
        """Get all clusters for a project"""
        return self.cluster_repo.find_by_project_id(project_id)
    
    def get_cluster_objects(self, cluster_id: int) -> Dict[str, Any]:
        """Get all objects in a cluster"""
        return self.object_repo.find_by_cluster_id(cluster_id)
    
    def create_clusters_from_data(self, project_id: int, cluster_data: List[Dict[str, Any]]) -> None:
        """Create clusters and objects from upload data"""
        print(f"=== create_clusters_from_data DEBUG ===")
        print(f"project_id: {project_id}")
        print(f"cluster_data length: {len(cluster_data)}")
        # Get existing files in storage
        storage_files = self.supabase.storage.from_(str(project_id)).list(
                options={
                    "limit": 1000,
                    "offset": 0,
                }
            )
        if not storage_files:
            print("ERROR: No files found in storage")
            raise ValueError("No files found in storage")
        
        file_names = {item["name"] for item in storage_files}
        print(f"Found {len(file_names)} files in storage")
        print(list(file_names))
        
        for cluster_info in cluster_data:
            file_name = f"{cluster_info['name']}.png"
            
            if file_name in file_names:
                # Get or create cluster
                cluster = self.cluster_repo.find_by_label_and_project(
                    cluster_info["cluster"], project_id
                )
                
                if not cluster:
                    cluster = self.cluster_repo.create_cluster(
                        project_id, cluster_info["cluster"]
                    )
                
                cluster_id = cluster['id']
                
                # Check if object already exists
                existing_object = self.object_repo.find_by_name_and_cluster(
                    cluster_info["name"], cluster_id
                )
                
                if not existing_object:
                    self.object_repo.create_object(cluster_info["name"], cluster_id)

    def create_new_cluster(self, project_id: int, label: str, label_name: str) -> Dict[str, Any]:
        """Create a new cluster with the given name and label"""
        print(f"=== ClusterService.create_new_cluster DEBUG ===")
        print(f"project_id: {project_id} (type: {type(project_id)})")
        print(f"label: {label} (type: {type(label)})")
        print(f"label_name: {label_name} (type: {type(label_name)})")
        
        try:
            # Check if cluster already exists
            existing_cluster = self.cluster_repo.find_by_label_and_project(label, project_id)
            print(f"Existing cluster found: {existing_cluster}")
            
            if existing_cluster:
                error_msg = "Cluster with this name already exists"
                raise ValueError(error_msg)
            
            # Create new cluster
            print("Creating new cluster...")
            cluster = self.cluster_repo.create_cluster(project_id, label, label_name)
            print(f"Created cluster: {cluster}")

            # Invalidate cache
            self.cache_service.invalidate_project_cache(project_id)
            print("Cache invalidated")
            
            print(f"Returning cluster: {cluster}")
            return cluster
            
        except Exception as e:
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            raise
    
    def update_cluster(self, project_id: int, cluster_number: str, label_name: str) -> Dict[str, Any]:
        """Update cluster label"""
        # Verify cluster exists in project
        existing_cluster = self.cluster_repo.find_by_label_and_project(cluster_number, project_id)
        if not existing_cluster:
            raise ValueError("Cluster not found")

        # Invalidate cache after batch update
        self.cache_service.invalidate_all_cluster_caches()
        
        return self.cluster_repo.update_cluster(cluster_number, label_name)

    def reset_cluster(self, project_id: int, cluster_number: str ) -> Dict[str, Any]:
        """Reset cluster to initial state"""
        # Verify cluster exists in project
        existing_cluster = self.cluster_repo.find_by_label_and_project(cluster_number, project_id)
        if not existing_cluster:
            raise ValueError("Cluster not found")

        # Reset cluster state
        self.cache_service.invalidate_all_cluster_caches()
        response = self.object_repo.reset_objects_in_cluster(existing_cluster['id'])
        response_2 = self.object_repo.reset_moved_objects_from_cluster(existing_cluster['id'])
        return {
            "reset_objects": response,
            "reset_moved_objects": response_2
        }
