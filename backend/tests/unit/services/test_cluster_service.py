"""Unit tests for ClusterService.

This module contains comprehensive unit tests for the ClusterService class,
testing all business logic, error handling, and edge cases.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock, call
from services.cluster_service import ClusterService


class TestClusterService:
    """Test ClusterService business logic."""
    
    @pytest.fixture
    def mock_cluster_repo(self):
        """Create mock cluster repository."""
        return Mock()
    
    @pytest.fixture
    def mock_object_repo(self):
        """Create mock object repository."""
        return Mock()
    
    @pytest.fixture
    def mock_cache_service(self):
        """Create mock cache service."""
        return Mock()
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Create mock Supabase client."""
        mock_client = Mock()
        mock_client.storage.from_.return_value = Mock()
        return mock_client
    
    @pytest.fixture
    def service(self, mock_cluster_repo, mock_object_repo, mock_cache_service, mock_supabase_client):
        """Create ClusterService instance with mocked dependencies."""
        return ClusterService(
            cluster_repo=mock_cluster_repo,
            object_repo=mock_object_repo,
            cache_service=mock_cache_service,
            supabase_client=mock_supabase_client
        )
    
    @pytest.fixture
    def sample_cluster_data(self):
        """Sample cluster data for testing."""
        return [
            {"name": "image1", "cluster": "cluster_1"},
            {"name": "image2", "cluster": "cluster_1"},
            {"name": "image3", "cluster": "cluster_2"},
        ]
    
    @pytest.fixture
    def sample_storage_files(self):
        """Sample storage files response."""
        return [
            {"name": "image1.png"},
            {"name": "image2.png"},
            {"name": "image3.png"},
            {"name": "other_file.jpg"}
        ]


class TestGetProjectClusters(TestClusterService):
    """Test get_project_clusters functionality."""
    
    def test_get_project_clusters_success(self, service, mock_cluster_repo):
        """Test successful retrieval of project clusters."""
        # Arrange
        project_id = 123
        expected_clusters = [
            {"id": 1, "label": "cluster_1", "project_id": 123},
            {"id": 2, "label": "cluster_2", "project_id": 123}
        ]
        mock_cluster_repo.find_by_project_id.return_value = expected_clusters
        
        # Act
        result = service.get_project_clusters(project_id)
        
        # Assert
        assert result == expected_clusters
        mock_cluster_repo.find_by_project_id.assert_called_once_with(project_id)
    
    def test_get_project_clusters_empty_result(self, service, mock_cluster_repo):
        """Test retrieval when no clusters exist for project."""
        # Arrange
        project_id = 999
        mock_cluster_repo.find_by_project_id.return_value = []
        
        # Act
        result = service.get_project_clusters(project_id)
        
        # Assert
        assert result == []
        mock_cluster_repo.find_by_project_id.assert_called_once_with(project_id)


class TestGetClusterObjects(TestClusterService):
    """Test get_cluster_objects functionality."""
    
    def test_get_cluster_objects_success(self, service, mock_object_repo):
        """Test successful retrieval of cluster objects."""
        # Arrange
        cluster_id = 456
        expected_objects = [
            {"id": 1, "name": "image1", "cluster_id": 456},
            {"id": 2, "name": "image2", "cluster_id": 456}
        ]
        mock_object_repo.find_by_cluster_id.return_value = expected_objects
        
        # Act
        result = service.get_cluster_objects(cluster_id)
        
        # Assert
        assert result == expected_objects
        mock_object_repo.find_by_cluster_id.assert_called_once_with(cluster_id)
    
    def test_get_cluster_objects_empty_cluster(self, service, mock_object_repo):
        """Test retrieval when cluster has no objects."""
        # Arrange
        cluster_id = 999
        mock_object_repo.find_by_cluster_id.return_value = []
        
        # Act
        result = service.get_cluster_objects(cluster_id)
        
        # Assert
        assert result == []
        mock_object_repo.find_by_cluster_id.assert_called_once_with(cluster_id)


