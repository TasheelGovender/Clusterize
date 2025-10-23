"""Unit tests for StorageService.

This module contains comprehensive unit tests for the StorageService class,
testing file upload operations, concurrent URL generation, complex caching logic,
batch operations, and project reset functionality.
"""

import pytest
import json
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock, call, ANY
from services.storage_service import StorageService


class TestStorageService:
    """Test StorageService business logic."""
    
    @pytest.fixture
    def mock_object_repo(self):
        """Create mock object repository."""
        return Mock()
    
    @pytest.fixture
    def mock_cluster_repo(self):
        """Create mock cluster repository."""
        return Mock()
    
    @pytest.fixture
    def mock_project_repo(self):
        """Create mock project repository."""
        return Mock()
    
    @pytest.fixture
    def mock_cache_service(self):
        """Create mock cache service."""
        return Mock()
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Create mock Supabase client."""
        mock_client = Mock()
        
        # Mock storage operations
        mock_storage = Mock()
        mock_bucket = Mock()
        mock_bucket.list.return_value = []
        mock_bucket.upload.return_value = {"message": "Upload successful"}
        mock_bucket.create_signed_url.return_value = {
            "signedURL": "https://example.com/signed-url"
        }
        
        mock_storage.from_.return_value = mock_bucket
        mock_client.storage = mock_storage
        
        return mock_client
    
    @pytest.fixture
    def mock_config(self):
        """Create mock configuration."""
        config = Mock()
        config.CLUSTER_OBJECTS_CACHE_TTL = 82800
        return config
    
    @pytest.fixture
    def service(self, mock_object_repo, mock_cluster_repo, mock_project_repo,
                mock_cache_service, mock_supabase_client, mock_config):
        """Create StorageService instance with mocked dependencies."""
        return StorageService(
            object_repo=mock_object_repo,
            cluster_repo=mock_cluster_repo,
            project_repo=mock_project_repo,
            cache_service=mock_cache_service,
            supabase_client=mock_supabase_client,
            config=mock_config
        )
    
    @pytest.fixture
    def sample_project(self):
        """Sample project data."""
        return {
            "id": 123,
            "name": "Test Project",
            "owner": 456,
            "created_at": "2024-01-01T00:00:00Z"
        }
    
    @pytest.fixture
    def sample_objects(self):
        """Sample objects for testing."""
        return [
            {
                "id": 1,
                "name": "object1",
                "cluster_id": 10,
                "tags": ["nature", "outdoor"],
                "project_id": 123
            },
            {
                "id": 2,
                "name": "object2",
                "cluster_id": 11,
                "tags": ["urban", "building"],
                "project_id": 123
            }
        ]
    
    @pytest.fixture
    def mock_file(self):
        """Create mock file for upload testing."""
        mock_file = Mock()
        mock_file.filename = "test_image.png"
        mock_file.content_type = "image/png"
        mock_file.read.return_value = b"fake_image_data"
        return mock_file


class TestUploadFiles(TestStorageService):
    """Test upload_files functionality."""
    
    def test_upload_files_success(self, service, mock_project_repo, mock_supabase_client, 
                                 sample_project, mock_file):
        """Test successful file upload."""
        # Arrange
        project_id = 123
        files = [mock_file]
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_supabase_client.storage.from_.return_value.list.return_value = []
        
        # Act
        service.upload_files(project_id, files)
        
        # Assert
        mock_project_repo.find_by_id.assert_called_once_with(project_id)
        mock_supabase_client.storage.from_.assert_called_with(str(project_id))
        mock_supabase_client.storage.from_.return_value.upload.assert_called_once_with(
            path="test_image.png",
            file=b"fake_image_data",
            file_options={"content-type": "image/png"}
        )
    
    def test_upload_files_project_not_found(self, service, mock_project_repo):
        """Test file upload when project doesn't exist."""
        # Arrange
        project_id = 999
        files = [Mock()]
        mock_project_repo.find_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="Project not found"):
            service.upload_files(project_id, files)
    
    def test_upload_files_empty_filename(self, service, mock_project_repo, sample_project):
        """Test file upload with empty filename."""
        # Arrange
        project_id = 123
        mock_file = Mock()
        mock_file.filename = ""
        files = [mock_file]
        
        mock_project_repo.find_by_id.return_value = sample_project
        
        # Act & Assert
        with pytest.raises(ValueError, match="File has no name"):
            service.upload_files(project_id, files)
    
    def test_upload_files_duplicate_filename(self, service, mock_project_repo, 
                                           mock_supabase_client, sample_project, mock_file):
        """Test file upload with duplicate filename."""
        # Arrange
        project_id = 123
        files = [mock_file]
        
        mock_project_repo.find_by_id.return_value = sample_project
        existing_files = [{"name": "test_image.png"}]
        mock_supabase_client.storage.from_.return_value.list.return_value = existing_files
        
        # Act & Assert
        with pytest.raises(ValueError, match="File test_image.png already exists"):
            service.upload_files(project_id, files)
    
    def test_upload_multiple_files_success(self, service, mock_project_repo, 
                                         mock_supabase_client, sample_project):
        """Test uploading multiple files successfully."""
        # Arrange
        project_id = 123
        
        mock_files = []
        for i in range(3):
            mock_file = Mock()
            mock_file.filename = f"image_{i}.png"
            mock_file.content_type = "image/png"
            mock_file.read.return_value = f"data_{i}".encode()
            mock_files.append(mock_file)
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_supabase_client.storage.from_.return_value.list.return_value = []
        
        # Act
        service.upload_files(project_id, mock_files)
        
        # Assert
        assert mock_supabase_client.storage.from_.return_value.upload.call_count == 3


