"""Unit tests for ObjectRepository.

This module contains comprehensive unit tests for the ObjectRepository class,
testing database operations, query building, data validation, and error handling.
"""

import pytest
from unittest.mock import Mock, MagicMock
from repositories.object_repository import ObjectRepository


@pytest.fixture
def mock_supabase_client():
    """Create mock Supabase client."""
    mock_client = Mock()
    
    # Mock the table chain
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()
    mock_in = Mock()
    mock_insert = Mock()
    mock_update = Mock()
    mock_delete = Mock()
    mock_execute = Mock()
    mock_contains = Mock()
    mock_neq = Mock()
    
    # Set up the method chain
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.eq.return_value = mock_eq
    mock_eq.in_.return_value = mock_in
    mock_eq.execute.return_value = mock_execute
    mock_in.execute.return_value = mock_execute
    mock_eq.contains.return_value = mock_contains
    mock_contains.execute.return_value = mock_execute
    mock_eq.neq.return_value = mock_neq
    mock_neq.execute.return_value = mock_execute
    mock_neq.eq.return_value = mock_eq
    mock_neq.neq.return_value = mock_neq
    
    mock_table.insert.return_value = mock_insert
    mock_insert.execute.return_value = mock_execute
    
    mock_table.update.return_value = mock_update
    mock_update.eq.return_value = mock_eq
    
    mock_table.delete.return_value = mock_delete
    mock_delete.eq.return_value = mock_eq
    
    return mock_client


@pytest.fixture
def repository(mock_supabase_client):
    """Create ObjectRepository instance with mocked dependencies."""
    return ObjectRepository(mock_supabase_client)


@pytest.fixture
def sample_objects():
    """Sample object data for testing."""
    return [
        {
            "id": 1,
            "name": "object1.jpg",
            "cluster_id": 101,
            "original_cluster": 101,
            "tags": ["nature", "landscape"],
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": 2,
            "name": "object2.jpg",
            "cluster_id": 102,
            "original_cluster": 101,
            "tags": ["urban", "building"],
            "created_at": "2024-01-01T01:00:00Z"
        }
    ]


@pytest.fixture
def sample_object():
    """Single object data for testing."""
    return {
        "id": 1,
        "name": "test_object.jpg",
        "cluster_id": 101,
        "original_cluster": 101,
        "tags": ["test", "sample"],
        "created_at": "2024-01-01T00:00:00Z"
    }


class TestObjectRepository:
    """Test ObjectRepository functionality."""

    def test_initialization(self, mock_supabase_client):
        """Test repository initialization."""
        repo = ObjectRepository(mock_supabase_client)
        assert repo.supabase == mock_supabase_client


class TestFindByClusterId:
    """Test find_by_cluster_id functionality."""

    def test_find_by_cluster_id_success(self, repository, mock_supabase_client, sample_objects):
        """Test successful retrieval of objects by cluster ID."""
        # Arrange
        cluster_id = 101
        mock_response = Mock()
        mock_response.data = sample_objects
        mock_response.count = 2
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_cluster_id(cluster_id)

        # Assert
        assert result['objects'] == sample_objects
        assert result['count'] == 2
        mock_supabase_client.table.assert_called_with("objects")
        mock_supabase_client.table.return_value.select.assert_called_with("*", count="exact")

    def test_find_by_cluster_id_empty_result(self, repository, mock_supabase_client):
        """Test retrieval when no objects found."""
        # Arrange
        cluster_id = 999
        mock_response = Mock()
        mock_response.data = []
        mock_response.count = 0
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_cluster_id(cluster_id)

        # Assert
        assert result['objects'] == []
        assert result['count'] == 0


class TestFindByNameAndCluster:
    """Test find_by_name_and_cluster functionality."""

    def test_find_by_name_and_cluster_success(self, repository, mock_supabase_client, sample_object):
        """Test successful retrieval of object by name and cluster."""
        # Arrange
        name = "test_object.jpg"
        cluster_id = 101
        mock_response = Mock()
        mock_response.data = [sample_object]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_name_and_cluster(name, cluster_id)

        # Assert
        assert result == sample_object
        mock_supabase_client.table.assert_called_with("objects")

    def test_find_by_name_and_cluster_not_found(self, repository, mock_supabase_client):
        """Test when object not found."""
        # Arrange
        name = "nonexistent.jpg"
        cluster_id = 101
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_name_and_cluster(name, cluster_id)

        # Assert
        assert result is None


