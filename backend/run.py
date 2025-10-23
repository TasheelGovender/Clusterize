#!/usr/bin/env python3
"""
Application entry point for the refactored Flask API.

This file serves as the main entry point for running the application.
It imports the application factory and runs the Flask app in either
development mode (Flask dev server) or production mode (Gunicorn).
"""

import os
import sys
import subprocess
from app import create_app

def run_development():
    """Run the application using Flask's development server"""
    # Get configuration from environment variables
    debug_mode = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    port = int(os.environ.get('FLASK_PORT', 5001))
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    
    print(f"🚀 Starting Flask application in DEVELOPMENT mode")
    print(f"📍 Server running on http://{host}:{port}")
    print(f"🐛 Debug mode: {debug_mode}")
    print("=" * 50)
    
    app.run(
        debug=debug_mode,
        port=port,
        host=host
    )

def run_production():
    """Run the application using Gunicorn WSGI server"""
    port = int(os.environ.get('FLASK_PORT', 5001))
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    workers = int(os.environ.get('GUNICORN_WORKERS', 4))
    timeout = int(os.environ.get('GUNICORN_TIMEOUT', 120))
    
    print(f"🚀 Starting Flask application in PRODUCTION mode")
    print(f"📍 Server running on http://{host}:{port}")
    print(f"👥 Workers: {workers}")
    print(f"⏱️  Timeout: {timeout}s")
    print("=" * 50)
    
    # Gunicorn command
    cmd = [
        'gunicorn',
        '--workers', str(workers),
        '--bind', f'{host}:{port}',
        '--timeout', str(timeout),
        '--keep-alive', '5',
        '--max-requests', '1000',
        '--max-requests-jitter', '100',
        '--access-logfile', '-',  # Log to stdout
        '--error-logfile', '-',   # Log to stdout
        'run:app',                # Point to the app instance in this file
    ]
    
    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\n👋 Shutting down Gunicorn server...")
    except FileNotFoundError:
        print("❌ Error: Gunicorn not found. Install it with: pip install gunicorn")
        sys.exit(1)

# Determine the configuration to use based on environment
config_name = os.environ.get('FLASK_ENV', 'development')

# Create the Flask application instance
app = create_app(config_name)

if __name__ == '__main__':
    # Check if production mode is requested
    mode = os.environ.get('FLASK_MODE', config_name).lower()
    
    if mode == 'production' or config_name == 'production':
        run_production()
    else:
        run_development()
