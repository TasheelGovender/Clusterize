"""Unit tests for ProjectRepository.

This module contains comprehensive unit tests for the ProjectRepository class,
testing database operations, query building, data validation, and error handling.
"""

import pytest
from unittest.mock import Mock
from repositories.project_repository import ProjectRepository


@pytest.fixture
def mock_supabase_client():
    """Create mock Supabase client."""
    mock_client = Mock()
    
    # Mock the table chain
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()
    mock_insert = Mock()
    mock_update = Mock()
    mock_delete = Mock()
    mock_execute = Mock()
    
    # Set up the method chain
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.eq.return_value = mock_eq
    mock_eq.execute.return_value = mock_execute
    
    mock_table.insert.return_value = mock_insert
    mock_insert.execute.return_value = mock_execute
    
    mock_table.update.return_value = mock_update
    mock_update.eq.return_value = mock_eq
    
    mock_table.delete.return_value = mock_delete
    mock_delete.eq.return_value = mock_eq
    
    return mock_client


@pytest.fixture
def repository(mock_supabase_client):
    """Create ProjectRepository instance with mocked dependencies."""
    return ProjectRepository(mock_supabase_client)


@pytest.fixture
def sample_projects():
    """Sample project data for testing."""
    return [
        {
            "id": 1,
            "owner": 123,
            "project_name": "Image Classification",
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": 2,
            "owner": 123,
            "project_name": "Object Detection",
            "created_at": "2024-01-02T00:00:00Z"
        }
    ]


@pytest.fixture
def sample_project():
    """Single project data for testing."""
    return {
        "id": 1,
        "owner": 123,
        "project_name": "Test Project",
        "created_at": "2024-01-01T00:00:00Z"
    }


class TestProjectRepository:
    """Test ProjectRepository functionality."""

    def test_initialization(self, mock_supabase_client):
        """Test repository initialization."""
        repo = ProjectRepository(mock_supabase_client)
        assert repo.supabase == mock_supabase_client


class TestFindByUserId:
    """Test find_by_user_id functionality."""

    def test_find_by_user_id_success(self, repository, mock_supabase_client, sample_projects):
        """Test successful retrieval of projects by user ID."""
        # Arrange
        user_id = 123
        mock_response = Mock()
        mock_response.data = sample_projects
        mock_response.count = 2
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_user_id(user_id)

        # Assert
        assert result['projects'] == sample_projects
        assert result['count'] == 2
        mock_supabase_client.table.assert_called_with("projects")
        mock_supabase_client.table.return_value.select.assert_called_with("*", count="exact")
        mock_supabase_client.table.return_value.select.return_value.eq.assert_called_with('owner', user_id)

    def test_find_by_user_id_empty_result(self, repository, mock_supabase_client):
        """Test retrieval when user has no projects."""
        # Arrange
        user_id = 999
        mock_response = Mock()
        mock_response.data = []
        mock_response.count = 0
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_user_id(user_id)

        # Assert
        assert result['projects'] == []
        assert result['count'] == 0


class TestFindById:
    """Test find_by_id functionality."""

    def test_find_by_id_success(self, repository, mock_supabase_client, sample_project):
        """Test successful retrieval of project by ID."""
        # Arrange
        project_id = 1
        mock_response = Mock()
        mock_response.data = [sample_project]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_id(project_id)

        # Assert
        assert result == sample_project
        mock_supabase_client.table.assert_called_with("projects")
        mock_supabase_client.table.return_value.select.assert_called_with("*")
        mock_supabase_client.table.return_value.select.return_value.eq.assert_called_with("id", project_id)

    def test_find_by_id_not_found(self, repository, mock_supabase_client):
        """Test when project not found."""
        # Arrange
        project_id = 999
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_id(project_id)

        # Assert
        assert result is None


class TestFindByNameAndOwner:
    """Test find_by_name_and_owner functionality."""

    def test_find_by_name_and_owner_success(self, repository, mock_supabase_client, sample_project):
        """Test successful retrieval of project by name and owner."""
        # Arrange
        project_name = "Test Project"
        owner_id = 123
        mock_response = Mock()
        mock_response.data = [sample_project]
        
        # Create separate mocks for the chained eq calls
        mock_first_eq = Mock()
        mock_second_eq = Mock()
        mock_second_eq.execute.return_value = mock_response
        mock_first_eq.eq.return_value = mock_second_eq
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value = mock_first_eq

        # Act
        result = repository.find_by_name_and_owner(project_name, owner_id)

        # Assert
        assert result == sample_project
        mock_supabase_client.table.assert_called_with("projects")
        mock_supabase_client.table.return_value.select.assert_called_with("*")
        
        # Verify the first eq call (owner)
        mock_supabase_client.table.return_value.select.return_value.eq.assert_called_with('owner', owner_id)
        # Verify the second eq call (project_name)
        mock_first_eq.eq.assert_called_with('project_name', project_name)

    def test_find_by_name_and_owner_not_found(self, repository, mock_supabase_client):
        """Test when project not found by name and owner."""
        # Arrange
        project_name = "Nonexistent Project"
        owner_id = 123
        mock_response = Mock()
        mock_response.data = []
        
        # Create separate mocks for the chained eq calls
        mock_first_eq = Mock()
        mock_second_eq = Mock()
        mock_second_eq.execute.return_value = mock_response
        mock_first_eq.eq.return_value = mock_second_eq
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value = mock_first_eq

        # Act
        result = repository.find_by_name_and_owner(project_name, owner_id)

        # Assert
        assert result is None