class TestCacheKeyGeneration(TestStorageService):
    """Test cache key generation functionality."""
    
    def test_generate_cache_key_basic(self, service):
        """Test basic cache key generation."""
        # Act
        key = service._generate_cache_key(123)
        
        # Assert
        assert key == "cluster_objects:proj:123"
    
    def test_generate_cache_key_with_clusters(self, service):
        """Test cache key generation with clusters."""
        # Act
        key = service._generate_cache_key(123, clusters=["cluster_a", "cluster_b"])
        
        # Assert
        assert "proj:123" in key
        assert "clusters:cluster_a,cluster_b" in key
    
    def test_generate_cache_key_with_tags(self, service):
        """Test cache key generation with tags."""
        # Act
        key = service._generate_cache_key(123, tags_list=["nature", "outdoor"])
        
        # Assert
        assert "proj:123" in key
        assert "tags:nature,outdoor" in key
    
    def test_generate_cache_key_with_all_params(self, service):
        """Test cache key generation with all parameters."""
        # Act
        key = service._generate_cache_key(
            123,
            clusters=["cluster_a"],
            tags_list=["nature"],
            label_names=["label1"],
            relocated_images=True,
            labels="test_label"
        )
        
        # Assert
        assert "proj:123" in key
        assert "clusters:cluster_a" in key
        assert "tags:nature" in key
        assert "labels:label1" in key
        assert "relocated:true" in key
        assert "name:test_label" in key


class TestUrlGeneration(TestStorageService):
    """Test URL generation functionality."""
    
    def test_generate_url_with_smart_retry_success(self, service, mock_supabase_client):
        """Test successful URL generation on first attempt."""
        # Arrange
        project_id = 123
        obj = {"name": "test_object", "id": 1}
        
        mock_supabase_client.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.com/signed-url"
        }
        
        # Act
        result = service._generate_url_with_smart_retry(project_id, obj)
        
        # Assert
        assert result["url"] == "https://example.com/signed-url"
        assert result["name"] == "test_object"
    
    def test_generate_url_with_retry_on_connection_error(self, service, mock_supabase_client):
        """Test URL generation with retry on connection error."""
        # Arrange
        project_id = 123
        obj = {"name": "test_object", "id": 1}
        
        # First call fails with connection error, second succeeds
        mock_supabase_client.storage.from_.return_value.create_signed_url.side_effect = [
            Exception("Connection timeout error"),
            {"signedURL": "https://example.com/signed-url"}
        ]
        
        # Act
        with patch('time.sleep'):  # Mock sleep to speed up test
            result = service._generate_url_with_smart_retry(project_id, obj)
        
        # Assert
        assert result["url"] == "https://example.com/signed-url"
        assert mock_supabase_client.storage.from_.return_value.create_signed_url.call_count == 2
    
    def test_generate_url_max_retries_exceeded(self, service, mock_supabase_client):
        """Test URL generation when max retries are exceeded."""
        # Arrange
        project_id = 123
        obj = {"name": "test_object", "id": 1}
        
        mock_supabase_client.storage.from_.return_value.create_signed_url.side_effect = \
            Exception("Connection error")
        
        # Act
        with patch('time.sleep'):  # Mock sleep to speed up test
            result = service._generate_url_with_smart_retry(project_id, obj, max_retries=1)
        
        # Assert
        assert result["url"] is None
        assert mock_supabase_client.storage.from_.return_value.create_signed_url.call_count == 2
    
    def test_generate_url_non_retryable_error(self, service, mock_supabase_client):
        """Test URL generation with non-retryable error."""
        # Arrange
        project_id = 123
        obj = {"name": "test_object", "id": 1}
        
        mock_supabase_client.storage.from_.return_value.create_signed_url.side_effect = \
            Exception("Permission denied")
        
        # Act
        result = service._generate_url_with_smart_retry(project_id, obj)
        
        # Assert
        # Note: Service doesn't set url key for non-retryable errors, it just returns the original object
        assert "url" not in result or result.get("url") is None
        # Should not retry for non-connection errors
        assert mock_supabase_client.storage.from_.return_value.create_signed_url.call_count == 1
    
    def test_generate_signed_urls_batch_small_batch(self, service, mock_supabase_client, sample_objects):
        """Test batch URL generation with small batch size."""
        # Arrange
        project_id = 123
        mock_supabase_client.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.com/signed-url"
        }
        
        # Act
        result = service.generate_signed_urls_batch(project_id, sample_objects[:1])
        
        # Assert
        assert len(result) == 1
        assert result[0]["url"] == "https://example.com/signed-url"
    
    def test_generate_signed_urls_batch_large_batch(self, service, mock_supabase_client):
        """Test batch URL generation with large batch size."""
        # Arrange
        project_id = 123
        large_batch = [{"name": f"object_{i}", "id": i} for i in range(20)]
        
        mock_supabase_client.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.com/signed-url"
        }
        
        # Act
        result = service.generate_signed_urls_batch(project_id, large_batch)
        
        # Assert
        assert len(result) == 20
        for obj in result:
            assert obj["url"] == "https://example.com/signed-url"
    
    def test_generate_urls_sequential_fallback(self, service, mock_supabase_client, sample_objects):
        """Test sequential fallback URL generation."""
        # Arrange
        project_id = 123
        mock_supabase_client.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.com/fallback-url"
        }
        
        # Act
        with patch('time.sleep'):  # Mock sleep to speed up test
            result = service._generate_urls_sequential_fallback(project_id, sample_objects)
        
        # Assert
        assert len(result) == 2
        for obj in result:
            assert obj["url"] == "https://example.com/fallback-url"


