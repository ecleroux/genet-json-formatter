import * as assert from 'assert';
import * as vscode from 'vscode';

// Simple test data
const SIMPLE_JSON = '{"name":"John","age":30}';
const COMPLEX_JSON = '{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}],"settings":{"theme":"dark"}}';
const INVALID_JSON = '{"name":"John","age":30,}';

suite('Basic Extension Tests', () => {
	
	suiteSetup(async function() {
		this.timeout(10000); // 10 second timeout for setup
		
		// Activate extension
		const extension = vscode.extensions.getExtension('ecleroux.genet-json-formatter');
		if (extension) {
			if (!extension.isActive) {
				await extension.activate();
			}
		}
		
		// Wait for activation to complete
		await new Promise(resolve => setTimeout(resolve, 2000));
	});

	teardown(async () => {
		try {
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	test('Extension should be present', () => {
		const extension = vscode.extensions.getExtension('ecleroux.genet-json-formatter');
		assert.ok(extension, 'Extension should be found');
	});

	test('Extension should activate', async function() {
		this.timeout(5000);
		
		const extension = vscode.extensions.getExtension('ecleroux.genet-json-formatter');
		assert.ok(extension, 'Extension should exist');
		
		if (!extension.isActive) {
			await extension.activate();
		}
		assert.ok(extension.isActive, 'Extension should be active');
	});

	test('Commands should be registered', async function() {
		this.timeout(5000);
		
		const commands = await vscode.commands.getCommands();
		
		const expectedCommands = [
			'genet-json-formatter.formatJson',
			'genet-json-formatter.minifyJson',
			'genet-json-formatter.validateJson'
		];

		for (const command of expectedCommands) {
			assert.ok(commands.includes(command), `Command ${command} should be registered`);
		}
	});

	test('Should create and open JSON document', async function() {
		this.timeout(5000);
		
		const document = await vscode.workspace.openTextDocument({
			content: SIMPLE_JSON,
			language: 'json'
		});

		assert.strictEqual(document.languageId, 'json', 'Should create JSON document');
		assert.strictEqual(document.getText(), SIMPLE_JSON, 'Should have correct content');
	});

	test('Should execute format command without errors', async function() {
		this.timeout(10000);
		
		const document = await vscode.workspace.openTextDocument({
			content: SIMPLE_JSON,
			language: 'json'
		});
		const editor = await vscode.window.showTextDocument(document);

		try {
			await vscode.commands.executeCommand('genet-json-formatter.formatJson');
			assert.ok(true, 'Format command should execute without errors');
		} catch (error) {
			assert.fail(`Format command failed: ${error}`);
		}
	});

	test('Should execute minify command without errors', async function() {
		this.timeout(10000);
		
		const document = await vscode.workspace.openTextDocument({
			content: COMPLEX_JSON,
			language: 'json'
		});
		const editor = await vscode.window.showTextDocument(document);

		try {
			await vscode.commands.executeCommand('genet-json-formatter.minifyJson');
			assert.ok(true, 'Minify command should execute without errors');
		} catch (error) {
			assert.fail(`Minify command failed: ${error}`);
		}
	});

	test('Should execute validate command without errors', async function() {
		this.timeout(10000);
		
		const document = await vscode.workspace.openTextDocument({
			content: SIMPLE_JSON,
			language: 'json'
		});
		const editor = await vscode.window.showTextDocument(document);

		try {
			await vscode.commands.executeCommand('genet-json-formatter.validateJson');
			assert.ok(true, 'Validate command should execute without errors');
		} catch (error) {
			assert.fail(`Validate command failed: ${error}`);
		}
	});

	test('Should handle invalid JSON gracefully', async function() {
		this.timeout(10000);
		
		const document = await vscode.workspace.openTextDocument({
			content: INVALID_JSON,
			language: 'json'
		});
		const editor = await vscode.window.showTextDocument(document);

		try {
			// All commands should handle invalid JSON without throwing
			await vscode.commands.executeCommand('genet-json-formatter.formatJson');
			await vscode.commands.executeCommand('genet-json-formatter.minifyJson');
			await vscode.commands.executeCommand('genet-json-formatter.validateJson');
			
			assert.ok(true, 'Commands should handle invalid JSON gracefully');
		} catch (error) {
			assert.fail(`Commands should not throw errors for invalid JSON: ${error}`);
		}
	});

	test('Should handle no active editor gracefully', async function() {
		this.timeout(10000);
		
		// Close all editors
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');

		try {
			// Commands should handle no active editor without throwing
			await vscode.commands.executeCommand('genet-json-formatter.formatJson');
			await vscode.commands.executeCommand('genet-json-formatter.minifyJson');
			await vscode.commands.executeCommand('genet-json-formatter.validateJson');
			
			assert.ok(true, 'Commands should handle no active editor gracefully');
		} catch (error) {
			assert.fail(`Commands should not throw errors when no editor is active: ${error}`);
		}
	});

	test('Configuration should be accessible', () => {
		const config = vscode.workspace.getConfiguration('genet-json-formatter');
		
		// Should be able to access configuration without errors
		const maxLength = config.get('maxSingleLineLength');
		const indentSpaces = config.get('indentSpaces');
		const formatOnSave = config.get('formatOnSave');

		assert.ok(typeof maxLength === 'number' || maxLength === undefined, 'maxSingleLineLength should be number or undefined');
		assert.ok(typeof indentSpaces === 'number' || indentSpaces === undefined, 'indentSpaces should be number or undefined');
		assert.ok(typeof formatOnSave === 'boolean' || formatOnSave === undefined, 'formatOnSave should be boolean or undefined');
	});
});