import redis
import json
from supabase import create_client, Client
from authlib.integrations.flask_oauth2 import ResourceProtector
from validator import Auth0JWTBearerTokenValidator
from repositories import (
    UserRepository, ProjectRepository, ClusterRepository, ObjectRepository
)
from services import CacheService


class Container:
    """Dependency injection container"""
    
    def __init__(self, config):
        self.config = config
        self._supabase_client = None
        self._redis_client = None
        self._auth_validator = None
        self._require_auth = None
        self._redis_available = None
        self._user_repository = None
        self._project_repository = None
        self._cluster_repository = None
        self._object_repository = None
        self._cache_service = None
    
    @property
    def supabase_client(self) -> Client:
        """Get Supabase client instance"""
        if self._supabase_client is None:
            url = self.config.PUBLIC_SUPABASE_URL
            key = self.config.PUBLIC_SUPABASE_SERVICE_ROLE_KEY
            self._supabase_client = create_client(url, key)
        return self._supabase_client
    
    @property
    def redis_client(self):
        """Get Redis client instance with error handling"""
        if self._redis_client is None:
            try:
                self._redis_client = redis.Redis(
                    host=self.config.REDIS_HOST,
                    port=self.config.REDIS_PORT,
                    db=self.config.REDIS_DB,
                    decode_responses=True,
                    socket_timeout=self.config.REDIS_SOCKET_TIMEOUT,
                    socket_connect_timeout=self.config.REDIS_SOCKET_CONNECT_TIMEOUT
                )
                # Test the connection
                self._redis_client.ping()
                self._redis_available = True
                print("Redis connection established successfully")
            except (redis.ConnectionError, redis.TimeoutError, Exception) as e:
                print(f"Redis connection failed: {e}")
                self._redis_client = None
                self._redis_available = False
        return self._redis_client
    
    @property
    def redis_available(self) -> bool:
        """Check if Redis is available"""
        if self._redis_available is None:
            # Trigger redis_client property to initialize connection
            self.redis_client
        return self._redis_available or False
    
    @property
    def require_auth(self):
        """Get auth requirement decorator"""
        if self._require_auth is None:
            self._require_auth = ResourceProtector()
            validator = Auth0JWTBearerTokenValidator(
                self.config.AUTH0_DOMAIN,
                self.config.AUTH0_AUDIENCE
            )
            self._require_auth.register_token_validator(validator)
        return self._require_auth
    
    @property
    def cache_service(self) -> CacheService:
        """Get cache service instance"""
        if self._cache_service is None:
            self._cache_service = CacheService(
                self.redis_client,
                self.redis_available,
                self.config
            )
        return self._cache_service
    
    @property
    def user_repository(self) -> UserRepository:
        """Get user repository instance"""
        if self._user_repository is None:
            self._user_repository = UserRepository(self.supabase_client)
        return self._user_repository
    
    @property
    def project_repository(self) -> ProjectRepository:
        """Get project repository instance"""
        if self._project_repository is None:
            self._project_repository = ProjectRepository(self.supabase_client)
        return self._project_repository
    
    @property
    def cluster_repository(self) -> ClusterRepository:
        """Get cluster repository instance"""
        if self._cluster_repository is None:
            self._cluster_repository = ClusterRepository(self.supabase_client)
        return self._cluster_repository
    
    @property
    def object_repository(self) -> ObjectRepository:
        """Get object repository instance"""
        if self._object_repository is None:
            self._object_repository = ObjectRepository(self.supabase_client)
        return self._object_repository