class TestGetObjectsWithFilters(TestStorageService):
    """Test get_objects_with_filters functionality."""
    
    def test_get_objects_cache_hit_valid(self, service, mock_cache_service):
        """Test getting objects when cache hit with valid expiration."""
        # Arrange
        project_id = 123
        future_time = (datetime.now() + timedelta(hours=2)).isoformat()
        cached_data = {
            "objects": [{"id": 1, "name": "cached_object"}],
            "expiration_seconds": 86400,
            "expires_at": future_time
        }
        mock_cache_service.get.return_value = json.dumps(cached_data)
        
        # Act
        result = service.get_objects_with_filters(project_id)
        
        # Assert
        assert result["cached"] is True
        assert result["data"] == cached_data["objects"]
        assert result["expiration_seconds"] == 86400
    
    def test_get_objects_cache_hit_expired(self, service, mock_cache_service, mock_object_repo,
                                         mock_supabase_client, sample_objects):
        """Test getting objects when cache hit but expired."""
        # Arrange
        project_id = 123
        past_time = (datetime.now() - timedelta(hours=1)).isoformat()
        cached_data = {
            "objects": [{"id": 1, "name": "expired_object"}],
            "expiration_seconds": 86400,
            "expires_at": past_time
        }
        mock_cache_service.get.return_value = json.dumps(cached_data)
        mock_object_repo.search_objects.return_value = sample_objects
        
        # Mock URL generation
        mock_supabase_client.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.com/new-url"
        }
        
        # Act
        result = service.get_objects_with_filters(project_id)
        
        # Assert
        assert result["cached"] is False
        mock_cache_service.delete.assert_called_once()
        mock_object_repo.search_objects.assert_called_once()
    
    def test_get_objects_cache_miss(self, service, mock_cache_service, mock_object_repo,
                                  mock_supabase_client, mock_config, sample_objects):
        """Test getting objects when cache miss occurs."""
        # Arrange
        project_id = 123
        mock_cache_service.get.return_value = None
        mock_object_repo.search_objects.return_value = sample_objects
        
        mock_supabase_client.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.com/signed-url"
        }
        
        # Act
        result = service.get_objects_with_filters(project_id)
        
        # Assert
        assert result["cached"] is False
        assert len(result["data"]) == 2
        
        # Verify cache was set
        mock_cache_service.set.assert_called_once()
        args = mock_cache_service.set.call_args
        assert args[0][2] == mock_config.CLUSTER_OBJECTS_CACHE_TTL
    
    def test_get_objects_with_cluster_filter(self, service, mock_cache_service, mock_cluster_repo,
                                           mock_object_repo, mock_supabase_client, sample_objects):
        """Test getting objects with cluster filter."""
        # Arrange
        project_id = 123
        clusters = ["cluster_a", "cluster_b"]
        
        mock_cache_service.get.return_value = None
        mock_cluster_repo.find_by_labels_and_project_batch.return_value = [
            {"id": 10, "label": "cluster_a"},
            {"id": 11, "label": "cluster_b"}
        ]
        mock_object_repo.search_objects.return_value = sample_objects
        
        mock_supabase_client.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.com/signed-url"
        }
        
        # Act
        result = service.get_objects_with_filters(project_id, clusters=clusters)
        
        # Assert
        mock_cluster_repo.find_by_labels_and_project_batch.assert_called_once_with(clusters, project_id)
        mock_object_repo.search_objects.assert_called_once()
        filters_arg = mock_object_repo.search_objects.call_args[0][0]
        assert "cluster_ids" in filters_arg
        assert set(filters_arg["cluster_ids"]) == {10, 11}
    
    def test_get_objects_cluster_not_found(self, service, mock_cache_service, mock_cluster_repo):
        """Test getting objects when cluster doesn't exist."""
        # Arrange
        project_id = 123
        clusters = ["nonexistent_cluster"]
        
        mock_cache_service.get.return_value = None
        mock_cluster_repo.find_by_labels_and_project_batch.return_value = []  # No clusters found
        
        # Act & Assert
        with pytest.raises(ValueError, match="Clusters not found: nonexistent_cluster"):
            service.get_objects_with_filters(project_id, clusters=clusters)
    
    def test_get_objects_with_multiple_filters(self, service, mock_cache_service, mock_cluster_repo,
                                             mock_object_repo, mock_supabase_client, sample_objects):
        """Test getting objects with multiple filters."""
        # Arrange
        project_id = 123
        clusters = ["cluster_a"]
        tags_list = ["nature", "outdoor"]
        label_names = ["label1"]
        labels = "specific_label"
        relocated_images = True
        
        mock_cache_service.get.return_value = None
        mock_cluster_repo.find_by_labels_and_project_batch.return_value = [
            {"id": 10, "label": "cluster_a"}
        ]
        mock_cluster_repo.find_by_label_names_and_project.return_value = [
            {"id": 12, "label": "label1_cluster"}
        ]
        mock_object_repo.search_objects.return_value = sample_objects
        
        mock_supabase_client.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.com/signed-url"
        }
        
        # Act
        result = service.get_objects_with_filters(
            project_id,
            clusters=clusters,
            tags_list=tags_list,
            label_names=label_names,
            labels=labels,
            relocated_images=relocated_images
        )
        
        # Assert
        mock_object_repo.search_objects.assert_called_once()
        filters_arg, relocated_arg = mock_object_repo.search_objects.call_args[0]
        
        assert "cluster_ids" in filters_arg
        assert set(filters_arg["cluster_ids"]) == {10, 12}
        assert filters_arg["tags"] == tags_list
        assert filters_arg["name"] == labels
        assert relocated_arg is True
    
    def test_get_objects_no_objects_found(self, service, mock_cache_service, mock_object_repo):
        """Test getting objects when no objects are found."""
        # Arrange
        project_id = 123
        mock_cache_service.get.return_value = None
        mock_object_repo.search_objects.return_value = []
        
        # Act & Assert
        with pytest.raises(ValueError, match="No objects found"):
            service.get_objects_with_filters(project_id)


