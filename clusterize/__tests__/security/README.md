# Security Testing Suite

This directory contains comprehensive security tests for the Clusterize application, focusing on authentication, authorization, and protection of sensitive pages and API endpoints.

## Test Files

### `test_auth.py`
Tests for page-level authentication and authorization:
- ✅ Unauthenticated access blocking to protected pages
- ✅ Proper redirects to login for unauthorized users
- ✅ Authenticated user access verification
- ✅ Session expiry handling
- ✅ User avatar visibility based on auth state
- ✅ Logout functionality
- ✅ Protection against malicious URL patterns
- ✅ Comprehensive testing of all protected routes

### `api_tests.py`
Tests for API-level security:
- ✅ API authentication requirements
- ✅ CORS header validation
- ✅ Security header verification
- ✅ Rate limiting detection
- ✅ SQL injection vulnerability testing
- ✅ XSS vulnerability testing
- ✅ File upload security validation
- ✅ Information disclosure prevention
- ✅ HTTP method validation

### `test_input.py`
Tests for input validation across the application (existing file):
- ✅ Project creation input validation
- ✅ File upload validation  
- ✅ Cluster creation and editing validation
- ✅ Object editing and tagging validation
- ✅ Batch operations validation

## Setup and Installation

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Install ChromeDriver**
   The tests use Chrome WebDriver. Install it via:
   ```bash
   # macOS with Homebrew
   brew install chromedriver
   
   # Or use webdriver-manager (included in requirements)
   # It will auto-download the driver
   ```

3. **Start Your Application**
   Ensure your application is running on `http://localhost:3000`
   ```bash
   cd /path/to/clusterize
   npm run dev
   ```

## Running the Tests

### Run All Security Tests
```bash
pytest __tests__/security/ -v
```

### Run Specific Test Files
```bash
# Page authentication tests
pytest __tests__/security/test_auth.py -v

# API security tests  
pytest __tests__/security/api_tests.py -v

# Input validation tests
pytest __tests__/security/test_input.py -v
```

### Run Tests with HTML Report
```bash
pytest __tests__/security/ -v --html=security_report.html --self-contained-html
```

### Run Tests in Parallel
```bash
pytest __tests__/security/ -v -n auto
```

### Run Specific Test Methods
```bash
# Test only unauthenticated access
pytest __tests__/security/test_auth.py::TestAuthenticationSecurity::test_unauthenticated_access_to_projects_page -v

# Test only API authentication
pytest __tests__/security/api_tests.py::TestAPIAuthenticationSecurity::test_protected_api_routes_require_authentication -v
```

## Test Configuration

### Environment Variables
You can configure tests using environment variables:

```bash
# Base URL for testing (default: http://localhost:3000)
export TEST_BASE_URL=http://localhost:3000

# Test credentials (update in test files)
export TEST_USERNAME=test@gmail.com
export TEST_PASSWORD=test@1234

# Headless mode (default: True for CI)
export HEADLESS_MODE=false
```

### Browser Configuration
Tests are configured to run in headless mode by default. To run with visible browser:

```python
# In test_auth.py, modify the driver fixture:
chrome_options.add_argument("--headless")  # Comment out this line
```

## Test Coverage Areas

### Authentication & Authorization
- [x] Protected route access control
- [x] Login/logout functionality  
- [x] Session management
- [x] User state verification
- [x] Auth0 integration testing

### Input Validation
- [x] Form input sanitization
- [x] File upload restrictions
- [x] SQL injection prevention
- [x] XSS attack prevention
- [x] Path traversal protection

### API Security
- [x] Endpoint authentication
- [x] HTTP method validation
- [x] Rate limiting
- [x] CORS policy verification
- [x] Security headers validation

### Session Security
- [x] Session expiry handling
- [x] Cookie security
- [x] CSRF protection testing
- [x] Session hijacking prevention

## Test Data and Fixtures

### Test Users
- **Username:** `test@gmail.com`
- **Password:** `test@1234`
- Make sure this user exists in your Auth0 tenant

### Test Projects
- Tests use project ID `84` for specific project testing
- Ensure this project exists or update the ID in test files

## Continuous Integration

### GitHub Actions Example
```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
        
    - name: Install dependencies
      run: |
        pip install -r __tests__/security/requirements.txt
        
    - name: Start application
      run: |
        npm install
        npm run build
        npm start &
        sleep 30  # Wait for app to start
        
    - name: Run security tests
      run: |
        pytest __tests__/security/ -v --html=security_report.html
        
    - name: Upload test report
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: security-test-report
        path: security_report.html
```

## Common Issues and Troubleshooting

### ChromeDriver Issues
```bash
# Update ChromeDriver
brew upgrade chromedriver

# Or reinstall
brew uninstall chromedriver
brew install chromedriver
```

### Auth0 Login Issues
- Verify test credentials exist in your Auth0 tenant
- Check Auth0 application configuration
- Ensure localhost is in allowed callback URLs

### Test Timeouts
- Increase wait times in tests if your app is slow to load
- Check that the application is running on the correct port
- Verify network connectivity

### Element Not Found Errors
- UI elements may have changed - update selectors in tests
- Check if pages load completely before interacting
- Add explicit waits for dynamic content

## Security Test Checklist

When adding new features, ensure you test:

- [ ] New protected routes require authentication
- [ ] New API endpoints validate permissions
- [ ] New forms validate and sanitize input
- [ ] New file uploads restrict file types
- [ ] New user actions log appropriately
- [ ] New configuration doesn't expose secrets

## Best Practices

1. **Keep Tests Updated:** Update tests when UI/API changes
2. **Test Real Scenarios:** Use realistic attack vectors
3. **Automate Execution:** Run tests in CI/CD pipeline
4. **Review Results:** Regularly review and act on test failures
5. **Document Findings:** Keep security documentation current

## Contributing

When adding new security tests:

1. Follow existing test patterns and naming conventions
2. Add comprehensive docstrings
3. Include both positive and negative test cases
4. Update this README with new test coverage
5. Ensure tests are deterministic and not flaky