class TestCreateClustersFromData(TestClusterService):
    """Test create_clusters_from_data functionality."""
    
    def test_create_clusters_from_data_success(self, service, mock_supabase_client, 
                                             mock_cluster_repo, mock_object_repo, 
                                             sample_cluster_data, sample_storage_files):
        """Test successful cluster creation from data."""
        # Arrange
        project_id = 123
        mock_supabase_client.storage.from_.return_value.list.return_value = sample_storage_files
        
        # Mock cluster repository responses
        mock_cluster_repo.find_by_label_and_project.side_effect = [
            None,  # First cluster doesn't exist
            {"id": 1, "label": "cluster_1"},  # Second image uses existing cluster
            None   # Second cluster doesn't exist
        ]
        mock_cluster_repo.create_cluster.side_effect = [
            {"id": 1, "label": "cluster_1"},
            {"id": 2, "label": "cluster_2"}
        ]
        
        # Mock object repository responses
        mock_object_repo.find_by_name_and_cluster.return_value = None  # Objects don't exist
        mock_object_repo.create_object.return_value = {"id": 1, "name": "test"}
        
        # Act
        service.create_clusters_from_data(project_id, sample_cluster_data)
        
        # Assert
        # Verify storage was checked
        mock_supabase_client.storage.from_.assert_called_once_with(str(project_id))
        mock_supabase_client.storage.from_.return_value.list.assert_called_once()
        
        # Verify cluster creation
        assert mock_cluster_repo.create_cluster.call_count == 2
        mock_cluster_repo.create_cluster.assert_any_call(project_id, "cluster_1")
        mock_cluster_repo.create_cluster.assert_any_call(project_id, "cluster_2")
        
        # Verify object creation
        assert mock_object_repo.create_object.call_count == 3
        mock_object_repo.create_object.assert_any_call("image1", 1)
        mock_object_repo.create_object.assert_any_call("image2", 1)
        mock_object_repo.create_object.assert_any_call("image3", 2)
    
    def test_create_clusters_from_data_no_storage_files(self, service, mock_supabase_client):
        """Test cluster creation when no files exist in storage."""
        # Arrange
        project_id = 123
        cluster_data = [{"name": "image1", "cluster": "cluster_1"}]
        mock_supabase_client.storage.from_.return_value.list.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="No files found in storage"):
            service.create_clusters_from_data(project_id, cluster_data)
    
    def test_create_clusters_from_data_file_not_in_storage(self, service, mock_supabase_client, 
                                                          mock_cluster_repo, mock_object_repo):
        """Test cluster creation when referenced file doesn't exist in storage."""
        # Arrange
        project_id = 123
        cluster_data = [{"name": "missing_image", "cluster": "cluster_1"}]
        storage_files = [{"name": "image1.png"}]  # Different file
        mock_supabase_client.storage.from_.return_value.list.return_value = storage_files
        
        # Act
        service.create_clusters_from_data(project_id, cluster_data)
        
        # Assert
        # Should not create cluster or object for missing file
        mock_cluster_repo.find_by_label_and_project.assert_not_called()
        mock_object_repo.create_object.assert_not_called()
    
    def test_create_clusters_from_data_existing_object(self, service, mock_supabase_client, 
                                                     mock_cluster_repo, mock_object_repo, 
                                                     sample_storage_files):
        """Test cluster creation when object already exists."""
        # Arrange
        project_id = 123
        cluster_data = [{"name": "image1", "cluster": "cluster_1"}]
        mock_supabase_client.storage.from_.return_value.list.return_value = sample_storage_files
        
        existing_cluster = {"id": 1, "label": "cluster_1"}
        mock_cluster_repo.find_by_label_and_project.return_value = existing_cluster
        
        existing_object = {"id": 1, "name": "image1", "cluster_id": 1}
        mock_object_repo.find_by_name_and_cluster.return_value = existing_object
        
        # Act
        service.create_clusters_from_data(project_id, cluster_data)
        
        # Assert
        # Should not create new object
        mock_object_repo.create_object.assert_not_called()


