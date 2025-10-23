"""Unit tests for ProjectService.

This module contains comprehensive unit tests for the ProjectService class,
testing project CRUD operations, caching logic, statistics, and complex
cascade deletion workflows.
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock, call
from services.project_service import ProjectService


class TestProjectService:
    """Test ProjectService business logic."""
    
    @pytest.fixture
    def mock_project_repo(self):
        """Create mock project repository."""
        return Mock()
    
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
        mock_client.storage.create_bucket.return_value = {"message": "Bucket created"}
        mock_client.storage.empty_bucket.return_value = True
        mock_client.storage.delete_bucket.return_value = True
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = Mock(data=[])
        return mock_client
    
    @pytest.fixture
    def mock_config(self):
        """Create mock configuration."""
        config = Mock()
        config.USER_PROJECTS_CACHE_TTL = 1800
        config.PROJECT_CACHE_TTL = 3600
        config.CLUSTER_OBJECTS_CACHE_TTL = 82800
        return config
    
    @pytest.fixture
    def service(self, mock_project_repo, mock_cache_service, mock_supabase_client, 
                mock_config, mock_cluster_repo, mock_object_repo):
        """Create ProjectService instance with mocked dependencies."""
        return ProjectService(
            project_repo=mock_project_repo,
            cache_service=mock_cache_service,
            supabase_client=mock_supabase_client,
            config=mock_config,
            cluster_repo=mock_cluster_repo,
            object_repo=mock_object_repo
        )
    
    @pytest.fixture
    def service_minimal(self, mock_project_repo, mock_cache_service, 
                       mock_supabase_client, mock_config):
        """Create ProjectService instance with minimal dependencies."""
        return ProjectService(
            project_repo=mock_project_repo,
            cache_service=mock_cache_service,
            supabase_client=mock_supabase_client,
            config=mock_config,
            cluster_repo=None,
            object_repo=None
        )
    
    @pytest.fixture
    def sample_project(self):
        """Sample project data."""
        return {
            "id": 123,
            "name": "Test Project",
            "owner": 456,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    
    @pytest.fixture
    def sample_user_projects(self):
        """Sample user projects data."""
        return {
            "projects": [
                {"id": 1, "name": "Project 1", "owner": 456},
                {"id": 2, "name": "Project 2", "owner": 456}
            ],
            "count": 2
        }


class TestGetUserProjects(TestProjectService):
    """Test get_user_projects functionality."""
    
    def test_get_user_projects_cache_hit(self, service, mock_cache_service, 
                                       mock_project_repo, sample_user_projects):
        """Test getting user projects when data is cached."""
        # Arrange
        user_id = 456
        cache_key = f"user_projects:{user_id}"
        cached_data = {"projects": sample_user_projects["projects"], "count": 2}
        mock_cache_service.get.return_value = json.dumps(cached_data)
        
        # Act
        result = service.get_user_projects(user_id)
        
        # Assert
        assert result["data"] == sample_user_projects["projects"]
        assert result["count"] == 2
        assert result["cached"] is True
        mock_cache_service.get.assert_called_once_with(cache_key)
        mock_project_repo.find_by_user_id.assert_not_called()
    
    def test_get_user_projects_cache_miss(self, service, mock_cache_service, 
                                        mock_project_repo, mock_config, sample_user_projects):
        """Test getting user projects when cache miss occurs."""
        # Arrange
        user_id = 456
        cache_key = f"user_projects:{user_id}"
        mock_cache_service.get.return_value = None  # Cache miss
        mock_project_repo.find_by_user_id.return_value = sample_user_projects
        
        # Act
        result = service.get_user_projects(user_id)
        
        # Assert
        assert result["data"] == sample_user_projects["projects"]
        assert result["count"] == 2
        assert result["cached"] is False
        
        # Verify cache operations
        mock_cache_service.get.assert_called_once_with(cache_key)
        mock_project_repo.find_by_user_id.assert_called_once_with(user_id)
        
        # Verify cache was set
        expected_cache_data = json.dumps({
            "projects": sample_user_projects["projects"],
            "count": sample_user_projects["count"]
        })
        mock_cache_service.set.assert_called_once_with(
            cache_key, expected_cache_data, mock_config.USER_PROJECTS_CACHE_TTL
        )
    
    def test_get_user_projects_empty_result(self, service, mock_cache_service, 
                                          mock_project_repo, mock_config):
        """Test getting user projects when user has no projects."""
        # Arrange
        user_id = 999
        empty_result = {"projects": [], "count": 0}
        mock_cache_service.get.return_value = None
        mock_project_repo.find_by_user_id.return_value = empty_result
        
        # Act
        result = service.get_user_projects(user_id)
        
        # Assert
        assert result["data"] == []
        assert result["count"] == 0
        assert result["cached"] is False


class TestGetProjectById(TestProjectService):
    """Test get_project_by_id functionality."""
    
    def test_get_project_by_id_cache_hit(self, service, mock_cache_service, 
                                       mock_project_repo, sample_project):
        """Test getting project by ID when data is cached."""
        # Arrange
        project_id = 123
        cache_key = f"project:{project_id}"
        mock_cache_service.get.return_value = json.dumps(sample_project)
        
        # Act
        result = service.get_project_by_id(project_id)
        
        # Assert
        assert result["data"] == sample_project
        assert result["cached"] is True
        mock_cache_service.get.assert_called_once_with(cache_key)
        mock_project_repo.find_by_id.assert_not_called()
    
    def test_get_project_by_id_cache_miss(self, service, mock_cache_service, 
                                        mock_project_repo, mock_config, sample_project):
        """Test getting project by ID when cache miss occurs."""
        # Arrange
        project_id = 123
        cache_key = f"project:{project_id}"
        mock_cache_service.get.return_value = None
        mock_project_repo.find_by_id.return_value = sample_project
        
        # Act
        result = service.get_project_by_id(project_id)
        
        # Assert
        assert result["data"] == sample_project
        assert result["cached"] is False
        
        # Verify cache operations
        mock_cache_service.get.assert_called_once_with(cache_key)
        mock_project_repo.find_by_id.assert_called_once_with(project_id)
        mock_cache_service.set.assert_called_once_with(
            cache_key, json.dumps(sample_project), mock_config.PROJECT_CACHE_TTL
        )
    
    def test_get_project_by_id_not_found(self, service, mock_cache_service, mock_project_repo):
        """Test getting project by ID when project doesn't exist."""
        # Arrange
        project_id = 999
        mock_cache_service.get.return_value = None
        mock_project_repo.find_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="Project not found"):
            service.get_project_by_id(project_id)
        
        # Verify no cache was set for non-existent project
        mock_cache_service.set.assert_not_called()