class TestCreateProject:
    """Test create_project functionality."""

    def test_create_project_success(self, repository, mock_supabase_client, sample_project):
        """Test successful project creation."""
        # Arrange
        owner_id = 123
        project_name = "New Project"
        mock_response = Mock()
        mock_response.data = [sample_project]
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response

        # Act
        result = repository.create_project(owner_id, project_name)

        # Assert
        assert result == sample_project
        mock_supabase_client.table.assert_called_with("projects")
        mock_supabase_client.table.return_value.insert.assert_called_with({
            "owner": owner_id,
            "project_name": project_name
        })

    def test_create_project_empty_response(self, repository, mock_supabase_client):
        """Test when creation returns empty response."""
        # Arrange
        owner_id = 123
        project_name = "New Project"
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response

        # Act
        result = repository.create_project(owner_id, project_name)

        # Assert
        assert result is None


class TestUpdateProject:
    """Test update_project functionality."""

    def test_update_project_success(self, repository, mock_supabase_client, sample_project):
        """Test successful project update."""
        # Arrange
        project_id = 1
        new_project_name = "Updated Project Name"
        updated_project = {**sample_project, "project_name": new_project_name}
        mock_response = Mock()
        mock_response.data = [updated_project]
        
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.update_project(project_id, new_project_name)

        # Assert
        assert result == updated_project
        mock_supabase_client.table.assert_called_with("projects")
        mock_supabase_client.table.return_value.update.assert_called_with({
            "project_name": new_project_name
        })
        mock_supabase_client.table.return_value.update.return_value.eq.assert_called_with('id', project_id)

    def test_update_project_empty_response(self, repository, mock_supabase_client):
        """Test when update returns empty response."""
        # Arrange
        project_id = 1
        new_project_name = "Updated Project Name"
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.update_project(project_id, new_project_name)

        # Assert
        assert result is None

    def test_update_project_not_found(self, repository, mock_supabase_client):
        """Test update when project doesn't exist."""
        # Arrange
        project_id = 999
        new_project_name = "Updated Project Name"
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.update_project(project_id, new_project_name)

        # Assert
        assert result is None


class TestDeleteProject:
    """Test delete_project functionality."""

    def test_delete_project_success(self, repository, mock_supabase_client, sample_project):
        """Test successful project deletion."""
        # Arrange
        project_id = 1
        mock_response = Mock()
        mock_response.data = [sample_project]
        
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.delete_project(project_id)

        # Assert
        assert result == sample_project
        mock_supabase_client.table.assert_called_with("projects")
        mock_supabase_client.table.return_value.delete.return_value.eq.assert_called_with("id", project_id)

    def test_delete_project_empty_response(self, repository, mock_supabase_client):
        """Test when deletion returns empty response."""
        # Arrange
        project_id = 1
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.delete_project(project_id)

        # Assert
        assert result is None

    def test_delete_project_not_found(self, repository, mock_supabase_client):
        """Test deletion when project doesn't exist."""
        # Arrange
        project_id = 999
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.delete_project(project_id)

        # Assert
        assert result is None


class TestProjectRepositoryErrorHandling:
    """Test error handling scenarios."""

    def test_find_by_user_id_database_error(self, repository, mock_supabase_client):
        """Test handling of database errors in find_by_user_id."""
        # Arrange
        user_id = 123
        mock_response = Mock()
        # Simulate a response without data attribute to trigger error handling
        delattr(mock_response, 'data')
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act & Assert
        with pytest.raises(Exception, match="Failed to fetch user projects"):
            repository.find_by_user_id(user_id)

    def test_create_project_database_error(self, repository, mock_supabase_client):
        """Test handling of database errors in create_project."""
        # Arrange
        owner_id = 123
        project_name = "Test Project"
        mock_response = Mock()
        # Simulate a response without data attribute to trigger error handling
        delattr(mock_response, 'data')
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response

        # Act & Assert
        with pytest.raises(Exception, match="Failed to create project"):
            repository.create_project(owner_id, project_name)

    def test_update_project_database_error(self, repository, mock_supabase_client):
        """Test handling of database errors in update_project."""
        # Arrange
        project_id = 1
        project_name = "Updated Name"
        mock_response = Mock()
        # Simulate a response without data attribute to trigger error handling
        delattr(mock_response, 'data')
        
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response

        # Act & Assert
        with pytest.raises(Exception, match="Failed to update project"):
            repository.update_project(project_id, project_name)

    def test_delete_project_database_error(self, repository, mock_supabase_client):
        """Test handling of database errors in delete_project."""
        # Arrange
        project_id = 1
        mock_response = Mock()
        # Simulate a response without data attribute to trigger error handling
        delattr(mock_response, 'data')
        
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response

        # Act & Assert
        with pytest.raises(Exception, match="Failed to delete project"):
            repository.delete_project(project_id)


class TestProjectRepositoryIntegration:
    """Integration-style tests for common workflows."""

    def test_find_project_multiple_methods(self, repository, mock_supabase_client, sample_project):
        """Test finding the same project using different methods."""
        mock_response = Mock()
        mock_response.data = [sample_project]
        
        # Set up mock for single eq call (find by ID)
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        # Test find by ID
        result_by_id = repository.find_by_id(1)
        assert result_by_id == sample_project
        
        # Set up mock for chained eq calls (find by name and owner)
        mock_first_eq = Mock()
        mock_second_eq = Mock()
        mock_second_eq.execute.return_value = mock_response
        mock_first_eq.eq.return_value = mock_second_eq
        mock_supabase_client.table.return_value.select.return_value.eq.return_value = mock_first_eq
        
        # Test find by name and owner
        result_by_name = repository.find_by_name_and_owner("Test Project", 123)
        assert result_by_name == sample_project
        
        # Both should return the same project
        assert result_by_id == result_by_name