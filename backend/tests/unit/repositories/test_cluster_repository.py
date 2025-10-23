"""Unit tests for ClusterRepository.

This module contains comprehensive unit tests for the ClusterRepository class,
testing database operations, query building, data validation, and error handling.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from repositories.cluster_repository import ClusterRepository


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
    mock_execute = Mock()
    
    # Set up the method chain
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.eq.return_value = mock_eq
    mock_eq.in_.return_value = mock_in
    mock_eq.execute.return_value = mock_execute
    mock_in.execute.return_value = mock_execute
    
    mock_table.insert.return_value = mock_insert
    mock_insert.execute.return_value = mock_execute
    
    mock_table.update.return_value = mock_update
    mock_update.eq.return_value = mock_eq
    
    return mock_client


@pytest.fixture
def repository(mock_supabase_client):
    """Create ClusterRepository instance with mocked dependencies."""
    return ClusterRepository(mock_supabase_client)


@pytest.fixture
def sample_clusters():
    """Sample cluster data for testing."""
    return [
        {
            "id": 1,
            "project_id": 123,
            "label": "cluster_a",
            "label_name": "Nature Cluster",
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": 2,
            "project_id": 123,
            "label": "cluster_b",
            "label_name": "Urban Cluster",
            "created_at": "2024-01-01T01:00:00Z"
        }
    ]


@pytest.fixture
def sample_cluster():
    """Single cluster data for testing."""
    return {
        "id": 1,
        "project_id": 123,
        "label": "test_cluster",
        "label_name": "Test Cluster",
        "created_at": "2024-01-01T00:00:00Z"
    }


class TestClusterRepository:
    """Test ClusterRepository functionality."""

    def test_initialization(self, mock_supabase_client):
        """Test repository initialization."""
        repo = ClusterRepository(mock_supabase_client)
        assert repo.supabase == mock_supabase_client


class TestFindByProjectId(TestClusterRepository):
    """Test find_by_project_id functionality."""

    def test_find_by_project_id_success(self, repository, mock_supabase_client, sample_clusters):
        """Test successful retrieval of clusters by project ID."""
        # Arrange
        project_id = 123
        mock_response = Mock()
        mock_response.data = sample_clusters
        mock_response.count = 2
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.find_by_project_id(project_id)
        
        # Assert
        assert result['clusters'] == sample_clusters
        assert result['count'] == 2
        
        # Verify correct query was made
        mock_supabase_client.table.assert_called_with("cluster")
        mock_supabase_client.table.return_value.select.assert_called_with("*", count="exact")
        mock_supabase_client.table.return_value.select.return_value.eq.assert_called_with(
            "project_id", project_id
        )

    def test_find_by_project_id_no_clusters(self, repository, mock_supabase_client):
        """Test finding clusters when none exist for project."""
        # Arrange
        project_id = 999
        mock_response = Mock()
        mock_response.data = []
        mock_response.count = 0
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.find_by_project_id(project_id)
        
        # Assert
        assert result['clusters'] == []
        assert result['count'] == 0

    def test_find_by_project_id_database_error(self, repository, mock_supabase_client):
        """Test handling database errors when finding by project ID."""
        # Arrange
        project_id = 123
        # Create a mock response without 'data' attribute to simulate error
        mock_response = Mock(spec=[])  # Empty spec means no attributes
        mock_response.error = "Database connection failed"
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        # Act & Assert
        with pytest.raises(Exception, match="Failed to fetch clusters"):
            repository.find_by_project_id(project_id)

    @pytest.mark.parametrize("project_id", [0, -1, 999999])
    def test_find_by_project_id_edge_cases(self, repository, mock_supabase_client, project_id):
        """Test find_by_project_id with edge case project IDs."""
        # Arrange
        mock_response = Mock()
        mock_response.data = []
        mock_response.count = 0
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.find_by_project_id(project_id)
        
        # Assert
        assert result['clusters'] == []
        assert result['count'] == 0


class TestFindByLabelAndProject(TestClusterRepository):
    """Test find_by_label_and_project functionality."""

    def test_find_by_label_and_project_not_found(self, repository, mock_supabase_client):
        """Test when cluster is not found by label and project."""
        # Arrange
        label = "nonexistent_cluster"
        project_id = 123
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.find_by_label_and_project(label, project_id)
        
        # Assert
        assert result is None

    def test_find_by_label_and_project_database_error(self, repository, mock_supabase_client):
        """Test handling database errors when finding by label and project."""
        # Arrange
        label = "test_cluster"
        project_id = 123
        # Create a mock response without 'data' attribute to simulate error
        mock_response = Mock(spec=[])
        mock_response.error = "Database error"
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response
        
        # Act & Assert
        with pytest.raises(Exception, match="Failed to find cluster"):
            repository.find_by_label_and_project(label, project_id)

    @pytest.mark.parametrize("label,project_id", [
        ("", 123),
        ("valid_label", 0),
        ("special-chars_123", 456),
        ("very_long_cluster_name_that_might_exceed_limits", 789)
    ])
    def test_find_by_label_and_project_edge_cases(self, repository, mock_supabase_client, label, project_id):
        """Test find_by_label_and_project with edge case inputs."""
        # Arrange
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.find_by_label_and_project(label, project_id)
        
        # Assert
        assert result is None


class TestFindByLabelNamesAndProject(TestClusterRepository):
    """Test find_by_label_names_and_project functionality."""

    def test_find_by_label_names_success(self, repository, mock_supabase_client, sample_clusters):
        """Test successful retrieval of clusters by label names."""
        # Arrange
        label_names = ["Nature Cluster", "Urban Cluster"]
        project_id = 123
        mock_response = Mock()
        mock_response.data = sample_clusters
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.find_by_label_names_and_project(label_names, project_id)
        
        # Assert
        assert result == sample_clusters
        
        # Verify correct query
        mock_supabase_client.table.assert_called_with("cluster")
        mock_supabase_client.table.return_value.select.return_value.eq.assert_called_with('project_id', project_id)
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.in_.assert_called_with('label_name', label_names)

    def test_find_by_label_names_empty_list(self, repository, mock_supabase_client):
        """Test with empty label names list."""
        # Arrange
        label_names = []
        project_id = 123
        
        # Act
        result = repository.find_by_label_names_and_project(label_names, project_id)
        
        # Assert
        assert result == []
        
        # Verify no database call was made
        mock_supabase_client.table.assert_not_called()

    def test_find_by_label_names_single_item(self, repository, mock_supabase_client, sample_cluster):
        """Test with single label name."""
        # Arrange
        label_names = ["Nature Cluster"]
        project_id = 123
        mock_response = Mock()
        mock_response.data = [sample_cluster]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.find_by_label_names_and_project(label_names, project_id)
        
        # Assert
        assert result == [sample_cluster]

    def test_find_by_label_names_database_error(self, repository, mock_supabase_client):
        """Test handling database errors when finding by label names."""
        # Arrange
        label_names = ["Nature Cluster"]
        project_id = 123
        # Create a mock response without 'data' attribute to simulate error
        mock_response = Mock(spec=[])
        mock_response.error = "Database error"
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = mock_response
        
        # Act & Assert
        with pytest.raises(Exception, match="Failed to find clusters by label names"):
            repository.find_by_label_names_and_project(label_names, project_id)


class TestFindByLabelsAndProjectBatch(TestClusterRepository):
    """Test find_by_labels_and_project_batch functionality."""

    def test_find_by_labels_batch_success(self, repository, mock_supabase_client, sample_clusters):
        """Test successful batch retrieval of clusters by labels."""
        # Arrange
        labels = ["cluster_a", "cluster_b"]
        project_id = 123
        mock_response = Mock()
        mock_response.data = sample_clusters
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.find_by_labels_and_project_batch(labels, project_id)
        
        # Assert
        assert result == sample_clusters
        
        # Verify correct query
        mock_supabase_client.table.assert_called_with("cluster")
        mock_supabase_client.table.return_value.select.return_value.eq.assert_called_with('project_id', project_id)
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.in_.assert_called_with('label', labels)

    def test_find_by_labels_batch_empty_list(self, repository, mock_supabase_client):
        """Test batch find with empty labels list."""
        # Arrange
        labels = []
        project_id = 123
        
        # Act
        result = repository.find_by_labels_and_project_batch(labels, project_id)
        
        # Assert
        assert result == []
        
        # Verify no database call was made
        mock_supabase_client.table.assert_not_called()

    def test_find_by_labels_batch_partial_match(self, repository, mock_supabase_client, sample_cluster):
        """Test batch find when only some labels match."""
        # Arrange
        labels = ["cluster_a", "nonexistent_cluster"]
        project_id = 123
        mock_response = Mock()
        mock_response.data = [sample_cluster]  # Only one cluster found
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.find_by_labels_and_project_batch(labels, project_id)
        
        # Assert
        assert result == [sample_cluster]
        assert len(result) == 1  # Only one cluster found, not two


class TestCreateCluster(TestClusterRepository):
    """Test create_cluster functionality."""

    def test_create_cluster_success_with_label_name(self, repository, mock_supabase_client, sample_cluster):
        """Test successful cluster creation with label name."""
        # Arrange
        project_id = 123
        label = "test_cluster"
        label_name = "Test Cluster"
        
        mock_response = Mock()
        mock_response.data = [sample_cluster]
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.create_cluster(project_id, label, label_name)
        
        # Assert
        assert result == sample_cluster
        
        # Verify correct insert data
        expected_data = {
            "project_id": project_id,
            "label": label,
            "label_name": label_name
        }
        mock_supabase_client.table.return_value.insert.assert_called_with(expected_data)

    def test_create_cluster_without_label_name(self, repository, mock_supabase_client, sample_cluster):
        """Test cluster creation without label name."""
        # Arrange
        project_id = 123
        label = "test_cluster"
        
        mock_response = Mock()
        mock_response.data = [sample_cluster]
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.create_cluster(project_id, label)
        
        # Assert
        assert result == sample_cluster
        
        # Verify label_name was not included
        expected_data = {
            "project_id": project_id,
            "label": label
        }
        mock_supabase_client.table.return_value.insert.assert_called_with(expected_data)

    def test_create_cluster_empty_label_name(self, repository, mock_supabase_client, sample_cluster):
        """Test cluster creation with empty label name."""
        # Arrange
        project_id = 123
        label = "test_cluster"
        label_name = "   "  # Empty after strip
        
        mock_response = Mock()
        mock_response.data = [sample_cluster]
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.create_cluster(project_id, label, label_name)
        
        # Assert
        assert result == sample_cluster
        
        # Verify label_name was not included (empty after strip)
        expected_data = {
            "project_id": project_id,
            "label": label
        }
        mock_supabase_client.table.return_value.insert.assert_called_with(expected_data)

    def test_create_cluster_trims_label_name(self, repository, mock_supabase_client, sample_cluster):
        """Test cluster creation trims whitespace from label name."""
        # Arrange
        project_id = 123
        label = "test_cluster"
        label_name = "  Test Cluster  "
        
        mock_response = Mock()
        mock_response.data = [sample_cluster]
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.create_cluster(project_id, label, label_name)
        
        # Assert
        assert result == sample_cluster
        
        # Verify label_name was trimmed
        expected_data = {
            "project_id": project_id,
            "label": label,
            "label_name": "Test Cluster"
        }
        mock_supabase_client.table.return_value.insert.assert_called_with(expected_data)

    def test_create_cluster_database_error(self, repository, mock_supabase_client):
        """Test handling database errors during cluster creation."""
        # Arrange
        project_id = 123
        label = "test_cluster"
        
        # Create a mock response without 'data' attribute to simulate error
        mock_response = Mock(spec=[])
        mock_response.error = "Unique constraint violation"
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response
        
        # Act & Assert
        with pytest.raises(Exception, match="Failed to create cluster"):
            repository.create_cluster(project_id, label)

    def test_create_cluster_no_data_returned(self, repository, mock_supabase_client):
        """Test cluster creation when no data is returned."""
        # Arrange
        project_id = 123
        label = "test_cluster"
        
        mock_response = Mock()
        mock_response.data = []  # Empty data
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.create_cluster(project_id, label)
        
        # Assert
        assert result is None


class TestUpdateCluster(TestClusterRepository):
    """Test update_cluster functionality."""

    def test_update_cluster_success(self, repository, mock_supabase_client, sample_cluster):
        """Test successful cluster update."""
        # Arrange
        cluster_label = "test_cluster"
        new_label_name = "Updated Cluster Name"
        
        updated_cluster = sample_cluster.copy()
        updated_cluster['label_name'] = new_label_name
        
        mock_response = Mock()
        mock_response.data = [updated_cluster]
        
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.update_cluster(cluster_label, new_label_name)
        
        # Assert
        assert result == updated_cluster
        
        # Verify correct update call
        mock_supabase_client.table.assert_called_with("cluster")
        mock_supabase_client.table.return_value.update.assert_called_with({
            "label_name": new_label_name
        })
        mock_supabase_client.table.return_value.update.return_value.eq.assert_called_with('label', cluster_label)

    def test_update_cluster_not_found(self, repository, mock_supabase_client):
        """Test updating cluster that doesn't exist."""
        # Arrange
        cluster_label = "nonexistent_cluster"
        new_label_name = "Updated Name"
        
        mock_response = Mock()
        mock_response.data = []  # No cluster found to update
        
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
        
        # Act
        result = repository.update_cluster(cluster_label, new_label_name)
        
        # Assert
        assert result is None

    def test_update_cluster_database_error(self, repository, mock_supabase_client):
        """Test handling database errors during cluster update."""
        # Arrange
        cluster_label = "test_cluster"
        new_label_name = "Updated Name"
        
        # Create a mock response without 'data' attribute to simulate error
        mock_response = Mock(spec=[])
        mock_response.error = "Database error"
        
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
        
        # Act & Assert
        with pytest.raises(Exception, match="Failed to update cluster"):
            repository.update_cluster(cluster_label, new_label_name)