class TestGetProjectWithStatistics(TestProjectService):
    """Test get_project_with_statistics functionality."""
    
    def test_get_project_with_statistics_success(self, service, mock_cache_service, 
                                               mock_project_repo, mock_cluster_repo, 
                                               mock_object_repo, sample_project, mock_config):
        """Test getting project with statistics successfully."""
        # Arrange
        project_id = 123
        mock_cache_service.get.return_value = None
        mock_project_repo.find_by_id.return_value = sample_project
        
        cluster_stats = [{"cluster": "A", "count": 5}, {"cluster": "B", "count": 3}]
        tag_stats = [{"tag": "nature", "count": 8}, {"tag": "urban", "count": 2}]
        
        mock_cluster_repo.get_cluster_statistics.return_value = cluster_stats
        mock_object_repo.get_tag_statistics.return_value = tag_stats
        
        # Act
        result = service.get_project_with_statistics(project_id)
        
        # Assert
        assert result["data"] == sample_project
        assert result["statistics"]["clusters"] == cluster_stats
        assert result["statistics"]["tags"] == tag_stats
        assert result["cached"] is False
        
        # Verify statistics were fetched
        mock_cluster_repo.get_cluster_statistics.assert_called_once_with(project_id)
        mock_object_repo.get_tag_statistics.assert_called_once_with(project_id)
    
    def test_get_project_with_statistics_minimal_service(self, service_minimal, mock_cache_service, 
                                                       mock_project_repo, sample_project):
        """Test getting project with statistics when cluster/object repos are None."""
        # Arrange
        project_id = 123
        mock_cache_service.get.return_value = None
        mock_project_repo.find_by_id.return_value = sample_project
        
        # Act
        result = service_minimal.get_project_with_statistics(project_id)
        
        # Assert
        assert result["data"] == sample_project
        assert result["statistics"]["clusters"] == []
        assert result["statistics"]["tags"] == []
    
    def test_get_project_with_statistics_repo_errors(self, service, mock_cache_service, 
                                                   mock_project_repo, mock_cluster_repo, 
                                                   mock_object_repo, sample_project, mock_config):
        """Test getting project with statistics when repositories raise errors."""
        # Arrange
        project_id = 123
        mock_cache_service.get.return_value = None
        mock_project_repo.find_by_id.return_value = sample_project
        
        mock_cluster_repo.get_cluster_statistics.side_effect = Exception("Cluster error")
        mock_object_repo.get_tag_statistics.side_effect = Exception("Tag error")
        
        # Act
        result = service.get_project_with_statistics(project_id)
        
        # Assert - Should still return project data with empty statistics
        assert result["data"] == sample_project
        assert result["statistics"]["clusters"] == []
        assert result["statistics"]["tags"] == []


