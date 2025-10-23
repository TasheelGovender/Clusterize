"""
Pytest configuration for security tests.
"""

import pytest
import os
import logging
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def pytest_addoption(parser):
    """Add command line options for pytest."""
    parser.addoption(
        "--base-url",
        action="store",
        default="http://localhost:3000",
        help="Base URL for testing"
    )
    parser.addoption(
        "--headless",
        action="store_true",
        default=True,
        help="Run browser in headless mode"
    )
    parser.addoption(
        "--test-username",
        action="store",
        default="test@gmail.com",
        help="Username for authenticated tests"
    )
    parser.addoption(
        "--test-password",
        action="store",
        default="test@1234",
        help="Password for authenticated tests"
    )

@pytest.fixture(scope="session")
def base_url(request):
    """Base URL for the application."""
    return request.config.getoption("--base-url")

@pytest.fixture(scope="session")
def test_credentials(request):
    """Test credentials for authentication."""
    return {
        "username": request.config.getoption("--test-username"),
        "password": request.config.getoption("--test-password")
    }

@pytest.fixture(scope="session")
def browser_options(request):
    """Browser options for Chrome driver."""
    options = Options()
    
    if request.config.getoption("--headless"):
        options.add_argument("--headless")
    
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-web-security")
    options.add_argument("--allow-running-insecure-content")
    
    return options

def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "auth: mark test as requiring authentication"
    )
    config.addinivalue_line(
        "markers", "api: mark test as API security test"
    )
    config.addinivalue_line(
        "markers", "ui: mark test as UI security test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )

def pytest_runtest_setup(item):
    """Setup for each test."""
    # Skip tests based on markers if needed
    pass

def pytest_runtest_teardown(item, nextitem):
    """Teardown for each test."""
    # Clean up after each test if needed
    pass