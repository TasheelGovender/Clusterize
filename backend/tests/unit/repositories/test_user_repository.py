"""Unit tests for UserRepository.

This module contains comprehensive unit tests for the UserRepository class,
testing database operations, query building, data validation, and error handling.
"""

import pytest
from unittest.mock import Mock
from repositories.user_repository import UserRepository


@pytest.fixture
def mock_supabase_client():
    """Create mock Supabase client."""
    mock_client = Mock()
    
    # Mock the table chain
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()
    mock_insert = Mock()
    mock_delete = Mock()
    mock_execute = Mock()
    
    # Set up the method chain
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.execute.return_value = mock_execute
    
    mock_table.insert.return_value = mock_insert
    mock_insert.execute.return_value = mock_execute
    
    mock_table.delete.return_value = mock_delete
    mock_delete.eq.return_value = mock_eq
    
    return mock_client


@pytest.fixture
def repository(mock_supabase_client):
    """Create UserRepository instance with mocked dependencies."""
    return UserRepository(mock_supabase_client)


@pytest.fixture
def sample_user():
    """Single user data for testing."""
    return {
        "id": 1,
        "auth0_id": "auth0|123456789",
        "email": "test@example.com",
        "created_at": "2024-01-01T00:00:00Z"
    }


@pytest.fixture
def sample_users():
    """Multiple user data for testing."""
    return [
        {
            "id": 1,
            "auth0_id": "auth0|123456789",
            "email": "test1@example.com",
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": 2,
            "auth0_id": "auth0|987654321",
            "email": "test2@example.com",
            "created_at": "2024-01-02T00:00:00Z"
        }
    ]


class TestUserRepository:
    """Test UserRepository functionality."""

    def test_initialization(self, mock_supabase_client):
        """Test repository initialization."""
        repo = UserRepository(mock_supabase_client)
        assert repo.supabase == mock_supabase_client


class TestFindByAuth0Id:
    """Test find_by_auth0_id functionality."""

    def test_find_by_auth0_id_success(self, repository, mock_supabase_client, sample_user):
        """Test successful retrieval of user by Auth0 ID."""
        # Arrange
        auth0_id = "auth0|123456789"
        mock_response = Mock()
        mock_response.data = [sample_user]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_auth0_id(auth0_id)

        # Assert
        assert result == sample_user
        mock_supabase_client.table.assert_called_with("users")
        mock_supabase_client.table.return_value.select.assert_called_with("*")
        mock_supabase_client.table.return_value.select.return_value.eq.assert_called_with('auth0_id', auth0_id)

    def test_find_by_auth0_id_not_found(self, repository, mock_supabase_client):
        """Test when user not found by Auth0 ID."""
        # Arrange
        auth0_id = "auth0|nonexistent"
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_auth0_id(auth0_id)

        # Assert
        assert result is None
        mock_supabase_client.table.assert_called_with("users")
        mock_supabase_client.table.return_value.select.assert_called_with("*")
        mock_supabase_client.table.return_value.select.return_value.eq.assert_called_with('auth0_id', auth0_id)

    def test_find_by_auth0_id_multiple_results(self, repository, mock_supabase_client, sample_users):
        """Test when multiple users found (should return first one)."""
        # Arrange
        auth0_id = "auth0|123456789"
        mock_response = Mock()
        mock_response.data = sample_users  # Multiple users
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_auth0_id(auth0_id)

        # Assert
        assert result == sample_users[0]  # Should return first user

    def test_find_by_auth0_id_empty_string(self, repository, mock_supabase_client):
        """Test with empty Auth0 ID."""
        # Arrange
        auth0_id = ""
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.find_by_auth0_id(auth0_id)

        # Assert
        assert result is None