class TestFindByIdAndCluster:
    """Test find_by_id_and_cluster functionality."""

    def test_find_by_id_and_cluster_success(self, repository, mock_supabase_client, sample_object):
        """Test successful retrieval of object by ID and cluster."""
        # Arrange
        object_id = 1
        cluster_id = 101
        mock_response = Mock()
        mock_response.data = [sample_object]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_id_and_cluster(object_id, cluster_id)

        # Assert
        assert result == sample_object

    def test_find_by_id_and_cluster_not_found(self, repository, mock_supabase_client):
        """Test when object not found."""
        # Arrange
        object_id = 999
        cluster_id = 101
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_id_and_cluster(object_id, cluster_id)

        # Assert
        assert result is None


class TestFindByIdInProject:
    """Test find_by_id_in_project functionality."""

    def test_find_by_id_in_project_success(self, repository, mock_supabase_client, sample_object):
        """Test successful retrieval of object by ID within project."""
        # Arrange
        object_id = 1
        project_id = 123
        mock_response = Mock()
        mock_response.data = [sample_object]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_id_in_project(object_id, project_id)

        # Assert
        assert result == sample_object
        mock_supabase_client.table.return_value.select.assert_called_with("*, cluster!inner(project_id)")

    def test_find_by_id_in_project_not_found(self, repository, mock_supabase_client):
        """Test when object not found in project."""
        # Arrange
        object_id = 999
        project_id = 123
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_id_in_project(object_id, project_id)

        # Assert
        assert result is None


class TestCreateObject:
    """Test create_object functionality."""

    def test_create_object_success(self, repository, mock_supabase_client, sample_object):
        """Test successful object creation."""
        # Arrange
        name = "new_object.jpg"
        cluster_id = 101
        mock_response = Mock()
        mock_response.data = [sample_object]
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response

        # Act
        result = repository.create_object(name, cluster_id)

        # Assert
        assert result == sample_object
        mock_supabase_client.table.assert_called_with("objects")
        mock_supabase_client.table.return_value.insert.assert_called_with({
            "name": name,
            "cluster_id": cluster_id,
        })

    def test_create_object_empty_response(self, repository, mock_supabase_client):
        """Test when creation returns empty response."""
        # Arrange
        name = "new_object.jpg"
        cluster_id = 101
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response

        # Act
        result = repository.create_object(name, cluster_id)

        # Assert
        assert result is None


class TestUpdateObjectTags:
    """Test update_object_tags functionality."""

    def test_update_object_tags_success(self, repository, mock_supabase_client, sample_object):
        """Test successful object tags update."""
        # Arrange
        object_id = 1
        tags = ["new", "updated", "tags"]
        mock_response = Mock()
        mock_response.data = [sample_object]
        
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.update_object_tags(object_id, tags)

        # Assert
        assert result == sample_object
        mock_supabase_client.table.return_value.update.assert_called_with({'tags': tags})

    def test_update_object_tags_empty_response(self, repository, mock_supabase_client):
        """Test when update returns empty response."""
        # Arrange
        object_id = 1
        tags = ["new", "tags"]
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.update_object_tags(object_id, tags)

        # Assert
        assert result is None


class TestUpdateObjectCluster:
    """Test update_object_cluster functionality."""

    def test_update_object_cluster_success(self, repository, mock_supabase_client, sample_object):
        """Test successful object cluster update."""
        # Arrange
        object_id = 1
        cluster_id = 102
        mock_response = Mock()
        mock_response.data = [sample_object]
        
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.update_object_cluster(object_id, cluster_id)

        # Assert
        assert result == sample_object
        mock_supabase_client.table.return_value.update.assert_called_with({'cluster_id': cluster_id})

    def test_update_object_cluster_empty_response(self, repository, mock_supabase_client):
        """Test when update returns empty response."""
        # Arrange
        object_id = 1
        cluster_id = 102
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.update_object_cluster(object_id, cluster_id)

        # Assert
        assert result is None


