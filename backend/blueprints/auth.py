from flask import Blueprint, request, jsonify
from authlib.integrations.flask_oauth2 import current_token

from services import UserService


def create_auth_blueprint(container):
    """Create authentication blueprint with dependencies"""
    auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
    
    # Get dependencies
    require_auth = container.require_auth
    user_service = UserService(container.user_repository)
    
    @auth_bp.route('/users', methods=['POST', 'DELETE'])
    @require_auth(None)
    def users():
        if request.method == 'POST':
            try:
                data = request.get_json()
                user = user_service.create_user(current_token['sub'], data["email"])
                return jsonify(user), 201
            except Exception as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Failed to create user'
                }), 400
        
        elif request.method == 'DELETE':
            try:
                result = user_service.delete_user(current_token['sub'])
                return jsonify(result), 204
            except Exception as e:
                return jsonify({
                    'error': str(e),
                    'details': 'Failed to delete user'
                }), 400
    
    @auth_bp.route('/sign-in', methods=['POST'])
    @require_auth(None)
    def signin():
        try:
            data = request.get_json()
            result = user_service.sign_in_or_create_user(
                current_token['sub'], 
                data["email"]
            )
            
            status_code = 201 if result['is_new'] else 200
            return jsonify({
                'message': result['message'],
                'user': result['user']
            }), status_code
            
        except Exception as e:
            return jsonify({
                'error': str(e),
                'details': 'Failed to validate user'
            }), 400
    
    return auth_bp