class TestCreateProject(TestProjectService):
    """Test create_project functionality."""
    
    def test_create_project_success(self, service, mock_project_repo, mock_supabase_client, 
                                  mock_cache_service, sample_project):
        """Test successful project creation."""
        # Arrange
        user_id = 456
        project_name = "New Project"
        
        mock_project_repo.find_by_name_and_owner.return_value = None  # No existing project
        mock_project_repo.create_project.return_value = sample_project
        
        bucket_response = {"message": "Bucket created successfully"}
        mock_supabase_client.storage.create_bucket.return_value = bucket_response
        
        # Act
        result = service.create_project(user_id, project_name)
        
        # Assert
        assert result["project"] == sample_project
        assert result["bucket"] == bucket_response
        
        # Verify operations
        mock_project_repo.find_by_name_and_owner.assert_called_once_with(project_name, user_id)
        mock_project_repo.create_project.assert_called_once_with(user_id, project_name)
        
        # Verify bucket creation
        mock_supabase_client.storage.create_bucket.assert_called_once_with(
            str(sample_project["id"]),
            options={
                "public": False,
                "allowed_mime_types": ["image/png"],
                "file_size_limit": 5 * 1024 * 1024,
            }
        )
        
        # Verify cache invalidation
        mock_cache_service.invalidate_project_cache.assert_called_once_with(
            sample_project["id"], user_id
        )
    
    def test_create_project_name_already_exists(self, service, mock_project_repo, sample_project):
        """Test project creation when name already exists for user."""
        # Arrange
        user_id = 456
        project_name = "Existing Project"
        mock_project_repo.find_by_name_and_owner.return_value = sample_project
        
        # Act & Assert
        with pytest.raises(ValueError, match="Project name already exists"):
            service.create_project(user_id, project_name)
        
        # Should not create project or bucket
        mock_project_repo.create_project.assert_not_called()
    
    def test_create_project_bucket_creation_fails(self, service, mock_project_repo, 
                                                mock_supabase_client, sample_project):
        """Test project creation when bucket creation fails."""
        # Arrange
        user_id = 456
        project_name = "New Project"
        
        mock_project_repo.find_by_name_and_owner.return_value = None
        mock_project_repo.create_project.return_value = sample_project
        mock_supabase_client.storage.create_bucket.side_effect = Exception("Bucket error")
        
        # Act & Assert
        with pytest.raises(Exception, match="Bucket error"):
            service.create_project(user_id, project_name)


class TestUpdateProject(TestProjectService):
    """Test update_project functionality."""
    
    def test_update_project_success(self, service, mock_project_repo, mock_cache_service, sample_project):
        """Test successful project update."""
        # Arrange
        project_id = 123
        new_name = "Updated Project Name"
        updated_project = {**sample_project, "name": new_name}
        mock_project_repo.update_project.return_value = updated_project
        
        # Act
        result = service.update_project(project_id, new_name)
        
        # Assert
        assert result == updated_project
        mock_project_repo.update_project.assert_called_once_with(project_id, new_name)
        mock_cache_service.invalidate_project_cache.assert_called_once_with(project_id)
    
    def test_update_project_repository_error(self, service, mock_project_repo):
        """Test project update when repository raises error."""
        # Arrange
        project_id = 123
        new_name = "Updated Name"
        mock_project_repo.update_project.side_effect = Exception("Update failed")
        
        # Act & Assert
        with pytest.raises(Exception, match="Update failed"):
            service.update_project(project_id, new_name)


