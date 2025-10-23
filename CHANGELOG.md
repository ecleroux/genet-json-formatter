# Change Log

All notable changes to the Genet JSON Formatter extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-10-22

### Added
- **JSON List Compact Formatting**: New `Genet: JSON Format List Compact` command that formats arrays with each item on a new line as compact single-line objects for optimal scan-ability
- **List Format Keyboard Shortcut**: `Ctrl+Alt+L` (Windows/Linux) or `Ctrl+Cmd+Option+L` (macOS)
- **Dedicated List Formatter**: New `customJsonListFormat()` function optimized for data lists, API responses, and configuration arrays
- **JSON Array Sorting**: New `Genet: JSON Sort List` command with interactive property selection, ascending/descending direction choice, primitive value sorting, mixed-type array support, smart defaults, and automatic compact list formatting
- **Sort Keyboard Shortcut**: `Ctrl+Alt+S` (Windows/Linux) or `Ctrl+Cmd+Option+S` (macOS)
- **Future-Proof Command ID**: Uses `genet-json-formatter.formatJsonListCompact` for consistency and future extensibility

### Enhanced
- **Sort Direction Control**: Interactive ascending/descending direction selection for all array sorting (objects and primitives)
- **Mixed-Type Array Sorting**: Arrays containing both objects and primitives now sort intelligently (primitives first by value, then objects by selected property)
- **Command Palette**: Added "Genet: JSON Format List Compact" and "Genet: JSON Sort List" to available commands
- **Documentation**: Updated README.md with list formatting examples, mixed-type sorting, and direction control usage instructions
- **Keyboard Shortcuts**: Extended shortcuts table to include list formatting and sorting options

### Technical
- **Type Safety**: Maintained full TypeScript implementation with proper error handling
- **Performance**: List formatting and sorting include progress indicators for large files (>50KB)
- **Smart Sorting**: Type-aware sorting algorithm handles objects by property, primitive values by value, strings, numbers, mixed types, and null values
- **Interactive UI**: Quick pick interface for property selection with visual icons and descriptions
- **Integration**: Seamless integration with existing VS Code formatting workflows
- **Unit Tests**: Added comprehensive test suite with 118+ tests covering all sorting scenarios, edge cases, and performance validation

## [1.0.0] - 2025-10-17

### Added
- **Smart JSON Formatting**: Intelligent compact/expanded formatting that keeps small objects on one line while properly formatting complex structures
- **JSON Minification**: Ultra-compact single-line output for production use
- **JSON Validation**: Comprehensive syntax validation with detailed error reporting including line/column positions
- **Selection Support**: Format specific parts of large JSON files using VS Code's Format Selection
- **Multiple Access Methods**: 7 different ways to access formatting (commands, shortcuts, VS Code integration, auto-save)
- **Keyboard Shortcuts**: 
  - `Ctrl+Alt+F` / `Ctrl+Cmd+Option+F` - Format JSON
  - `Ctrl+Alt+M` / `Ctrl+Cmd+Option+M` - Minify JSON  
  - `Ctrl+Alt+V` / `Ctrl+Cmd+Option+V` - Validate JSON
- **VS Code Integration**: Complete integration with Format Document and Format Selection
- **Format on Save**: Configurable automatic formatting when saving JSON files
- **Progress Indicators**: User feedback for large file operations (>50KB)
- **Configuration Options**:
  - `maxSingleLineLength`: Maximum character length for compact formatting (10-500)
  - `indentSpaces`: Number of spaces for indentation (1-8)  
  - `formatOnSave`: Automatic formatting on save (boolean)
- **Professional Features**:
  - Type-safe TypeScript implementation
  - Comprehensive error handling
  - Memory-conscious large file processing
  - Cross-platform keyboard shortcuts
  - Graceful handling of invalid JSON

### Performance
- Handles JSON files up to 1MB+ efficiently
- Progress indicators for operations on large files
- Optimized for real-time formatting operations
- Memory leak prevention with proper cleanup

### Testing
- 78 comprehensive automated tests
- Performance benchmarks for large files
- Edge case testing for malformed JSON
- VS Code integration testing
- Memory leak detection
- Stress testing with concurrent operations

### Documentation
- Comprehensive README with examples and usage instructions
- Complete API documentation
- Testing guide and troubleshooting documentation
- Configuration examples for all use cases