class TestDeleteByClusterId:
    """Test delete_by_cluster_id functionality."""

    def test_delete_by_cluster_id_success(self, repository, mock_supabase_client, sample_objects):
        """Test successful deletion of objects by cluster ID."""
        # Arrange
        cluster_id = 101
        mock_response = Mock()
        mock_response.data = sample_objects
        
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.delete_by_cluster_id(cluster_id)

        # Assert
        assert result == sample_objects
        mock_supabase_client.table.assert_called_with("objects")
        mock_supabase_client.table.return_value.delete.return_value.eq.assert_called_with("cluster_id", cluster_id)

    def test_delete_by_cluster_id_no_objects(self, repository, mock_supabase_client):
        """Test deletion when no objects exist."""
        # Arrange
        cluster_id = 999
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.delete_by_cluster_id(cluster_id)

        # Assert
        assert result == []


class TestSearchObjects:
    """Test search_objects functionality."""

    def test_search_objects_by_cluster_id(self, repository, mock_supabase_client, sample_objects):
        """Test search objects by single cluster ID (backward compatibility)."""
        # Arrange
        filters = {"cluster_id": 101}
        mock_response = Mock()
        mock_response.data = sample_objects
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.search_objects(filters, relocated_images=False)

        # Assert
        assert result == sample_objects
        mock_supabase_client.table.return_value.select.return_value.eq.assert_called_with('cluster_id', 101)

    def test_search_objects_by_cluster_ids(self, repository, mock_supabase_client, sample_objects):
        """Test search objects by multiple cluster IDs."""
        # Arrange
        filters = {"cluster_ids": [101, 102]}
        mock_response = Mock()
        mock_response.data = sample_objects
        
        mock_supabase_client.table.return_value.select.return_value.in_.return_value.execute.return_value = mock_response

        # Act
        result = repository.search_objects(filters, relocated_images=False)

        # Assert
        assert result == sample_objects
        mock_supabase_client.table.return_value.select.return_value.in_.assert_called_with('cluster_id', [101, 102])

    def test_search_objects_by_name(self, repository, mock_supabase_client, sample_objects):
        """Test search objects by name."""
        # Arrange
        filters = {"name": "test.jpg"}
        mock_response = Mock()
        mock_response.data = sample_objects
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.search_objects(filters, relocated_images=False)

        # Assert
        assert result == sample_objects

    def test_search_objects_by_tags_list(self, repository, mock_supabase_client, sample_objects):
        """Test search objects by tags list."""
        # Arrange
        filters = {"tags": ["nature", "landscape"]}
        mock_response = Mock()
        mock_response.data = sample_objects
        
        mock_supabase_client.table.return_value.select.return_value.contains.return_value.execute.return_value = mock_response

        # Act
        result = repository.search_objects(filters, relocated_images=False)

        # Assert
        assert result == sample_objects
        mock_supabase_client.table.return_value.select.return_value.contains.assert_called_with('tags', ["nature", "landscape"])

    def test_search_objects_by_tags_string(self, repository, mock_supabase_client, sample_objects):
        """Test search objects by tags string (backward compatibility)."""
        # Arrange
        filters = {"tags": "nature,landscape"}
        mock_response = Mock()
        mock_response.data = sample_objects
        
        mock_supabase_client.table.return_value.select.return_value.contains.return_value.execute.return_value = mock_response

        # Act
        result = repository.search_objects(filters, relocated_images=False)

        # Assert
        assert result == sample_objects
        mock_supabase_client.table.return_value.select.return_value.contains.assert_called_with('tags', ["nature", "landscape"])

    def test_search_objects_relocated_images_filter(self, repository, mock_supabase_client):
        """Test search objects with relocated images filter."""
        # Arrange
        filters = {}
        relocated_objects = [
            {"id": 1, "cluster_id": 102, "original_cluster": 101},  # relocated
            {"id": 2, "cluster_id": 101, "original_cluster": 101},  # not relocated
        ]
        mock_response = Mock()
        mock_response.data = relocated_objects
        
        mock_supabase_client.table.return_value.select.return_value.execute.return_value = mock_response

        # Act
        result = repository.search_objects(filters, relocated_images=True)

        # Assert
        assert len(result) == 1
        assert result[0]["id"] == 1  # Only the relocated object


