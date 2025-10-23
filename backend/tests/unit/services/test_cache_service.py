"""Unit tests for CacheService.

This module contains comprehensive unit tests for the CacheService class,
testing Redis operations, error handling, and cache invalidation logic.
"""

import pytest
from unittest.mock import Mock, patch
from services.cache_service import CacheService


class TestCacheService:
    """Test CacheService Redis operations and business logic."""
    
    @pytest.fixture
    def mock_redis_client(self):
        """Create mock Redis client."""
        return Mock()
    
    @pytest.fixture
    def mock_config(self):
        """Create mock configuration."""
        config = Mock()
        config.PROJECT_CACHE_TTL = 3600
        config.USER_PROJECTS_CACHE_TTL = 1800
        config.CLUSTER_OBJECTS_CACHE_TTL = 82800
        return config
    
    @pytest.fixture
    def cache_service_available(self, mock_redis_client, mock_config):
        """Create CacheService with Redis available."""
        return CacheService(
            redis_client=mock_redis_client,
            redis_available=True,
            config=mock_config
        )
    
    @pytest.fixture
    def cache_service_unavailable(self, mock_redis_client, mock_config):
        """Create CacheService with Redis unavailable."""
        return CacheService(
            redis_client=mock_redis_client,
            redis_available=False,
            config=mock_config
        )


class TestCacheServiceInitialization(TestCacheService):
    """Test CacheService initialization."""
    
    def test_initialization_with_available_redis(self, cache_service_available):
        """Test service initialization when Redis is available."""
        assert cache_service_available.redis_available is True
        assert cache_service_available.redis_client is not None
        assert cache_service_available.config is not None
    
    def test_initialization_with_unavailable_redis(self, cache_service_unavailable):
        """Test service initialization when Redis is unavailable."""
        assert cache_service_unavailable.redis_available is False
        assert cache_service_unavailable.redis_client is not None
        assert cache_service_unavailable.config is not None


class TestCacheGet(TestCacheService):
    """Test cache get operations."""
    
    def test_get_success_with_available_redis(self, cache_service_available, mock_redis_client):
        """Test successful cache get when Redis is available."""
        # Arrange
        test_key = "test:key"
        expected_value = "cached_value"
        mock_redis_client.get.return_value = expected_value
        
        # Act
        result = cache_service_available.get(test_key)
        
        # Assert
        assert result == expected_value
        mock_redis_client.get.assert_called_once_with(test_key)
    
    def test_get_with_unavailable_redis(self, cache_service_unavailable, mock_redis_client):
        """Test cache get when Redis is unavailable."""
        # Arrange
        test_key = "test:key"
        
        # Act
        result = cache_service_unavailable.get(test_key)
        
        # Assert
        assert result is None
        mock_redis_client.get.assert_not_called()
    
    def test_get_redis_exception(self, cache_service_available, mock_redis_client):
        """Test cache get when Redis raises an exception."""
        # Arrange
        test_key = "test:key"
        mock_redis_client.get.side_effect = Exception("Redis connection failed")
        
        # Act
        result = cache_service_available.get(test_key)
        
        # Assert
        assert result is None
        mock_redis_client.get.assert_called_once_with(test_key)
    
    def test_get_none_value(self, cache_service_available, mock_redis_client):
        """Test cache get when key doesn't exist (returns None)."""
        # Arrange
        test_key = "nonexistent:key"
        mock_redis_client.get.return_value = None
        
        # Act
        result = cache_service_available.get(test_key)
        
        # Assert
        assert result is None
        mock_redis_client.get.assert_called_once_with(test_key)