class TestDeleteProject(TestProjectService):
    """Test delete_project functionality."""
    
    @pytest.fixture
    def sample_clusters(self):
        """Sample clusters for deletion testing."""
        return [
            {"id": 1, "name": "Cluster A", "project_id": 123},
            {"id": 2, "name": "Cluster B", "project_id": 123}
        ]
    
    def test_delete_project_full_cascade_success(self, service, mock_project_repo, 
                                               mock_cluster_repo, mock_object_repo, 
                                               mock_supabase_client, mock_cache_service, 
                                               sample_project, sample_clusters):
        """Test successful project deletion with full cascade."""
        # Arrange
        project_id = 123
        user_id = 456
        
        mock_project_repo.find_by_id.return_value = sample_project
        mock_cluster_repo.find_by_project_id.return_value = {"clusters": sample_clusters}
        
        # Mock object deletion
        mock_object_repo.delete_by_cluster_id.side_effect = [
            [{"id": 1}, {"id": 2}],  # 2 objects in cluster 1
            [{"id": 3}]              # 1 object in cluster 2
        ]
        
        # Mock cluster deletion
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = Mock(
            data=[{"id": 1}, {"id": 2}]  # 2 clusters deleted
        )
        
        # Act
        service.delete_project(project_id)
        
        # Assert
        # Verify project lookup
        mock_project_repo.find_by_id.assert_called_with(project_id)
        
        # Verify cascade deletion
        mock_cluster_repo.find_by_project_id.assert_called_once_with(project_id)
        assert mock_object_repo.delete_by_cluster_id.call_count == 2
        mock_object_repo.delete_by_cluster_id.assert_any_call(1)
        mock_object_repo.delete_by_cluster_id.assert_any_call(2)
        
        # Verify cluster deletion
        mock_supabase_client.table.assert_called_with("cluster")
        
        # Verify storage deletion
        mock_supabase_client.storage.empty_bucket.assert_called_once_with(str(project_id))
        mock_supabase_client.storage.delete_bucket.assert_called_once_with(str(project_id))
        
        # Verify project deletion
        mock_project_repo.delete_project.assert_called_once_with(project_id)
        
        # Verify cache invalidation
        mock_cache_service.invalidate_project_cache.assert_called_once_with(project_id, user_id)
    
    def test_delete_project_not_found(self, service, mock_project_repo):
        """Test project deletion when project doesn't exist."""
        # Arrange
        project_id = 999
        mock_project_repo.find_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="Project not found"):
            service.delete_project(project_id)
        
        # Should not perform any deletion operations
        mock_project_repo.delete_project.assert_not_called()
    
    def test_delete_project_minimal_service(self, service_minimal, mock_project_repo, 
                                          mock_supabase_client, mock_cache_service, sample_project):
        """Test project deletion with minimal service (no cluster/object repos)."""
        # Arrange
        project_id = 123
        mock_project_repo.find_by_id.return_value = sample_project
        
        # Act
        service_minimal.delete_project(project_id)
        
        # Assert
        # Should skip cascade deletion but still delete project and storage
        mock_supabase_client.storage.empty_bucket.assert_called_once_with(str(project_id))
        mock_supabase_client.storage.delete_bucket.assert_called_once_with(str(project_id))
        mock_project_repo.delete_project.assert_called_once_with(project_id)
        mock_cache_service.invalidate_project_cache.assert_called_once_with(
            project_id, sample_project["owner"]
        )
    
    def test_delete_project_cascade_errors_continue(self, service, mock_project_repo, 
                                                  mock_cluster_repo, mock_object_repo, 
                                                  mock_supabase_client, sample_project, sample_clusters):
        """Test project deletion continues even when cascade operations fail."""
        # Arrange
        project_id = 123
        mock_project_repo.find_by_id.return_value = sample_project
        mock_cluster_repo.find_by_project_id.return_value = {"clusters": sample_clusters}
        
        # Make cascade operations fail
        mock_object_repo.delete_by_cluster_id.side_effect = Exception("Object deletion failed")
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.side_effect = Exception("Cluster deletion failed")
        
        # Act - Should not raise exception
        service.delete_project(project_id)
        
        # Assert - Project should still be deleted despite cascade failures
        mock_project_repo.delete_project.assert_called_once_with(project_id)
    
    def test_delete_project_storage_errors_continue(self, service, mock_project_repo, 
                                                  mock_supabase_client, sample_project):
        """Test project deletion continues even when storage operations fail."""
        # Arrange
        project_id = 123
        mock_project_repo.find_by_id.return_value = sample_project
        
        # Make storage operations fail
        mock_supabase_client.storage.empty_bucket.side_effect = Exception("Empty bucket failed")
        mock_supabase_client.storage.delete_bucket.side_effect = Exception("Delete bucket failed")
        
        # Act - Should not raise exception
        service.delete_project(project_id)
        
        # Assert - Project should still be deleted despite storage failures
        mock_project_repo.delete_project.assert_called_once_with(project_id)
    
    def test_delete_project_final_deletion_fails(self, service, mock_project_repo, sample_project):
        """Test project deletion when final project deletion fails."""
        # Arrange
        project_id = 123
        mock_project_repo.find_by_id.return_value = sample_project
        mock_project_repo.delete_project.side_effect = Exception("Final deletion failed")
        
        # Act & Assert
        with pytest.raises(Exception, match="Final deletion failed"):
            service.delete_project(project_id)


