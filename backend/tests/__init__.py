"""Test package for the Flask backend application.

This package contains all tests for the backend application, organized into:
- unit/ : Unit tests for individual components and functions
- integration/ : Integration tests for API endpoints and database operations  
- e2e/ : End-to-end tests for complete user workflows

Test Configuration:
- conftest.py contains pytest fixtures and configuration
- Tests use the 'testing' configuration from config.py
- Redis DB 1 is used for testing to avoid conflicts with development data

Running Tests:
- Run all tests: pytest
- Run specific test types: pytest -m unit
- Run with coverage: pytest --cov=app
- Run verbose: pytest -v

Test Markers:
- @pytest.mark.unit - Unit tests (fast, isolated)
- @pytest.mark.integration - Integration tests (slower, external dependencies)
- @pytest.mark.e2e - End-to-end tests (slowest, full workflows)
- @pytest.mark.slow - Tests that take longer to run
"""

__version__ = '1.0.0'
__author__ = 'Backend Team'
