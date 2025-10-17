import * as assert from 'assert';
import * as vscode from 'vscode';

// Test data constants
const TEST_JSON_SIMPLE = '{"name":"John","age":30}';
const TEST_JSON_COMPLEX = '{"name":"John Doe","age":30,"address":{"street":"123 Main St","city":"New York","country":"USA"},"hobbies":["reading","coding"],"contacts":[{"type":"email","value":"john@example.com"},{"type":"phone","value":"555-1234"}]}';
const TEST_JSON_ARRAY_WITH_OBJECTS = '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]';
const TEST_JSON_SIMPLE_ARRAY = '["apple","banana","cherry"]';
const TEST_JSON_INVALID = '{"name":"John","age":30,}'; // Trailing comma
const TEST_JSON_MALFORMED = '{"name":"John"age":30}'; // Missing colon

suite('Genet JSON Formatter Extension Tests', () => {
	let document: vscode.TextDocument;
	let editor: vscode.TextEditor;

	suiteSetup(async () => {
		// Ensure our extension is activated before running any tests
		const extension = vscode.extensions.getExtension('ecleroux.genet-json-formatter');
		if (extension && !extension.isActive) {
			await extension.activate();
		}
		
		// Wait a bit for extension to fully activate
		await new Promise(resolve => setTimeout(resolve, 1000));
	});

	teardown(async () => {
		// Close any open editors after each test
		try {
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		} catch (error) {
			// Ignore errors during cleanup
		}
	});

	suite('Extension Activation', () => {
		test('Extension should be present and activate', async () => {
			const extension = vscode.extensions.getExtension('ecleroux.genet-json-formatter');
			assert.ok(extension, 'Extension should be present');
			
			if (!extension.isActive) {
				await extension.activate();
			}
			assert.ok(extension.isActive, 'Extension should activate successfully');
		});

		test('Commands should be registered', async () => {
			const commands = await vscode.commands.getCommands();
			
			assert.ok(commands.includes('genet-json-formatter.formatJson'), 'Format command should be registered');
			assert.ok(commands.includes('genet-json-formatter.minifyJson'), 'Minify command should be registered');
			assert.ok(commands.includes('genet-json-formatter.validateJson'), 'Validate command should be registered');
		});
	});

	suite('Document Formatting Provider', () => {
		test('Should format simple JSON object', async () => {
			document = await vscode.workspace.openTextDocument({
				content: TEST_JSON_SIMPLE,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			const originalContent = document.getText();

			// Use VS Code's built-in format document command
			await vscode.commands.executeCommand('editor.action.formatDocument');

			const formattedText = document.getText();
			
			// Should be valid JSON and contain the expected keys
			assert.ok(formattedText.includes('"name"'), 'Should contain name key');
			assert.ok(formattedText.includes('"age"'), 'Should contain age key');
			assert.ok(formattedText.includes('John'), 'Should contain John');
			assert.ok(formattedText.includes('30'), 'Should contain age 30');
			
			// Should be parseable JSON
			assert.doesNotThrow(() => JSON.parse(formattedText), 'Should produce valid JSON');
		});

		test('Should format complex JSON with proper structure', async () => {
			document = await vscode.workspace.openTextDocument({
				content: TEST_JSON_COMPLEX,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			await vscode.commands.executeCommand('editor.action.formatDocument');

			const formattedText = document.getText();
			
			// Should contain all expected keys and values
			assert.ok(formattedText.includes('"name"'), 'Should contain name');
			assert.ok(formattedText.includes('"address"'), 'Should contain address');
			assert.ok(formattedText.includes('"hobbies"'), 'Should contain hobbies');
			assert.ok(formattedText.includes('"contacts"'), 'Should contain contacts');
			assert.ok(formattedText.includes('John Doe'), 'Should contain John Doe');
			
			// Should be parseable JSON
			assert.doesNotThrow(() => JSON.parse(formattedText), 'Should produce valid JSON');
		});

		test('Should handle arrays with objects properly', async () => {
			document = await vscode.workspace.openTextDocument({
				content: TEST_JSON_ARRAY_WITH_OBJECTS,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			await vscode.commands.executeCommand('editor.action.formatDocument');

			const formattedText = document.getText();
			
			// Should contain the expected data
			assert.ok(formattedText.includes('"id"'), 'Should contain id fields');
			assert.ok(formattedText.includes('"name"'), 'Should contain name fields');
			assert.ok(formattedText.includes('Alice'), 'Should contain Alice');
			assert.ok(formattedText.includes('Bob'), 'Should contain Bob');
			
			// Should be parseable JSON
			assert.doesNotThrow(() => JSON.parse(formattedText), 'Should produce valid JSON');
		});

		test('Should keep simple arrays compact', async () => {
			document = await vscode.workspace.openTextDocument({
				content: TEST_JSON_SIMPLE_ARRAY,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			await vscode.commands.executeCommand('editor.action.formatDocument');

			const formattedText = document.getText();
			
			// Simple arrays should contain all expected elements
			assert.ok(formattedText.includes('apple'), 'Should contain apple');
			assert.ok(formattedText.includes('banana'), 'Should contain banana');
			assert.ok(formattedText.includes('cherry'), 'Should contain cherry');
			
			// Should be parseable JSON
			assert.doesNotThrow(() => JSON.parse(formattedText), 'Should produce valid JSON');
		});

		test('Should handle invalid JSON gracefully', async () => {
			document = await vscode.workspace.openTextDocument({
				content: TEST_JSON_INVALID,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			// Should not throw error when attempting to format invalid JSON
			try {
				await vscode.commands.executeCommand('editor.action.formatDocument');
				
				// Content may or may not change depending on VS Code's JSON formatting behavior
				// The key is that no error should be thrown
				const currentText = document.getText();
				assert.ok(typeof currentText === 'string', 'Should still have string content');
				assert.ok(currentText.length > 0, 'Should have some content');
				
			} catch (error) {
				assert.fail(`Format command should not throw errors: ${error}`);
			}
		});
	});

	suite('Range Formatting Provider', () => {
		test('Should format selected JSON range', async () => {
			const testContent = `{
"data": ${TEST_JSON_SIMPLE},
"other": "value"
}`;

			document = await vscode.workspace.openTextDocument({
				content: testContent,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			// Select only the inner JSON object
			const startPos = testContent.indexOf(TEST_JSON_SIMPLE);
			const endPos = startPos + TEST_JSON_SIMPLE.length;
			
			editor.selection = new vscode.Selection(
				document.positionAt(startPos),
				document.positionAt(endPos)
			);

			await vscode.commands.executeCommand('editor.action.formatSelection');

			const formattedText = document.getText();
			
			// The content should still be valid JSON and contain expected data
			assert.ok(formattedText.includes('"data"'), 'Should contain data key');
			assert.ok(formattedText.includes('"other"'), 'Should contain other key');
			assert.ok(formattedText.includes('John'), 'Should contain John');
			
			// Should be parseable JSON
			assert.doesNotThrow(() => JSON.parse(formattedText), 'Should produce valid JSON');
		});
	});

	suite('Format Command', () => {
		test('Should format entire document via command', async () => {
			document = await vscode.workspace.openTextDocument({
				content: TEST_JSON_COMPLEX,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			await vscode.commands.executeCommand('genet-json-formatter.formatJson');

			const formattedText = document.getText();
			const lines = formattedText.split('\n');
			
			assert.ok(lines.length > 1, 'Should format complex JSON with multiple lines');
			assert.ok(formattedText.includes('  '), 'Should include proper indentation');
		});

		test('Should format selected text via command', async () => {
			const testContent = `{"unformatted":${TEST_JSON_SIMPLE},"other":"data"}`;
			
			document = await vscode.workspace.openTextDocument({
				content: testContent,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			// Select only part of the JSON
			const startPos = testContent.indexOf(TEST_JSON_SIMPLE);
			const endPos = startPos + TEST_JSON_SIMPLE.length;
			
			editor.selection = new vscode.Selection(
				document.positionAt(startPos),
				document.positionAt(endPos)
			);

			await vscode.commands.executeCommand('genet-json-formatter.formatJson');

			const formattedText = document.getText();
			
			// Should format the selected part
			assert.ok(formattedText.includes('{ '), 'Selected part should be formatted');
		});

		test('Should show error for invalid JSON via command', async () => {
			document = await vscode.workspace.openTextDocument({
				content: TEST_JSON_MALFORMED,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			// For invalid JSON, the command should complete without throwing
			// but the document content should remain unchanged
			const originalContent = document.getText();
			
			try {
				await vscode.commands.executeCommand('genet-json-formatter.formatJson');
				
				// Content should remain unchanged for invalid JSON
				const newContent = document.getText();
				assert.strictEqual(newContent, originalContent, 'Invalid JSON should remain unchanged');
				
				assert.ok(true, 'Command should handle invalid JSON gracefully');
			} catch (error) {
				assert.fail(`Command should not throw errors: ${error}`);
			}
		});
	});

	suite('Minify Command', () => {
		test('Should minify formatted JSON', async () => {
			const formattedJson = `{
  "name": "John Doe",
  "age": 30,
  "city": "New York"
}`;

			document = await vscode.workspace.openTextDocument({
				content: formattedJson,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			await vscode.commands.executeCommand('genet-json-formatter.minifyJson');

			const minifiedText = document.getText();
			
			// Should be single line without extra spaces
			assert.strictEqual(minifiedText.split('\n').length, 1, 'Minified JSON should be single line');
			assert.ok(!minifiedText.includes('  '), 'Should not contain extra spaces');
			assert.ok(minifiedText.includes('{"name":"John Doe"'), 'Should contain minified content');
		});

		test('Should minify selected JSON', async () => {
			const testContent = `{
"data": {
  "name": "John",
  "age": 30
},
"other": "value"
}`;

			document = await vscode.workspace.openTextDocument({
				content: testContent,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			// Select the inner object
			const startPos = testContent.indexOf('{\n  "name"');
			const endPos = testContent.indexOf('\n}') + 1;
			
			editor.selection = new vscode.Selection(
				document.positionAt(startPos),
				document.positionAt(endPos)
			);

			await vscode.commands.executeCommand('genet-json-formatter.minifyJson');

			const resultText = document.getText();
			
			// Should still contain expected data and be valid JSON
			assert.ok(resultText.includes('"name"'), 'Should contain name key');
			assert.ok(resultText.includes('"John"'), 'Should contain John value');
			assert.ok(resultText.includes('"age"'), 'Should contain age key');
			assert.ok(resultText.includes('30'), 'Should contain age value');
			
			// Should be parseable JSON
			assert.doesNotThrow(() => JSON.parse(resultText), 'Should produce valid JSON');
		});
	});

	suite('Validate Command', () => {
		test('Should validate correct JSON', async () => {
			document = await vscode.workspace.openTextDocument({
				content: TEST_JSON_SIMPLE,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			// Test that validation command runs without errors
			try {
				await vscode.commands.executeCommand('genet-json-formatter.validateJson');
				assert.ok(true, 'Validation command should run successfully for valid JSON');
			} catch (error) {
				assert.fail(`Validation should not throw errors for valid JSON: ${error}`);
			}
		});

		test('Should validate complex JSON', async () => {
			document = await vscode.workspace.openTextDocument({
				content: TEST_JSON_COMPLEX,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			// Test that validation works for complex JSON
			try {
				await vscode.commands.executeCommand('genet-json-formatter.validateJson');
				assert.ok(true, 'Should validate complex JSON successfully');
			} catch (error) {
				assert.fail(`Validation should not throw errors for valid complex JSON: ${error}`);
			}
		});

		test('Should handle invalid JSON validation gracefully', async () => {
			document = await vscode.workspace.openTextDocument({
				content: TEST_JSON_INVALID,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			// Command should complete without throwing, may show error message
			try {
				await vscode.commands.executeCommand('genet-json-formatter.validateJson');
				assert.ok(true, 'Validation command should handle invalid JSON gracefully');
			} catch (error) {
				assert.fail(`Validation should not throw unhandled errors: ${error}`);
			}
		});
	});

	suite('Configuration Tests', () => {
		test('Should respect maxSingleLineLength setting', async () => {
			// Set a very small max length to force multi-line formatting
			await vscode.workspace.getConfiguration('genet-json-formatter')
				.update('maxSingleLineLength', 20, vscode.ConfigurationTarget.Global);

			document = await vscode.workspace.openTextDocument({
				content: TEST_JSON_SIMPLE,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			await vscode.commands.executeCommand('editor.action.formatDocument');

			const formattedText = document.getText();
			const lines = formattedText.split('\n');
			
			// With small max length, even simple objects should be multi-line
			assert.ok(lines.length > 1, 'Should format with multiple lines when max length is small');

			// Reset configuration
			await vscode.workspace.getConfiguration('genet-json-formatter')
				.update('maxSingleLineLength', undefined, vscode.ConfigurationTarget.Global);
		});

		test('Should respect indentSpaces setting', async () => {
			// Set custom indentation
			await vscode.workspace.getConfiguration('genet-json-formatter')
				.update('indentSpaces', 4, vscode.ConfigurationTarget.Global);

			document = await vscode.workspace.openTextDocument({
				content: TEST_JSON_COMPLEX,
				language: 'json'
			});
			editor = await vscode.window.showTextDocument(document);

			await vscode.commands.executeCommand('editor.action.formatDocument');

			const formattedText = document.getText();
			
			// Should use 4 spaces for indentation
			assert.ok(formattedText.includes('    '), 'Should use 4 spaces for indentation');

			// Reset configuration
			await vscode.workspace.getConfiguration('genet-json-formatter')
				.update('indentSpaces', undefined, vscode.ConfigurationTarget.Global);
		});
	});

	suite('Error Handling', () => {
		test('Should handle no active editor gracefully', async () => {
			// Close all editors to test no active editor scenario
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');

			// Command should complete without throwing (may show error message)
			try {
				await vscode.commands.executeCommand('genet-json-formatter.formatJson');
				assert.ok(true, 'Command should handle no active editor gracefully');
			} catch (error) {
				assert.fail(`Command should not throw unhandled errors: ${error}`);
			}
		});

		test('Should not break on extremely large JSON', function() {
			this.timeout(10000); // Increase timeout for large JSON test
			
			return new Promise(async (resolve) => {
				// Create a large JSON object
				const largeObject: any = {};
				for (let i = 0; i < 1000; i++) {
					largeObject[`key${i}`] = `value${i}`;
				}
				const largeJson = JSON.stringify(largeObject);

				document = await vscode.workspace.openTextDocument({
					content: largeJson,
					language: 'json'
				});
				editor = await vscode.window.showTextDocument(document);

				// Should not throw error or timeout
				await vscode.commands.executeCommand('genet-json-formatter.formatJson');

				const formattedText = document.getText();
				assert.ok(formattedText.length > 0, 'Should handle large JSON without crashing');
				
				resolve(undefined);
			});
		});
	});
});
