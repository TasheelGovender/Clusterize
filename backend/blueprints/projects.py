from flask import Blueprint, request, jsonify

from services import ProjectService, UserService


def create_projects_blueprint(container):
    """Create projects blueprint with dependencies"""
    projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')
    
    # Get dependencies
    require_auth = container.require_auth
    user_service = UserService(container.user_repository)
    project_service = ProjectService(
        container.project_repository,
        container.cache_service,
        container.supabase_client,
        container.config,
        container.cluster_repository,  # Add cluster repository
        container.object_repository    # Add object repository
    )
    
    @projects_bp.route('/<sub_id>', methods=['GET', 'POST'])
    @require_auth(None)
    def projects(sub_id):
        try:
            # Get user_id from sub
            user = user_service.get_user_by_auth0_id(sub_id)
            if not user:
                # Try creating new user if not found
                user = user_service.create_user(auth0_id=sub_id, email=None)

            
            user_id = user['id']
        except Exception as e:
            return jsonify({
                'error': str(e),
                'details': 'Failed to get user_id'
            }), 400
        
        if request.method == 'GET':
            try:
                result = project_service.get_user_projects(user_id)
                return jsonify(result), 200
            except Exception as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Failed to retrieve projects'
                }), 400
        
        elif request.method == 'POST':
            try:
                data = request.get_json()
                result = project_service.create_project(user_id, data["project_name"])
                return jsonify(result), 201
            except ValueError as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Validation failed'
                }), 400
            except Exception as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Failed to create project'
                }), 400
    
    @projects_bp.route('/<int:project_id>', methods=['GET', 'PUT', 'DELETE'])
    @require_auth(None)
    def project(project_id):
        if request.method == 'PUT':
            try:
                data = request.get_json()
                result = project_service.update_project(project_id, data["project_name"])
                return jsonify(result), 200
            except Exception as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Failed to update project'
                }), 400
        
        elif request.method == 'DELETE':
            try:
                project_service.delete_project(project_id)
                return jsonify({'message': 'Project deleted successfully'}), 204
            except ValueError as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Project not found'
                }), 404
            except Exception as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Failed to delete project'
                }), 400
        
        elif request.method == 'GET':
            try:
                # Check if statistics are requested
                include_stats = request.args.get('include_stats', 'false').lower() == 'true'
                
                if include_stats:
                    result = project_service.get_project_with_statistics(project_id)
                else:
                    result = project_service.get_project_by_id(project_id)
                
                return jsonify(result), 200
            except ValueError as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Project not found'
                }), 404
            except Exception as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Failed to fetch project'
                }), 400
    
    return projects_bp