class TestEdgeCases(TestProjectService):
    """Test edge cases and error scenarios."""
    
    def test_service_initialization_with_optional_repos(self, mock_project_repo, 
                                                       mock_cache_service, mock_supabase_client, mock_config):
        """Test service initialization with optional repositories as None."""
        service = ProjectService(
            project_repo=mock_project_repo,
            cache_service=mock_cache_service,
            supabase_client=mock_supabase_client,
            config=mock_config,
            cluster_repo=None,
            object_repo=None
        )
        
        assert service.cluster_repo is None
        assert service.object_repo is None
    
    @pytest.mark.parametrize("user_id,project_name", [
        (0, "Valid Project"),
        (123, ""),
        (-1, "Negative User Project"),
    ])
    def test_create_project_edge_case_inputs(self, service, mock_project_repo, 
                                           mock_supabase_client, user_id, project_name):
        """Test project creation with edge case inputs."""
        # Arrange
        mock_project_repo.find_by_name_and_owner.return_value = None
        sample_project = {"id": 1, "name": project_name, "owner": user_id}
        mock_project_repo.create_project.return_value = sample_project
        
        # Act
        result = service.create_project(user_id, project_name)
        
        # Assert
        assert result["project"]["owner"] == user_id
        assert result["project"]["name"] == project_name
    
    def test_cache_service_unavailable_operations(self, service, mock_cache_service, 
                                                mock_project_repo, sample_project):
        """Test operations when cache service is unavailable."""
        # Arrange - Cache operations return None/False
        mock_cache_service.get.return_value = None
        mock_cache_service.set.return_value = False
        mock_project_repo.find_by_id.return_value = sample_project
        
        # Act
        result = service.get_project_by_id(123)
        
        # Assert - Should still work, just not cached
        assert result["data"] == sample_project
        assert result["cached"] is False


@pytest.mark.integration
class TestProjectServiceIntegration(TestProjectService):
    """Integration-style tests for ProjectService workflows."""
    
    def test_complete_project_lifecycle(self, service, mock_project_repo, mock_supabase_client, 
                                      mock_cache_service, sample_project):
        """Test complete project lifecycle: create → get → update → delete."""
        # Arrange
        user_id = 456
        project_name = "Lifecycle Project"
        project_id = 123
        
        # Setup mocks for creation
        mock_project_repo.find_by_name_and_owner.return_value = None
        mock_project_repo.create_project.return_value = sample_project
        
        # Setup mocks for retrieval
        mock_cache_service.get.return_value = None
        mock_project_repo.find_by_id.return_value = sample_project
        
        # Setup mocks for update
        updated_project = {**sample_project, "name": "Updated Lifecycle Project"}
        mock_project_repo.update_project.return_value = updated_project
        
        # Act - Execute complete lifecycle
        
        # 1. Create project
        create_result = service.create_project(user_id, project_name)
        
        # 2. Get project
        get_result = service.get_project_by_id(project_id)
        
        # 3. Update project
        update_result = service.update_project(project_id, "Updated Lifecycle Project")
        
        # 4. Delete project
        service.delete_project(project_id)
        
        # Assert - Verify all operations completed
        assert create_result["project"] == sample_project
        assert get_result["data"] == sample_project
        assert update_result["name"] == "Updated Lifecycle Project"
        
        # Verify cache invalidation was called multiple times
        assert mock_cache_service.invalidate_project_cache.call_count >= 3
    
    def test_project_statistics_and_caching_workflow(self, service, mock_cache_service, 
                                                   mock_project_repo, mock_cluster_repo, 
                                                   mock_object_repo, sample_project, mock_config):
        """Test project statistics retrieval with caching workflow."""
        # Arrange
        project_id = 123
        
        # First call - cache miss, fetch from DB
        mock_cache_service.get.return_value = None
        mock_project_repo.find_by_id.return_value = sample_project
        mock_cluster_repo.get_cluster_statistics.return_value = [{"cluster": "A", "count": 5}]
        mock_object_repo.get_tag_statistics.return_value = [{"tag": "nature", "count": 3}]
        
        # Second call - cache hit
        cached_project = json.dumps(sample_project)
        
        # Act
        # First call (cache miss)
        result1 = service.get_project_with_statistics(project_id)
        
        # Simulate cache being populated
        mock_cache_service.get.return_value = cached_project
        
        # Second call (cache hit for project, but statistics always fresh)
        result2 = service.get_project_with_statistics(project_id)
        
        # Assert
        assert result1["cached"] is False
        assert result2["cached"] is True
        
        # Statistics should be fetched both times (not cached)
        assert mock_cluster_repo.get_cluster_statistics.call_count == 2
        assert mock_object_repo.get_tag_statistics.call_count == 2