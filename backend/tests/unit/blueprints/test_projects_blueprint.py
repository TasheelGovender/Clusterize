"""
Unit tests for projects blueprint
"""
import pytest
from unittest.mock import Mock, patch
from flask import Flask
import json

from blueprints.projects import create_projects_blueprint


class TestProjectsBlueprint:
    """Test class for projects blueprint endpoints"""
    
    @pytest.fixture
    def container(self):
        """Mock container with all dependencies"""
        container = Mock()
        container.require_auth = Mock()
        container.user_repository = Mock()
        container.project_repository = Mock()
        container.cache_service = Mock()
        container.supabase_client = Mock()
        container.config = Mock()
        container.cluster_repository = Mock()
        container.object_repository = Mock()
        return container
    
    @pytest.fixture
    def mock_services(self):
        """Mock service instances - patch where they're imported in the blueprint"""
        with patch('blueprints.projects.UserService') as mock_user_service, \
             patch('blueprints.projects.ProjectService') as mock_project_service:
            
            user_service_instance = Mock()
            project_service_instance = Mock()
            
            mock_user_service.return_value = user_service_instance
            mock_project_service.return_value = project_service_instance
            
            yield {
                'user_service': user_service_instance,
                'project_service': project_service_instance
            }
    
    @pytest.fixture
    def client(self, container, mock_services):
        """Create test client with blueprint registered"""
        # Create a fresh Flask app for each test
        app = Flask(__name__)
        app.config['TESTING'] = True
        
        # Mock the auth decorator to bypass authentication
        def mock_require_auth(permissions):
            def decorator(f):
                def wrapper(*args, **kwargs):
                    return f(*args, **kwargs)
                # Give each wrapper a unique name to avoid endpoint conflicts
                wrapper.__name__ = f"{f.__name__}_{id(f)}"
                return wrapper
            return decorator
        
        container.require_auth.side_effect = mock_require_auth
        
        # Create and register blueprint (services are already mocked at this point)
        projects_bp = create_projects_blueprint(container)
        app.register_blueprint(projects_bp)
        
        return app.test_client()


