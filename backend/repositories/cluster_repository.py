from typing import List, Dict, Optional, Any
from .base_repository import BaseRepository


class ClusterRepository(BaseRepository):
    """Repository for cluster-related database operations"""
    
    def find_by_project_id(self, project_id: int) -> Dict[str, Any]:
        """Find all clusters for a project"""
        response = (
            self.supabase.table("cluster")
            .select("*", count="exact")
            .eq("project_id", project_id)
            .execute()
        )
        return {
            'clusters': self._handle_response(response, "Failed to fetch clusters"),
            'count': response.count
        }
    
    def find_by_label_and_project(self, label: str, project_id: int) -> Optional[Dict[str, Any]]:
        """Find cluster by label and project"""
        response = (
            self.supabase.table("cluster")
            .select("*")
            .eq('project_id', project_id)
            .eq('label', label)
            .execute()
        )
        data = self._handle_response(response, "Failed to find cluster")
        return data[0] if data else None
    
    def find_by_label_names_and_project(self, label_names: List[str], project_id: int) -> List[Dict[str, Any]]:
        """Find clusters by label_names and project - handles null values"""
        if not label_names:
            return []
        
        response = (
            self.supabase.table("cluster")
            .select("*")
            .eq('project_id', project_id)
            .in_('label_name', label_names)
            .execute()
        )
        
        return self._handle_response(response, "Failed to find clusters by label names")

    def find_by_labels_and_project_batch(self, labels: List[str], project_id: int) -> List[Dict[str, Any]]:
        """Find multiple clusters by labels and project in a single query"""
        if not labels:
            return []
        
        response = (
            self.supabase.table("cluster")
            .select("*")
            .eq('project_id', project_id)
            .in_('label', labels)
            .execute()
        )
        
        return self._handle_response(response, "Failed to find clusters by labels")

    def create_cluster(self, project_id: int, label: str, label_name: Optional[str] = None) -> Dict[str, Any]:
        """Create a new cluster"""
        cluster_data = {
            "project_id": project_id,
            "label": label
        }
        
        # Only include label_name if it's provided and not empty
        if label_name is not None and label_name.strip():
            cluster_data["label_name"] = label_name.strip()
        
        response = (
            self.supabase.table("cluster")
            .insert(cluster_data)
            .execute()
        )
        data = self._handle_response(response, "Failed to create cluster")
        return data[0] if data else None
    
    def update_cluster(self, cluster_label: str, label_name: str) -> Dict[str, Any]:
        """Update cluster label"""
        response = (
            self.supabase.table("cluster")
            .update({
                "label_name": label_name
            })
            .eq('label', cluster_label)
            .execute()
        )
        data = self._handle_response(response, "Failed to update cluster")
        return data[0] if data else None
    
    def get_cluster_statistics(self, project_id: int) -> List[Dict[str, Any]]:
        """Get cluster names and their object counts for a project"""
        # First get all clusters for the project
        clusters_response = (
            self.supabase.table("cluster")
            .select("id, label, label_name")
            .eq("project_id", project_id)
            .execute()
        )
        
        clusters = self._handle_response(clusters_response, "Failed to fetch clusters")
        
        # Get object counts for each cluster
        statistics = []
        for cluster in clusters:
            # Count objects in this cluster
            objects_response = (
                self.supabase.table("objects")
                .select("*", count="exact")
                .eq("cluster_id", cluster['id'])
                .execute()
            )
            
            object_count = objects_response.count if objects_response.count is not None else 0
            
            statistics.append({
                'name': cluster['label'],
                'frequency': object_count,
                'label': cluster.get('label_name', '')  # Include label_name if available
            })
        
        # Sort by frequency (descending)
        statistics.sort(key=lambda x: x['frequency'], reverse=True)
        
        return statistics
