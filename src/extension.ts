import * as vscode from 'vscode';

// Type definitions
interface FormatConfig {
	maxSingleLineLength: number;
	indentSpaces: number;
	formatOnSave: boolean;
}

interface FormatResult {
	text: string;
	range: vscode.Range;
	isSelection: boolean;
}

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
	[key: string]: JsonValue;
}
interface JsonArray extends Array<JsonValue> {}

// Constants
const EXTENSION_CONFIG_SECTION = 'genet-json-formatter';
const DEFAULT_MAX_LENGTH = 100;
const DEFAULT_INDENT_SPACES = 2;
const MIN_INDENT_SPACES = 1;
const MAX_INDENT_SPACES = 8;
const LARGE_FILE_THRESHOLD = 50000; // Show progress for files larger than 50KB

const COMMANDS = {
	FORMAT: 'genet-json-formatter.formatJson',
	MINIFY: 'genet-json-formatter.minifyJson',
	VALIDATE: 'genet-json-formatter.validateJson',
	FORMAT_LIST_COMPACT: 'genet-json-formatter.formatJsonListCompact',
	SORT_LIST: 'genet-json-formatter.sortJsonList'
} as const;

const MESSAGES = {
	SUCCESS: {
		FORMAT_SELECTION: 'JSON selection formatted successfully!',
		FORMAT_DOCUMENT: 'JSON document formatted successfully!',
		MINIFY_SELECTION: 'JSON selection minified successfully!',
		MINIFY_DOCUMENT: 'JSON document minified successfully!',
		FORMAT_LIST_SELECTION: 'JSON list selection formatted successfully!',
		FORMAT_LIST_DOCUMENT: 'JSON list document formatted successfully!',
		SORT_LIST_SELECTION: (property: string, direction: string) => `JSON array sorted by "${property}" (${direction}) and formatted compact successfully!`,
		SORT_LIST_DOCUMENT: (property: string, direction: string) => `JSON array sorted by "${property}" (${direction}) and formatted compact successfully!`,
		VALIDATE_SUCCESS: 'JSON is valid! ✅',
		VALIDATE_SUCCESS_DETAILS: (lines: number, chars: number) => `JSON is valid! ✅ (${lines} lines, ${chars} characters)`
	},
	ERROR: {
		NO_EDITOR: 'No active editor found',
		INVALID_JSON: (error: string) => `Invalid JSON: ${error}`,
		VALIDATION_FAILED: (error: string) => `JSON Validation Failed: ${error}`,
		NOT_ARRAY: 'Selected JSON is not an array. Sort operation requires an array.',
		SORT_PROPERTY_NOT_FOUND: (property: string) => `Property "${property}" not found in array items.`,
		SORT_CANCELLED: 'Sort operation was cancelled.'
	}
} as const;

