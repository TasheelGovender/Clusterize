"""
Unit tests for clusters blueprint
"""
import pytest
from unittest.mock import Mock, patch
from flask import Flask
import json

from blueprints.clusters import create_clusters_blueprint


class TestClustersBlueprint:
    """Test class for clusters blueprint endpoints"""
    
    @pytest.fixture
    def container(self):
        """Mock container with all dependencies"""
        container = Mock()
        container.require_auth = Mock()
        container.cluster_repository = Mock()
        container.object_repository = Mock()
        container.cache_service = Mock()
        container.supabase_client = Mock()
        return container
    
    @pytest.fixture
    def mock_cluster_service(self):
        """Mock cluster service"""
        with patch('blueprints.clusters.ClusterService') as mock_service:
            service_instance = Mock()
            mock_service.return_value = service_instance
            yield service_instance
    
    @pytest.fixture
    def client(self, container, mock_cluster_service):
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
        clusters_bp = create_clusters_blueprint(container)
        app.register_blueprint(clusters_bp)
        
        return app.test_client()


class TestClustersEndpoint(TestClustersBlueprint):
    """Test the /<int:project_id> endpoint (GET and POST methods)"""
    
    def test_get_clusters_success(self, client, mock_cluster_service):
        """Test successful GET clusters"""
        # Arrange
        mock_cluster_service.get_project_clusters.return_value = [
            {'id': 1, 'name': 'cluster_1', 'label': 'Animals'},
            {'id': 2, 'name': 'cluster_2', 'label': 'Vehicles'}
        ]
        
        # Act
        response = client.get('/api/clusters/1')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data) == 2
        assert data[0]['label'] == 'Animals'
        mock_cluster_service.get_project_clusters.assert_called_once_with(1)
    
    def test_get_clusters_error(self, client, mock_cluster_service):
        """Test GET clusters with service error"""
        # Arrange
        mock_cluster_service.get_project_clusters.side_effect = Exception('Database error')
        
        # Act
        response = client.get('/api/clusters/1')
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Database error' in data['error']
        assert 'Failed to fetch clusters' in data['details']
    
    def test_create_clusters_success(self, client, mock_cluster_service):
        """Test successful POST create clusters"""
        # Arrange
        mock_cluster_service.create_clusters_from_data.return_value = None
        cluster_data = {
            'clusterData': [{'name': 'cluster_1', 'objects': [1, 2, 3]}]
        }
        
        # Act
        response = client.post('/api/clusters/1', json=cluster_data)
        
        # Assert
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['message'] == 'New clusters created'
        mock_cluster_service.create_clusters_from_data.assert_called_once_with(
            1, cluster_data['clusterData']
        )
    
    def test_create_clusters_validation_error(self, client, mock_cluster_service):
        """Test POST create clusters with validation error"""
        # Arrange
        mock_cluster_service.create_clusters_from_data.side_effect = ValueError('Invalid cluster data')
        
        # Act
        response = client.post('/api/clusters/1', json={'clusterData': []})
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid cluster data' in data['error']
        assert 'Validation failed' in data['details']


class TestNewClusterEndpoint(TestClustersBlueprint):
    """Test the /<int:project_id>/new-cluster endpoint"""
    
    def test_create_new_cluster_success(self, client, mock_cluster_service):
        """Test successful new cluster creation"""
        # Arrange
        mock_cluster_service.create_new_cluster.return_value = None
        
        # Act
        response = client.post('/api/clusters/1/new-cluster', json={
            'clusterName': 'new_cluster',
            'clusterLabel': 'New Label'
        })
        
        # Assert
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['message'] == 'New cluster created'
        mock_cluster_service.create_new_cluster.assert_called_once_with(
            1, 'new_cluster', 'New Label'
        )
    
    def test_create_new_cluster_validation_error(self, client, mock_cluster_service):
        """Test new cluster creation with validation error"""
        # Arrange
        mock_cluster_service.create_new_cluster.side_effect = ValueError('Invalid cluster name')
        
        # Act
        response = client.post('/api/clusters/1/new-cluster', json={
            'clusterName': '',
            'clusterLabel': 'Label'
        })
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid cluster name' in data['error']
        assert 'Validation failed' in data['details']


