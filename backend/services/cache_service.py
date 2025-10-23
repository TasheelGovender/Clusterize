from typing import Optional


class CacheService:
    """Service for handling Redis caching operations"""
    
    def __init__(self, redis_client, redis_available: bool, config):
        self.redis_client = redis_client
        self.redis_available = redis_available
        self.config = config
    
    def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        if not self.redis_available:
            return None
        
        try:
            return self.redis_client.get(key)
        except Exception as e:
            print(f"Redis get failed: {e}")
            return None
    
    def set(self, key: str, value: str, ttl: int = None) -> bool:
        """Set value in cache with optional TTL"""
        if not self.redis_available:
            return False
        
        try:
            if ttl:
                self.redis_client.setex(key, ttl, value)
            else:
                self.redis_client.set(key, value)
            return True
        except Exception as e:
            print(f"Redis set failed: {e}")
            return False
    
    def delete(self, *keys: str) -> bool:
        """Delete keys from cache"""
        if not self.redis_available or not keys:
            return False
        
        try:
            self.redis_client.delete(*keys)
            return True
        except Exception as e:
            print(f"Redis delete failed: {e}")
            return False
    
    def scan_and_delete(self, pattern: str) -> int:
        """Scan for keys matching pattern and delete them"""
        if not self.redis_available:
            return 0
        
        try:
            keys_to_delete = list(self.redis_client.scan_iter(match=pattern))
            if keys_to_delete:
                self.redis_client.delete(*keys_to_delete)
                return len(keys_to_delete)
            return 0
        except Exception as e:
            print(f"Cache scan and delete failed: {e}")
            return 0
    
    def invalidate_project_cache(self, project_id: int, user_id: int = None):
        """Invalidate project-related caches"""
        keys_to_delete = [f"project:{project_id}"]
        
        if user_id:
            keys_to_delete.append(f"user_projects:{user_id}")
        
        if self.delete(*keys_to_delete):
            print(f"Invalidated project caches: {keys_to_delete}")
    
    def invalidate_all_cluster_caches(self):
        """Invalidate all cluster object caches"""
        deleted_count = self.scan_and_delete("cluster_objects:*")
        if deleted_count > 0:
            print(f"Invalidated {deleted_count} cluster caches")