class TestCreateUser:
    """Test create_user functionality."""

    def test_create_user_success(self, repository, mock_supabase_client, sample_user):
        """Test successful user creation."""
        # Arrange
        auth0_id = "auth0|123456789"
        email = "test@example.com"
        mock_response = Mock()
        mock_response.data = [sample_user]
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response

        # Act
        result = repository.create_user(auth0_id, email)

        # Assert
        assert result == sample_user
        mock_supabase_client.table.assert_called_with("users")
        mock_supabase_client.table.return_value.insert.assert_called_with({
            "auth0_id": auth0_id,
            "email": email
        })

    def test_create_user_empty_response(self, repository, mock_supabase_client):
        """Test when creation returns empty response."""
        # Arrange
        auth0_id = "auth0|123456789"
        email = "test@example.com"
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response

        # Act
        result = repository.create_user(auth0_id, email)

        # Assert
        assert result is None

    def test_create_user_with_special_characters(self, repository, mock_supabase_client):
        """Test creating user with special characters in email."""
        # Arrange
        auth0_id = "auth0|special123"
        email = "test.user+tag@example-domain.co.uk"
        created_user = {
            "id": 1,
            "auth0_id": auth0_id,
            "email": email,
            "created_at": "2024-01-01T00:00:00Z"
        }
        mock_response = Mock()
        mock_response.data = [created_user]
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response

        # Act
        result = repository.create_user(auth0_id, email)

        # Assert
        assert result == created_user
        mock_supabase_client.table.return_value.insert.assert_called_with({
            "auth0_id": auth0_id,
            "email": email
        })

    def test_create_user_empty_parameters(self, repository, mock_supabase_client):
        """Test creating user with empty parameters."""
        # Arrange
        auth0_id = ""
        email = ""
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response

        # Act
        result = repository.create_user(auth0_id, email)

        # Assert
        assert result is None
        mock_supabase_client.table.return_value.insert.assert_called_with({
            "auth0_id": auth0_id,
            "email": email
        })


class TestDeleteUser:
    """Test delete_user functionality."""

    def test_delete_user_success(self, repository, mock_supabase_client, sample_user):
        """Test successful user deletion."""
        # Arrange
        auth0_id = "auth0|123456789"
        mock_response = Mock()
        mock_response.data = [sample_user]
        
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.delete_user(auth0_id)

        # Assert
        assert result == [sample_user]
        mock_supabase_client.table.assert_called_with("users")
        mock_supabase_client.table.return_value.delete.return_value.eq.assert_called_with('auth0_id', auth0_id)

    def test_delete_user_not_found(self, repository, mock_supabase_client):
        """Test deletion when user doesn't exist."""
        # Arrange
        auth0_id = "auth0|nonexistent"
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.delete_user(auth0_id)

        # Assert
        assert result == []
        mock_supabase_client.table.assert_called_with("users")
        mock_supabase_client.table.return_value.delete.return_value.eq.assert_called_with('auth0_id', auth0_id)

    def test_delete_user_multiple_users(self, repository, mock_supabase_client, sample_users):
        """Test deletion when multiple users match (edge case)."""
        # Arrange
        auth0_id = "auth0|123456789"
        mock_response = Mock()
        mock_response.data = sample_users
        
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.delete_user(auth0_id)

        # Assert
        assert result == sample_users

    def test_delete_user_empty_auth0_id(self, repository, mock_supabase_client):
        """Test deletion with empty Auth0 ID."""
        # Arrange
        auth0_id = ""
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response

        # Act
        result = repository.delete_user(auth0_id)

        # Assert
        assert result == []
        mock_supabase_client.table.return_value.delete.return_value.eq.assert_called_with('auth0_id', auth0_id)


class TestUserRepositoryErrorHandling:
    """Test error handling scenarios."""

    def test_find_by_auth0_id_database_error(self, repository, mock_supabase_client):
        """Test handling of database errors in find_by_auth0_id."""
        # Arrange
        auth0_id = "auth0|123456789"
        mock_response = Mock()
        # Simulate a response without data attribute to trigger error handling
        delattr(mock_response, 'data')
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Act & Assert
        with pytest.raises(Exception, match="Failed to find user"):
            repository.find_by_auth0_id(auth0_id)

    def test_create_user_database_error(self, repository, mock_supabase_client):
        """Test handling of database errors in create_user."""
        # Arrange
        auth0_id = "auth0|123456789"
        email = "test@example.com"
        mock_response = Mock()
        # Simulate a response without data attribute to trigger error handling
        delattr(mock_response, 'data')
        
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_response

        # Act & Assert
        with pytest.raises(Exception, match="Failed to create user"):
            repository.create_user(auth0_id, email)

    def test_delete_user_database_error(self, repository, mock_supabase_client):
        """Test handling of database errors in delete_user."""
        # Arrange
        auth0_id = "auth0|123456789"
        mock_response = Mock()
        # Simulate a response without data attribute to trigger error handling
        delattr(mock_response, 'data')
        
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response

        # Act & Assert
        with pytest.raises(Exception, match="Failed to delete user"):
            repository.delete_user(auth0_id)
