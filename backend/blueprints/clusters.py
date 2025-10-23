from flask import Blueprint, request, jsonify

from services import ClusterService


def create_clusters_blueprint(container):
    """Create clusters blueprint with dependencies"""
    clusters_bp = Blueprint('clusters', __name__, url_prefix='/api/clusters')
    
    # Get dependencies
    require_auth = container.require_auth
    cluster_service = ClusterService(
        container.cluster_repository,
        container.object_repository,
        container.cache_service,
        container.supabase_client
    )
    
    @clusters_bp.route('/<int:project_id>', methods=['GET', 'POST'])
    @require_auth(None)
    def clusters(project_id):
        if request.method == 'GET':
            try:
                result = cluster_service.get_project_clusters(project_id)
                return jsonify(result), 200
            except Exception as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Failed to fetch clusters'
                }), 400
        
        elif request.method == 'POST':
            try:
                data = request.get_json()
                cluster_service.create_clusters_from_data(project_id, data["clusterData"])
                return jsonify({'message': 'New clusters created'}), 201
            except ValueError as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Validation failed'
                }), 400
            except Exception as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Failed to create clusters'
                }), 400
            
    @clusters_bp.route('/<int:project_id>/new-cluster', methods=['POST'])
    @require_auth(None)
    def new_cluster(project_id):
        try:
            data = request.get_json()
            cluster_service.create_new_cluster(project_id, data["clusterName"], data["clusterLabel"])
            return jsonify({'message': 'New cluster created'}), 201
        except ValueError as e:
            return jsonify({
                'error': str(e),
                'details': 'Validation failed'
            }), 400
        except Exception as e:
            return jsonify({
                'error': str(e),
                'details': 'Failed to create clusters'
            }), 400

    @clusters_bp.route('/<int:project_id>/<string:cluster_number>', methods=['GET', 'PUT'])
    @require_auth(None)
    def cluster_detail(project_id, cluster_number):
        if request.method == 'GET':
            try:
                result = cluster_service.get_cluster_objects(cluster_number) # change this method to use number instead of ID
                return jsonify(result), 200
            except Exception as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Failed to fetch cluster objects'
                }), 400
        
        elif request.method == 'PUT':
            try:
                data = request.get_json()
                result = cluster_service.update_cluster(project_id, cluster_number, data["label_name"])
                return jsonify(result), 200
            except ValueError as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Cluster not found'
                }), 404
            except Exception as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Failed to update cluster'
                }), 400
            
    @clusters_bp.route('/<int:project_id>/<string:cluster_number>/reset', methods=['POST'])
    @require_auth(None)
    def reset_cluster(project_id, cluster_number):
        try:
            response = cluster_service.reset_cluster(project_id, cluster_number)
            return jsonify({'message': 'Cluster reset successfully', 'details': response}), 200
        except ValueError as e:
            return jsonify({
                'error': str(e),
                'details': 'Cluster not found'
            }), 404
        except Exception as e:
            return jsonify({
                'error': str(e),
                'details': 'Failed to reset cluster'
            }), 400

    return clusters_bp