class TestGetTagStatistics:
    """Test get_tag_statistics functionality."""

    def test_get_tag_statistics_success(self, repository, mock_supabase_client):
        """Test successful tag statistics retrieval."""
        # Arrange
        project_id = 123
        objects_with_tags = [
            {"tags": ["nature", "landscape"]},
            {"tags": ["nature", "water"]},
            {"tags": ["urban"]},
            {"tags": ["nature"]},
            {"tags": []},  # empty tags
            {"tags": None},  # null tags
        ]
        mock_response = Mock()
        mock_response.data = objects_with_tags
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.get_tag_statistics(project_id)

        # Assert
        assert len(result) == 4
        # Check that tags are sorted by frequency (descending)
        assert result[0]['name'] == 'nature' and result[0]['frequency'] == 3
        assert result[1]['name'] == 'landscape' and result[1]['frequency'] == 1
        assert result[2]['name'] == 'water' and result[2]['frequency'] == 1
        assert result[3]['name'] == 'urban' and result[3]['frequency'] == 1

    def test_get_tag_statistics_no_objects(self, repository, mock_supabase_client):
        """Test tag statistics when no objects exist."""
        # Arrange
        project_id = 123
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.get_tag_statistics(project_id)

        # Assert
        assert result == []


class TestResetObjectsInProject:
    """Test reset_objects_in_project functionality."""

    def test_reset_objects_in_project_success(self, repository, mock_supabase_client):
        """Test successful reset of objects in project."""
        # Arrange
        project_id = 123
        clusters = [{"id": 101}, {"id": 102}]
        objects_to_reset = [
            {"id": 1, "cluster_id": 102, "original_cluster": 101},
            {"id": 2, "cluster_id": 101, "original_cluster": 101},  # already in original
        ]
        
        # Mock clusters query
        clusters_response = Mock()
        clusters_response.data = clusters
        
        # Mock objects query
        objects_response = Mock()
        objects_response.data = objects_to_reset
        
        # Mock update response
        update_response = Mock()
        update_response.data = [{"id": 1}]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = clusters_response
        mock_supabase_client.table.return_value.select.return_value.in_.return_value.execute.return_value = objects_response
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = update_response

        # Act
        result = repository.reset_objects_in_project(project_id)

        # Assert
        assert result["updated_count"] == 1

    def test_reset_objects_in_project_no_clusters(self, repository, mock_supabase_client):
        """Test reset when no clusters exist in project."""
        # Arrange
        project_id = 999
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.reset_objects_in_project(project_id)

        # Assert
        assert result == []


class TestResetObjectsInCluster:
    """Test reset_objects_in_cluster functionality."""

    def test_reset_objects_in_cluster_success(self, repository, mock_supabase_client):
        """Test successful reset of objects in cluster."""
        # Arrange
        cluster_id = "101"
        reset_objects = [{"id": 1}, {"id": 2}]
        mock_response = Mock()
        mock_response.data = reset_objects
        
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.neq.return_value.execute.return_value = mock_response

        # Act
        result = repository.reset_objects_in_cluster(cluster_id)

        # Assert
        assert result["updated_count"] == 2
        assert result["objects"] == reset_objects

    def test_reset_objects_in_cluster_no_objects(self, repository, mock_supabase_client):
        """Test reset when no objects need resetting."""
        # Arrange
        cluster_id = "101"
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.neq.return_value.execute.return_value = mock_response

        # Act
        result = repository.reset_objects_in_cluster(cluster_id)

        # Assert
        assert result["updated_count"] == 0
        assert result["objects"] == []


class TestResetMovedObjectsFromCluster:
    """Test reset_moved_objects_from_cluster functionality."""

    def test_reset_moved_objects_from_cluster_success(self, repository, mock_supabase_client):
        """Test successful reset of moved objects from cluster."""
        # Arrange
        cluster_id = "102"
        objects_to_reset = [
            {"id": 1, "original_cluster": 101},
            {"id": 2, "original_cluster": 103}
        ]
        
        # Mock objects query
        objects_response = Mock()
        objects_response.data = objects_to_reset
        
        # Mock update responses
        update_response = Mock()
        update_response.data = [{"id": 1}]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.neq.return_value.execute.return_value = objects_response
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = update_response

        # Act
        result = repository.reset_moved_objects_from_cluster(cluster_id)

        # Assert
        assert result["updated_count"] == 2
        assert len(result["objects"]) == 2

    def test_reset_moved_objects_from_cluster_no_objects(self, repository, mock_supabase_client):
        """Test reset when no moved objects exist."""
        # Arrange
        cluster_id = "102"
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.neq.return_value.execute.return_value = mock_response

        # Act
        result = repository.reset_moved_objects_from_cluster(cluster_id)

        # Assert
        assert result["updated_count"] == 0
        assert result["objects"] == []