class TestUpdateObject(TestStorageService):
    """Test update_object functionality."""
    
    @pytest.fixture
    def sample_object(self):
        """Sample object for update testing."""
        return {
            "id": 1,
            "name": "test_object",
            "cluster_id": 10,
            "tags": ["nature"],
            "project_id": 123
        }
    
    def test_update_object_tags_success(self, service, mock_project_repo, mock_object_repo,
                                      mock_cache_service, sample_project, sample_object):
        """Test successful object tag update."""
        # Arrange
        project_id = 123
        object_id = 1
        new_tags = ["nature", "outdoor", "landscape"]
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.find_by_id_in_project.return_value = sample_object
        
        # Act
        result = service.update_object(project_id, object_id, tags=new_tags)
        
        # Assert
        assert result["tags_updated"] is True
        mock_object_repo.update_object_tags.assert_called_once_with(object_id, new_tags)
        mock_cache_service.invalidate_all_cluster_caches.assert_called_once()
    
    def test_update_object_cluster_success(self, service, mock_project_repo, mock_object_repo,
                                         mock_cluster_repo, mock_cache_service, sample_project, sample_object):
        """Test successful object cluster update."""
        # Arrange
        project_id = 123
        object_id = 1
        new_cluster_name = "new_cluster"
        new_cluster = {"id": 20, "label": "new_cluster"}
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.find_by_id_in_project.return_value = sample_object
        mock_cluster_repo.find_by_label_and_project.return_value = new_cluster
        
        # Act
        result = service.update_object(project_id, object_id, new_cluster_name=new_cluster_name)
        
        # Assert
        assert result["cluster_updated"] is True
        mock_object_repo.update_object_cluster.assert_called_once_with(object_id, 20)
        mock_cache_service.invalidate_all_cluster_caches.assert_called_once()
    
    def test_update_object_both_tags_and_cluster(self, service, mock_project_repo, mock_object_repo,
                                               mock_cluster_repo, mock_cache_service, sample_project, sample_object):
        """Test updating both tags and cluster simultaneously."""
        # Arrange
        project_id = 123
        object_id = 1
        new_tags = ["updated", "tags"]
        new_cluster_name = "new_cluster"
        new_cluster = {"id": 20, "label": "new_cluster"}
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.find_by_id_in_project.return_value = sample_object
        mock_cluster_repo.find_by_label_and_project.return_value = new_cluster
        
        # Act
        result = service.update_object(project_id, object_id, tags=new_tags, new_cluster_name=new_cluster_name)
        
        # Assert
        assert result["tags_updated"] is True
        assert result["cluster_updated"] is True
        mock_object_repo.update_object_tags.assert_called_once_with(object_id, new_tags)
        mock_object_repo.update_object_cluster.assert_called_once_with(object_id, 20)
    
    def test_update_object_project_not_found(self, service, mock_project_repo):
        """Test object update when project doesn't exist."""
        # Arrange
        project_id = 999
        object_id = 1
        mock_project_repo.find_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="Project not found"):
            service.update_object(project_id, object_id, tags=["new_tag"])
    
    def test_update_object_not_found(self, service, mock_project_repo, mock_object_repo, sample_project):
        """Test object update when object doesn't exist."""
        # Arrange
        project_id = 123
        object_id = 999
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.find_by_id_in_project.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="Object not found"):
            service.update_object(project_id, object_id, tags=["new_tag"])
    
    def test_update_object_cluster_not_found(self, service, mock_project_repo, mock_object_repo,
                                           mock_cluster_repo, sample_project, sample_object):
        """Test object update when new cluster doesn't exist."""
        # Arrange
        project_id = 123
        object_id = 1
        new_cluster_name = "nonexistent_cluster"
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.find_by_id_in_project.return_value = sample_object
        mock_cluster_repo.find_by_label_and_project.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="New cluster not found"):
            service.update_object(project_id, object_id, new_cluster_name=new_cluster_name)


