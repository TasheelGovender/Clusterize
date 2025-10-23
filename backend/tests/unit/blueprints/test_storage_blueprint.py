"""
Unit tests for storage blueprint
"""
import pytest
from unittest.mock import Mock, patch
from flask import Flask
import json
import io

from blueprints.storage import create_storage_blueprint


class TestStorageBlueprint:
    """Test class for storage blueprint endpoints"""
    
    @pytest.fixture
    def container(self):
        """Mock container with all dependencies"""
        container = Mock()
        container.require_auth = Mock()
        container.object_repository = Mock()
        container.cluster_repository = Mock()
        container.project_repository = Mock()
        container.cache_service = Mock()
        container.supabase_client = Mock()
        container.config = Mock()
        return container
    
    @pytest.fixture
    def mock_storage_service(self):
        """Mock storage service"""
        with patch('blueprints.storage.StorageService') as mock_service:
            service_instance = Mock()
            mock_service.return_value = service_instance
            yield service_instance
    
    @pytest.fixture
    def client(self, container, mock_storage_service):
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
        storage_bp = create_storage_blueprint(container)
        app.register_blueprint(storage_bp)
        
        return app.test_client()


class TestUploadFiles(TestStorageBlueprint):
    """Test file upload endpoint"""
    
    def test_upload_files_success(self, client, mock_storage_service):
        """Test successful file upload"""
        # Arrange
        mock_storage_service.upload_files.return_value = None
        
        data = {
            'files': [(io.BytesIO(b'test file content'), 'test.jpg')]
        }
        
        # Act
        response = client.post('/api/storage/1', data=data)
        
        # Assert
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['message'] == 'Files uploaded successfully'
        # Verify the service was called with project_id and a list of files
        mock_storage_service.upload_files.assert_called_once()
        call_args = mock_storage_service.upload_files.call_args
        assert call_args[0][0] == 1  # project_id
        assert len(call_args[0][1]) == 1  # one file uploaded
    
    def test_upload_files_no_files(self, client, mock_storage_service):
        """Test upload with no files"""
        # Act
        response = client.post('/api/storage/1')
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'No selected files' in data['error']
    
    def test_upload_files_validation_error(self, client, mock_storage_service):
        """Test upload with validation error"""
        # Arrange
        mock_storage_service.upload_files.side_effect = ValueError('Invalid file type')
        
        data = {
            'files': [(io.BytesIO(b'test'), 'test.txt')]
        }
        
        # Act
        response = client.post('/api/storage/1', data=data)
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid file type' in data['error']
        assert 'Validation failed' in data['details']


class TestGetImages(TestStorageBlueprint):
    """Test get images endpoint"""
    
    def test_get_images_success(self, client, mock_storage_service):
        """Test successful image retrieval"""
        # Arrange
        mock_storage_service.get_objects_with_filters.return_value = [
            {'id': 1, 'filename': 'test1.jpg'},
            {'id': 2, 'filename': 'test2.jpg'}
        ]
        
        # Act
        response = client.get('/api/storage/1/get_images')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data) == 2
        assert data[0]['filename'] == 'test1.jpg'
        mock_storage_service.get_objects_with_filters.assert_called_once()
    
    def test_get_images_with_filters(self, client, mock_storage_service):
        """Test image retrieval with filters"""
        # Arrange
        mock_storage_service.get_objects_with_filters.return_value = [{'id': 1}]
        
        # Act
        response = client.get('/api/storage/1/get_images?clusters=animals&tags_list=cat,dog&relocated_images=true')
        
        # Assert
        assert response.status_code == 200
        mock_storage_service.get_objects_with_filters.assert_called_once_with(
            project_id=1,
            labels=None,
            clusters=['animals'],
            tags_list=['cat', 'dog'],
            label_names=[],
            relocated_images=True
        )
    
    def test_get_images_not_found(self, client, mock_storage_service):
        """Test when no images found"""
        # Arrange
        mock_storage_service.get_objects_with_filters.side_effect = ValueError('No objects found')
        
        # Act
        response = client.get('/api/storage/1/get_images')
        
        # Assert
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'No objects found' in data['error']