export function activate(context: vscode.ExtensionContext) {

	// Helper function to get configuration with proper types
	function getFormatConfig(): FormatConfig {
		const config = vscode.workspace.getConfiguration(EXTENSION_CONFIG_SECTION);
		return {
			maxSingleLineLength: config.get<number>('maxSingleLineLength', DEFAULT_MAX_LENGTH),
			indentSpaces: Math.max(MIN_INDENT_SPACES, Math.min(MAX_INDENT_SPACES, 
				config.get<number>('indentSpaces', DEFAULT_INDENT_SPACES))),
			formatOnSave: config.get<boolean>('formatOnSave', false)
		};
	}

	// Helper function to prepare text and range for formatting
	function prepareFormatting(editor: vscode.TextEditor): FormatResult {
		const document = editor.document;
		const selection = editor.selection;
		const isSelection = !selection.isEmpty;
		
		const text = isSelection ? document.getText(selection) : document.getText();
		const range = isSelection ? selection : new vscode.Range(
			document.positionAt(0),
			document.positionAt(document.getText().length)
		);

		return { text, range, isSelection };
	}

	// Helper function to apply formatting changes
	async function applyFormatting(
		document: vscode.TextDocument, 
		range: vscode.Range, 
		formattedText: string,
		isSelection: boolean,
		operation: 'formatted' | 'minified'
	): Promise<void> {
		const edit = new vscode.WorkspaceEdit();
		edit.replace(document.uri, range, formattedText);
		
		await vscode.workspace.applyEdit(edit);
		
		const message = operation === 'formatted' 
			? (isSelection ? MESSAGES.SUCCESS.FORMAT_SELECTION : MESSAGES.SUCCESS.FORMAT_DOCUMENT)
			: (isSelection ? MESSAGES.SUCCESS.MINIFY_SELECTION : MESSAGES.SUCCESS.MINIFY_DOCUMENT);
		
		vscode.window.showInformationMessage(message);
	}

	// Helper function to execute operations with progress indicators for large files
	async function executeWithProgress<T>(
		operation: () => Promise<T> | T,
		progressTitle: string,
		text: string
	): Promise<T> {
		// Only show progress for large files
		if (text.length < LARGE_FILE_THRESHOLD) {
			return await operation();
		}

		return vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: progressTitle,
				cancellable: false
			},
			async (progress) => {
				progress.report({ increment: 0, message: 'Parsing JSON...' });
				
				// Small delay to show the progress indicator
				await new Promise(resolve => setTimeout(resolve, 100));
				
				progress.report({ increment: 50, message: 'Processing...' });
				
				const result = await operation();
				
				progress.report({ increment: 100, message: 'Complete!' });
				
				return result;
			}
		);
	}

	// Custom JSON formatter that keeps small objects on the same line
	function customJsonFormat(
		obj: JsonValue, 
		indent: number = 0, 
		maxLength: number = DEFAULT_MAX_LENGTH, 
		indentSpaces: number = DEFAULT_INDENT_SPACES
	): string {
		const indentStr = ' '.repeat(indent * indentSpaces);
		
		if (obj === null) {
			return 'null';
		}
		if (typeof obj === 'boolean' || typeof obj === 'number') {
			return obj.toString();
		}
		if (typeof obj === 'string') {
			return JSON.stringify(obj);
		}
		
		if (Array.isArray(obj)) {
			// If array contains objects, format each item on its own row
			const hasObjects = obj.some(item => typeof item === 'object' && item !== null && !Array.isArray(item));
			if (hasObjects) {
				const items = obj.map(item => indentStr + ' '.repeat(indentSpaces) + customJsonFormat(item, indent + 1, maxLength, indentSpaces));
				return '[\n' + items.join(',\n') + '\n' + indentStr + ']';
			}
			
			// Check if array should stay on one line (no objects)
			const compactArray = JSON.stringify(obj);
			if (compactArray.length <= maxLength) {
				return compactArray;
			}
			
			// Format array with line breaks
			const items = obj.map(item => indentStr + ' '.repeat(indentSpaces) + customJsonFormat(item, indent + 1, maxLength, indentSpaces));
			return '[\n' + items.join(',\n') + '\n' + indentStr + ']';
		}
		
		if (typeof obj === 'object') {
			// Check if object should stay on one line
			const compactObject = JSON.stringify(obj);
			if (compactObject.length <= maxLength) {
				// Add spaces after { and before }, after : and after , for single-line objects
				return compactObject
					.replace(/^\{/, '{ ')
					.replace(/\}$/, ' }')
					.replace(/:/g, ': ')
					.replace(/,/g, ', ');
			}
			
			// Format object with line breaks
			const keys = Object.keys(obj);
			const items = keys.map(key => {
				const value = customJsonFormat(obj[key], indent + 1, maxLength, indentSpaces);
				return indentStr + ' '.repeat(indentSpaces) + JSON.stringify(key) + ': ' + value;
			});
			return '{\n' + items.join(',\n') + '\n' + indentStr + '}';
		}
		
		return JSON.stringify(obj);
	}

	// Custom JSON list formatter that keeps each array item on a single line
	// Perfect for data lists where each item should be compact but readable
	function customJsonListFormat(
		obj: JsonValue, 
		indent: number = 0, 
		indentSpaces: number = DEFAULT_INDENT_SPACES
	): string {
		const indentStr = ' '.repeat(indent * indentSpaces);
		
		if (obj === null) {
			return 'null';
		}
		if (typeof obj === 'boolean' || typeof obj === 'number') {
			return obj.toString();
		}
		if (typeof obj === 'string') {
			return JSON.stringify(obj);
		}
		
		if (Array.isArray(obj)) {
			// Always format arrays with each item on a new line
			if (obj.length === 0) {
				return '[]';
			}
			
			const items = obj.map(item => {
				// For array items, always use compact single-line format
				const compactItem = JSON.stringify(item)
					.replace(/^\{/, '{ ')
					.replace(/\}$/, ' }')
					.replace(/:/g, ': ')
					.replace(/,/g, ', ');
				return indentStr + ' '.repeat(indentSpaces) + compactItem;
			});
			
			return '[\n' + items.join(',\n') + '\n' + indentStr + ']';
		}
		
		if (typeof obj === 'object') {
			// For standalone objects (not array items), use compact single-line format
			const compactObject = JSON.stringify(obj);
			return compactObject
				.replace(/^\{/, '{ ')
				.replace(/\}$/, ' }')
				.replace(/:/g, ': ')
				.replace(/,/g, ', ');
		}
		
		return JSON.stringify(obj);
	}

	// Helper function to sort JSON array by property or by value
	function sortJsonArrayByProperty(arr: JsonArray, sortProperty?: string, ascending: boolean = true): JsonArray {
		if (!Array.isArray(arr) || arr.length === 0) {
			return arr;
		}

		// Check array composition
		const firstItem = arr[0];
		const hasPrimitiveValues = arr.every(item => 
			typeof item === 'string' || 
			typeof item === 'number' || 
			typeof item === 'boolean' || 
			item === null
		);

		const hasObjectValues = arr.some(item => 
			typeof item === 'object' && 
			item !== null && 
			!Array.isArray(item)
		);

		// Handle pure primitive arrays
		if (hasPrimitiveValues && !hasObjectValues) {
			// Sort by the values themselves
			return [...arr].sort((a, b) => {
				// Handle null values
				if (a === null && b === null) {
					return 0;
				}
				if (a === null) {
					return 1;  // null values go to end
				}
				if (b === null) {
					return -1;
				}

				// Type-specific comparisons for primitives
				if (typeof a === typeof b) {
					if (typeof a === 'string') {
						return a.localeCompare(b as string);
					}
					if (typeof a === 'number') {
						return a - (b as number);
					}
					if (typeof a === 'boolean') {
						return a === b ? 0 : (a ? 1 : -1);
					}
				}

				// Different types - convert to string for comparison
				return String(a).localeCompare(String(b));
			});
		}

		// Handle mixed arrays or pure object arrays
		let propertyToSort = sortProperty;

		// For mixed arrays or when no property specified for object arrays
		if (!propertyToSort && hasObjectValues) {
			// Use the first property of the first object if no property specified
			const firstObject = arr.find(item => 
				typeof item === 'object' && 
				item !== null && 
				!Array.isArray(item)
			);
			
			if (firstObject) {
				const keys = Object.keys(firstObject);
				if (keys.length > 0) {
					propertyToSort = keys[0];
				}
			}
		}

		// Sort the array with mixed type support
		return [...arr].sort((a, b) => {
			let result = 0;

			// Handle cases where one or both items are primitives
			const aIsPrimitive = typeof a !== 'object' || a === null || Array.isArray(a);
			const bIsPrimitive = typeof b !== 'object' || b === null || Array.isArray(b);

			// If both are primitives, sort by value
			if (aIsPrimitive && bIsPrimitive) {
				if (a === null && b === null) {
					result = 0;
				} else if (a === null) {
					result = 1;
				} else if (b === null) {
					result = -1;
				} else if (typeof a === typeof b) {
					if (typeof a === 'string') {
						result = a.localeCompare(b as string);
					} else if (typeof a === 'number') {
						result = a - (b as number);
					} else if (typeof a === 'boolean') {
						result = a === b ? 0 : (a ? 1 : -1);
					}
				} else {
					result = String(a).localeCompare(String(b));
				}
			}

			// If one is primitive and one is object, primitives come first
			else if (aIsPrimitive && !bIsPrimitive) {
				result = -1;
			} else if (!aIsPrimitive && bIsPrimitive) {
				result = 1;
			}
			// Both are objects - sort by property if available
			else if (propertyToSort && 
				typeof a === 'object' && a !== null && !Array.isArray(a) &&
				typeof b === 'object' && b !== null && !Array.isArray(b) &&
				propertyToSort in a && propertyToSort in b) {
				
				const aValue = (a as Record<string, any>)[propertyToSort];
				const bValue = (b as Record<string, any>)[propertyToSort];

				// Handle different data types
				if (aValue === bValue) {
					result = 0;
				} else if (aValue === null || aValue === undefined) {
					result = 1;  // null/undefined values go to end
				} else if (bValue === null || bValue === undefined) {
					result = -1;
				}

				// Convert to strings for comparison if different types
				else if (typeof aValue !== typeof bValue) {
					result = String(aValue).localeCompare(String(bValue));
				}
				// Type-specific comparisons
				else if (typeof aValue === 'string' && typeof bValue === 'string') {
					result = aValue.localeCompare(bValue);
				} else if (typeof aValue === 'number' && typeof bValue === 'number') {
					result = aValue - bValue;
				} else {
					// Fallback to string comparison
					result = String(aValue).localeCompare(String(bValue));
				}
			} else {
				// If objects don't have the property, keep original order
				result = 0;
			}

			// Apply ascending/descending direction
			return ascending ? result : -result;
		});
	}

	// Register the JSON format command
	const formatJsonDisposable = vscode.commands.registerCommand(COMMANDS.FORMAT, async () => {
		const editor = vscode.window.activeTextEditor;
		
		if (!editor) {
			vscode.window.showErrorMessage(MESSAGES.ERROR.NO_EDITOR);
			return;
		}

		try {
			const { text, range, isSelection } = prepareFormatting(editor);
			const config = getFormatConfig();

			// Execute formatting with progress indicator for large files
			const formattedJson = await executeWithProgress(
				() => {
					const parsedJson: JsonValue = JSON.parse(text);
					return customJsonFormat(parsedJson, 0, config.maxSingleLineLength, config.indentSpaces);
				},
				'Formatting JSON...',
				text
			);

			await applyFormatting(editor.document, range, formattedJson, isSelection, 'formatted');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(MESSAGES.ERROR.INVALID_JSON(errorMessage));
		}
	});

	context.subscriptions.push(formatJsonDisposable);

	// Register the JSON minify command
	const minifyJsonDisposable = vscode.commands.registerCommand(COMMANDS.MINIFY, async () => {
		const editor = vscode.window.activeTextEditor;
		
		if (!editor) {
			vscode.window.showErrorMessage(MESSAGES.ERROR.NO_EDITOR);
			return;
		}

		try {
			const { text, range, isSelection } = prepareFormatting(editor);

			// Execute minification with progress indicator for large files
			const minifiedJson = await executeWithProgress(
				() => {
					const parsedJson: JsonValue = JSON.parse(text);
					return JSON.stringify(parsedJson);
				},
				'Minifying JSON...',
				text
			);

			await applyFormatting(editor.document, range, minifiedJson, isSelection, 'minified');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(MESSAGES.ERROR.INVALID_JSON(errorMessage));
		}
	});

	context.subscriptions.push(minifyJsonDisposable);

	// Register the JSON list format command
	const formatJsonListDisposable = vscode.commands.registerCommand(COMMANDS.FORMAT_LIST_COMPACT, async () => {
		const editor = vscode.window.activeTextEditor;
		
		if (!editor) {
			vscode.window.showErrorMessage(MESSAGES.ERROR.NO_EDITOR);
			return;
		}

		try {
			const { text, range, isSelection } = prepareFormatting(editor);
			const config = getFormatConfig();

			// Execute list formatting with progress indicator for large files
			const formattedJson = await executeWithProgress(
				() => {
					const parsedJson: JsonValue = JSON.parse(text);
					return customJsonListFormat(parsedJson, 0, config.indentSpaces);
				},
				'Formatting JSON list...',
				text
			);

			// Apply formatting with custom success message
			const edit = new vscode.WorkspaceEdit();
			edit.replace(editor.document.uri, range, formattedJson);
			await vscode.workspace.applyEdit(edit);
			
			const message = isSelection 
				? MESSAGES.SUCCESS.FORMAT_LIST_SELECTION 
				: MESSAGES.SUCCESS.FORMAT_LIST_DOCUMENT;
			vscode.window.showInformationMessage(message);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(MESSAGES.ERROR.INVALID_JSON(errorMessage));
		}
	});

	context.subscriptions.push(formatJsonListDisposable);

	// Register the JSON sort list command
	const sortJsonListDisposable = vscode.commands.registerCommand(COMMANDS.SORT_LIST, async () => {
		const editor = vscode.window.activeTextEditor;
		
		if (!editor) {
			vscode.window.showErrorMessage(MESSAGES.ERROR.NO_EDITOR);
			return;
		}

		try {
			const { text, range, isSelection } = prepareFormatting(editor);
			const parsedJson: JsonValue = JSON.parse(text);

			// Check if the JSON is an array
			if (!Array.isArray(parsedJson)) {
				vscode.window.showErrorMessage(MESSAGES.ERROR.NOT_ARRAY);
				return;
			}

			if (parsedJson.length === 0) {
				vscode.window.showInformationMessage('Array is empty, nothing to sort.');
				return;
			}

			// Check if the array contains primitive values
			const hasPrimitiveValues = parsedJson.every(item => 
				typeof item === 'string' || 
				typeof item === 'number' || 
				typeof item === 'boolean' || 
				item === null
			);

			// Check if we're dealing with primitive values or objects
			const firstItem = parsedJson[0];
			let availableProperties: string[] = [];

			if (!hasPrimitiveValues && typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
				availableProperties = Object.keys(firstItem);
			}

			let sortProperty: string | undefined;

			if (hasPrimitiveValues) {
				// Skip property selection for primitive arrays - sort by value
				sortProperty = undefined;
			} else if (availableProperties.length > 0) {
				// Show quick pick for property selection
				const propertyOptions = [
					{
						label: `$(arrow-right) ${availableProperties[0]}`,
						description: 'Default - First property',
						detail: `Sort by "${availableProperties[0]}" (default)`,
						property: availableProperties[0]
					},
					...availableProperties.slice(1).map(prop => ({
						label: `$(symbol-property) ${prop}`,
						description: 'Property',
						detail: `Sort by "${prop}"`,
						property: prop
					}))
				];

				const selected = await vscode.window.showQuickPick(propertyOptions, {
					placeHolder: 'Select property to sort by (or press Escape to cancel)',
					title: 'Sort JSON Array'
				});

				if (!selected) {
					vscode.window.showInformationMessage(MESSAGES.ERROR.SORT_CANCELLED);
					return;
				}

				sortProperty = selected.property;
			} else {
				// No available properties, use default
				sortProperty = undefined;
			}

			// Show direction selection
			const directionOptions = [
				{
					label: '$(arrow-up) Ascending',
					description: 'A → Z, 0 → 9',
					detail: 'Sort in ascending order (default)',
					ascending: true
				},
				{
					label: '$(arrow-down) Descending', 
					description: 'Z → A, 9 → 0',
					detail: 'Sort in descending order',
					ascending: false
				}
			];

			const directionSelected = await vscode.window.showQuickPick(directionOptions, {
				placeHolder: 'Select sort direction (or press Escape to cancel)',
				title: 'Sort Direction'
			});

			if (!directionSelected) {
				vscode.window.showInformationMessage(MESSAGES.ERROR.SORT_CANCELLED);
				return;
			}

			const ascending = directionSelected.ascending;

			// Execute sorting with progress indicator for large files
			const sortedJson = await executeWithProgress(
				() => {
					const sortedArray = sortJsonArrayByProperty(parsedJson, sortProperty, ascending);
					const config = getFormatConfig();
					return customJsonListFormat(sortedArray, 0, config.indentSpaces);
				},
				'Sorting and formatting JSON array...',
				text
			);

			// Apply the sorted result
			const edit = new vscode.WorkspaceEdit();
			edit.replace(editor.document.uri, range, sortedJson);
			await vscode.workspace.applyEdit(edit);
			
			// Determine what we sorted by for the success message
			let sortDescription: string;
			if (hasPrimitiveValues) {
				sortDescription = 'value';
			} else {
				sortDescription = sortProperty || 'first available property';
			}
			
			const direction = ascending ? 'ascending' : 'descending';
			const message = isSelection 
				? MESSAGES.SUCCESS.SORT_LIST_SELECTION(sortDescription, direction)
				: MESSAGES.SUCCESS.SORT_LIST_DOCUMENT(sortDescription, direction);
			vscode.window.showInformationMessage(message);

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			if (errorMessage.includes('Property') && errorMessage.includes('not found')) {
				vscode.window.showErrorMessage(MESSAGES.ERROR.SORT_PROPERTY_NOT_FOUND(errorMessage.split('"')[1] || 'unknown'));
			} else {
				vscode.window.showErrorMessage(MESSAGES.ERROR.INVALID_JSON(errorMessage));
			}
		}
	});

	context.subscriptions.push(sortJsonListDisposable);

	// Register the JSON validation command
	const validateJsonDisposable = vscode.commands.registerCommand(COMMANDS.VALIDATE, async () => {
		const editor = vscode.window.activeTextEditor;
		
		if (!editor) {
			vscode.window.showErrorMessage(MESSAGES.ERROR.NO_EDITOR);
			return;
		}

		try {
			const { text, isSelection } = prepareFormatting(editor);

			// Execute validation with progress indicator for large files
			await executeWithProgress(
				() => {
					// Attempt to parse the JSON to validate syntax
					const parsedJson: JsonValue = JSON.parse(text);
					
					// If we get here, JSON is valid - show success message with details
					const lines = text.split('\n').length;
					const chars = text.length;
					const target = isSelection ? 'selection' : 'document';
					
					// Check if it's a simple value or complex structure
					const isSimpleValue = typeof parsedJson !== 'object' || parsedJson === null;
					
					if (isSimpleValue) {
						vscode.window.showInformationMessage(`JSON ${target} is valid! ✅ (Simple value: ${typeof parsedJson})`);
					} else {
						// For objects/arrays, provide more details
						const objectCount = JSON.stringify(parsedJson).split('{').length - 1;
						const arrayCount = JSON.stringify(parsedJson).split('[').length - 1;
						let details = '';
						
						if (objectCount > 0 && arrayCount > 0) {
							details = ` (${objectCount} objects, ${arrayCount} arrays)`;
						} else if (objectCount > 0) {
							details = ` (${objectCount} objects)`;
						} else if (arrayCount > 0) {
							details = ` (${arrayCount} arrays)`;
						}
						
						vscode.window.showInformationMessage(
							`JSON ${target} is valid! ✅ ${lines} lines, ${chars} characters${details}`
						);
					}
				},
				'Validating JSON...',
				text
			);
		} catch (error) {
			// Enhanced error message with line/position information when possible
			let errorMessage = error instanceof Error ? error.message : 'Unknown error';
			
			// Try to extract position information from JSON.parse error
			const positionMatch = errorMessage.match(/position (\d+)/i);
			if (positionMatch) {
				const position = parseInt(positionMatch[1]);
				const { text } = prepareFormatting(editor);
				const lines = text.substring(0, position).split('\n');
				const lineNumber = lines.length;
				const columnNumber = lines[lines.length - 1].length + 1;
				
				errorMessage = `${errorMessage} (Line ${lineNumber}, Column ${columnNumber})`;
			}
			
			vscode.window.showErrorMessage(MESSAGES.ERROR.VALIDATION_FAILED(errorMessage));
		}
	});

	context.subscriptions.push(validateJsonDisposable);

	// Register document formatting provider for JSON files
	const documentFormattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
		{ scheme: 'file', language: 'json' },
		{
			provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
				const text = document.getText();

				try {
					const config = getFormatConfig();

					// Parse and format the JSON with custom formatting
					const parsedJson: JsonValue = JSON.parse(text);
					const formattedJson = customJsonFormat(parsedJson, 0, config.maxSingleLineLength, config.indentSpaces);

					// Create a text edit for the entire document
					const fullRange = new vscode.Range(
						document.positionAt(0),
						document.positionAt(text.length)
					);

					return [vscode.TextEdit.replace(fullRange, formattedJson)];
				} catch (error) {
					// Return empty array if JSON is invalid (no formatting will happen)
					return [];
				}
			}
		}
	);

	context.subscriptions.push(documentFormattingProvider);

	// Register range formatting provider for JSON files
	const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(
		{ scheme: 'file', language: 'json' },
		{
			provideDocumentRangeFormattingEdits(
				document: vscode.TextDocument, 
				range: vscode.Range
			): vscode.TextEdit[] {
				try {
					const config = getFormatConfig();
					const text = document.getText(range);
					
					// Parse and format the JSON selection
					const parsedJson: JsonValue = JSON.parse(text);
					const formattedJson = customJsonFormat(
						parsedJson, 
						0, 
						config.maxSingleLineLength, 
						config.indentSpaces
					);
					
					return [vscode.TextEdit.replace(range, formattedJson)];
				} catch (error) {
					// Return empty array if JSON is invalid (no formatting will happen)
					return [];
				}
			}
		}
	);

	context.subscriptions.push(rangeFormattingProvider);

	// Register format on save handler
	const formatOnSaveHandler = vscode.workspace.onWillSaveTextDocument(async (event) => {
		const config = getFormatConfig();
		
		// Only format if the option is enabled and it's a JSON file
		if (!config.formatOnSave || event.document.languageId !== 'json') {
			return;
		}

		// Only format if there are no syntax errors in the JSON
		try {
			const text = event.document.getText();
			
			// Use progress indicator for large files during format-on-save
			const formattedJson = await executeWithProgress(
				() => {
					const parsedJson: JsonValue = JSON.parse(text);
					return customJsonFormat(parsedJson, 0, config.maxSingleLineLength, config.indentSpaces);
				},
				'Auto-formatting JSON on save...',
				text
			);

			// Only apply formatting if the content actually changed
			if (text !== formattedJson) {
				const fullRange = new vscode.Range(
					event.document.positionAt(0),
					event.document.positionAt(text.length)
				);

				const edit = new vscode.WorkspaceEdit();
				edit.replace(event.document.uri, fullRange, formattedJson);
				await vscode.workspace.applyEdit(edit);
			}
		} catch (error) {
			// Silently ignore invalid JSON - don't break the save process
			console.log('Genet JSON Formatter: Skipping format on save due to invalid JSON');
		}
	});

	context.subscriptions.push(formatOnSaveHandler);
}

// This method is called when your extension is deactivated
export function deactivate() {}
