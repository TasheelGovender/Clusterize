from typing import List, Dict, Optional, Any
from .base_repository import BaseRepository


class ObjectRepository(BaseRepository):
    """Repository for object-related database operations"""
    
    def find_by_cluster_id(self, cluster_id: int) -> Dict[str, Any]:
        """Find all objects in a cluster"""
        response = (
            self.supabase.table("objects")
            .select("*", count="exact")
            .eq("cluster_id", cluster_id)
            .execute()
        )
        return {
            'objects': self._handle_response(response, "Failed to fetch objects"),
            'count': response.count
        }
    
    def find_by_name_and_cluster(self, name: str, cluster_id: int) -> Optional[Dict[str, Any]]:
        """Find object by name and cluster"""
        response = (
            self.supabase.table("objects")
            .select("*")
            .eq('name', name)
            .eq('cluster_id', cluster_id)
            .execute()
        )
        data = self._handle_response(response, "Failed to find object")
        return data[0] if data else None
    
    def find_by_id_and_cluster(self, object_id: int, cluster_id: int) -> Optional[Dict[str, Any]]:
        """Find object by ID and cluster"""
        response = (
            self.supabase.table("objects")
            .select("*")
            .eq('cluster_id', cluster_id)
            .eq('id', object_id)
            .execute()
        )
        data = self._handle_response(response, "Failed to find object")
        return data[0] if data else None
    
    def find_by_id_in_project(self, object_id: int, project_id: int) -> Optional[Dict[str, Any]]:
        """Find object by ID within a specific project (across all clusters in the project)"""
        response = (
            self.supabase.table("objects")
            .select("*, cluster!inner(project_id)")
            .eq('id', object_id)
            .eq('cluster.project_id', project_id)
            .execute()
        )
        data = self._handle_response(response, "Failed to find object in project")
        return data[0] if data else None
    
    def create_object(self, name: str, cluster_id: int) -> Dict[str, Any]:
        """Create a new object"""
        response = (
            self.supabase.table("objects")
            .insert({
                "name": name,
                "cluster_id": cluster_id,
            })
            .execute()
        )
        data = self._handle_response(response, "Failed to create object")
        return data[0] if data else None
    
    def update_object_tags(self, object_id: int, tags: List[str]) -> Dict[str, Any]:
        """Update object tags"""
        response = (
            self.supabase.table('objects')
            .update({'tags': tags})
            .eq('id', object_id)
            .execute()
        )
        data = self._handle_response(response, "Failed to update object tags")
        return data[0] if data else None
    
    def update_object_cluster(self, object_id: int, cluster_id: int) -> Dict[str, Any]:
        """Update object cluster"""
        response = (
            self.supabase.table('objects')
            .update({'cluster_id': cluster_id})
            .eq('id', object_id)
            .execute()
        )
        data = self._handle_response(response, "Failed to update object cluster")
        return data[0] if data else None
    
    def delete_by_cluster_id(self, cluster_id: int) -> List[Dict[str, Any]]:
        """Delete all objects in a cluster"""
        response = (
            self.supabase.table("objects")
            .delete()
            .eq("cluster_id", cluster_id)
            .execute()
        )
        return self._handle_response(response, "Failed to delete objects")

    def search_objects(self, filters: Dict[str, Any], relocated_images: bool) -> List[Dict[str, Any]]:
        """Search objects with filters
        
        Args:
            filters: Dictionary containing filter criteria:
                - cluster_ids: List of cluster IDs (replaces cluster_id)
                - name: Single string for name filtering
                - tags: List of tags for filtering
            relocated_images: Boolean flag, if set as true, will include only images relocated from their original clusters.
        """
        objects_query = self.supabase.table("objects").select("*")

        # Handle cluster filtering (both old single and new multiple format)
        if 'cluster_id' in filters and filters['cluster_id']:
            # Backward compatibility for single cluster_id
            objects_query = objects_query.eq('cluster_id', filters['cluster_id'])
        elif 'cluster_ids' in filters and filters['cluster_ids']:
            # New multiple cluster filtering
            objects_query = objects_query.in_('cluster_id', filters['cluster_ids'])
        
        # Handle name filtering
        if 'name' in filters and filters['name']:
            objects_query = objects_query.eq('name', filters['name'])
        
        # Handle tag filtering (now expects a list)
        if 'tags' in filters and filters['tags']:
            if isinstance(filters['tags'], list):
                # New format: list of tags
                # For PostgreSQL array contains, we use the contains operator for AND filtering
                # This means the object's tags array must contain ALL of the specified tags
                objects_query = objects_query.contains('tags', filters['tags'])
            else:
                # Backward compatibility: single tag or comma-separated string
                tags_array = filters['tags'].split(",") if isinstance(filters['tags'], str) and "," in filters['tags'] else [filters['tags']]
                objects_query = objects_query.contains('tags', tags_array)
        
        response = objects_query.execute()
        
        # Handle relocated images filtering (post-query since PostgREST doesn't support column comparison)
        data = self._handle_response(response, "Failed to search objects")
        if relocated_images and data:
            data = [obj for obj in data 
                   if obj.get('cluster_id') != obj.get('original_cluster')]
        
        return data
    
    def get_tag_statistics(self, project_id: int) -> List[Dict[str, Any]]:
        """Get tag names and their frequencies for a project"""
        # First get all objects in the project through clusters
        response = (
            self.supabase.table("objects")
            .select("tags, cluster!inner(project_id)")
            .eq("cluster.project_id", project_id)
            .execute()
        )
        
        objects = self._handle_response(response, "Failed to fetch tag statistics")
        
        # Count tag frequencies
        tag_counts = {}
        for obj in objects:
            tags = obj.get('tags', [])
            if tags:
                for tag in tags:
                    if tag:  # Skip empty tags
                        tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        # Transform to list format
        statistics = []
        for tag, count in tag_counts.items():
            statistics.append({
                'name': tag,
                'frequency': count
            })
        
        # Sort by frequency (descending)
        statistics.sort(key=lambda x: x['frequency'], reverse=True)
        
        return statistics

    def reset_objects_in_project(self, project_id: int) -> bool:
        """Reset all objects in a project to their initial state"""
        # First, we need to get all clusters that belong to this project
        clusters_response = (
            self.supabase.table("cluster")
            .select("id")
            .eq("project_id", project_id)
            .execute()
        )
        
        clusters = self._handle_response(clusters_response, "Failed to fetch project clusters")
        
        if not clusters:
            return []
            
        # Extract cluster IDs
        cluster_ids = [cluster['id'] for cluster in clusters]
        
        # For each object, get its original_cluster and then update cluster_id to that value

        # First, get all objects in these clusters
        objects_response = (
            self.supabase.table("objects")
            .select("id, cluster_id, original_cluster")
            .in_("cluster_id", cluster_ids)
            .execute()
        )
        
        objects = self._handle_response(objects_response, "Failed to fetch objects")
        
        # Now, update each object individually
        updated_count = 0
        for obj in objects:
            if obj.get('cluster_id') != obj.get('original_cluster'):
                update_response = (
                    self.supabase.table("objects")
                    .update({"cluster_id": obj['original_cluster']})
                    .eq("id", obj['id'])
                    .execute()
                )
                self._handle_response(update_response, f"Failed to update object {obj['id']}")
                updated_count += 1
        
        return {"updated_count": updated_count}
    
    def reset_objects_in_cluster(self, cluster_id: str) -> Dict[str, Any]:
        """Reset objects back to their original cluster (where original_cluster equals cluster_id)"""
        # Only update objects that are NOT already in their original cluster
        response = (
            self.supabase.table("objects")
            .update({"cluster_id": cluster_id})
            .eq("original_cluster", cluster_id)
            .neq("cluster_id", cluster_id)  # Only update if cluster_id != original_cluster
            .execute()
        )
        updated_objects = self._handle_response(response, "Failed to reset cluster")
        return {
            "updated_count": len(updated_objects) if updated_objects else 0,
            "objects": updated_objects
        }
    
    def reset_moved_objects_from_cluster(self, cluster_id: str) -> Dict[str, Any]:
        """Reset objects that are currently in cluster_id but were moved from their original cluster"""
        # Single query to update all objects that need resetting
        # This finds objects where cluster_id = provided cluster_id AND original_cluster != cluster_id
        # Then sets cluster_id = original_cluster for each
        
        # We need to do this in a more complex way since we're setting cluster_id to different values
        # First get the objects that need updating
        objects_response = (
            self.supabase.table("objects")
            .select("id, original_cluster")
            .eq("cluster_id", cluster_id)
            .neq("original_cluster", cluster_id)  # Only get objects that actually need updating
            .execute()
        )
        
        objects_to_reset = self._handle_response(objects_response, "Failed to fetch moved objects")
        
        if not objects_to_reset:
            return {
                "updated_count": 0,
                "objects": []
            }
        
        # Batch update using PostgreSQL's UPDATE with CASE/WHEN or individual updates
        # Since we need to set different cluster_id values, we'll do individual updates
        # but only for objects that actually need updating (already filtered above)
        updated_objects = []
        for obj in objects_to_reset:
            update_response = (
                self.supabase.table("objects")
                .update({"cluster_id": obj["original_cluster"]})
                .eq("id", obj["id"])
                .execute()
            )
            updated_obj = self._handle_response(update_response, f"Failed to reset object {obj['id']}")
            if updated_obj:
                updated_objects.extend(updated_obj)
        
        return {
            "updated_count": len(updated_objects),
            "objects": updated_objects
        }
