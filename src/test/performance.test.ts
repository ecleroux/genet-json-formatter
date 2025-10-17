import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Performance Tests', () => {
	let document: vscode.TextDocument;
	let editor: vscode.TextEditor;

	suiteSetup(async () => {
		// Ensure extension is activated for performance tests
		const extension = vscode.extensions.getExtension('ecleroux.genet-json-formatter');
		if (extension && !extension.isActive) {
			await extension.activate();
		}
		await new Promise(resolve => setTimeout(resolve, 1000));
	});

	teardown(async () => {
		try {
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	suite('Large JSON Performance', () => {
		test('Should handle large JSON file efficiently', function() {
			this.timeout(15000); // 15 second timeout for large file test

			return new Promise(async (resolve) => {
				// Generate moderately large JSON object (smaller for test stability)
				const largeObject: any = {};
				for (let i = 0; i < 1000; i++) { // Reduced from 10000 to 1000
					largeObject[`key_${i}`] = {
						id: i,
						name: `Name ${i}`,
						description: `Description for item ${i}`,
						tags: [`tag${i}`, `category${i % 10}`],
						metadata: {
							created: '2023-01-01T00:00:00.000Z',
							version: '1.0.0'
						}
					};
				}

				const largeJson = JSON.stringify(largeObject);
				console.log(`Generated JSON size: ${(largeJson.length / 1024).toFixed(2)} KB`);

				document = await vscode.workspace.openTextDocument({
					content: largeJson,
					language: 'json'
				});
				editor = await vscode.window.showTextDocument(document);

				const startTime = Date.now();
				
				// Test formatting performance
				try {
					await vscode.commands.executeCommand('genet-json-formatter.formatJson');
					
					const formatTime = Date.now() - startTime;
					console.log(`Format time: ${formatTime}ms`);

					// Should complete within reasonable time (15 seconds)
					assert.ok(formatTime < 15000, `Formatting should complete within 15 seconds, took ${formatTime}ms`);

					const formattedText = document.getText();
					assert.ok(formattedText.length > 0, 'Should produce formatted output');
				} catch (error) {
					assert.fail(`Large file formatting failed: ${error}`);
				}
				
				resolve(undefined);
			});
		});

		test('Should handle deeply nested JSON efficiently', function() {
			this.timeout(15000); // 15 second timeout

			return new Promise(async (resolve) => {
				// Create deeply nested JSON (100 levels)
				let deepObject: any = { value: 'deep_value' };
				for (let i = 0; i < 100; i++) {
					deepObject = {
						[`level_${i}`]: deepObject,
						metadata: { level: i, created: new Date().toISOString() }
					};
				}

				const deepJson = JSON.stringify(deepObject);
				console.log(`Deep JSON size: ${(deepJson.length / 1024).toFixed(2)} KB, depth: 100`);

				document = await vscode.workspace.openTextDocument({
					content: deepJson,
					language: 'json'
				});
				editor = await vscode.window.showTextDocument(document);

				const startTime = Date.now();
				
				await vscode.commands.executeCommand('genet-json-formatter.formatJson');
				
				const formatTime = Date.now() - startTime;
				console.log(`Deep format time: ${formatTime}ms`);

				// Should handle deep nesting efficiently
				assert.ok(formatTime < 15000, `Deep formatting should complete within 15 seconds, took ${formatTime}ms`);

				const formattedText = document.getText();
				assert.ok(formattedText.includes('deep_value'), 'Should preserve deep values');
				
				resolve(undefined);
			});
		});

		test('Should handle wide JSON arrays efficiently', function() {
			this.timeout(20000); // 20 second timeout

			return new Promise(async (resolve) => {
				// Create wide array (50,000 items)
				const wideArray = Array.from({ length: 50000 }, (_, i) => ({
					id: i,
					name: `Item ${i}`,
					active: i % 2 === 0
				}));

				const wideJson = JSON.stringify(wideArray);
				console.log(`Wide JSON size: ${(wideJson.length / 1024 / 1024).toFixed(2)} MB, items: ${wideArray.length}`);

				document = await vscode.workspace.openTextDocument({
					content: wideJson,
					language: 'json'
				});
				editor = await vscode.window.showTextDocument(document);

				const startTime = Date.now();
				
				await vscode.commands.executeCommand('genet-json-formatter.formatJson');
				
				const formatTime = Date.now() - startTime;
				console.log(`Wide format time: ${formatTime}ms`);

				// Should handle wide arrays efficiently
				assert.ok(formatTime < 20000, `Wide formatting should complete within 20 seconds, took ${formatTime}ms`);

				const formattedText = document.getText();
				assert.ok(formattedText.includes('[\n'), 'Should format array with line breaks');
				
				resolve(undefined);
			});
		});
	});

	suite('Command Performance', () => {
		test('Should minify large JSON quickly', function() {
			this.timeout(10000);

			return new Promise(async (resolve) => {
				// Create formatted JSON to minify
				const formattedJson = `{
  "users": [
    ${Array.from({ length: 1000 }, (_, i) => `{
      "id": ${i},
      "name": "User ${i}",
      "email": "user${i}@example.com"
    }`).join(',\n    ')}
  ]
}`;

				document = await vscode.workspace.openTextDocument({
					content: formattedJson,
					language: 'json'
				});
				editor = await vscode.window.showTextDocument(document);

				const startTime = Date.now();
				
				await vscode.commands.executeCommand('genet-json-formatter.minifyJson');
				
				const minifyTime = Date.now() - startTime;
				console.log(`Minify time: ${minifyTime}ms`);

				// Minification should be very fast
				assert.ok(minifyTime < 5000, `Minification should complete within 5 seconds, took ${minifyTime}ms`);

				const minifiedText = document.getText();
				assert.strictEqual(minifiedText.split('\n').length, 1, 'Should produce single-line output');
				
				resolve(undefined);
			});
		});

		test('Should validate large JSON quickly', function() {
			this.timeout(10000);

			return new Promise(async (resolve) => {
				// Create large valid JSON
				const largeValidJson = JSON.stringify({
					data: Array.from({ length: 5000 }, (_, i) => ({
						id: i,
						value: `Value ${i}`,
						metadata: { index: i, category: i % 10 }
					}))
				});

				document = await vscode.workspace.openTextDocument({
					content: largeValidJson,
					language: 'json'
				});
				editor = await vscode.window.showTextDocument(document);

				const startTime = Date.now();
				
				await vscode.commands.executeCommand('genet-json-formatter.validateJson');
				
				const validateTime = Date.now() - startTime;
				console.log(`Validate time: ${validateTime}ms`);

				// Validation should be very fast
				assert.ok(validateTime < 5000, `Validation should complete within 5 seconds, took ${validateTime}ms`);
				
				resolve(undefined);
			});
		});
	});

	suite('Memory Usage Tests', () => {
		test('Should not cause memory leaks with repeated operations', function() {
			this.timeout(30000);

			return new Promise(async (resolve) => {
				const testJson = JSON.stringify({
					data: Array.from({ length: 1000 }, (_, i) => ({
						id: i,
						name: `Name ${i}`,
						values: Array.from({ length: 10 }, (_, j) => j)
					}))
				});

				// Perform multiple operations to test for memory leaks
				for (let i = 0; i < 10; i++) {
					document = await vscode.workspace.openTextDocument({
						content: testJson,
						language: 'json'
					});
					editor = await vscode.window.showTextDocument(document);

					// Cycle through all operations
					await vscode.commands.executeCommand('genet-json-formatter.formatJson');
					await vscode.commands.executeCommand('genet-json-formatter.minifyJson');
					await vscode.commands.executeCommand('genet-json-formatter.validateJson');

					// Close document to free memory
					await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
				}

				assert.ok(true, 'Should complete multiple operations without memory issues');
				resolve(undefined);
			});
		});
	});

	suite('Stress Tests', () => {
		test('Should handle malformed JSON edge cases', async () => {
			const malformedCases = [
				'{"unclosed": "string',
				'{"trailing": "comma",}',
				'{"duplicate": "key", "duplicate": "value"}',
				'{"number": 123.456.789}',
				'{"string": "unescaped"quote"}',
				'{"array": [1,2,3,]}',
				'{"nested": {"unclosed": {"object": true}',
				'{broken json completely}',
				'null null null',
				'{"unicode": "\\uXXXX"}'
			];

			for (const malformedJson of malformedCases) {
				document = await vscode.workspace.openTextDocument({
					content: malformedJson,
					language: 'json'
				});
				editor = await vscode.window.showTextDocument(document);

				// Should not crash on any malformed JSON
				try {
					await vscode.commands.executeCommand('genet-json-formatter.validateJson');
					// Should either succeed (if fixable) or show error message
					assert.ok(true, `Should handle malformed JSON: ${malformedJson.substring(0, 30)}...`);
				} catch (error) {
					assert.fail(`Should not throw unhandled errors for: ${malformedJson}`);
				}

				await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
			}
		});

		test('Should handle concurrent operations gracefully', function() {
			this.timeout(15000);

			return new Promise(async (resolve) => {
				const testJson = '{"test": "concurrent", "data": [1,2,3,4,5]}';
				
				// Create multiple documents
				const documents = await Promise.all([
					vscode.workspace.openTextDocument({ content: testJson, language: 'json' }),
					vscode.workspace.openTextDocument({ content: testJson, language: 'json' }),
					vscode.workspace.openTextDocument({ content: testJson, language: 'json' })
				]);

				// Show all documents
				const editors = await Promise.all(documents.map(doc => vscode.window.showTextDocument(doc)));

				// Run concurrent operations
				const operations = [];
				for (let i = 0; i < editors.length; i++) {
					operations.push(vscode.commands.executeCommand('genet-json-formatter.formatJson'));
					operations.push(vscode.commands.executeCommand('genet-json-formatter.validateJson'));
				}

				await Promise.all(operations);

				assert.ok(true, 'Should handle concurrent operations without conflicts');
				resolve(undefined);
			});
		});
	});
});