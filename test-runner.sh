#!/bin/bash

# Genet JSON Formatter Test Runner
# Provides convenient commands for running different test suites

set -e

echo "🧪 Genet JSON Formatter Test Suite"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run a command and capture its output
run_test() {
    local test_name="$1"
    local command="$2"
    
    echo -e "${BLUE}Running ${test_name}...${NC}"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ ${test_name} passed${NC}"
        return 0
    else
        echo -e "${RED}❌ ${test_name} failed${NC}"
        return 1
    fi
}

# Function to show help
show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  all         Run all tests (default)"
    echo "  unit        Run core logic tests only"
    echo "  integration Run VS Code integration tests only"
    echo "  extension   Run main extension tests only"
    echo "  performance Run performance tests only"
    echo "  quick       Run quick tests (no performance)"
    echo "  compile     Compile TypeScript and run linting"
    echo "  watch       Watch mode for development"
    echo "  clean       Clean compiled files"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 quick              # Run tests without performance suite"
    echo "  $0 unit               # Run only core logic tests"
    echo "  $0 performance        # Run only performance tests"
}

# Ensure we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must be run from the extension root directory${NC}"
    exit 1
fi

# Parse command line arguments
COMMAND=${1:-all}

case $COMMAND in
    "help"|"-h"|"--help")
        show_help
        exit 0
        ;;
    
    "clean")
        echo -e "${YELLOW}🧹 Cleaning compiled files...${NC}"
        rm -rf out/
        echo -e "${GREEN}✅ Clean complete${NC}"
        exit 0
        ;;
    
    "compile")
        echo -e "${YELLOW}🔨 Compiling and linting...${NC}"
        run_test "TypeScript compilation" "npm run compile"
        run_test "ESLint" "npm run lint"
        exit $?
        ;;
    
    "watch")
        echo -e "${YELLOW}👀 Starting watch mode...${NC}"
        echo "Press Ctrl+C to stop"
        npm run watch
        exit 0
        ;;
    
    "unit")
        echo -e "${BLUE}🧪 Running core logic tests...${NC}"
        run_test "Pre-test compilation" "npm run pretest"
        run_test "Core formatting logic" "npm test -- --grep 'JSON Formatter Core Logic'"
        ;;
    
    "integration")
        echo -e "${BLUE}🔗 Running VS Code integration tests...${NC}"
        run_test "Pre-test compilation" "npm run pretest"
        run_test "VS Code integration" "npm test -- --grep 'VS Code Integration'"
        ;;
    
    "extension")
        echo -e "${BLUE}⚙️ Running main extension tests...${NC}"
        run_test "Pre-test compilation" "npm run pretest"
        run_test "Extension functionality" "npm test -- --grep 'Genet JSON Formatter Extension'"
        ;;
    
    "performance")
        echo -e "${BLUE}⚡ Running performance tests...${NC}"
        echo -e "${YELLOW}⚠️  Performance tests may take several minutes...${NC}"
        run_test "Pre-test compilation" "npm run pretest"
        run_test "Performance benchmarks" "npm test -- --grep 'Performance Tests'"
        ;;
    
    "quick")
        echo -e "${BLUE}🚀 Running quick test suite (no performance)...${NC}"
        run_test "Pre-test compilation" "npm run pretest"
        
        # Run all tests except performance
        run_test "Core logic tests" "npm test -- --grep 'JSON Formatter Core Logic'"
        run_test "Extension tests" "npm test -- --grep 'Genet JSON Formatter Extension'"
        run_test "Integration tests" "npm test -- --grep 'VS Code Integration'"
        ;;
    
    "all")
        echo -e "${BLUE}🎯 Running complete test suite...${NC}"
        
        # Pre-test steps
        run_test "Pre-test compilation" "npm run pretest"
        
        # All test suites
        run_test "Core logic tests" "npm test -- --grep 'JSON Formatter Core Logic'"
        run_test "Extension tests" "npm test -- --grep 'Genet JSON Formatter Extension'"
        run_test "Integration tests" "npm test -- --grep 'VS Code Integration'"
        
        echo -e "${YELLOW}⚠️  Running performance tests (may take several minutes)...${NC}"
        run_test "Performance tests" "npm test -- --grep 'Performance Tests'"
        ;;
    
    *)
        echo -e "${RED}❌ Unknown command: $COMMAND${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Test run complete!${NC}"

# Show test summary
if [ $? -eq 0 ]; then
    echo -e "${GREEN}All tests passed successfully!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check the output above for details.${NC}"
    exit 1
fi