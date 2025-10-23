import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=True)

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    PUBLIC_SUPABASE_URL = os.environ.get("PUBLIC_SUPABASE_URL")
    PUBLIC_SUPABASE_SERVICE_ROLE_KEY = os.environ.get("PUBLIC_SUPABASE_SERVICE_ROLE_KEY")
    
    # Redis Configuration
    REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
    REDIS_DB = int(os.environ.get('REDIS_DB', 0))
    REDIS_SOCKET_TIMEOUT = 5
    REDIS_SOCKET_CONNECT_TIMEOUT = 5
    
    # Auth0 Configuration
    AUTH0_DOMAIN = "dev-uqzwqfq04uyjkvob.us.auth0.com"
    AUTH0_AUDIENCE = "clusterize1234"
    
    # Cache TTL settings
    PROJECT_CACHE_TTL = 3600  # 1 hour
    USER_PROJECTS_CACHE_TTL = 1800  # 30 minutes
    CLUSTER_OBJECTS_CACHE_TTL = 82800  # 23 hours


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    # Development logging
    LOG_LEVEL = 'DEBUG'
    LOG_TO_STDOUT = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    # Production logging
    LOG_LEVEL = 'WARNING'
    LOG_TO_STDOUT = False
    LOG_FILE = 'app.log'
    # Security settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'


class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    REDIS_DB = 1  # Use different Redis DB for testing


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
