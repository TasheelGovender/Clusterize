from flask import Flask, jsonify

from config import config
from container import Container
from blueprints.auth import create_auth_blueprint
from blueprints.projects import create_projects_blueprint
from blueprints.clusters import create_clusters_blueprint
from blueprints.storage import create_storage_blueprint


def create_app(config_name='development'):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize container with configuration
    container = Container(config[config_name])
    
    # Repository and service instances are automatically created by the container properties
    
    # Register blueprints
    app.register_blueprint(create_auth_blueprint(container))
    app.register_blueprint(create_projects_blueprint(container))
    app.register_blueprint(create_clusters_blueprint(container))
    app.register_blueprint(create_storage_blueprint(container))
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad request'}), 400
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'redis_available': container.redis_available
        }), 200
    
    return app
