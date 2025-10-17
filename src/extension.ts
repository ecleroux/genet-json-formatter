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
	VALIDATE: 'genet-json-formatter.validateJson'
} as const;

const MESSAGES = {
	SUCCESS: {
		FORMAT_SELECTION: 'JSON selection formatted successfully!',
		FORMAT_DOCUMENT: 'JSON document formatted successfully!',
		MINIFY_SELECTION: 'JSON selection minified successfully!',
		MINIFY_DOCUMENT: 'JSON document minified successfully!',
		VALIDATE_SUCCESS: 'JSON is valid! ✅',
		VALIDATE_SUCCESS_DETAILS: (lines: number, chars: number) => `JSON is valid! ✅ (${lines} lines, ${chars} characters)`
	},
	ERROR: {
		NO_EDITOR: 'No active editor found',
		INVALID_JSON: (error: string) => `Invalid JSON: ${error}`,
		VALIDATION_FAILED: (error: string) => `JSON Validation Failed: ${error}`
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
		
		const target = isSelection ? 'selection' : 'document';
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
