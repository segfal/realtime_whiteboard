#!/usr/bin/env python3
"""
Simple script to run WebSocket server tests
"""

import sys
import subprocess
import asyncio
from pathlib import Path


def check_server_running():
    """Check if the WebSocket server is running"""
    try:
        # Use subprocess to run the check within Poetry environment
        result = subprocess.run(
            ["poetry", "run", "python", "check_server.py"],
            capture_output=True,
            text=True,
        )
        return result.returncode == 0
    except Exception:
        return False


def main():
    print("🔍 WebSocket Server Test Runner")
    print("=" * 40)

    # Check if we're in the right directory
    if not Path("pyproject.toml").exists():
        print("❌ Please run this script from the websocket-tests directory")
        print("   cd websocket-tests")
        print("   python run_tests.py")
        sys.exit(1)

    # Check if Poetry is installed
    try:
        subprocess.run(["poetry", "--version"], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Poetry not found. Install it with: pip install poetry")
        sys.exit(1)

    # Check if dependencies are installed
    if not Path(".venv").exists():
        print("📦 Installing dependencies...")
        try:
            subprocess.run(["poetry", "install"], check=True)
        except subprocess.CalledProcessError:
            print("❌ Failed to install dependencies")
            sys.exit(1)

    # Check if server is running
    print("🔍 Checking if WebSocket server is running...")
    if not check_server_running():
        print("❌ WebSocket server is not running!")
        print()
        print("Please start the server first:")
        print("   cd ../websocket-server")
        print("   ./build/server")
        print()
        print("Then run this script again.")
        sys.exit(1)

    print("✅ Server is running!")
    print()

    # Run the tests
    print("🚀 Running tests...")
    try:
        result = subprocess.run(
            ["poetry", "run", "python", "tests/test_websocket_server.py"], check=True
        )
        print()
        print("✅ Tests completed successfully!")
    except subprocess.CalledProcessError:
        print()
        print("❌ Some tests failed. Check the output above for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()
