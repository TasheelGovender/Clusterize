"""Unit tests for UserService.

This module contains comprehensive unit tests for the UserService class,
testing user authentication, creation, deletion, and sign-in/registration workflows.
"""

import pytest
from unittest.mock import Mock
from services.user_service import UserService


class TestUserService:
    """Test UserService business logic."""
    
    @pytest.fixture
    def mock_user_repo(self):
        """Create mock user repository."""
        return Mock()
    
    @pytest.fixture
    def service(self, mock_user_repo):
        """Create UserService instance with mocked dependencies."""
        return UserService(user_repo=mock_user_repo)
    
    @pytest.fixture
    def sample_user(self):
        """Sample user data."""
        return {
            "id": 123,
            "auth0_id": "auth0|test123456",
            "email": "test@example.com",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    
    @pytest.fixture
    def sample_auth0_id(self):
        """Sample Auth0 ID."""
        return "auth0|test123456"
    
    @pytest.fixture
    def sample_email(self):
        """Sample email address."""
        return "test@example.com"


class TestGetUserByAuth0Id(TestUserService):
    """Test get_user_by_auth0_id functionality."""
    
    def test_get_user_by_auth0_id_exists(self, service, mock_user_repo, sample_user, sample_auth0_id):
        """Test getting user by Auth0 ID when user exists."""
        # Arrange
        mock_user_repo.find_by_auth0_id.return_value = sample_user
        
        # Act
        result = service.get_user_by_auth0_id(sample_auth0_id)
        
        # Assert
        assert result == sample_user
        mock_user_repo.find_by_auth0_id.assert_called_once_with(sample_auth0_id)
    
    def test_get_user_by_auth0_id_not_exists(self, service, mock_user_repo, sample_auth0_id):
        """Test getting user by Auth0 ID when user doesn't exist."""
        # Arrange
        mock_user_repo.find_by_auth0_id.return_value = None
        
        # Act
        result = service.get_user_by_auth0_id(sample_auth0_id)
        
        # Assert
        assert result is None
        mock_user_repo.find_by_auth0_id.assert_called_once_with(sample_auth0_id)
    
    def test_get_user_by_auth0_id_empty_string(self, service, mock_user_repo):
        """Test getting user by Auth0 ID with empty string."""
        # Arrange
        auth0_id = ""
        mock_user_repo.find_by_auth0_id.return_value = None
        
        # Act
        result = service.get_user_by_auth0_id(auth0_id)
        
        # Assert
        assert result is None
        mock_user_repo.find_by_auth0_id.assert_called_once_with(auth0_id)
    
    @pytest.mark.parametrize("auth0_id", [
        "auth0|123456789",
        "google-oauth2|user123",
        "facebook|fb_user_id",
        "twitter|tw_user_id",
        "github|gh_user_123"
    ])
    def test_get_user_by_auth0_id_various_providers(self, service, mock_user_repo, auth0_id):
        """Test getting user by Auth0 ID with various OAuth providers."""
        # Arrange
        expected_user = {"id": 1, "auth0_id": auth0_id, "email": "user@example.com"}
        mock_user_repo.find_by_auth0_id.return_value = expected_user
        
        # Act
        result = service.get_user_by_auth0_id(auth0_id)
        
        # Assert
        assert result == expected_user
        mock_user_repo.find_by_auth0_id.assert_called_once_with(auth0_id)


class TestCreateUser(TestUserService):
    """Test create_user functionality."""
    
    def test_create_user_success(self, service, mock_user_repo, sample_user, sample_auth0_id, sample_email):
        """Test successful user creation."""
        # Arrange
        mock_user_repo.create_user.return_value = sample_user
        
        # Act
        result = service.create_user(sample_auth0_id, sample_email)
        
        # Assert
        assert result == sample_user
        mock_user_repo.create_user.assert_called_once_with(sample_auth0_id, sample_email)
    
    def test_create_user_with_different_email_formats(self, service, mock_user_repo, sample_auth0_id):
        """Test user creation with different email formats."""
        # Arrange
        emails = [
            "user@example.com",
            "user.name@example.co.uk",
            "user+tag@example-domain.org",
            "123user@test.io"
        ]
        
        for email in emails:
            expected_user = {"id": 1, "auth0_id": sample_auth0_id, "email": email}
            mock_user_repo.create_user.return_value = expected_user
            
            # Act
            result = service.create_user(sample_auth0_id, email)
            
            # Assert
            assert result["email"] == email
            assert result["auth0_id"] == sample_auth0_id
        
        # Verify all calls were made
        assert mock_user_repo.create_user.call_count == len(emails)
    
    def test_create_user_repository_error(self, service, mock_user_repo, sample_auth0_id, sample_email):
        """Test user creation when repository raises an error."""
        # Arrange
        mock_user_repo.create_user.side_effect = Exception("Database error")
        
        # Act & Assert
        with pytest.raises(Exception, match="Database error"):
            service.create_user(sample_auth0_id, sample_email)
        
        mock_user_repo.create_user.assert_called_once_with(sample_auth0_id, sample_email)
    
    @pytest.mark.parametrize("auth0_id,email", [
        ("", "test@example.com"),
        ("auth0|123", ""),
        ("", ""),
        ("auth0|valid", "invalid-email"),
        ("special-chars|user@#$%", "user@example.com")
    ])
    def test_create_user_edge_case_inputs(self, service, mock_user_repo, auth0_id, email):
        """Test user creation with edge case inputs."""
        # Arrange
        expected_user = {"id": 1, "auth0_id": auth0_id, "email": email}
        mock_user_repo.create_user.return_value = expected_user
        
        # Act
        result = service.create_user(auth0_id, email)
        
        # Assert
        assert result["auth0_id"] == auth0_id
        assert result["email"] == email
        mock_user_repo.create_user.assert_called_once_with(auth0_id, email)


class TestDeleteUser(TestUserService):
    """Test delete_user functionality."""
    
    def test_delete_user_success(self, service, mock_user_repo, sample_auth0_id):
        """Test successful user deletion."""
        # Arrange
        deleted_data = [{"id": 123, "deleted_at": "2024-01-01T00:00:00Z"}]
        mock_user_repo.delete_user.return_value = deleted_data
        
        # Act
        result = service.delete_user(sample_auth0_id)
        
        # Assert
        assert result == deleted_data
        mock_user_repo.delete_user.assert_called_once_with(sample_auth0_id)
    
    def test_delete_user_not_exists(self, service, mock_user_repo, sample_auth0_id):
        """Test deleting user that doesn't exist."""
        # Arrange
        mock_user_repo.delete_user.return_value = []  # No user deleted
        
        # Act
        result = service.delete_user(sample_auth0_id)
        
        # Assert
        assert result == []
        mock_user_repo.delete_user.assert_called_once_with(sample_auth0_id)
    
    def test_delete_user_repository_error(self, service, mock_user_repo, sample_auth0_id):
        """Test user deletion when repository raises an error."""
        # Arrange
        mock_user_repo.delete_user.side_effect = Exception("Deletion failed")
        
        # Act & Assert
        with pytest.raises(Exception, match="Deletion failed"):
            service.delete_user(sample_auth0_id)
        
        mock_user_repo.delete_user.assert_called_once_with(sample_auth0_id)
    
    def test_delete_user_cascade_data(self, service, mock_user_repo, sample_auth0_id):
        """Test user deletion returns cascade deletion data."""
        # Arrange
        cascade_data = [
            {"table": "projects", "deleted_count": 3},
            {"table": "user_sessions", "deleted_count": 1},
            {"table": "users", "deleted_count": 1}
        ]
        mock_user_repo.delete_user.return_value = cascade_data
        
        # Act
        result = service.delete_user(sample_auth0_id)
        
        # Assert
        assert result == cascade_data
        assert len(result) == 3
        mock_user_repo.delete_user.assert_called_once_with(sample_auth0_id)


class TestSignInOrCreateUser(TestUserService):
    """Test sign_in_or_create_user functionality."""
    
    def test_sign_in_existing_user(self, service, mock_user_repo, sample_user, sample_auth0_id, sample_email):
        """Test sign in when user already exists."""
        # Arrange
        mock_user_repo.find_by_auth0_id.return_value = sample_user
        
        # Act
        result = service.sign_in_or_create_user(sample_auth0_id, sample_email)
        
        # Assert
        assert result["message"] == "User already exists"
        assert result["user"] == sample_user
        assert result["is_new"] is False
        
        # Verify only lookup was called, not creation
        mock_user_repo.find_by_auth0_id.assert_called_once_with(sample_auth0_id)
        mock_user_repo.create_user.assert_not_called()
    
    def test_create_new_user(self, service, mock_user_repo, sample_user, sample_auth0_id, sample_email):
        """Test creating new user when user doesn't exist."""
        # Arrange
        mock_user_repo.find_by_auth0_id.return_value = None  # User doesn't exist
        mock_user_repo.create_user.return_value = sample_user
        
        # Act
        result = service.sign_in_or_create_user(sample_auth0_id, sample_email)
        
        # Assert
        assert result["message"] == "New user created"
        assert result["user"] == sample_user
        assert result["is_new"] is True
        
        # Verify both lookup and creation were called
        mock_user_repo.find_by_auth0_id.assert_called_once_with(sample_auth0_id)
        mock_user_repo.create_user.assert_called_once_with(sample_auth0_id, sample_email)
    
    def test_sign_in_or_create_user_creation_error(self, service, mock_user_repo, sample_auth0_id, sample_email):
        """Test sign in or create when user creation fails."""
        # Arrange
        mock_user_repo.find_by_auth0_id.return_value = None  # User doesn't exist
        mock_user_repo.create_user.side_effect = Exception("Creation failed")
        
        # Act & Assert
        with pytest.raises(Exception, match="Creation failed"):
            service.sign_in_or_create_user(sample_auth0_id, sample_email)
        
        # Verify both methods were called
        mock_user_repo.find_by_auth0_id.assert_called_once_with(sample_auth0_id)
        mock_user_repo.create_user.assert_called_once_with(sample_auth0_id, sample_email)
    
    def test_sign_in_or_create_user_lookup_error(self, service, mock_user_repo, sample_auth0_id, sample_email):
        """Test sign in or create when user lookup fails."""
        # Arrange
        mock_user_repo.find_by_auth0_id.side_effect = Exception("Lookup failed")
        
        # Act & Assert
        with pytest.raises(Exception, match="Lookup failed"):
            service.sign_in_or_create_user(sample_auth0_id, sample_email)
        
        # Verify only lookup was attempted
        mock_user_repo.find_by_auth0_id.assert_called_once_with(sample_auth0_id)
        mock_user_repo.create_user.assert_not_called()
    
    def test_sign_in_or_create_different_emails(self, service, mock_user_repo, sample_auth0_id):
        """Test sign in or create with different email scenarios."""
        # Test 1: Existing user with same email
        existing_user = {"id": 1, "auth0_id": sample_auth0_id, "email": "original@example.com"}
        mock_user_repo.find_by_auth0_id.return_value = existing_user
        
        result1 = service.sign_in_or_create_user(sample_auth0_id, "new@example.com")
        assert result1["is_new"] is False
        assert result1["user"]["email"] == "original@example.com"  # Original email preserved
        
        # Reset mock for second test
        mock_user_repo.reset_mock()
        
        # Test 2: New user with provided email
        mock_user_repo.find_by_auth0_id.return_value = None
        new_user = {"id": 2, "auth0_id": sample_auth0_id, "email": "new@example.com"}
        mock_user_repo.create_user.return_value = new_user
        
        result2 = service.sign_in_or_create_user(sample_auth0_id, "new@example.com")
        assert result2["is_new"] is True
        assert result2["user"]["email"] == "new@example.com"


class TestEdgeCases(TestUserService):
    """Test edge cases and error scenarios."""
    
    def test_service_initialization(self, mock_user_repo):
        """Test service initialization with user repository."""
        service = UserService(user_repo=mock_user_repo)
        assert service.user_repo is mock_user_repo
    
    @pytest.mark.parametrize("auth0_id", [
        None,
        123,
        [],
        {},
        True
    ])
    def test_methods_with_non_string_auth0_id(self, service, mock_user_repo, auth0_id):
        """Test methods with non-string Auth0 ID inputs."""
        # Note: This tests how the service handles unexpected input types
        # The actual validation might be done at the repository level
        
        # Arrange - Repository should handle the input gracefully
        mock_user_repo.find_by_auth0_id.return_value = None
        
        # Act & Assert - Should pass through to repository without crashing
        result = service.get_user_by_auth0_id(auth0_id)
        assert result is None
        mock_user_repo.find_by_auth0_id.assert_called_once_with(auth0_id)
    
    def test_concurrent_sign_in_or_create_simulation(self, service, mock_user_repo, sample_auth0_id, sample_email):
        """Test sign in or create user with race condition simulation."""
        # Simulate race condition where user is created between lookup and create
        mock_user_repo.find_by_auth0_id.return_value = None  # First lookup: no user
        
        # Mock create_user to simulate user already exists error
        mock_user_repo.create_user.side_effect = Exception("User already exists")
        
        # Act & Assert
        with pytest.raises(Exception, match="User already exists"):
            service.sign_in_or_create_user(sample_auth0_id, sample_email)
    
    def test_user_data_consistency(self, service, mock_user_repo, sample_auth0_id, sample_email):
        """Test that user data remains consistent across operations."""
        # Arrange
        consistent_user = {
            "id": 123,
            "auth0_id": sample_auth0_id,
            "email": sample_email,
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        mock_user_repo.find_by_auth0_id.return_value = consistent_user
        mock_user_repo.create_user.return_value = consistent_user
        
        # Act
        get_result = service.get_user_by_auth0_id(sample_auth0_id)
        signin_result = service.sign_in_or_create_user(sample_auth0_id, sample_email)
        
        # Assert
        assert get_result["auth0_id"] == sample_auth0_id
        assert signin_result["user"]["auth0_id"] == sample_auth0_id
        assert get_result["email"] == signin_result["user"]["email"]


@pytest.mark.integration
class TestUserServiceIntegration(TestUserService):
    """Integration-style tests for UserService workflows."""
    
    def test_complete_user_lifecycle(self, service, mock_user_repo, sample_auth0_id, sample_email):
        """Test complete user lifecycle: create → sign in → delete."""
        # Arrange
        new_user = {"id": 123, "auth0_id": sample_auth0_id, "email": sample_email}
        deletion_result = [{"id": 123, "deleted_at": "2024-01-01T00:00:00Z"}]
        
        # Step 1: Create new user (sign in or create)
        mock_user_repo.find_by_auth0_id.return_value = None  # User doesn't exist
        mock_user_repo.create_user.return_value = new_user
        
        create_result = service.sign_in_or_create_user(sample_auth0_id, sample_email)
        
        # Step 2: Sign in existing user
        mock_user_repo.reset_mock()
        mock_user_repo.find_by_auth0_id.return_value = new_user  # User now exists
        
        signin_result = service.sign_in_or_create_user(sample_auth0_id, sample_email)
        
        # Step 3: Delete user
        mock_user_repo.delete_user.return_value = deletion_result
        
        delete_result = service.delete_user(sample_auth0_id)
        
        # Assert
        assert create_result["is_new"] is True
        assert create_result["user"]["auth0_id"] == sample_auth0_id
        
        assert signin_result["is_new"] is False
        assert signin_result["user"]["auth0_id"] == sample_auth0_id
        
        assert delete_result == deletion_result
    
    def test_multiple_oauth_providers_workflow(self, service, mock_user_repo):
        """Test workflow with multiple OAuth providers."""
        # Arrange
        providers = [
            ("auth0|123", "auth0@example.com"),
            ("google-oauth2|456", "google@example.com"),
            ("github|789", "github@example.com")
        ]
        
        created_users = []
        
        for auth0_id, email in providers:
            # Mock user doesn't exist initially
            mock_user_repo.find_by_auth0_id.return_value = None
            
            # Mock user creation
            new_user = {"id": len(created_users) + 1, "auth0_id": auth0_id, "email": email}
            mock_user_repo.create_user.return_value = new_user
            
            # Act
            result = service.sign_in_or_create_user(auth0_id, email)
            
            # Assert
            assert result["is_new"] is True
            assert result["user"]["auth0_id"] == auth0_id
            assert result["user"]["email"] == email
            
            created_users.append(new_user)
            mock_user_repo.reset_mock()
        
        assert len(created_users) == 3
    
    def test_user_authentication_flow(self, service, mock_user_repo, sample_auth0_id, sample_email):
        """Test typical authentication flow scenarios."""
        # Scenario 1: First-time login
        mock_user_repo.find_by_auth0_id.return_value = None
        new_user = {"id": 1, "auth0_id": sample_auth0_id, "email": sample_email}
        mock_user_repo.create_user.return_value = new_user
        
        first_login = service.sign_in_or_create_user(sample_auth0_id, sample_email)
        assert first_login["is_new"] is True
        
        # Scenario 2: Subsequent logins
        mock_user_repo.reset_mock()
        mock_user_repo.find_by_auth0_id.return_value = new_user
        
        for _ in range(3):  # Multiple subsequent logins
            subsequent_login = service.sign_in_or_create_user(sample_auth0_id, sample_email)
            assert subsequent_login["is_new"] is False
            assert subsequent_login["user"]["id"] == new_user["id"]
        
        # Verify create_user was never called for subsequent logins
        mock_user_repo.create_user.assert_not_called()
        assert mock_user_repo.find_by_auth0_id.call_count == 3