class TestClusterDetailEndpoint(TestClustersBlueprint):
    """Test the /<int:project_id>/<string:cluster_number> endpoint"""
    
    def test_get_cluster_objects_success(self, client, mock_cluster_service):
        """Test successful GET cluster objects"""
        # Arrange
        mock_cluster_service.get_cluster_objects.return_value = [
            {'id': 1, 'filename': 'image1.jpg'},
            {'id': 2, 'filename': 'image2.jpg'}
        ]
        
        # Act
        response = client.get('/api/clusters/1/cluster_1')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data) == 2
        assert data[0]['filename'] == 'image1.jpg'
        mock_cluster_service.get_cluster_objects.assert_called_once_with('cluster_1')
    
    def test_get_cluster_objects_error(self, client, mock_cluster_service):
        """Test GET cluster objects with error"""
        # Arrange
        mock_cluster_service.get_cluster_objects.side_effect = Exception('Cluster not found')
        
        # Act
        response = client.get('/api/clusters/1/invalid_cluster')
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Cluster not found' in data['error']
        assert 'Failed to fetch cluster objects' in data['details']
    
    def test_update_cluster_success(self, client, mock_cluster_service):
        """Test successful PUT update cluster"""
        # Arrange
        mock_cluster_service.update_cluster.return_value = {
            'id': 1, 'label_name': 'Updated Label'
        }
        
        # Act
        response = client.put('/api/clusters/1/cluster_1', json={
            'label_name': 'Updated Label'
        })
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['label_name'] == 'Updated Label'
        mock_cluster_service.update_cluster.assert_called_once_with(
            1, 'cluster_1', 'Updated Label'
        )
    
    def test_update_cluster_not_found(self, client, mock_cluster_service):
        """Test PUT update cluster when not found"""
        # Arrange
        mock_cluster_service.update_cluster.side_effect = ValueError('Cluster not found')
        
        # Act
        response = client.put('/api/clusters/1/invalid_cluster', json={
            'label_name': 'New Label'
        })
        
        # Assert
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Cluster not found' in data['error']


class TestResetClusterEndpoint(TestClustersBlueprint):
    """Test the /<int:project_id>/<string:cluster_number>/reset endpoint"""
    
    def test_reset_cluster_success(self, client, mock_cluster_service):
        """Test successful cluster reset"""
        # Arrange
        mock_cluster_service.reset_cluster.return_value = {
            'reset_objects': 5,
            'cluster_name': 'cluster_1'
        }
        
        # Act
        response = client.post('/api/clusters/1/cluster_1/reset')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Cluster reset successfully'
        assert data['details']['reset_objects'] == 5
        mock_cluster_service.reset_cluster.assert_called_once_with(1, 'cluster_1')
    
    def test_reset_cluster_not_found(self, client, mock_cluster_service):
        """Test reset cluster when not found"""
        # Arrange
        mock_cluster_service.reset_cluster.side_effect = ValueError('Cluster not found')
        
        # Act
        response = client.post('/api/clusters/1/invalid_cluster/reset')
        
        # Assert
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Cluster not found' in data['error']
        assert 'Cluster not found' in data['details']


class TestBlueprintCreation(TestClustersBlueprint):
    """Test blueprint creation"""
    
    def test_create_clusters_blueprint_returns_blueprint(self, container):
        """Test that create_clusters_blueprint returns a Blueprint instance"""
        # Act
        blueprint = create_clusters_blueprint(container)
        
        # Assert
        assert blueprint.name == 'clusters'
        assert blueprint.url_prefix == '/api/clusters'