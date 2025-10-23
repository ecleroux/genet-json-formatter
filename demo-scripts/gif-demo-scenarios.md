# GIF Demo Scenarios for Genet JSON Formatter

## 1. Basic JSON Formatting Demo
**File**: demo-basic-formatting.json
```json
{"name":"John Doe","age":30,"address":{"street":"123 Main St","city":"New York"},"hobbies":["reading","coding"],"active":true}
```

**Actions to Record**:
1. Open minified JSON
2. Use Ctrl+Alt+F to format
3. Show beautiful formatted result

## 2. List Compact Formatting Demo  
**File**: demo-list-formatting.json
```json
[{"id":1,"name":"Alice Johnson","age":28,"city":"San Francisco","department":"Engineering","salary":95000,"active":true},{"id":2,"name":"Bob Smith","age":35,"city":"New York","department":"Marketing","salary":75000,"active":false},{"id":3,"name":"Carol Davis","age":42,"city":"Chicago","department":"Sales","salary":85000,"active":true}]
```

**Actions to Record**:
1. Open minified array
2. Use Ctrl+Alt+L for list compact formatting
3. Show each object on single line

## 3. Interactive Sorting Demo
**File**: demo-sorting.json
```json
[{"name":"Charlie","age":35,"department":"Sales"},{"name":"Alice","age":28,"department":"Engineering"},{"name":"Bob","age":35,"department":"Marketing"}]
```

**Actions to Record**:
1. Open unsorted array
2. Use Ctrl+Alt+S for sorting
3. Show property picker dialog
4. Select "name" property
5. Show direction picker dialog (ascending/descending)
6. Select "Ascending" 
7. Show sorted and formatted result

## 4. Mixed-Type Sorting Demo
**File**: demo-mixed-types.json
```json
[{"name":"Alice","age":30},"zebra",42,{"name":"Bob","age":25},true,null,"apple",{"name":"Charlie","age":35}]
```

**Actions to Record**:
1. Open mixed array
2. Use Ctrl+Alt+S for sorting
3. Show direction selection dialog
4. Select "Descending" 
5. Show how primitives sort first, then objects
6. Select property for objects

## 5. Direction Comparison Demo
**File**: demo-sort-direction.json
```json
[{"name":"Alice","age":30,"score":85},{"name":"Charlie","age":25,"score":92},{"name":"Bob","age":35,"score":78},{"name":"Diana","age":28,"score":95}]
```

**Actions to Record**:
1. Sort by "score" ascending (show lowest to highest)
2. Then sort by "score" descending (show highest to lowest)
3. Demonstrate the difference clearly

## Recording Tips:
- Keep recordings under 10 seconds each
- Use 1280x720 or 1440x900 resolution
- Record at 15-20 FPS for smaller file size
- Show keyboard shortcuts clearly
- Include command palette usage as alternative