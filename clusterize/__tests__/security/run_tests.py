#!/usr/bin/env python3
"""
Security test runner script.
Provides easy commands to run different types of security tests.
"""

import subprocess
import sys
import os
import argparse
from pathlib import Path

def run_command(cmd, description):
    """Run a command and handle output."""
    print(f"\n🔒 {description}")
    print(f"Running: {' '.join(cmd)}")
    print("-" * 50)
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
            
        if result.returncode != 0:
            print(f"❌ Command failed with exit code {result.returncode}")
            return False
        else:
            print(f"✅ {description} completed successfully")
            return True
            
    except Exception as e:
        print(f"❌ Error running command: {e}")
        return False

def install_dependencies():
    """Install test dependencies."""
    script_dir = Path(__file__).parent
    requirements_file = script_dir / "requirements.txt"
    
    cmd = [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)]
    return run_command(cmd, "Installing security test dependencies")

def run_test_auth(args):
    """Run authentication and page security tests."""
    cmd = [sys.executable, "-m", "pytest", "test_auth.py", "-v"]
    
    if args.html:
        cmd.extend(["--html=test_auth_report.html", "--self-contained-html"])
    if args.parallel:
        cmd.extend(["-n", "auto"])
    if args.base_url:
        cmd.extend(["--base-url", args.base_url])
    if not args.headless:
        cmd.append("--headless=false")
        
    return run_command(cmd, "Authentication and Page Security Tests")

def run_api_tests(args):
    """Run API security tests."""
    cmd = [sys.executable, "-m", "pytest", "api_tests.py", "-v"]
    
    if args.html:
        cmd.extend(["--html=api_test_report.html", "--self-contained-html"])
    if args.parallel:
        cmd.extend(["-n", "auto"])
    if args.base_url:
        cmd.extend(["--base-url", args.base_url])
        
    return run_command(cmd, "API Security Tests")

def run_test_input_tests(args):
    """Run input validation tests."""
    cmd = [sys.executable, "-m", "pytest", "test_input.py", "-v"]
    
    if args.html:
        cmd.extend(["--html=test_input_report.html", "--self-contained-html"])
    if args.parallel:
        cmd.extend(["-n", "auto"])
    if args.base_url:
        cmd.extend(["--base-url", args.base_url])
    if not args.headless:
        cmd.append("--headless=false")
        
    return run_command(cmd, "Input Validation Security Tests")

def run_all_tests(args):
    """Run all security tests."""
    cmd = [sys.executable, "-m", "pytest", ".", "-v"]
    
    if args.html:
        cmd.extend(["--html=security_test_report.html", "--self-contained-html"])
    if args.parallel:
        cmd.extend(["-n", "auto"])
    if args.base_url:
        cmd.extend(["--base-url", args.base_url])
    if not args.headless:
        cmd.append("--headless=false")
        
    return run_command(cmd, "All Security Tests")

def check_app_running(base_url):
    """Check if the application is running."""
    import requests
    try:
        response = requests.get(base_url, timeout=5)
        if response.status_code == 200:
            print(f"✅ Application is running at {base_url}")
            return True
        else:
            print(f"⚠️  Application responded with status {response.status_code}")
            return False
    except requests.exceptions.RequestException:
        print(f"❌ Application is not running at {base_url}")
        print("Please start your application with: npm run dev")
        return False

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Security Test Runner for Clusterize")
    
    # Test type selection
    parser.add_argument("command", choices=["install", "auth", "api", "input", "all", "check"], 
                       help="Test command to run")
    
    # Options
    parser.add_argument("--base-url", default="http://localhost:3000",
                       help="Base URL for testing (default: http://localhost:3000)")
    parser.add_argument("--html", action="store_true",
                       help="Generate HTML test report")
    parser.add_argument("--parallel", action="store_true",
                       help="Run tests in parallel")
    parser.add_argument("--headless", action="store_true", default=True,
                       help="Run browser tests in headless mode (default: True)")
    parser.add_argument("--no-headless", dest="headless", action="store_false",
                       help="Run browser tests with visible browser")
    
    args = parser.parse_args()
    
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print("🔒 Clusterize Security Test Runner")
    print("=" * 50)
    
    if args.command == "install":
        success = install_dependencies()
        
    elif args.command == "check":
        success = check_app_running(args.base_url)
        
    elif args.command == "auth":
        if not check_app_running(args.base_url):
            sys.exit(1)
        success = run_test_auth(args)
        
    elif args.command == "api":
        if not check_app_running(args.base_url):
            sys.exit(1)
        success = run_api_tests(args)
        
    elif args.command == "input":
        if not check_app_running(args.base_url):
            sys.exit(1)
        success = run_test_input_tests(args)
        
    elif args.command == "all":
        if not check_app_running(args.base_url):
            sys.exit(1)
        success = run_all_tests(args)
    
    else:
        parser.print_help()
        sys.exit(1)
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Security tests completed successfully!")
        if args.html:
            print(f"📊 HTML report generated")
    else:
        print("❌ Some security tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()