class TestBatchUpdateObjects(TestStorageService):
    """Test batch_update_objects functionality."""
    
    @pytest.fixture
    def sample_batch_objects(self):
        """Sample objects for batch update testing."""
        return [
            {"id": 1, "tags": ["nature"], "cluster_id": 10, "project_id": 123},
            {"id": 2, "tags": ["urban"], "cluster_id": 10, "project_id": 123},
            {"id": 3, "tags": [], "cluster_id": 11, "project_id": 123}
        ]
    
    def test_batch_update_add_tags_success(self, service, mock_project_repo, mock_object_repo,
                                         mock_cache_service, sample_project, sample_batch_objects):
        """Test successful batch tag addition."""
        # Arrange
        project_id = 123
        object_ids = [1, 2, 3]
        operations = {"add_tags": ["outdoor", "landscape"]}
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.find_by_id_in_project.side_effect = sample_batch_objects
        
        # Act
        result = service.batch_update_objects(project_id, object_ids, operations)
        
        # Assert
        assert result["updated_count"] == 3
        assert result["operation_type"] == "add_tags"
        assert result["tags_added"] == ["outdoor", "landscape"]
        assert result["object_ids"] == object_ids
        
        # Verify tags were updated for all objects
        assert mock_object_repo.update_object_tags.call_count == 3
        
        # Check that tags were merged correctly (order may vary due to set() usage)
        actual_calls = mock_object_repo.update_object_tags.call_args_list
        assert len(actual_calls) == 3
        
        # Verify each call has correct object_id and tag sets
        call_dict = {call[0][0]: set(call[0][1]) for call in actual_calls}
        assert call_dict[1] == {"nature", "outdoor", "landscape"}  # nature + new tags
        assert call_dict[2] == {"urban", "outdoor", "landscape"}   # urban + new tags
        assert call_dict[3] == {"outdoor", "landscape"}             # empty + new tags
        
        mock_cache_service.invalidate_all_cluster_caches.assert_called_once()
    
    def test_batch_update_new_cluster_success(self, service, mock_project_repo, mock_object_repo,
                                            mock_cluster_repo, mock_cache_service, sample_project, sample_batch_objects):
        """Test successful batch cluster update."""
        # Arrange
        project_id = 123
        object_ids = [1, 2, 3]
        operations = {"new_cluster": "target_cluster"}
        new_cluster = {"id": 50, "label": "target_cluster"}
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.find_by_id_in_project.side_effect = sample_batch_objects
        mock_cluster_repo.find_by_label_and_project.return_value = new_cluster
        
        # Act
        result = service.batch_update_objects(project_id, object_ids, operations)
        
        # Assert
        assert result["updated_count"] == 3
        assert result["operation_type"] == "new_cluster"
        assert result["new_cluster"] == "target_cluster"
        assert result["object_ids"] == object_ids
        
        # Verify cluster was updated for all objects
        assert mock_object_repo.update_object_cluster.call_count == 3
        for call_args in mock_object_repo.update_object_cluster.call_args_list:
            assert call_args[0][1] == 50  # All objects moved to cluster ID 50
        
        mock_cache_service.invalidate_all_cluster_caches.assert_called_once()
    
    def test_batch_update_project_not_found(self, service, mock_project_repo):
        """Test batch update when project doesn't exist."""
        # Arrange
        project_id = 999
        object_ids = [1, 2]
        operations = {"add_tags": ["test"]}
        
        mock_project_repo.find_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="Project not found"):
            service.batch_update_objects(project_id, object_ids, operations)
    
    def test_batch_update_empty_object_ids(self, service, mock_project_repo, sample_project):
        """Test batch update with empty object IDs list."""
        # Arrange
        project_id = 123
        object_ids = []
        operations = {"add_tags": ["test"]}
        
        mock_project_repo.find_by_id.return_value = sample_project
        
        # Act & Assert
        with pytest.raises(ValueError, match="No object IDs provided"):
            service.batch_update_objects(project_id, object_ids, operations)
    
    def test_batch_update_empty_operations(self, service, mock_project_repo, sample_project):
        """Test batch update with empty operations."""
        # Arrange
        project_id = 123
        object_ids = [1, 2]
        operations = {}
        
        mock_project_repo.find_by_id.return_value = sample_project
        
        # Act & Assert
        with pytest.raises(ValueError, match="No operations provided"):
            service.batch_update_objects(project_id, object_ids, operations)
    
    def test_batch_update_multiple_operations(self, service, mock_project_repo, sample_project):
        """Test batch update with multiple operation types."""
        # Arrange
        project_id = 123
        object_ids = [1, 2]
        operations = {"add_tags": ["test"], "new_cluster": "cluster"}
        
        mock_project_repo.find_by_id.return_value = sample_project
        
        # Act & Assert
        with pytest.raises(ValueError, match="Exactly one operation type must be provided"):
            service.batch_update_objects(project_id, object_ids, operations)
    
    def test_batch_update_object_not_found(self, service, mock_project_repo, mock_object_repo, sample_project):
        """Test batch update when one object doesn't exist."""
        # Arrange
        project_id = 123
        object_ids = [1, 999]  # 999 doesn't exist
        operations = {"add_tags": ["test"]}
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.find_by_id_in_project.side_effect = [
            {"id": 1, "tags": []}, None  # Second object not found
        ]
        
        # Act & Assert
        with pytest.raises(ValueError, match="Object 999 not found in project 123"):
            service.batch_update_objects(project_id, object_ids, operations)
    
    def test_batch_update_invalid_add_tags(self, service, mock_project_repo, mock_object_repo, 
                                         sample_project, sample_batch_objects):
        """Test batch update with invalid add_tags parameter."""
        # Arrange
        project_id = 123
        object_ids = [1]
        operations = {"add_tags": "not_a_list"}  # Should be a list
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.find_by_id_in_project.return_value = sample_batch_objects[0]
        
        # Act & Assert
        with pytest.raises(ValueError, match="add_tags must be a list"):
            service.batch_update_objects(project_id, object_ids, operations)
    
    def test_batch_update_empty_add_tags(self, service, mock_project_repo, mock_object_repo, 
                                       sample_project, sample_batch_objects):
        """Test batch update with empty add_tags list."""
        # Arrange
        project_id = 123
        object_ids = [1]
        operations = {"add_tags": []}
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.find_by_id_in_project.return_value = sample_batch_objects[0]
        
        # Act & Assert
        with pytest.raises(ValueError, match="add_tags cannot be empty"):
            service.batch_update_objects(project_id, object_ids, operations)
    
    def test_batch_update_invalid_new_cluster(self, service, mock_project_repo, mock_object_repo, 
                                            sample_project, sample_batch_objects):
        """Test batch update with invalid new_cluster parameter."""
        # Arrange
        project_id = 123
        object_ids = [1]
        operations = {"new_cluster": 123}  # Should be a string
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.find_by_id_in_project.return_value = sample_batch_objects[0]
        
        # Act & Assert
        with pytest.raises(ValueError, match="new_cluster must be a string"):
            service.batch_update_objects(project_id, object_ids, operations)
    
    def test_batch_update_empty_new_cluster(self, service, mock_project_repo, mock_object_repo, 
                                          sample_project, sample_batch_objects):
        """Test batch update with empty new_cluster name."""
        # Arrange
        project_id = 123
        object_ids = [1]
        operations = {"new_cluster": "   "}  # Empty after strip
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.find_by_id_in_project.return_value = sample_batch_objects[0]
        
        # Act & Assert
        with pytest.raises(ValueError, match="new_cluster cannot be empty"):
            service.batch_update_objects(project_id, object_ids, operations)
    
    def test_batch_update_cluster_not_found(self, service, mock_project_repo, mock_object_repo, 
                                          mock_cluster_repo, sample_project, sample_batch_objects):
        """Test batch update when target cluster doesn't exist."""
        # Arrange
        project_id = 123
        object_ids = [1]
        operations = {"new_cluster": "nonexistent_cluster"}
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.find_by_id_in_project.return_value = sample_batch_objects[0]
        mock_cluster_repo.find_by_label_and_project.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="Cluster 'nonexistent_cluster' not found in project"):
            service.batch_update_objects(project_id, object_ids, operations)


