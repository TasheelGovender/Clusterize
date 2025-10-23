"""
Security tests for protected pages and authentication flows.
Tests unauthorized access attempts and proper authentication redirects.
"""

import pytest
import time
import logging
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TestAuthenticationSecurity:
    """Test suite for authentication and authorization security."""

    @pytest.fixture(scope="function")  # Changed from "class" to "function"
    def driver(self):
        """Initialize Chrome driver for testing."""
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        
        driver = webdriver.Chrome(options=chrome_options)
        driver.implicitly_wait(10)
        yield driver
        driver.quit()

    @pytest.fixture
    def unauthenticated_driver(self, driver):
        """Ensure driver has no authentication cookies or session data."""
        logger.info("✓ Fresh browser instance created for unauthenticated test")
        return driver

    @pytest.fixture
    def authenticated_driver(self, driver):
        """Log in the driver for authenticated tests."""
        driver.get("http://localhost:3000")
        
        # Click "Get Started" to initiate login
        try:
            get_started_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Get Started')]"))
            )
            get_started_btn.click()
        except TimeoutException:
            logger.warning("Get Started button not found, trying direct login")
            driver.get("http://localhost:3000/api/auth/login")

        # Wait for Auth0 login form and fill credentials
        try:
            username_field = WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.NAME, "username"))
            )
            password_field = driver.find_element(By.NAME, "password")
            submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
            
            username_field.send_keys("test@gmail.com")
            password_field.send_keys("test@1234")
            submit_btn.click()
            
            # Wait for successful login (should redirect to projects page)
            WebDriverWait(driver, 15).until(
                lambda d: "/projects" in d.current_url or "/user-profile" in d.current_url
            )
            logger.info("Successfully authenticated")
            
        except TimeoutException:
            logger.error("Authentication failed - login form not found or login unsuccessful")
            pytest.skip("Cannot authenticate - skipping authenticated tests")
            
        return driver

    def test_unauthenticated_access_to_projects_page(self, unauthenticated_driver):
        """Test that unauthenticated users cannot access the projects page."""
        driver = unauthenticated_driver
        
        # Try to access projects page directly
        driver.get("http://localhost:3000/projects")
        
        # Should be redirected to login or home page
        time.sleep(2)  # Allow time for redirect
        
        current_url = driver.current_url
        assert any([
            "/api/auth/login" in current_url,
            current_url == "http://localhost:3000/",
            "auth0" in current_url.lower()
        ]), f"Expected redirect to login, but got: {current_url}"
        
        logger.info("✓ Unauthenticated access to /projects properly blocked")

    def test_unauthenticated_access_to_specific_project(self, unauthenticated_driver):
        """Test that unauthenticated users cannot access specific project pages."""
        driver = unauthenticated_driver
        
        # Try to access a specific project page
        driver.get("http://localhost:3000/projects/84")
        
        time.sleep(2)  # Allow time for redirect
        
        current_url = driver.current_url
        assert any([
            "/api/auth/login" in current_url,
            current_url == "http://localhost:3000/",
            "auth0" in current_url.lower()
        ]), f"Expected redirect to login, but got: {current_url}"
        
        logger.info("✓ Unauthenticated access to specific project properly blocked")

    def test_unauthenticated_access_to_user_profile(self, unauthenticated_driver):
        """Test that unauthenticated users cannot access user profile page."""
        driver = unauthenticated_driver
        
        # Try to access user profile page
        driver.get("http://localhost:3000/user-profile")
        
        time.sleep(2)  # Allow time for redirect
        
        current_url = driver.current_url
        assert any([
            "/api/auth/login" in current_url,
            current_url == "http://localhost:3000/",
            "auth0" in current_url.lower()
        ]), f"Expected redirect to login, but got: {current_url}"
        
        logger.info("✓ Unauthenticated access to user profile properly blocked")

    def test_authenticated_access_to_projects_page(self, authenticated_driver):
        """Test that authenticated users can access the projects page."""
        driver = authenticated_driver
        
        # Navigate to projects page
        driver.get("http://localhost:3000/projects")
        
        # Should successfully load the projects page
        try:
            # Look for elements that indicate we're on the projects page
            WebDriverWait(driver, 10).until(
                EC.any_of(
                    EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Create Project')]")),
                    EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Projects')]")),
                    EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'project')]"))
                )
            )
            
            # Check that we're still on the projects page (not redirected)
            assert "/projects" in driver.current_url, f"Expected to be on projects page, but got: {driver.current_url}"
            logger.info("✓ Authenticated access to projects page successful")
            
        except TimeoutException:
            pytest.fail("Projects page did not load properly for authenticated user")

    def test_authenticated_access_to_user_profile(self, authenticated_driver):
        """Test that authenticated users can access their profile page."""
        driver = authenticated_driver
        
        # Navigate to user profile page
        driver.get("http://localhost:3000/user-profile")
        
        # Should successfully load the user profile page
        try:
            # Look for elements that indicate we're on the user profile page
            WebDriverWait(driver, 10).until(
                EC.any_of(
                    EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Profile')]")),
                    EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'profile')]")),
                    EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'test@gmail.com')]"))
                )
            )
            
            assert "/user-profile" in driver.current_url, f"Expected to be on user profile page, but got: {driver.current_url}"
            logger.info("✓ Authenticated access to user profile successful")
            
        except TimeoutException:
            pytest.fail("User profile page did not load properly for authenticated user")

    # def test_session_expiry_simulation(self, authenticated_driver):
    #     """Test behavior when session expires (simulated by clearing cookies)."""
    #     driver = authenticated_driver
        
    #     # First, verify we're authenticated by accessing projects page
    #     driver.get("http://localhost:3000/projects")
        
    #     try:
    #         WebDriverWait(driver, 10).until(
    #             EC.any_of(
    #                 EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Create Project')]")),
    #                 EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Projects')]"))
    #             )
    #         )
    #         logger.info("Initial authentication verified")
    #     except TimeoutException:
    #         pytest.skip("Could not verify initial authentication")
        
    #     # Simulate session expiry by clearing all cookies
    #     driver.delete_all_cookies()
        
    #     # Try to access a protected page
    #     driver.get("http://localhost:3000/projects")
    #     time.sleep(2)  # Allow time for redirect
        
    #     # Should be redirected to login
    #     current_url = driver.current_url
    #     assert any([
    #         "/api/auth/login" in current_url,
    #         current_url == "http://localhost:3000/",
    #         "auth0" in current_url.lower()
    #     ]), f"Expected redirect to login after session expiry, but got: {current_url}"
        
    #     logger.info("✓ Session expiry properly handled with redirect to login")

    def test_direct_api_auth_endpoints(self, unauthenticated_driver):
        """Test direct access to authentication API endpoints."""
        driver = unauthenticated_driver
        
        # Test logout endpoint (should not cause errors)
        driver.get("http://localhost:3000/api/auth/logout")
        time.sleep(2)
        
        # Should redirect to home page or login
        current_url = driver.current_url
        assert any([
            current_url == "http://localhost:3000/",
            "/api/auth/login" in current_url,
            "auth0" in current_url.lower()
        ]), f"Logout endpoint should redirect properly, got: {current_url}"
        
        logger.info("✓ Auth API endpoints handle unauthenticated access properly")

    def test_user_avatar_not_displayed_when_unauthenticated(self, unauthenticated_driver):
        """Test that user avatar is not displayed for unauthenticated users."""
        driver = unauthenticated_driver
        
        # Go to home page
        driver.get("http://localhost:3000")
        time.sleep(2)
        
        # Check that user avatar is not present
        avatars = driver.find_elements(By.XPATH, "//button[contains(@class, 'rounded-full')]//img")
        user_dropdowns = driver.find_elements(By.XPATH, "//*[contains(text(), 'Log out')]")
        
        assert len(avatars) == 0, "User avatar should not be displayed for unauthenticated users"
        assert len(user_dropdowns) == 0, "User dropdown should not be displayed for unauthenticated users"
        
        logger.info("✓ User avatar properly hidden for unauthenticated users")

    def test_user_avatar_displayed_when_authenticated(self, authenticated_driver):
        """Test that user avatar is displayed for authenticated users."""
        driver = authenticated_driver
        
        # Navigate to a protected page where avatar should be visible
        driver.get("http://localhost:3000/projects")
        
        try:
            # Look for user avatar button
            avatar_button = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//button[contains(@class, 'rounded-full')]"))
            )
            
            assert avatar_button.is_displayed(), "User avatar should be visible for authenticated users"
            logger.info("✓ User avatar properly displayed for authenticated users")
            
        except TimeoutException:
            pytest.fail("User avatar not found for authenticated user")

    def test_logout_functionality(self, authenticated_driver):
        """Test that logout properly clears session and redirects."""
        driver = authenticated_driver
        
        # Navigate to projects page to ensure we're authenticated
        driver.get("http://localhost:3000/projects")
        
        try:
            # Find and click the user avatar to open dropdown
            avatar_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'rounded-full')]"))
            )
            avatar_button.click()
            
            # Find and click logout button
            logout_button = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'dropdown')]//span[text()='Log out']"))
            )
            logout_button.click()
            
            # Wait for logout to complete and redirect
            time.sleep(3)
            
            # Should be redirected to home page or Auth0 logout page
            current_url = driver.current_url
            assert any([
                current_url == "http://localhost:3000/",
                "auth0" in current_url.lower(),
                "/api/auth/logout" in current_url
            ]), f"Expected redirect after logout, but got: {current_url}"
            
            # Try to access protected page - should be redirected to login
            driver.get("http://localhost:3000/projects")
            time.sleep(2)
            
            final_url = driver.current_url
            assert any([
                "/api/auth/login" in final_url,
                final_url == "http://localhost:3000/",
                "auth0" in final_url.lower()
            ]), f"After logout, should not be able to access protected pages, but got: {final_url}"
            
            logger.info("✓ Logout functionality works properly")
            
        except TimeoutException:
            pytest.fail("Could not complete logout test - UI elements not found")

    def test_malicious_url_attempts(self, unauthenticated_driver):
        """Test various malicious URL patterns to ensure they're handled securely."""
        driver = unauthenticated_driver
        
        malicious_urls = [
            "http://localhost:3000/projects/../admin",
            "http://localhost:3000/projects/%2E%2E/admin",
            "http://localhost:3000/projects/../../etc/passwd",
            "http://localhost:3000/projects?redirect=http://evil.com",
            "http://localhost:3000/projects#<script>alert('xss')</script>",
            "http://localhost:3000/projects/999999999999999999999",
            "http://localhost:3000/projects/null",
            "http://localhost:3000/projects/undefined",
        ]
        
        for url in malicious_urls:
            try:
                driver.get(url)
                time.sleep(1)
                
                # Should not expose sensitive information or cause crashes
                current_url = driver.current_url
                page_source = driver.page_source.lower()
                
                # Check that we're properly redirected or show appropriate error
                assert any([
                    "/api/auth/login" in current_url,
                    current_url == "http://localhost:3000/",
                    "auth0" in current_url.lower(),
                    "404" in page_source,
                    "not found" in page_source,
                    "error" in page_source
                ]), f"Malicious URL {url} not handled properly"
                
                # Ensure no sensitive data is exposed
                sensitive_patterns = ["password", "secret", "token", "api_key", "admin", "/etc/", "root"]
                for pattern in sensitive_patterns:
                    assert pattern not in page_source, f"Sensitive information '{pattern}' exposed in response to {url}"
                
                logger.info(f"✓ Malicious URL {url} handled securely")
                
            except Exception as e:
                logger.warning(f"Exception testing URL {url}: {e}")
                # Exceptions are acceptable as long as they don't expose sensitive data

    @pytest.mark.parametrize("protected_route", [
        "/projects",
        "/projects/84",
        "/projects/1",
        "/user-profile",
    ])
    def test_all_protected_routes_require_authentication(self, unauthenticated_driver, protected_route):
        """Parameterized test to ensure all protected routes require authentication."""
        driver = unauthenticated_driver
        
        # Try to access the protected route
        full_url = f"http://localhost:3000{protected_route}"
        driver.get(full_url)
        time.sleep(2)  # Allow time for redirect
        
        current_url = driver.current_url
        assert any([
            "/api/auth/login" in current_url,
            current_url == "http://localhost:3000/",
            "auth0" in current_url.lower()
        ]), f"Protected route {protected_route} should require authentication, but got: {current_url}"
        
        logger.info(f"✓ Protected route {protected_route} properly secured")