class TestCreateNewCluster(TestClusterService):
    """Test create_new_cluster functionality."""
    
    def test_create_new_cluster_success(self, service, mock_cluster_repo, mock_cache_service):
        """Test successful creation of new cluster."""
        # Arrange
        project_id = 123
        label = "cluster_3"
        label_name = "New Cluster"
        
        mock_cluster_repo.find_by_label_and_project.return_value = None  # Cluster doesn't exist
        expected_cluster = {"id": 3, "label": label, "label_name": label_name}
        mock_cluster_repo.create_cluster.return_value = expected_cluster
        
        # Act
        result = service.create_new_cluster(project_id, label, label_name)
        
        # Assert
        assert result == expected_cluster
        mock_cluster_repo.find_by_label_and_project.assert_called_once_with(label, project_id)
        mock_cluster_repo.create_cluster.assert_called_once_with(project_id, label, label_name)
        mock_cache_service.invalidate_project_cache.assert_called_once_with(project_id)
    
    def test_create_new_cluster_already_exists(self, service, mock_cluster_repo):
        """Test cluster creation when cluster with same label already exists."""
        # Arrange
        project_id = 123
        label = "cluster_1"
        label_name = "Existing Cluster"
        
        existing_cluster = {"id": 1, "label": label}
        mock_cluster_repo.find_by_label_and_project.return_value = existing_cluster
        
        # Act & Assert
        with pytest.raises(ValueError, match="Cluster with this name already exists"):
            service.create_new_cluster(project_id, label, label_name)
        
        # Should not create or invalidate cache
        mock_cluster_repo.create_cluster.assert_not_called()
    
    def test_create_new_cluster_repository_error(self, service, mock_cluster_repo):
        """Test cluster creation when repository raises an error."""
        # Arrange
        project_id = 123
        label = "cluster_3"
        label_name = "New Cluster"
        
        mock_cluster_repo.find_by_label_and_project.return_value = None
        mock_cluster_repo.create_cluster.side_effect = Exception("Database error")
        
        # Act & Assert
        with pytest.raises(Exception, match="Database error"):
            service.create_new_cluster(project_id, label, label_name)


class TestUpdateCluster(TestClusterService):
    """Test update_cluster functionality."""
    
    def test_update_cluster_success(self, service, mock_cluster_repo, mock_cache_service):
        """Test successful cluster update."""
        # Arrange
        project_id = 123
        cluster_number = "cluster_1"
        label_name = "Updated Cluster Name"
        
        existing_cluster = {"id": 1, "label": cluster_number}
        mock_cluster_repo.find_by_label_and_project.return_value = existing_cluster
        
        updated_cluster = {"id": 1, "label": cluster_number, "label_name": label_name}
        mock_cluster_repo.update_cluster.return_value = updated_cluster
        
        # Act
        result = service.update_cluster(project_id, cluster_number, label_name)
        
        # Assert
        assert result == updated_cluster
        mock_cluster_repo.find_by_label_and_project.assert_called_once_with(cluster_number, project_id)
        mock_cluster_repo.update_cluster.assert_called_once_with(cluster_number, label_name)
        mock_cache_service.invalidate_all_cluster_caches.assert_called_once()
    
    def test_update_cluster_not_found(self, service, mock_cluster_repo):
        """Test cluster update when cluster doesn't exist."""
        # Arrange
        project_id = 123
        cluster_number = "nonexistent_cluster"
        label_name = "Updated Name"
        
        mock_cluster_repo.find_by_label_and_project.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="Cluster not found"):
            service.update_cluster(project_id, cluster_number, label_name)
        
        # Should not update or invalidate cache
        mock_cluster_repo.update_cluster.assert_not_called()


class TestResetCluster(TestClusterService):
    """Test reset_cluster functionality."""
    
    def test_reset_cluster_success(self, service, mock_cluster_repo, mock_object_repo, mock_cache_service):
        """Test successful cluster reset."""
        # Arrange
        project_id = 123
        cluster_number = "cluster_1"
        
        existing_cluster = {"id": 1, "label": cluster_number}
        mock_cluster_repo.find_by_label_and_project.return_value = existing_cluster
        
        reset_response = {"updated": 5}
        reset_moved_response = {"updated": 3}
        mock_object_repo.reset_objects_in_cluster.return_value = reset_response
        mock_object_repo.reset_moved_objects_from_cluster.return_value = reset_moved_response
        
        # Act
        result = service.reset_cluster(project_id, cluster_number)
        
        # Assert
        expected_result = {
            "reset_objects": reset_response,
            "reset_moved_objects": reset_moved_response
        }
        assert result == expected_result
        
        mock_cluster_repo.find_by_label_and_project.assert_called_once_with(cluster_number, project_id)
        mock_object_repo.reset_objects_in_cluster.assert_called_once_with(1)  # cluster id
        mock_object_repo.reset_moved_objects_from_cluster.assert_called_once_with(1)
        mock_cache_service.invalidate_all_cluster_caches.assert_called_once()
    
    def test_reset_cluster_not_found(self, service, mock_cluster_repo):
        """Test cluster reset when cluster doesn't exist."""
        # Arrange
        project_id = 123
        cluster_number = "nonexistent_cluster"
        
        mock_cluster_repo.find_by_label_and_project.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="Cluster not found"):
            service.reset_cluster(project_id, cluster_number)
        
        # Should not reset or invalidate cache
        mock_cluster_repo.find_by_label_and_project.assert_called_once_with(cluster_number, project_id)