class TestGetClusterStatistics(TestClusterRepository):
    """Test get_cluster_statistics functionality."""

    def test_get_cluster_statistics_success(self, repository, mock_supabase_client):
        """Test successful retrieval of cluster statistics."""
        # Arrange
        project_id = 123
        
        # Mock clusters response
        clusters_data = [
            {"id": 1, "label": "cluster_a", "label_name": "Nature"},
            {"id": 2, "label": "cluster_b", "label_name": "Urban"}
        ]
        clusters_response = Mock()
        clusters_response.data = clusters_data
        
        # Mock object count responses
        objects_response_1 = Mock()
        objects_response_1.count = 5
        objects_response_2 = Mock()
        objects_response_2.count = 3
        
        # Set up side effects for multiple calls
        def execute_side_effect():
            if mock_supabase_client.table.call_count == 1:
                return clusters_response
            elif mock_supabase_client.table.call_count == 2:
                return objects_response_1
            else:
                return objects_response_2
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            clusters_response, objects_response_1, objects_response_2
        ]
        
        # Act
        result = repository.get_cluster_statistics(project_id)
        
        # Assert
        expected_result = [
            {'name': 'cluster_a', 'frequency': 5, 'label': 'Nature'},
            {'name': 'cluster_b', 'frequency': 3, 'label': 'Urban'}
        ]
        assert result == expected_result
        
        # Verify correct database calls were made
        assert mock_supabase_client.table.call_count == 3  # 1 for clusters + 2 for object counts

    def test_get_cluster_statistics_no_clusters(self, repository, mock_supabase_client):
        """Test statistics when no clusters exist."""
        # Arrange
        project_id = 123
        clusters_response = Mock()
        clusters_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = clusters_response
        
        # Act
        result = repository.get_cluster_statistics(project_id)
        
        # Assert
        assert result == []

    def test_get_cluster_statistics_sorting(self, repository, mock_supabase_client):
        """Test that statistics are sorted by frequency (descending)."""
        # Arrange
        project_id = 123
        
        clusters_data = [
            {"id": 1, "label": "cluster_a", "label_name": "Low Count"},
            {"id": 2, "label": "cluster_b", "label_name": "High Count"},
            {"id": 3, "label": "cluster_c", "label_name": "Medium Count"}
        ]
        clusters_response = Mock()
        clusters_response.data = clusters_data
        
        # Object counts: 2, 10, 5 respectively
        object_responses = [
            Mock(count=2),
            Mock(count=10),
            Mock(count=5)
        ]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            clusters_response
        ] + object_responses
        
        # Act
        result = repository.get_cluster_statistics(project_id)
        
        # Assert - Should be sorted by frequency descending
        expected_order = [
            {'name': 'cluster_b', 'frequency': 10, 'label': 'High Count'},
            {'name': 'cluster_c', 'frequency': 5, 'label': 'Medium Count'},
            {'name': 'cluster_a', 'frequency': 2, 'label': 'Low Count'}
        ]
        assert result == expected_order

    def test_get_cluster_statistics_null_counts(self, repository, mock_supabase_client):
        """Test handling null object counts."""
        # Arrange
        project_id = 123
        
        clusters_data = [{"id": 1, "label": "cluster_a", "label_name": "Test"}]
        clusters_response = Mock()
        clusters_response.data = clusters_data
        
        # Null count response
        objects_response = Mock()
        objects_response.count = None
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            clusters_response, objects_response
        ]
        
        # Act
        result = repository.get_cluster_statistics(project_id)
        
        # Assert
        expected_result = [{'name': 'cluster_a', 'frequency': 0, 'label': 'Test'}]
        assert result == expected_result

    def test_get_cluster_statistics_missing_label_name(self, repository, mock_supabase_client):
        """Test statistics with clusters missing label_name."""
        # Arrange
        project_id = 123
        
        clusters_data = [{"id": 1, "label": "cluster_a"}]  # No label_name
        clusters_response = Mock()
        clusters_response.data = clusters_data
        
        objects_response = Mock()
        objects_response.count = 3
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            clusters_response, objects_response
        ]
        
        # Act
        result = repository.get_cluster_statistics(project_id)
        
        # Assert
        expected_result = [{'name': 'cluster_a', 'frequency': 3, 'label': ''}]
        assert result == expected_result

    def test_get_cluster_statistics_database_error(self, repository, mock_supabase_client):
        """Test handling database errors when getting statistics."""
        # Arrange
        project_id = 123
        
        # Create a mock response without 'data' attribute to simulate error
        mock_response = Mock(spec=[])
        mock_response.error = "Database error"
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        # Act & Assert
        with pytest.raises(Exception, match="Failed to fetch clusters"):
            repository.get_cluster_statistics(project_id)