class TestCacheSet(TestCacheService):
    """Test cache set operations."""
    
    def test_set_success_without_ttl(self, cache_service_available, mock_redis_client):
        """Test successful cache set without TTL."""
        # Arrange
        test_key = "test:key"
        test_value = "test_value"
        
        # Act
        result = cache_service_available.set(test_key, test_value)
        
        # Assert
        assert result is True
        mock_redis_client.set.assert_called_once_with(test_key, test_value)
        mock_redis_client.setex.assert_not_called()
    
    def test_set_success_with_ttl(self, cache_service_available, mock_redis_client):
        """Test successful cache set with TTL."""
        # Arrange
        test_key = "test:key"
        test_value = "test_value"
        test_ttl = 3600
        
        # Act
        result = cache_service_available.set(test_key, test_value, test_ttl)
        
        # Assert
        assert result is True
        mock_redis_client.setex.assert_called_once_with(test_key, test_ttl, test_value)
        mock_redis_client.set.assert_not_called()
    
    def test_set_with_unavailable_redis(self, cache_service_unavailable, mock_redis_client):
        """Test cache set when Redis is unavailable."""
        # Arrange
        test_key = "test:key"
        test_value = "test_value"
        
        # Act
        result = cache_service_unavailable.set(test_key, test_value)
        
        # Assert
        assert result is False
        mock_redis_client.set.assert_not_called()
        mock_redis_client.setex.assert_not_called()
    
    def test_set_redis_exception(self, cache_service_available, mock_redis_client):
        """Test cache set when Redis raises an exception."""
        # Arrange
        test_key = "test:key"
        test_value = "test_value"
        mock_redis_client.set.side_effect = Exception("Redis connection failed")
        
        # Act
        result = cache_service_available.set(test_key, test_value)
        
        # Assert
        assert result is False
        mock_redis_client.set.assert_called_once_with(test_key, test_value)
    
    def test_set_with_zero_ttl(self, cache_service_available, mock_redis_client):
        """Test cache set with zero TTL (should use set, not setex)."""
        # Arrange
        test_key = "test:key"
        test_value = "test_value"
        test_ttl = 0
        
        # Act
        result = cache_service_available.set(test_key, test_value, test_ttl)
        
        # Assert
        assert result is True
        mock_redis_client.set.assert_called_once_with(test_key, test_value)
        mock_redis_client.setex.assert_not_called()


class TestCacheDelete(TestCacheService):
    """Test cache delete operations."""
    
    def test_delete_single_key_success(self, cache_service_available, mock_redis_client):
        """Test successful deletion of single key."""
        # Arrange
        test_key = "test:key"
        
        # Act
        result = cache_service_available.delete(test_key)
        
        # Assert
        assert result is True
        mock_redis_client.delete.assert_called_once_with(test_key)
    
    def test_delete_multiple_keys_success(self, cache_service_available, mock_redis_client):
        """Test successful deletion of multiple keys."""
        # Arrange
        test_keys = ["test:key1", "test:key2", "test:key3"]
        
        # Act
        result = cache_service_available.delete(*test_keys)
        
        # Assert
        assert result is True
        mock_redis_client.delete.assert_called_once_with(*test_keys)
    
    def test_delete_with_unavailable_redis(self, cache_service_unavailable, mock_redis_client):
        """Test delete when Redis is unavailable."""
        # Arrange
        test_key = "test:key"
        
        # Act
        result = cache_service_unavailable.delete(test_key)
        
        # Assert
        assert result is False
        mock_redis_client.delete.assert_not_called()
    
    def test_delete_no_keys(self, cache_service_available, mock_redis_client):
        """Test delete with no keys provided."""
        # Act
        result = cache_service_available.delete()
        
        # Assert
        assert result is False
        mock_redis_client.delete.assert_not_called()
    
    def test_delete_redis_exception(self, cache_service_available, mock_redis_client):
        """Test delete when Redis raises an exception."""
        # Arrange
        test_key = "test:key"
        mock_redis_client.delete.side_effect = Exception("Redis connection failed")
        
        # Act
        result = cache_service_available.delete(test_key)
        
        # Assert
        assert result is False
        mock_redis_client.delete.assert_called_once_with(test_key)


