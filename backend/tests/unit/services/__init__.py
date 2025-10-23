"""Services unit tests package.

This package contains unit tests for all service layer classes.
Each service has its own test file following the pattern:
test_<service_name>_service.py

Test files in this directory:
- test_cluster_service.py - ClusterService business logic tests
- test_project_service.py - ProjectService business logic tests  
- test_storage_service.py - StorageService business logic tests
- test_cache_service.py - CacheService business logic tests
- test_user_service.py - UserService business logic tests

Each test file follows the structure:
- Main test class for the service
- Nested classes for grouping related functionality
- Comprehensive mocking of dependencies
- Edge cases and error scenarios
- Integration-style workflow tests
"""