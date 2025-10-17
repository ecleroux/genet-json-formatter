# Demo Assets Creation Guide

## Screenshots Needed for Marketplace

1. **Before/After Formatting Screenshot**
   - Show a messy JSON file being formatted
   - Highlight the smart formatting differences

2. **Command Palette Usage**
   - Show the JSON formatter commands in VS Code's command palette
   - `Ctrl+Shift+P` → "Format JSON", "Minify JSON", "Validate JSON"

3. **Keyboard Shortcuts in Action**
   - Show the keyboard shortcuts overlay or quick demonstration

4. **Settings Configuration**
   - Show the extension settings in VS Code preferences
   - Highlight configurable options like `maxSingleLineLength`, `indentSpaces`, `formatOnSave`

## Creating Screenshots

### Method 1: Manual Screenshots
1. Open VS Code with a sample JSON file
2. Use the extension features
3. Take high-quality screenshots (minimum 1280x720)
4. Save as PNG files in the `images/` directory

### Method 2: Sample JSON for Demo
```json
{"name":"John Doe","age":30,"address":{"street":"123 Main St","city":"New York","zipcode":"10001"},"hobbies":["reading","swimming","coding"],"isActive":true,"metadata":{"created":"2023-01-01","lastModified":"2023-12-15","tags":["important","customer","premium"]}}
```

### Recommended Filenames
- `images/demo-formatting.png` - Before/after formatting
- `images/command-palette.png` - Command palette usage  
- `images/keyboard-shortcuts.png` - Shortcuts demonstration
- `images/settings-configuration.png` - Extension settings
- `images/validation-error.png` - JSON validation in action

## Sample Demo Content

### Unformatted JSON (for demo)
```json
{"users":[{"id":1,"name":"Alice Johnson","email":"alice@example.com","profile":{"age":28,"location":"San Francisco","interests":["technology","travel","photography"]},"settings":{"notifications":true,"privacy":"public","theme":"dark"}},{"id":2,"name":"Bob Smith","email":"bob@example.com","profile":{"age":35,"location":"New York","interests":["sports","music","cooking"]},"settings":{"notifications":false,"privacy":"private","theme":"light"}}],"metadata":{"totalUsers":2,"lastUpdated":"2024-01-15T10:30:00Z","version":"1.0"}}
```

### Formatted Result (smart formatting)
```json
{
  "users": [
    {
      "id": 1,
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "profile": {
        "age": 28,
        "location": "San Francisco",
        "interests": ["technology", "travel", "photography"]
      },
      "settings": { "notifications": true, "privacy": "public", "theme": "dark" }
    },
    {
      "id": 2,
      "name": "Bob Smith", 
      "email": "bob@example.com",
      "profile": {
        "age": 35,
        "location": "New York",
        "interests": ["sports", "music", "cooking"]
      },
      "settings": { "notifications": false, "privacy": "private", "theme": "light" }
    }
  ],
  "metadata": { "totalUsers": 2, "lastUpdated": "2024-01-15T10:30:00Z", "version": "1.0" }
}
```

## Icon Creation from SVG

To convert the SVG icon to PNG:

1. **Using online converter**: Upload `icon.svg` to any SVG to PNG converter
2. **Using ImageMagick** (if installed): 
   ```bash
   convert -background none icon.svg -resize 128x128 icon.png
   ```
3. **Using Inkscape** (if available):
   ```bash
   inkscape icon.svg --export-type=png --export-filename=icon.png --export-width=128 --export-height=128
   ```

The marketplace requires PNG format for icons, typically 128x128 pixels.