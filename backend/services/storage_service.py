import json
import hashlib
import concurrent.futures
import time
import random
from datetime import datetime, timedelta
from typing import Dict, List, Any
from repositories import ObjectRepository, ClusterRepository, ProjectRepository
from .cache_service import CacheService


class StorageService:
    """Service for storage-related operations"""
    
    def __init__(self, object_repo: ObjectRepository, cluster_repo: ClusterRepository,
                 project_repo: ProjectRepository, cache_service: CacheService, 
                 supabase_client, config):
        self.object_repo = object_repo
        self.cluster_repo = cluster_repo
        self.project_repo = project_repo
        self.cache_service = cache_service
        self.supabase = supabase_client
        self.config = config
    
    def upload_files(self, project_id: int, files) -> None:
        """Upload files to storage"""
        # Verify project exists
        project = self.project_repo.find_by_id(project_id)
        if not project:
            raise ValueError("Project not found")
        
        # Get existing files
        existing_files = self.supabase.storage.from_(str(project_id)).list()
        existing_file_names = {f['name'] for f in existing_files}
        
        for file in files:
            if file.filename == '':
                raise ValueError("File has no name")
            
            if file.filename in existing_file_names:
                raise ValueError(f"File {file.filename} already exists")
            
            # Upload file
            self.supabase.storage.from_(str(project_id)).upload(
                path=file.filename,
                file=file.read(),
                file_options={
                    "content-type": file.content_type
                }
            )
    
    def _generate_cache_key(self, project_id: int, **kwargs) -> str:
        """Optimized cache key generation"""
        key_parts = [f"proj:{project_id}"]
        
        if kwargs.get('clusters'):
            key_parts.append(f"clusters:{','.join(sorted(kwargs['clusters']))}")
        if kwargs.get('tags_list'):
            key_parts.append(f"tags:{','.join(sorted(kwargs['tags_list']))}")
        if kwargs.get('label_names'):
            key_parts.append(f"labels:{','.join(sorted(kwargs['label_names']))}")
        if kwargs.get('relocated_images'):
            key_parts.append("relocated:true")
        if kwargs.get('labels'):
            key_parts.append(f"name:{kwargs['labels']}")
        
        return "cluster_objects:" + "|".join(key_parts)
    
    def _generate_url_with_smart_retry(self, project_id: int, obj: Dict, max_retries: int = 2) -> Dict:
        """Generate URL with intelligent retry logic"""
        delay = 0
        for attempt in range(max_retries + 1):
            try:
                # Add exponential backoff with jitter on retries
                if attempt > 0:
                    # Random delay between 0.1-0.5 seconds, exponentially increasing
                    delay = random.uniform(0.1, 0.5) * (1.5 ** attempt)
                    time.sleep(delay)
                
                signed_url_response = self.supabase.storage.from_(str(project_id)).create_signed_url(
                    obj['name'] + ".png", 
                    24 * 60 * 60  # 24 hours
                )
                obj["url"] = signed_url_response['signedURL']
                return obj
                
            except Exception as e:
                error_msg = str(e).lower()
                
                # Check if it's a connection-related error
                if any(keyword in error_msg for keyword in ['disconnect', 'connection', 'timeout', 'network']):
                    if attempt < max_retries:
                        print(f"Connection error for {obj['name']}, retrying in {delay:.2f}s... (attempt {attempt + 1})")
                        continue
                    else:
                        print(f"Failed to generate URL for {obj['name']} after {max_retries + 1} attempts: {e}")
                else:
                    # Non-connection error, don't retry
                    print(f"Non-retryable error for {obj['name']}: {e}")
                    break
                
                obj["url"] = None
                return obj
        
        return obj
    
    def generate_signed_urls_batch(self, project_id: int, objects: List[Dict]) -> List[Dict]:
        """Generate signed URLs in batch with smart error handling and connection management"""
        
        # OPTIMIZATION: Adaptive worker count based on batch size
        batch_size = len(objects)
        if batch_size <= 5:
            max_workers = 2
        elif batch_size <= 15:
            max_workers = 4
        elif batch_size <= 30:
            max_workers = 6
        else:
            max_workers = 8  # Reduced from 10
        
        print(f"Generating URLs for {batch_size} objects using {max_workers} workers...")
        
        # Use ThreadPoolExecutor with adaptive worker count and timeout
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            try:
                # Add timeout to prevent hanging
                future_to_obj = {
                    executor.submit(self._generate_url_with_smart_retry, project_id, obj): obj
                    for obj in objects
                }
                
                # Process results as they complete with timeout
                results = []
                for future in concurrent.futures.as_completed(future_to_obj, timeout=120):  # 2 minute timeout
                    try:
                        result = future.result(timeout=30)  # 30 second per-task timeout
                        results.append(result)
                    except concurrent.futures.TimeoutError:
                        obj = future_to_obj[future]
                        print(f"Timeout generating URL for {obj['name']}")
                        obj["url"] = None
                        results.append(obj)
                    except Exception as e:
                        obj = future_to_obj[future]
                        print(f"Unexpected error for {obj['name']}: {e}")
                        obj["url"] = None
                        results.append(obj)
                
                # Sort results to maintain original order
                obj_to_result = {result['name']: result for result in results}
                objects = [obj_to_result.get(obj['name'], obj) for obj in objects]
                
            except concurrent.futures.TimeoutError:
                print("Batch URL generation timed out completely, falling back to sequential")
                # Complete fallback to sequential processing
                objects = self._generate_urls_sequential_fallback(project_id, objects)
        
        return objects

    def _generate_urls_sequential_fallback(self, project_id: int, objects: List[Dict]) -> List[Dict]:
        """Fallback sequential URL generation"""
        print("Using sequential fallback...")
        
        for i, obj in enumerate(objects):
            try:
                signed_url_response = self.supabase.storage.from_(str(project_id)).create_signed_url(
                    obj['name'] + ".png", 
                    24 * 60 * 60
                )
                obj["url"] = signed_url_response['signedURL']
                
                # Progress indicator
                if (i + 1) % 5 == 0 or i == len(objects) - 1:
                    print(f"Sequential progress: {i + 1}/{len(objects)}")
                    
            except Exception as e:
                print(f"Sequential fallback failed for {obj['name']}: {e}")
                obj["url"] = None
                
            # Small delay to be gentle on the connection
            if i < len(objects) - 1:  # Don't delay after the last item
                time.sleep(0.05)  # 50ms delay between requests
        
        return objects
    
    def get_objects_with_filters(self, project_id: int, 
                            labels: str = None,
                            clusters: List[str] = None, 
                            tags_list: List[str] = None, 
                            label_names: List[str] = None, 
                            relocated_images: bool = False) -> Dict[str, Any]:
        """Get objects with optional filters and caching (optimized version)
        
        Args:
            project_id: ID of the project
            cluster: DEPRECATED - kept for signature compatibility
            labels: Single label/name filter 
            tags: DEPRECATED - kept for signature compatibility
            clusters: List of cluster names for multiple cluster filtering
            tags_list: List of tags for multiple tag filtering
            label_names: List of label names for multiple label filtering
            relocated_images: Boolean flag for relocated images filtering
        """
        # Only use the new list-based parameters
        
        # Optimized cache key generation
        cache_key = self._generate_cache_key(
            project_id=project_id,
            clusters=clusters,
            tags_list=tags_list,
            label_names=label_names,
            relocated_images=relocated_images,
            labels=labels
        )
        
        # Try cache first
        cached_result = self.cache_service.get(cache_key)
        if cached_result:
            print("Cache hit!")
            cached_data = json.loads(cached_result)
            
            # Check if URLs are still valid
            if datetime.now() < datetime.fromisoformat(cached_data['expires_at']):
                return {
                    'data': cached_data['objects'],
                    'expiration_seconds': cached_data['expiration_seconds'],
                    'cached': True
                }
            else:
                print("Cache expired, refreshing...")
                self.cache_service.delete(cache_key)
        
        print("Cache miss, fetching from database...")
        
        # Optimized database queries - batch operations
        filters = {}
        cluster_ids = []
        
        # Batch cluster lookups instead of individual queries
        if clusters:
            print(f"Filtering by cluster names: {clusters}")
            cluster_objects = self.cluster_repo.find_by_labels_and_project_batch(clusters, project_id)
            cluster_ids.extend([c['id'] for c in cluster_objects])
            
            # Check for missing clusters
            found_cluster_names = {c['label'] for c in cluster_objects}
            missing_clusters = set(clusters) - found_cluster_names
            if missing_clusters:
                raise ValueError(f"Clusters not found: {', '.join(missing_clusters)}")
        
        # Handle label_name filtering with existing batch query
        if label_names:
            print(f"Filtering by label names: {label_names}")
            label_clusters = self.cluster_repo.find_by_label_names_and_project(label_names, project_id)
            for cluster_obj in label_clusters:
                if cluster_obj['id'] not in cluster_ids:  # Avoid duplicates
                    cluster_ids.append(cluster_obj['id'])
        
        if cluster_ids:
            filters['cluster_ids'] = cluster_ids
        
        # Handle other filters
        if labels:
            filters['name'] = labels
        
        if tags_list:
            filters['tags'] = tags_list
        
        # Single optimized database query
        objects = self.object_repo.search_objects(filters, relocated_images)
        if not objects:
            raise ValueError("No objects found")
        
        # Batch URL generation
        objects = self.generate_signed_urls_batch(project_id, objects)
        
        # Cache the result
        expiration_seconds = 24 * 60 * 60
        cache_data = {
            'objects': objects,
            'expiration_seconds': expiration_seconds,
            'expires_at': (datetime.now() + timedelta(seconds=expiration_seconds - 3600)).isoformat()
        }
        
        self.cache_service.set(
            cache_key,
            json.dumps(cache_data),
            self.config.CLUSTER_OBJECTS_CACHE_TTL
        )
        
        return {
            'data': objects,
            'expiration_seconds': expiration_seconds,
            'cached': False
        }
    
    def update_object(self, project_id: int, object_id: int, 
                     tags: List[str] = None, new_cluster_name: str = None) -> Dict[str, Any]:
        """Update object tags and/or cluster"""
        # Verify project exists
        project = self.project_repo.find_by_id(project_id)
        if not project:
            raise ValueError("Project not found")
        
        # Verify object exists in the project
        obj = self.object_repo.find_by_id_in_project(object_id, project_id)
        if not obj:
            raise ValueError("Object not found")
        
        response_data = {}
        
        # Update tags if provided
        if tags is not None:
            tags_array = tags if isinstance(tags, list) else [tags]
            self.object_repo.update_object_tags(obj['id'], tags_array)
            response_data['tags_updated'] = True
        
        # Update cluster if provided
        if new_cluster_name:
            new_cluster = self.cluster_repo.find_by_label_and_project(new_cluster_name, project_id)
            if not new_cluster:
                raise ValueError("New cluster not found")
            
            self.object_repo.update_object_cluster(obj['id'], new_cluster['id'])
            response_data['cluster_updated'] = True
        
        # Invalidate cache
        self.cache_service.invalidate_all_cluster_caches()
        
        return response_data

    def batch_update_objects(self, project_id: int, object_ids: List[int],
                                 operations: Dict[str, Any]) -> Dict[str, Any]:
        """Batch update objects with specified operations"""
        # Verify project exists
        project = self.project_repo.find_by_id(project_id)
        if not project:
            raise ValueError("Project not found")
        
        # Validate object_ids is not empty
        if not object_ids:
            raise ValueError("No object IDs provided")
        
        # Validate operations
        if not operations:
            raise ValueError("No operations provided")
        
        # Check that only one operation type is provided
        operation_types = [key for key in ['add_tags', 'new_cluster'] if key in operations]
        if len(operation_types) != 1:
            raise ValueError("Exactly one operation type must be provided (add_tags or new_cluster)")
        
        operation_type = operation_types[0]
        
        # Validate all objects exist and belong to the project
        valid_objects = []
        for object_id in object_ids:
            # Find object across all clusters in the project
            obj = self.object_repo.find_by_id_in_project(object_id, project_id)
            if not obj:
                raise ValueError(f"Object {object_id} not found in project {project_id}")
            valid_objects.append(obj)
        
        response_data = {
            'updated_count': 0,
            'operation_type': operation_type,
            'object_ids': object_ids
        }
        
        # Process add_tags operation
        if operation_type == 'add_tags':
            tags_to_add = operations['add_tags']
            if not isinstance(tags_to_add, list):
                raise ValueError("add_tags must be a list")
            if not tags_to_add:
                raise ValueError("add_tags cannot be empty")
            
            # Batch update tags for all objects
            for obj in valid_objects:
                # Get current tags
                current_tags = obj.get('tags', []) or []
                
                # Add new tags (avoid duplicates)
                updated_tags = list(set(current_tags + tags_to_add))
                
                # Update object tags
                self.object_repo.update_object_tags(obj['id'], updated_tags)
                response_data['updated_count'] += 1
            
            response_data['tags_added'] = tags_to_add
        
        # Process new_cluster operation
        elif operation_type == 'new_cluster':
            new_cluster_name = operations['new_cluster']
            if not isinstance(new_cluster_name, str):
                raise ValueError("new_cluster must be a string")
            if not new_cluster_name.strip():
                raise ValueError("new_cluster cannot be empty")
            
            # Verify new cluster exists in the project
            new_cluster = self.cluster_repo.find_by_label_and_project(new_cluster_name, project_id)
            if not new_cluster:
                raise ValueError(f"Cluster '{new_cluster_name}' not found in project")
            
            new_cluster_id = new_cluster['id']
            
            # Batch update cluster for all objects
            for obj in valid_objects:
                self.object_repo.update_object_cluster(obj['id'], new_cluster_id)
                response_data['updated_count'] += 1
            
            response_data['new_cluster'] = new_cluster_name
        
        # Invalidate cache after batch update
        self.cache_service.invalidate_all_cluster_caches()
        
        return response_data
    
    def reset_project(self, project_id: int) -> Dict[str, Any]:
        """Reset project to initial state"""
        # Verify project exists
        project = self.project_repo.find_by_id(project_id)
        if not project:
            raise ValueError("Project not found")

        # Reset all objects in the project
        result = self.object_repo.reset_objects_in_project(project_id)

        # Invalidate cache after reset
        self.cache_service.invalidate_all_cluster_caches()

        return {"message": "Project reset successfully", "data": result}
