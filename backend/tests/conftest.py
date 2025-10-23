"""Test configuration and fixtures for pytest.

This module provides pytest fixtures and configurations for testing
the Flask application, including app instances, test clients, database
setup/teardown, and common test utilities.
"""

import os
import pytest
import tempfile
from unittest.mock import Mock, patch
from flask import Flask

# Add the backend directory to Python path so we can import modules
import sys
from pathlib import Path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app import create_app
from container import Container
from config import TestingConfig


# ============================================================================
# Application Fixtures
# ============================================================================

@pytest.fixture(scope='session')
def app():
    """Create application for testing.
    
    This fixture creates a Flask application configured for testing
    and provides it for the entire test session.
    """
    # Set testing environment variables
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['TESTING'] = 'True'
    
    # Create app with testing config
    app = create_app('testing')
    
    # Create application context
    with app.app_context():
        yield app


@pytest.fixture(scope='function')
def client(app):
    """A test client for the app.
    
    This fixture provides a Flask test client for making HTTP requests
    to the application during tests.
    """
    return app.test_client()


@pytest.fixture(scope='function')
def runner(app):
    """A test runner for the app's Click commands.
    
    This fixture provides a CLI test runner for testing
    Flask CLI commands.
    """
    return app.test_cli_runner()


# ============================================================================
# Container and Service Fixtures
# ============================================================================

@pytest.fixture(scope='function')
def mock_container():
    """Mock container with mocked services.
    
    This fixture provides a Container instance with mocked
    Redis connection and services for isolated testing.
    """
    with patch('container.redis.Redis') as mock_redis:
        # Configure mock Redis
        mock_redis_instance = Mock()
        mock_redis.return_value = mock_redis_instance
        mock_redis_instance.ping.return_value = True
        
        # Create container with mocked Redis
        container = Container(TestingConfig)
        
        # Set the private attribute directly since redis_available is a property
        container._redis_available = True
        
        yield container


@pytest.fixture(scope='function')
def mock_redis_client():
    """Mock Redis client for testing caching functionality.
    
    This fixture provides a mocked Redis client that simulates
    Redis operations without requiring a real Redis server.
    """
    mock_client = Mock()
    
    # Mock common Redis operations
    mock_client.get.return_value = None
    mock_client.set.return_value = True
    mock_client.delete.return_value = 1
    mock_client.exists.return_value = False
    mock_client.expire.return_value = True
    mock_client.ping.return_value = True
    
    return mock_client


# ============================================================================
# Authentication Fixtures
# ============================================================================

@pytest.fixture(scope='function')
def mock_auth_token():
    """Mock JWT token for authentication testing.
    
    This fixture provides a mock JWT token that can be used
    for testing authenticated endpoints.
    """
    return {
        'sub': 'auth0|test-user-id',
        'email': 'test@example.com',
        'name': 'Test User',
        'aud': 'clusterize1234',
        'iss': 'https://dev-uqzwqfq04uyjkvob.us.auth0.com/',
        'exp': 9999999999,  # Far future expiration
        'iat': 1000000000,
    }


@pytest.fixture(scope='function')
def auth_headers(mock_auth_token):
    """Authentication headers for API requests.
    
    This fixture provides properly formatted authorization headers
    for testing authenticated endpoints.
    """
    # Mock JWT encode/decode
    with patch('jwt.decode') as mock_decode:
        mock_decode.return_value = mock_auth_token
        return {
            'Authorization': 'Bearer mock-jwt-token',
            'Content-Type': 'application/json'
        }


# ============================================================================
# Data Fixtures
# ============================================================================

@pytest.fixture(scope='function')
def sample_project_data():
    """Sample project data for testing.
    
    This fixture provides consistent test data for project-related tests.
    """
    return {
        'id': 'test-project-123',
        'name': 'Test Project',
        'user_id': 'auth0|test-user-id',
        'description': 'A test project for unit testing',
        'created_at': '2024-01-01T00:00:00Z',
        'updated_at': '2024-01-01T00:00:00Z',
        'statistics': {
            'total_images': 10,
            'total_clusters': 3,
            'processed_images': 8
        }
    }


@pytest.fixture(scope='function')
def sample_cluster_data():
    """Sample cluster data for testing.
    
    This fixture provides consistent test data for cluster-related tests.
    """
    return {
        'id': 'test-cluster-456',
        'name': 'Test Cluster',
        'project_id': 'test-project-123',
        'objects': [
            {
                'id': 'obj-1',
                'name': 'test-image-1.jpg',
                'url': 'https://example.com/image1.jpg',
                'tags': ['nature', 'landscape']
            },
            {
                'id': 'obj-2', 
                'name': 'test-image-2.jpg',
                'url': 'https://example.com/image2.jpg',
                'tags': ['city', 'architecture']
            }
        ],
        'statistics': {
            'object_count': 2,
            'avg_similarity': 0.85
        }
    }


@pytest.fixture(scope='function')
def sample_storage_object():
    """Sample storage object data for testing.
    
    This fixture provides consistent test data for storage-related tests.
    """
    return {
        'id': 'obj-123',
        'name': 'test-image.jpg',
        'bucket_name': 'test-bucket',
        'object_path': 'projects/test-project-123/images/test-image.jpg',
        'url': 'https://example.com/test-image.jpg',
        'metadata': {
            'size': 1024000,
            'content_type': 'image/jpeg',
            'upload_date': '2024-01-01T00:00:00Z'
        },
        'tags': ['test', 'sample']
    }


# ============================================================================
# Mock Response Fixtures
# ============================================================================

@pytest.fixture(scope='function')
def mock_supabase_response():
    """Mock Supabase API response for testing.
    
    This fixture provides a mock response object that simulates
    Supabase API responses.
    """
    class MockResponse:
        def __init__(self, data=None, error=None, status_code=200):
            self.data = data
            self.error = error
            self.status_code = status_code
            
        def json(self):
            if self.error:
                return {'error': self.error}
            return self.data or []
    
    return MockResponse


# ============================================================================
# Test Utilities
# ============================================================================

@pytest.fixture(scope='function')
def temp_file():
    """Create a temporary file for testing file operations.
    
    This fixture creates a temporary file that is automatically
    cleaned up after the test completes.
    """
    fd, path = tempfile.mkstemp()
    try:
        yield path
    finally:
        os.close(fd)
        os.unlink(path)


@pytest.fixture(scope='function')
def temp_directory():
    """Create a temporary directory for testing.
    
    This fixture creates a temporary directory that is automatically
    cleaned up after the test completes.
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


# ============================================================================
# Pytest Configuration
# ============================================================================

@pytest.fixture(autouse=True)
def setup_test_environment():
    """Set up test environment before each test.
    
    This fixture runs automatically before each test to ensure
    a clean testing environment.
    """
    # Set testing environment variables
    original_env = os.environ.copy()
    
    # Override environment for testing
    os.environ.update({
        'FLASK_ENV': 'testing',
        'TESTING': 'True',
        'REDIS_DB': '1',  # Use separate Redis DB for testing
    })
    
    yield
    
    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


def pytest_configure(config):
    """Configure pytest settings.
    
    This function is called during pytest initialization to configure
    testing behavior and add custom markers.
    """
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "e2e: mark test as an end-to-end test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers automatically.
    
    This function automatically adds markers to tests based on their
    location in the test directory structure.
    """
    for item in items:
        # Add markers based on test file location
        if "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        elif "e2e" in str(item.fspath):
            item.add_marker(pytest.mark.e2e)