class TestResetProject(TestStorageService):
    """Test reset_project functionality."""
    
    def test_reset_project_success(self, service, mock_project_repo, mock_object_repo,
                                 mock_cache_service, sample_project):
        """Test successful project reset."""
        # Arrange
        project_id = 123
        reset_result = {"objects_reset": 15, "clusters_affected": 3}
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_object_repo.reset_objects_in_project.return_value = reset_result
        
        # Act
        result = service.reset_project(project_id)
        
        # Assert
        assert result["message"] == "Project reset successfully"
        assert result["data"] == reset_result
        
        mock_project_repo.find_by_id.assert_called_once_with(project_id)
        mock_object_repo.reset_objects_in_project.assert_called_once_with(project_id)
        mock_cache_service.invalidate_all_cluster_caches.assert_called_once()
    
    def test_reset_project_not_found(self, service, mock_project_repo):
        """Test project reset when project doesn't exist."""
        # Arrange
        project_id = 999
        mock_project_repo.find_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="Project not found"):
            service.reset_project(project_id)


class TestEdgeCases(TestStorageService):
    """Test edge cases and error scenarios."""
    
    @pytest.mark.parametrize("project_id,expected_bucket_name", [
        (123, "123"),
        (0, "0"),
        (-1, "-1"),
    ])
    def test_upload_files_edge_case_project_ids(self, service, mock_project_repo, 
                                              mock_supabase_client, project_id, expected_bucket_name):
        """Test file upload with edge case project IDs."""
        # Arrange
        sample_project = {"id": project_id, "name": "Test"}
        mock_file = Mock()
        mock_file.filename = "test.png"
        mock_file.content_type = "image/png"
        mock_file.read.return_value = b"data"
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_supabase_client.storage.from_.return_value.list.return_value = []
        
        # Act
        service.upload_files(project_id, [mock_file])
        
        # Assert
        mock_supabase_client.storage.from_.assert_called_with(expected_bucket_name)
    
    def test_cache_key_sorting_consistency(self, service):
        """Test that cache key generation is consistent with sorting."""
        # Act
        key1 = service._generate_cache_key(123, clusters=["b", "a"], tags_list=["z", "y"])
        key2 = service._generate_cache_key(123, clusters=["a", "b"], tags_list=["y", "z"])
        
        # Assert - Keys should be identical due to sorting
        assert key1 == key2
    
    def test_url_generation_with_special_characters(self, service, mock_supabase_client):
        """Test URL generation with special characters in object names."""
        # Arrange
        project_id = 123
        obj = {"name": "object with spaces & symbols", "id": 1}
        
        mock_supabase_client.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.com/encoded-url"
        }
        
        # Act
        result = service._generate_url_with_smart_retry(project_id, obj)
        
        # Assert
        assert result["url"] == "https://example.com/encoded-url"
        # Verify the correct path was used (name + .png)
        mock_supabase_client.storage.from_.return_value.create_signed_url.assert_called_with(
            "object with spaces & symbols.png", 24 * 60 * 60
        )