class TestScanAndDelete(TestCacheService):
    """Test scan and delete operations."""
    
    def test_scan_and_delete_success(self, cache_service_available, mock_redis_client):
        """Test successful scan and delete operation."""
        # Arrange
        pattern = "test:*"
        matching_keys = ["test:key1", "test:key2", "test:key3"]
        mock_redis_client.scan_iter.return_value = iter(matching_keys)
        
        # Act
        result = cache_service_available.scan_and_delete(pattern)
        
        # Assert
        assert result == 3
        mock_redis_client.scan_iter.assert_called_once_with(match=pattern)
        mock_redis_client.delete.assert_called_once_with(*matching_keys)
    
    def test_scan_and_delete_no_matches(self, cache_service_available, mock_redis_client):
        """Test scan and delete when no keys match pattern."""
        # Arrange
        pattern = "nonexistent:*"
        mock_redis_client.scan_iter.return_value = iter([])
        
        # Act
        result = cache_service_available.scan_and_delete(pattern)
        
        # Assert
        assert result == 0
        mock_redis_client.scan_iter.assert_called_once_with(match=pattern)
        mock_redis_client.delete.assert_not_called()
    
    def test_scan_and_delete_with_unavailable_redis(self, cache_service_unavailable, mock_redis_client):
        """Test scan and delete when Redis is unavailable."""
        # Arrange
        pattern = "test:*"
        
        # Act
        result = cache_service_unavailable.scan_and_delete(pattern)
        
        # Assert
        assert result == 0
        mock_redis_client.scan_iter.assert_not_called()
        mock_redis_client.delete.assert_not_called()
    
    def test_scan_and_delete_redis_exception(self, cache_service_available, mock_redis_client):
        """Test scan and delete when Redis raises an exception."""
        # Arrange
        pattern = "test:*"
        mock_redis_client.scan_iter.side_effect = Exception("Redis connection failed")
        
        # Act
        result = cache_service_available.scan_and_delete(pattern)
        
        # Assert
        assert result == 0
        mock_redis_client.scan_iter.assert_called_once_with(match=pattern)


class TestInvalidateProjectCache(TestCacheService):
    """Test project cache invalidation."""
    
    def test_invalidate_project_cache_without_user_id(self, cache_service_available, mock_redis_client):
        """Test project cache invalidation without user ID."""
        # Arrange
        project_id = 123
        
        # Act
        cache_service_available.invalidate_project_cache(project_id)
        
        # Assert
        expected_keys = [f"project:{project_id}"]
        mock_redis_client.delete.assert_called_once_with(*expected_keys)
    
    def test_invalidate_project_cache_with_user_id(self, cache_service_available, mock_redis_client):
        """Test project cache invalidation with user ID."""
        # Arrange
        project_id = 123
        user_id = 456
        
        # Act
        cache_service_available.invalidate_project_cache(project_id, user_id)
        
        # Assert
        expected_keys = [f"project:{project_id}", f"user_projects:{user_id}"]
        mock_redis_client.delete.assert_called_once_with(*expected_keys)
    
    def test_invalidate_project_cache_delete_failure(self, cache_service_available, mock_redis_client):
        """Test project cache invalidation when delete fails."""
        # Arrange
        project_id = 123
        mock_redis_client.delete.side_effect = Exception("Redis connection failed")
        
        # Act - Should not raise exception
        cache_service_available.invalidate_project_cache(project_id)
        
        # Assert
        mock_redis_client.delete.assert_called_once_with(f"project:{project_id}")
    
    @pytest.mark.parametrize("project_id,user_id,expected_keys", [
        (1, None, ["project:1"]),
        (1, 2, ["project:1", "user_projects:2"]),
        (999, 888, ["project:999", "user_projects:888"]),
        (0, 0, ["project:0"]),  # user_id=0 is falsy, so no user_projects key added
        (123, 1, ["project:123", "user_projects:1"]),  # user_id=1 is truthy
    ])
    def test_invalidate_project_cache_various_inputs(self, cache_service_available, mock_redis_client, 
                                                   project_id, user_id, expected_keys):
        """Test project cache invalidation with various input combinations."""
        # Act
        cache_service_available.invalidate_project_cache(project_id, user_id)
        
        # Assert
        mock_redis_client.delete.assert_called_once_with(*expected_keys)
    
    def test_invalidate_project_cache_zero_user_id_edge_case(self, cache_service_available, mock_redis_client):
        """Test that user_id=0 is treated as falsy and doesn't add user cache key.
        
        Note: This documents current behavior where user_id=0 is treated as falsy.
        This might be a bug if user_id=0 is a valid ID in your system.
        """
        # Arrange
        project_id = 123
        user_id = 0  # This is falsy in Python
        
        # Act
        cache_service_available.invalidate_project_cache(project_id, user_id)
        
        # Assert - Only project key should be deleted, not user_projects key
        expected_keys = ["project:123"]  # No user_projects:0 because 0 is falsy
        mock_redis_client.delete.assert_called_once_with(*expected_keys)