class TestProjectsEndpoint(TestProjectsBlueprint):
    """Test the /<sub_id> endpoint (GET and POST methods)"""
    
    def test_get_projects_success(self, client, mock_services):
        """Test successful GET /api/projects/<sub_id>"""
        # Arrange
        mock_services['user_service'].get_user_by_auth0_id.return_value = {'id': 123}
        mock_services['project_service'].get_user_projects.return_value = [
            {'id': 1, 'name': 'Test Project 1'},
            {'id': 2, 'name': 'Test Project 2'}
        ]
        
        # Act
        response = client.get('/api/projects/test-sub-id')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data) == 2
        assert data[0]['name'] == 'Test Project 1'
        
        mock_services['user_service'].get_user_by_auth0_id.assert_called_once_with('test-sub-id')
        mock_services['project_service'].get_user_projects.assert_called_once_with(123)
    
    def test_get_projects_user_not_found(self, client, mock_services):
        """Test GET projects when user not found"""
        # Arrange
        mock_services['user_service'].get_user_by_auth0_id.return_value = None
        
        # Act
        response = client.get('/api/projects/invalid-sub-id')
        
        # Assert
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'User not found' in data['error']
        
        mock_services['user_service'].get_user_by_auth0_id.assert_called_once_with('invalid-sub-id')
        mock_services['project_service'].get_user_projects.assert_not_called()
    
    def test_get_projects_service_exception(self, client, mock_services):
        """Test GET projects when user service raises exception"""
        # Arrange
        mock_services['user_service'].get_user_by_auth0_id.side_effect = Exception('Database error')
        
        # Act
        response = client.get('/api/projects/test-sub-id')
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Database error' in data['error']
        assert 'Failed to get user_id' in data['details']
    
    def test_get_projects_retrieve_exception(self, client, mock_services):
        """Test GET projects when project service raises exception"""
        # Arrange
        mock_services['user_service'].get_user_by_auth0_id.return_value = {'id': 123}
        mock_services['project_service'].get_user_projects.side_effect = Exception('Service error')
        
        # Act
        response = client.get('/api/projects/test-sub-id')
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Service error' in data['error']
        assert 'Failed to retrieve projects' in data['details']
    
    def test_create_project_success(self, client, mock_services):
        """Test successful POST /api/projects/<sub_id>"""
        # Arrange
        mock_services['user_service'].get_user_by_auth0_id.return_value = {'id': 123}
        mock_services['project_service'].create_project.return_value = {
            'id': 1, 
            'name': 'New Project',
            'created_at': '2025-10-08T12:00:00Z'
        }
        
        # Act
        response = client.post('/api/projects/test-sub-id', 
                             json={'project_name': 'New Project'})
        
        # Assert
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['name'] == 'New Project'
        assert data['id'] == 1
        
        mock_services['project_service'].create_project.assert_called_once_with(123, 'New Project')
    
    def test_create_project_validation_error(self, client, mock_services):
        """Test POST project with validation error"""
        # Arrange
        mock_services['user_service'].get_user_by_auth0_id.return_value = {'id': 123}
        mock_services['project_service'].create_project.side_effect = ValueError('Project name too short')
        
        # Act
        response = client.post('/api/projects/test-sub-id', 
                             json={'project_name': 'A'})
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Project name too short' in data['error']
        assert 'Validation failed' in data['details']
    
    def test_create_project_general_exception(self, client, mock_services):
        """Test POST project with general exception"""
        # Arrange
        mock_services['user_service'].get_user_by_auth0_id.return_value = {'id': 123}
        mock_services['project_service'].create_project.side_effect = Exception('Database connection failed')
        
        # Act
        response = client.post('/api/projects/test-sub-id', 
                             json={'project_name': 'Valid Project'})
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Database connection failed' in data['error']
        assert 'Failed to create project' in data['details']
    
    def test_create_project_missing_project_name(self, client, mock_services):
        """Test POST project with missing project_name"""
        # Arrange
        mock_services['user_service'].get_user_by_auth0_id.return_value = {'id': 123}
        
        # Act
        response = client.post('/api/projects/test-sub-id', json={})
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Failed to create project' in data['details']


