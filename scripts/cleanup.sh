#!/bin/bash

# Cleanup script for realtime_whiteboard project
# Removes all debug and test files to clean up the workspace

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if file/directory exists and is safe to delete
safe_delete() {
    local path="$1"
    local description="$2"
    
    if [[ -e "$path" ]]; then
        if [[ -f "$path" ]]; then
            print_status "Removing file: $path ($description)"
            rm -f "$path"
        elif [[ -d "$path" ]]; then
            print_status "Removing directory: $path ($description)"
            rm -rf "$path"
        fi
    fi
}

# Function to find and remove files by pattern
remove_files_by_pattern() {
    local pattern="$1"
    local description="$2"
    
    # Find files matching pattern (case insensitive)
    while IFS= read -r -d '' file; do
        if [[ -f "$file" ]]; then
            print_status "Removing file: $file ($description)"
            rm -f "$file"
        fi
    done < <(find . -type f -iname "$pattern" -print0 2>/dev/null || true)
}

# Function to find and remove directories by pattern
remove_dirs_by_pattern() {
    local pattern="$1"
    local description="$2"
    
    # Find directories matching pattern (case insensitive)
    while IFS= read -r -d '' dir; do
        if [[ -d "$dir" ]]; then
            print_status "Removing directory: $dir ($description)"
            rm -rf "$dir"
        fi
    done < <(find . -type d -iname "$pattern" -print0 2>/dev/null || true)
}

# Main cleanup function
main() {
    echo "🧹 Realtime Whiteboard Cleanup Script"
    echo "====================================="
    echo ""
    
    # Check if we're in the right directory
    if [[ ! -f "TODO.md" ]] || [[ ! -d "backend" ]] || [[ ! -d "frontend" ]]; then
        print_error "This script must be run from the realtime_whiteboard root directory"
        exit 1
    fi
    
    print_warning "This script will remove all debug and test files from the project."
    print_warning "This includes:"
    echo "  - Debug files and logs"
    echo "  - Test files and results"
    echo "  - Debug and test documentation"
    echo "  - Test build artifacts"
    echo "  - Debug symbols and executables"
    echo ""
    
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleanup cancelled."
        exit 0
    fi
    
    echo ""
    print_status "Starting cleanup process..."
    echo ""
    
    # Remove specific debug files and directories
    safe_delete "debug-session.json" "debug session file"
    safe_delete "debug-logs" "debug logs directory"
    
    # Remove debug documentation files
    safe_delete "DEBUG_SETUP.md" "debug setup documentation"
    safe_delete "DEBUG_GUIDE.md" "debug guide documentation"
    safe_delete "ERASER_BUG_ANALYSIS.md" "bug analysis documentation"
    
    # Remove test documentation files
    safe_delete "TEST_ERASER_FIX.md" "test eraser fix documentation"
    safe_delete "README_BACKEND_TESTING.md" "backend testing documentation"
    safe_delete "backend/README_TESTING.md" "backend testing documentation"
    
    # Remove test scripts
    safe_delete "run_backend_tests.sh" "backend test runner script"
    safe_delete "backend/run_tests.py" "Python test runner"
    
    # Remove debug and test files by pattern
    print_status "Removing debug files..."
    remove_files_by_pattern "debug*" "debug file"
    remove_files_by_pattern "*debug*" "debug-related file"
    remove_files_by_pattern "stroke_debug*" "stroke debug file"
    
    print_status "Removing test files..."
    remove_files_by_pattern "test*" "test file"
    remove_files_by_pattern "*test*" "test-related file"
    
    # Remove debug and test directories by pattern
    print_status "Removing debug and test directories..."
    remove_dirs_by_pattern "debug*" "debug directory"
    remove_dirs_by_pattern "*debug*" "debug-related directory"
    remove_dirs_by_pattern "test*" "test directory"
    remove_dirs_by_pattern "*test*" "test-related directory"
    
    # Remove specific test directories
    safe_delete "backend/test_logs" "backend test logs"
    safe_delete "backend/test_includes" "backend test includes"
    
    # Remove debug symbols and executables
    safe_delete "backend/test_strokes" "test strokes executable"
    safe_delete "backend/stroke_debug" "stroke debug executable"
    safe_delete "backend/test_strokes.dSYM" "test strokes debug symbols"
    safe_delete "backend/stroke_debug.dSYM" "stroke debug symbols"
    
    # Remove test result files
    remove_files_by_pattern "*test_results*" "test results file"
    remove_files_by_pattern "*debug_results*" "debug results file"
    
    # Remove build artifacts that might be test-related
    if [[ -d "backend/build" ]]; then
        print_status "Checking for test-related build artifacts..."
        # Only remove build directory if it contains test-related files
        if find "backend/build" -name "*test*" -o -name "*debug*" 2>/dev/null | grep -q .; then
            print_warning "Found test-related files in build directory. Consider cleaning build/ manually if needed."
        fi
    fi
    
    echo ""
    print_success "Cleanup completed successfully!"
    print_status "The following types of files have been removed:"
    echo "  ✓ Debug files and logs"
    echo "  ✓ Test files and results"
    echo "  ✓ Debug and test documentation"
    echo "  ✓ Test build artifacts"
    echo "  ✓ Debug symbols and executables"
    echo ""
    print_status "Your workspace is now clean! 🎉"
}

# Run the main function
main "$@" 