class TestUpdateObject(TestStorageBlueprint):
    """Test update object endpoint"""
    
    def test_update_object_success(self, client, mock_storage_service):
        """Test successful object update"""
        # Arrange
        mock_storage_service.update_object.return_value = {'id': 1, 'tags': ['updated']}
        
        # Act
        response = client.put('/api/storage/1/1', json={
            'tags': ['updated'],
            'new_cluster': 'new_cluster'
        })
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Object updated successfully'
        assert data['data']['tags'] == ['updated']
        mock_storage_service.update_object.assert_called_once_with(1, 1, ['updated'], 'new_cluster')
    
    def test_update_object_not_found(self, client, mock_storage_service):
        """Test update object when not found"""
        # Arrange
        mock_storage_service.update_object.side_effect = ValueError('Object not found')
        
        # Act
        response = client.put('/api/storage/1/999', json={'tags': ['test']})
        
        # Assert
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Object not found' in data['error']


class TestResetProject(TestStorageBlueprint):
    """Test reset project endpoint"""
    
    def test_reset_project_success(self, client, mock_storage_service):
        """Test successful project reset"""
        # Arrange
        mock_storage_service.reset_project.return_value = {
            'message': 'Project reset successfully',
            'data': {'deleted_objects': 5}
        }
        
        # Act
        response = client.post('/api/storage/1/reset')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Project reset successfully'
        assert data['data']['deleted_objects'] == 5
        mock_storage_service.reset_project.assert_called_once_with(1)
    
    def test_reset_project_validation_error(self, client, mock_storage_service):
        """Test reset project with validation error"""
        # Arrange
        mock_storage_service.reset_project.side_effect = ValueError('Invalid project')
        
        # Act
        response = client.post('/api/storage/1/reset')
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid project' in data['error']


class TestBatchUpdate(TestStorageBlueprint):
    """Test batch update endpoint"""
    
    def test_batch_update_success(self, client, mock_storage_service):
        """Test successful batch update"""
        # Arrange
        mock_storage_service.batch_update_objects.return_value = {
            'updated_count': 3,
            'objects': [1, 2, 3]
        }
        
        # Act
        response = client.post('/api/storage/1/batch_update', json={
            'object_ids': [1, 2, 3],
            'operations': {'add_tags': ['new_tag']}
        })
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Successfully updated 3 objects'
        assert data['data']['updated_count'] == 3
        mock_storage_service.batch_update_objects.assert_called_once_with(
            1, [1, 2, 3], {'add_tags': ['new_tag']}
        )
    
    def test_batch_update_no_object_ids(self, client, mock_storage_service):
        """Test batch update with no object IDs"""
        # Act
        response = client.post('/api/storage/1/batch_update', json={
            'operations': {'add_tags': ['tag']}
        })
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'object_ids is required' in data['error']
    
    def test_batch_update_no_operations(self, client, mock_storage_service):
        """Test batch update with no operations"""
        # Act
        response = client.post('/api/storage/1/batch_update', json={
            'object_ids': [1, 2]
        })
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'operations is required' in data['error']
    
    def test_batch_update_invalid_operation(self, client, mock_storage_service):
        """Test batch update with invalid operation"""
        # Act
        response = client.post('/api/storage/1/batch_update', json={
            'object_ids': [1, 2],
            'operations': {'invalid_op': 'value'}
        })
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'At least one valid operation required' in data['error']


class TestBlueprintCreation(TestStorageBlueprint):
    """Test blueprint creation"""
    
    def test_create_storage_blueprint_returns_blueprint(self, container):
        """Test that create_storage_blueprint returns a Blueprint instance"""
        # Act
        blueprint = create_storage_blueprint(container)
        
        # Assert
        assert blueprint.name == 'storage'
        assert blueprint.url_prefix == '/api/storage'