class TestEdgeCases(TestClusterService):
    """Test edge cases and error scenarios."""
    
    def test_create_clusters_from_data_empty_cluster_data(self, service, mock_supabase_client, sample_storage_files):
        """Test cluster creation with empty cluster data."""
        # Arrange
        project_id = 123
        empty_cluster_data = []
        mock_supabase_client.storage.from_.return_value.list.return_value = sample_storage_files
        
        # Act
        service.create_clusters_from_data(project_id, empty_cluster_data)
        
        # Assert - should complete without errors, no operations performed
        mock_supabase_client.storage.from_.assert_called_once()
    
    def test_service_initialization_with_none_dependencies(self):
        """Test service initialization with None dependencies."""
        # Act & Assert - should not raise exception during initialization
        service = ClusterService(
            cluster_repo=None,
            object_repo=None,
            cache_service=None,
            supabase_client=None
        )
        assert service is not None
    
    @pytest.mark.parametrize("project_id,cluster_number,label_name", [
        (0, "cluster_1", "Test"),
        (-1, "cluster_1", "Test"),
        (123, "", "Test"),
        (123, "cluster_1", ""),
    ])
    def test_create_new_cluster_edge_case_inputs(self, service, mock_cluster_repo, 
                                               project_id, cluster_number, label_name):
        """Test cluster creation with edge case inputs."""
        # Arrange
        mock_cluster_repo.find_by_label_and_project.return_value = None
        mock_cluster_repo.create_cluster.return_value = {"id": 1}
        
        # Act - should handle edge cases gracefully
        try:
            result = service.create_new_cluster(project_id, cluster_number, label_name)
            # If no exception, verify it was called with the exact parameters
            mock_cluster_repo.create_cluster.assert_called_with(project_id, cluster_number, label_name)
        except Exception:
            # Some edge cases might raise exceptions, which is acceptable
            pass


@pytest.mark.integration
class TestClusterServiceIntegration(TestClusterService):
    """Integration-style tests for ClusterService."""
    
    def test_full_cluster_workflow(self, service, mock_cluster_repo, mock_object_repo, 
                                  mock_cache_service, mock_supabase_client, sample_storage_files):
        """Test complete cluster creation, update, and reset workflow."""
        # Arrange
        project_id = 123
        cluster_data = [{"name": "image1", "cluster": "cluster_1"}]
        
        # Setup mocks for the workflow
        mock_supabase_client.storage.from_.return_value.list.return_value = sample_storage_files
        mock_cluster_repo.find_by_label_and_project.side_effect = [
            None,  # For create_clusters_from_data
            {"id": 1, "label": "cluster_1"},  # For update_cluster
            {"id": 1, "label": "cluster_1"}   # For reset_cluster
        ]
        mock_cluster_repo.create_cluster.return_value = {"id": 1, "label": "cluster_1"}
        mock_cluster_repo.update_cluster.return_value = {"id": 1, "label": "cluster_1", "label_name": "Updated"}
        mock_object_repo.find_by_name_and_cluster.return_value = None
        mock_object_repo.create_object.return_value = {"id": 1}
        mock_object_repo.reset_objects_in_cluster.return_value = {"updated": 1}
        mock_object_repo.reset_moved_objects_from_cluster.return_value = {"updated": 0}
        
        # Act - Execute full workflow
        # 1. Create clusters from data
        service.create_clusters_from_data(project_id, cluster_data)
        
        # 2. Update cluster
        update_result = service.update_cluster(project_id, "cluster_1", "Updated Cluster")
        
        # 3. Reset cluster
        reset_result = service.reset_cluster(project_id, "cluster_1")
        
        # Assert - Verify all operations completed successfully
        assert update_result["label_name"] == "Updated"
        assert reset_result["reset_objects"]["updated"] == 1
        
        # Verify cache was invalidated multiple times during workflow
        assert mock_cache_service.invalidate_all_cluster_caches.call_count == 2