class TestProjectEndpoint(TestProjectsBlueprint):
    """Test the /<int:project_id> endpoint (GET, PUT, DELETE methods)"""
    
    def test_get_project_by_id_success(self, client, mock_services):
        """Test successful GET /api/projects/<project_id>"""
        # Arrange
        mock_services['project_service'].get_project_by_id.return_value = {
            'id': 1, 
            'name': 'Test Project',
            'created_at': '2025-10-08T12:00:00Z'
        }
        
        # Act
        response = client.get('/api/projects/1')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['id'] == 1
        assert data['name'] == 'Test Project'
        
        mock_services['project_service'].get_project_by_id.assert_called_once_with(1)
        mock_services['project_service'].get_project_with_statistics.assert_not_called()
    
    def test_get_project_with_statistics(self, client, mock_services):
        """Test GET project with statistics parameter"""
        # Arrange
        mock_services['project_service'].get_project_with_statistics.return_value = {
            'id': 1, 
            'name': 'Test Project',
            'created_at': '2025-10-08T12:00:00Z',
            'stats': {
                'total_objects': 15,
                'total_clusters': 3
            }
        }
        
        # Act
        response = client.get('/api/projects/1?include_stats=true')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'stats' in data
        assert data['stats']['total_objects'] == 15
        
        mock_services['project_service'].get_project_with_statistics.assert_called_once_with(1)
        mock_services['project_service'].get_project_by_id.assert_not_called()
    
    def test_get_project_with_statistics_false(self, client, mock_services):
        """Test GET project with include_stats=false"""
        # Arrange
        mock_services['project_service'].get_project_by_id.return_value = {
            'id': 1, 'name': 'Test Project'
        }
        
        # Act
        response = client.get('/api/projects/1?include_stats=false')
        
        # Assert
        assert response.status_code == 200
        mock_services['project_service'].get_project_by_id.assert_called_once_with(1)
        mock_services['project_service'].get_project_with_statistics.assert_not_called()
    
    def test_get_project_not_found(self, client, mock_services):
        """Test GET project when project not found"""
        # Arrange
        mock_services['project_service'].get_project_by_id.side_effect = ValueError('Project not found')
        
        # Act
        response = client.get('/api/projects/999')
        
        # Assert
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Project not found' in data['error']
        assert 'Project not found' in data['details']
    
    def test_get_project_general_exception(self, client, mock_services):
        """Test GET project with general exception"""
        # Arrange
        mock_services['project_service'].get_project_by_id.side_effect = Exception('Database error')
        
        # Act
        response = client.get('/api/projects/1')
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Database error' in data['error']
        assert 'Failed to fetch project' in data['details']
    
    def test_update_project_success(self, client, mock_services):
        """Test successful PUT /api/projects/<project_id>"""
        # Arrange
        mock_services['project_service'].update_project.return_value = {
            'id': 1, 
            'name': 'Updated Project Name',
            'updated_at': '2025-10-08T12:30:00Z'
        }
        
        # Act
        response = client.put('/api/projects/1', 
                            json={'project_name': 'Updated Project Name'})
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['name'] == 'Updated Project Name'
        
        mock_services['project_service'].update_project.assert_called_once_with(1, 'Updated Project Name')
    
    def test_update_project_exception(self, client, mock_services):
        """Test PUT project with exception"""
        # Arrange
        mock_services['project_service'].update_project.side_effect = Exception('Update failed')
        
        # Act
        response = client.put('/api/projects/1', 
                            json={'project_name': 'New Name'})
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Update failed' in data['error']
        assert 'Failed to update project' in data['details']
    
    def test_delete_project_success(self, client, mock_services):
        """Test successful DELETE /api/projects/<project_id>"""
        # Arrange
        mock_services['project_service'].delete_project.return_value = None
        
        # Act
        response = client.delete('/api/projects/1')
        
        # Assert
        assert response.status_code == 204
        assert response.data == b''
        
        mock_services['project_service'].delete_project.assert_called_once_with(1)
    
    def test_delete_project_not_found(self, client, mock_services):
        """Test DELETE project when project not found"""
        # Arrange
        mock_services['project_service'].delete_project.side_effect = ValueError('Project not found')
        
        # Act
        response = client.delete('/api/projects/999')
        
        # Assert
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Project not found' in data['error']
        assert 'Project not found' in data['details']
    
    def test_delete_project_general_exception(self, client, mock_services):
        """Test DELETE project with general exception"""
        # Arrange
        mock_services['project_service'].delete_project.side_effect = Exception('Cascade delete failed')
        
        # Act
        response = client.delete('/api/projects/1')
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Cascade delete failed' in data['error']
        assert 'Failed to delete project' in data['details']


class TestBlueprintCreation(TestProjectsBlueprint):
    """Test blueprint creation and dependency injection"""
    
    def test_create_projects_blueprint_returns_blueprint(self, container):
        """Test that create_projects_blueprint returns a Blueprint instance"""
        # Act
        blueprint = create_projects_blueprint(container)
        
        # Assert
        assert blueprint.name == 'projects'
        assert blueprint.url_prefix == '/api/projects'
    
    def test_blueprint_dependencies_injected(self, container):
        """Test that all dependencies are properly injected"""
        # Arrange
        with patch('blueprints.projects.UserService') as mock_user_service, \
             patch('blueprints.projects.ProjectService') as mock_project_service:
            
            # Act
            create_projects_blueprint(container)
            
            # Assert
            mock_user_service.assert_called_once_with(container.user_repository)
            mock_project_service.assert_called_once_with(
                container.project_repository,
                container.cache_service,
                container.supabase_client,
                container.config,
                container.cluster_repository,
                container.object_repository
            )