"""
Unit tests for auth blueprint
"""
import pytest
from unittest.mock import Mock, patch
from flask import Flask
import json

from blueprints.auth import create_auth_blueprint


class TestAuthBlueprint:
    """Test class for auth blueprint endpoints"""
    
    @pytest.fixture
    def container(self):
        """Mock container with all dependencies"""
        container = Mock()
        container.require_auth = Mock()
        container.user_repository = Mock()
        return container
    
    @pytest.fixture
    def mock_user_service(self):
        """Mock user service"""
        with patch('blueprints.auth.UserService') as mock_service:
            service_instance = Mock()
            mock_service.return_value = service_instance
            yield service_instance
    
    @pytest.fixture
    def client(self, container, mock_user_service):
        """Create test client with blueprint registered"""
        app = Flask(__name__)
        app.config['TESTING'] = True
        
        # Mock auth decorator
        def mock_require_auth(permissions):
            def decorator(f):
                def wrapper(*args, **kwargs):
                    return f(*args, **kwargs)
                wrapper.__name__ = f"{f.__name__}_{id(f)}"
                return wrapper
            return decorator
        
        container.require_auth.side_effect = mock_require_auth
        
        # Create and register blueprint
        auth_bp = create_auth_blueprint(container)
        app.register_blueprint(auth_bp)
        
        return app.test_client()


class TestUsersEndpoint(TestAuthBlueprint):
    """Test the /users endpoint (POST and DELETE methods)"""
    
    def test_create_user_success(self, client, mock_user_service):
        """Test successful POST create user"""
        # Arrange
        mock_user_service.create_user.return_value = {
            'id': 1,
            'auth0_id': 'auth0|test-user-123',
            'email': 'test@example.com'
        }
        
        # Act
        with patch('blueprints.auth.current_token', {'sub': 'auth0|test-user-123'}):
            response = client.post('/api/auth/users', json={'email': 'test@example.com'})
        
        # Assert
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['email'] == 'test@example.com'
        assert data['auth0_id'] == 'auth0|test-user-123'
        mock_user_service.create_user.assert_called_once_with(
            'auth0|test-user-123', 'test@example.com'
        )
    
    def test_create_user_error(self, client, mock_user_service):
        """Test POST create user with service error"""
        # Arrange
        mock_user_service.create_user.side_effect = Exception('User already exists')
        
        # Act
        with patch('blueprints.auth.current_token', {'sub': 'auth0|test-user-123'}):
            response = client.post('/api/auth/users', json={'email': 'test@example.com'})
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'User already exists' in data['error']
        assert 'Failed to create user' in data['details']
    
    def test_delete_user_success(self, client, mock_user_service):
        """Test successful DELETE user"""
        # Arrange
        mock_user_service.delete_user.return_value = {
            'message': 'User deleted successfully'
        }
        
        # Act
        with patch('blueprints.auth.current_token', {'sub': 'auth0|test-user-123'}):
            response = client.delete('/api/auth/users')
        
        # Assert
        assert response.status_code == 204
        mock_user_service.delete_user.assert_called_once_with('auth0|test-user-123')
    
    def test_delete_user_error(self, client, mock_user_service):
        """Test DELETE user with service error"""
        # Arrange
        mock_user_service.delete_user.side_effect = Exception('User not found')
        
        # Act
        with patch('blueprints.auth.current_token', {'sub': 'auth0|test-user-123'}):
            response = client.delete('/api/auth/users')
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'User not found' in data['error']
        assert 'Failed to delete user' in data['details']


class TestSignInEndpoint(TestAuthBlueprint):
    """Test the /sign-in endpoint"""
    
    def test_sign_in_existing_user(self, client, mock_user_service):
        """Test successful sign-in with existing user"""
        # Arrange
        mock_user_service.sign_in_or_create_user.return_value = {
            'is_new': False,
            'message': 'User signed in successfully',
            'user': {
                'id': 1,
                'auth0_id': 'auth0|test-user-123',
                'email': 'test@example.com'
            }
        }
        
        # Act
        with patch('blueprints.auth.current_token', {'sub': 'auth0|test-user-123'}):
            response = client.post('/api/auth/sign-in', json={'email': 'test@example.com'})
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'User signed in successfully'
        assert data['user']['email'] == 'test@example.com'
        assert data['user']['id'] == 1
        mock_user_service.sign_in_or_create_user.assert_called_once_with(
            'auth0|test-user-123', 'test@example.com'
        )
    
    def test_sign_in_new_user(self, client, mock_user_service):
        """Test successful sign-in with new user creation"""
        # Arrange
        mock_user_service.sign_in_or_create_user.return_value = {
            'is_new': True,
            'message': 'New user created and signed in',
            'user': {
                'id': 2,
                'auth0_id': 'auth0|test-user-123',
                'email': 'newuser@example.com'
            }
        }
        
        # Act
        with patch('blueprints.auth.current_token', {'sub': 'auth0|test-user-123'}):
            response = client.post('/api/auth/sign-in', json={'email': 'newuser@example.com'})
        
        # Assert
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['message'] == 'New user created and signed in'
        assert data['user']['email'] == 'newuser@example.com'
        assert data['user']['id'] == 2
        mock_user_service.sign_in_or_create_user.assert_called_once_with(
            'auth0|test-user-123', 'newuser@example.com'
        )
    
    def test_sign_in_error(self, client, mock_user_service):
        """Test sign-in with service error"""
        # Arrange
        mock_user_service.sign_in_or_create_user.side_effect = Exception('Authentication failed')
        
        # Act
        with patch('blueprints.auth.current_token', {'sub': 'auth0|test-user-123'}):
            response = client.post('/api/auth/sign-in', json={'email': 'test@example.com'})
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Authentication failed' in data['error']
        assert 'Failed to validate user' in data['details']


class TestBlueprintCreation(TestAuthBlueprint):
    """Test blueprint creation"""
    
    def test_create_auth_blueprint_returns_blueprint(self, container):
        """Test that create_auth_blueprint returns a Blueprint instance"""
        # Act
        blueprint = create_auth_blueprint(container)
        
        # Assert
        assert blueprint.name == 'auth'
        assert blueprint.url_prefix == '/api/auth'