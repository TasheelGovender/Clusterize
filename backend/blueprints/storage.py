from flask import Blueprint, request, jsonify

from services import StorageService


def create_storage_blueprint(container):
    """Create storage blueprint with dependencies"""
    storage_bp = Blueprint('storage', __name__, url_prefix='/api/storage')
    
    # Get dependencies
    require_auth = container.require_auth
    
    storage_service = StorageService(
        container.object_repository,
        container.cluster_repository,
        container.project_repository,
        container.cache_service,
        container.supabase_client,
        container.config
    )

    def process_list_param(param_list):
        """Efficiently process list parameters with comma separation"""
        if not param_list:
            return []
        
        result = []
        for item in param_list:
            if ',' in item:
                result.extend(part.strip() for part in item.split(',') if part.strip())
            else:
                stripped = item.strip()
                if stripped:
                    result.append(stripped)
        return result
    
    @storage_bp.route('/<int:project_id>', methods=['POST'])
    @require_auth(None)
    def upload_files(project_id):
        try:
            # Check if files exist in request
            if 'files' not in request.files:
                return jsonify({"error": "No selected files"}), 400
            
            files = request.files.getlist('files')
            if not files or files[0].filename == '':
                return jsonify({"error": "No selected file"}), 400
            
            storage_service.upload_files(project_id, files)
            return jsonify({"message": "Files uploaded successfully"}), 200
            
        except ValueError as e:
            return jsonify({
                'error': str(e),
                'details': 'Validation failed'
            }), 400
        except Exception as e:
            return jsonify({
                'error': str(e),
                'details': 'Failed to upload files'
            }), 400
    
    @storage_bp.route('/<int:project_id>/get_images', methods=['GET'])
    @require_auth(None)
    def get_images(project_id):
        try:
            # Get single parameter filters (for special cases like labels)
            labels = request.args.get('labels')
            
            # Get new multiple parameter format - supports ?clusters=animals&clusters=vehicles
            clusters = process_list_param(request.args.getlist('clusters'))
            tags_list = process_list_param(request.args.getlist('tags_list'))
            label_names = process_list_param(request.args.getlist('label_names'))
            relocated_images = request.args.get('relocated_images') == 'true'
            
            # Call optimized service method (removed backwards compatibility parameters)
            result = storage_service.get_objects_with_filters(
                project_id=project_id,
                labels=labels,
                clusters=clusters,
                tags_list=tags_list,
                label_names=label_names,
                relocated_images=relocated_images
            )
            return jsonify(result), 200
            
        except ValueError as e:
            return jsonify({
                'error': str(e),
                'details': 'No objects found'
            }), 404
        except Exception as e:
            return jsonify({
                'error': str(e),
                'details': 'Failed to fetch objects'
            }), 400

    @storage_bp.route('/<int:project_id>/<int:object_id>', methods=['PUT'])
    @require_auth(None)
    def update_object(project_id, object_id):
        try:
            data = request.get_json()
            
            tags = data.get('tags')
            new_cluster = data.get('new_cluster')
            
            result = storage_service.update_object(
                project_id, object_id, tags, new_cluster
            )
            
            return jsonify({
                "message": "Object updated successfully",
                "data": result
            }), 200
            
        except ValueError as e:
            return jsonify({
                'error': str(e),
                'details': 'Resource not found'
            }), 404
        except Exception as e:
            return jsonify({
                'error': str(e),
                'details': 'Failed to update object'
            }), 400

    @storage_bp.route('/<int:project_id>/reset', methods=['POST'])
    @require_auth(None)
    def reset_project(project_id):
        try:
           result = storage_service.reset_project(project_id)
           return jsonify({
               "message": result["message"],
               "data": result["data"]
           }), 200
        except ValueError as e:
            return jsonify({
                'error': str(e),
                'details': 'Validation failed'
            }), 400
        except Exception as e:
            return jsonify({
                'error': str(e),
                'details': 'Failed to reset project'
            }), 500
    
    @storage_bp.route('/<int:project_id>/batch_update', methods=['POST'])
    @require_auth(None)
    def batch_update(project_id):
        try:
            data = request.get_json()
            
            # Validate request has JSON data
            if not data:
                return jsonify({"error": "No JSON data provided"}), 400
            
            object_ids = data.get('object_ids', [])
            operations = data.get('operations', {})
            
            # Enhanced validation
            if not object_ids:
                return jsonify({"error": "object_ids is required and cannot be empty"}), 400
            
            if not operations:
                return jsonify({"error": "operations is required and cannot be empty"}), 400
            
            # Validate object_ids is a list of integers
            if not isinstance(object_ids, list):
                return jsonify({"error": "object_ids must be a list"}), 400
            
            for obj_id in object_ids:
                if not isinstance(obj_id, int):
                    return jsonify({"error": "All object_ids must be integers"}), 400
            
            # Validate operations is a dictionary
            if not isinstance(operations, dict):
                return jsonify({"error": "operations must be an object"}), 400
            
            # Validate operation types
            valid_operations = ['add_tags', 'new_cluster']
            provided_operations = [key for key in operations.keys() if key in valid_operations]
            
            if not provided_operations:
                return jsonify({
                    "error": f"At least one valid operation required: {valid_operations}"
                }), 400
            
            if len(provided_operations) > 1:
                return jsonify({
                    "error": "Only one operation type allowed per request"
                }), 400
            
            result = storage_service.batch_update_objects(
                project_id, object_ids, operations
            )
            
            return jsonify({
                "message": f"Successfully updated {result['updated_count']} objects",
                "data": result
            }), 200
            
        except ValueError as e:
            return jsonify({
                'error': str(e),
                'details': 'Validation failed'
            }), 400
        except Exception as e:
            return jsonify({
                'error': str(e),
                'details': 'Failed to batch update objects'
            }), 500
    
    return storage_bp