class TestInvalidateAllClusterCaches(TestCacheService):
    """Test cluster cache invalidation."""
    
    def test_invalidate_all_cluster_caches_success(self, cache_service_available, mock_redis_client):
        """Test successful cluster cache invalidation."""
        # Arrange
        matching_keys = ["cluster_objects:1", "cluster_objects:2", "cluster_objects:3"]
        mock_redis_client.scan_iter.return_value = iter(matching_keys)
        
        # Act
        cache_service_available.invalidate_all_cluster_caches()
        
        # Assert
        mock_redis_client.scan_iter.assert_called_once_with(match="cluster_objects:*")
        mock_redis_client.delete.assert_called_once_with(*matching_keys)
    
    def test_invalidate_all_cluster_caches_no_matches(self, cache_service_available, mock_redis_client):
        """Test cluster cache invalidation when no caches exist."""
        # Arrange
        mock_redis_client.scan_iter.return_value = iter([])
        
        # Act
        cache_service_available.invalidate_all_cluster_caches()
        
        # Assert
        mock_redis_client.scan_iter.assert_called_once_with(match="cluster_objects:*")
        mock_redis_client.delete.assert_not_called()
    
    def test_invalidate_all_cluster_caches_redis_unavailable(self, cache_service_unavailable, mock_redis_client):
        """Test cluster cache invalidation when Redis is unavailable."""
        # Act
        cache_service_unavailable.invalidate_all_cluster_caches()
        
        # Assert
        mock_redis_client.scan_iter.assert_not_called()
        mock_redis_client.delete.assert_not_called()


class TestEdgeCases(TestCacheService):
    """Test edge cases and error scenarios."""
    
    def test_empty_string_key_operations(self, cache_service_available, mock_redis_client):
        """Test operations with empty string keys."""
        # Test get with empty key
        result_get = cache_service_available.get("")
        mock_redis_client.get.assert_called_with("")
        
        # Test set with empty key
        result_set = cache_service_available.set("", "value")
        mock_redis_client.set.assert_called_with("", "value")
        
        # Test delete with empty key
        result_delete = cache_service_available.delete("")
        mock_redis_client.delete.assert_called_with("")
    
    def test_none_values(self, cache_service_available, mock_redis_client):
        """Test handling of None values."""
        # Test set with None value (should work - Redis will convert to string)
        result = cache_service_available.set("key", None)
        assert result is True
        mock_redis_client.set.assert_called_with("key", None)
    
    def test_large_ttl_value(self, cache_service_available, mock_redis_client):
        """Test set operation with very large TTL."""
        # Arrange
        large_ttl = 2147483647  # Max 32-bit integer
        
        # Act
        result = cache_service_available.set("key", "value", large_ttl)
        
        # Assert
        assert result is True
        mock_redis_client.setex.assert_called_once_with("key", large_ttl, "value")
    
    def test_negative_project_id_invalidation(self, cache_service_available, mock_redis_client):
        """Test cache invalidation with negative project ID."""
        # Act
        cache_service_available.invalidate_project_cache(-1, -2)
        
        # Assert
        expected_keys = ["project:-1", "user_projects:-2"]
        mock_redis_client.delete.assert_called_once_with(*expected_keys)