@pytest.mark.integration
class TestStorageServiceIntegration(TestStorageService):
    """Integration-style tests for StorageService workflows."""
    
    def test_complete_file_management_workflow(self, service, mock_project_repo, 
                                             mock_supabase_client, mock_cache_service, 
                                             mock_object_repo, sample_project):
        """Test complete file management lifecycle: upload → get → update → reset."""
        # Arrange
        project_id = 123
        mock_project_repo.find_by_id.return_value = sample_project
        
        # Upload setup
        mock_file = Mock()
        mock_file.filename = "lifecycle_test.png"
        mock_file.content_type = "image/png"
        mock_file.read.return_value = b"test_data"
        mock_supabase_client.storage.from_.return_value.list.return_value = []
        
        # Get objects setup
        mock_cache_service.get.return_value = None
        mock_object_repo.search_objects.return_value = [
            {"id": 1, "name": "lifecycle_test", "tags": ["uploaded"]}
        ]
        mock_supabase_client.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.com/lifecycle-url"
        }
        
        # Update setup
        updated_object = {"id": 1, "name": "lifecycle_test", "tags": ["uploaded", "processed"]}
        mock_object_repo.find_by_id_in_project.return_value = updated_object
        
        # Reset setup
        mock_object_repo.reset_objects_in_project.return_value = {"objects_reset": 1}
        
        # Act - Execute complete workflow
        
        # 1. Upload file
        service.upload_files(project_id, [mock_file])
        
        # 2. Get objects
        get_result = service.get_objects_with_filters(project_id)
        
        # 3. Update object tags
        update_result = service.update_object(project_id, 1, tags=["uploaded", "processed"])
        
        # 4. Reset project
        reset_result = service.reset_project(project_id)
        
        # Assert - Verify all operations completed successfully
        assert get_result["cached"] is False
        assert len(get_result["data"]) == 1
        assert update_result["tags_updated"] is True
        assert reset_result["message"] == "Project reset successfully"
        
        # Verify cache invalidation was called multiple times
        assert mock_cache_service.invalidate_all_cluster_caches.call_count >= 2
    
    def test_concurrent_url_generation_with_mixed_results(self, service, mock_supabase_client):
        """Test concurrent URL generation with some successes and failures."""
        # Arrange
        project_id = 123
        objects = [
            {"name": f"object_{i}", "id": i} for i in range(6)
        ]
        
        # Mock mixed results - some succeed, some fail
        def mock_create_signed_url(path, ttl):
            if "object_1" in path or "object_3" in path:
                raise Exception("Connection error")
            return {"signedURL": f"https://example.com/{path}"}
        
        mock_supabase_client.storage.from_.return_value.create_signed_url.side_effect = mock_create_signed_url
        
        # Act
        with patch('time.sleep'):  # Mock sleep to speed up test
            result = service.generate_signed_urls_batch(project_id, objects)
        
        # Assert
        assert len(result) == 6
        
        # Check that some have URLs and some don't
        successful_urls = [obj for obj in result if obj.get("url") is not None]
        failed_urls = [obj for obj in result if obj.get("url") is None]
        
        assert len(successful_urls) == 4  # objects 0, 2, 4, 5
        assert len(failed_urls) == 2     # objects 1, 3
    
    def test_complex_filtering_and_caching_workflow(self, service, mock_cache_service, 
                                                  mock_cluster_repo, mock_object_repo, 
                                                  mock_supabase_client, mock_config):
        """Test complex filtering with cache interactions."""
        # Arrange
        project_id = 123
        
        # First call with cluster filter - cache miss
        mock_cache_service.get.return_value = None
        mock_cluster_repo.find_by_labels_and_project_batch.return_value = [
            {"id": 10, "label": "cluster_a"}
        ]
        mock_object_repo.search_objects.return_value = [
            {"id": 1, "name": "filtered_object", "tags": ["nature"]}
        ]
        mock_supabase_client.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.com/filtered-url"
        }
        
        # Second call with different filter - different cache key
        different_clusters = [{"id": 11, "label": "cluster_b"}]
        different_objects = [{"id": 2, "name": "different_object", "tags": ["urban"]}]
        
        # Act
        # First filtered call
        result1 = service.get_objects_with_filters(project_id, clusters=["cluster_a"])
        
        # Setup for second call
        mock_cluster_repo.find_by_labels_and_project_batch.return_value = different_clusters
        mock_object_repo.search_objects.return_value = different_objects
        
        # Second filtered call with different parameters
        result2 = service.get_objects_with_filters(project_id, clusters=["cluster_b"])
        
        # Assert
        assert result1["cached"] is False
        assert result2["cached"] is False
        assert len(result1["data"]) == 1
        assert len(result2["data"]) == 1
        assert result1["data"][0]["name"] == "filtered_object"
        assert result2["data"][0]["name"] == "different_object"
        
        # Verify cache was set twice (different cache keys)
        assert mock_cache_service.set.call_count == 2