class TestRedisOperationLogging(TestCacheService):
    """Test Redis operation logging and error handling."""
    
    @patch('builtins.print')
    def test_get_exception_logging(self, mock_print, cache_service_available, mock_redis_client):
        """Test that get exceptions are logged."""
        # Arrange
        mock_redis_client.get.side_effect = Exception("Connection timeout")
        
        # Act
        result = cache_service_available.get("test:key")
        
        # Assert
        assert result is None
        mock_print.assert_called_with("Redis get failed: Connection timeout")
    
    @patch('builtins.print')
    def test_set_exception_logging(self, mock_print, cache_service_available, mock_redis_client):
        """Test that set exceptions are logged."""
        # Arrange
        mock_redis_client.set.side_effect = Exception("Connection timeout")
        
        # Act
        result = cache_service_available.set("test:key", "value")
        
        # Assert
        assert result is False
        mock_print.assert_called_with("Redis set failed: Connection timeout")
    
    @patch('builtins.print')
    def test_delete_exception_logging(self, mock_print, cache_service_available, mock_redis_client):
        """Test that delete exceptions are logged."""
        # Arrange
        mock_redis_client.delete.side_effect = Exception("Connection timeout")
        
        # Act
        result = cache_service_available.delete("test:key")
        
        # Assert
        assert result is False
        mock_print.assert_called_with("Redis delete failed: Connection timeout")
    
    @patch('builtins.print')
    def test_scan_and_delete_exception_logging(self, mock_print, cache_service_available, mock_redis_client):
        """Test that scan_and_delete exceptions are logged."""
        # Arrange
        mock_redis_client.scan_iter.side_effect = Exception("Connection timeout")
        
        # Act
        result = cache_service_available.scan_and_delete("test:*")
        
        # Assert
        assert result == 0
        mock_print.assert_called_with("Cache scan and delete failed: Connection timeout")
    
    @patch('builtins.print')
    def test_successful_invalidation_logging(self, mock_print, cache_service_available, mock_redis_client):
        """Test that successful cache invalidations are logged."""
        # Test project cache invalidation logging
        cache_service_available.invalidate_project_cache(123, 456)
        mock_print.assert_called_with("Invalidated project caches: ['project:123', 'user_projects:456']")
        
        # Test cluster cache invalidation logging
        matching_keys = ["cluster_objects:1", "cluster_objects:2"]
        mock_redis_client.scan_iter.return_value = iter(matching_keys)
        
        cache_service_available.invalidate_all_cluster_caches()
        mock_print.assert_called_with("Invalidated 2 cluster caches")


@pytest.mark.integration
class TestCacheServiceIntegration(TestCacheService):
    """Integration-style tests for CacheService workflows."""
    
    def test_complete_cache_workflow(self, cache_service_available, mock_redis_client):
        """Test complete cache workflow: set → get → delete."""
        # Arrange
        key = "workflow:test"
        value = "test_value"
        ttl = 3600
        
        # Act & Assert - Set value
        set_result = cache_service_available.set(key, value, ttl)
        assert set_result is True
        mock_redis_client.setex.assert_called_with(key, ttl, value)
        
        # Mock get to return the set value
        mock_redis_client.get.return_value = value
        
        # Act & Assert - Get value
        get_result = cache_service_available.get(key)
        assert get_result == value
        mock_redis_client.get.assert_called_with(key)
        
        # Act & Assert - Delete value
        delete_result = cache_service_available.delete(key)
        assert delete_result is True
        mock_redis_client.delete.assert_called_with(key)
    
    def test_cache_invalidation_workflow(self, cache_service_available, mock_redis_client):
        """Test complete cache invalidation workflow."""
        # Arrange
        project_id = 123
        user_id = 456
        
        # Setup cluster cache keys for scan operation
        cluster_keys = ["cluster_objects:1", "cluster_objects:2", "cluster_objects:3"]
        mock_redis_client.scan_iter.return_value = iter(cluster_keys)
        
        # Act - Invalidate project cache
        cache_service_available.invalidate_project_cache(project_id, user_id)
        
        # Act - Invalidate all cluster caches
        cache_service_available.invalidate_all_cluster_caches()
        
        # Assert - Verify both invalidation operations
        project_keys = [f"project:{project_id}", f"user_projects:{user_id}"]
        mock_redis_client.delete.assert_any_call(*project_keys)
        mock_redis_client.delete.assert_any_call(*cluster_keys)
        
        # Verify total call count
        assert mock_redis_client.delete.call_count == 2