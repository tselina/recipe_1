/**
 * Unit Tests for Recipe Card Button (Task 11.1)
 * Tests for "New from this" button rendering, disabled state, and tooltip
 * 
 * Requirements: 1.4, 1.5
 * Run with: node test-recipe-card-button.js
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
    url: 'http://localhost',
    runScripts: 'dangerously'
});

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.InputEvent = dom.window.InputEvent;

// Load source files
const loadScript = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const script = dom.window.document.createElement('script');
    script.textContent = content;
    dom.window.document.head.appendChild(script);
};

loadScript(path.join(__dirname, 'js', 'data-models.js'));
loadScript(path.join(__dirname, 'js', 'storage-manager.js'));
loadScript(path.join(__dirname, 'js', 'barcode-generator.js'));
loadScript(path.join(__dirname, 'js', 'recipe-manager.js'));
loadScript(path.join(__dirname, 'js', 'ui-controller.js'));

// Extract classes from window
const { Ingredient, Recipe } = dom.window;
const StorageManager = dom.window.StorageManager;
const RecipeManager = dom.window.RecipeManager;
const UIController = dom.window.UIController;

// Test utilities
class TestRunner {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, fn) {
        try {
            fn();
            this.results.push({ name, passed: true });
            this.passed++;
            console.log(`  ✓ ${name}`);
        } catch (error) {
            this.results.push({ name, passed: false, error: error.message });
            this.failed++;
            console.log(`  ✗ ${name}`);
            console.log(`    ${error.message}`);
        }
    }

    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`${message}\n    Expected: ${expected}\n    Actual: ${actual}`);
        }
    }

    assertTrue(value, message = '') {
        if (!value) {
            throw new Error(message || 'Expected true but got false');
        }
    }

    assertFalse(value, message = '') {
        if (value) {
            throw new Error(message || 'Expected false but got true');
        }
    }

    assertNotNull(value, message = '') {
        if (value === null || value === undefined) {
            throw new Error(message || 'Expected non-null value');
        }
    }

    assertContains(str, substring, message = '') {
        if (!str || !str.includes(substring)) {
            throw new Error(message || `Expected "${str}" to contain "${substring}"`);
        }
    }

    summary() {
        console.log('\n' + '='.repeat(60));
        console.log(`Test Results: ${this.passed} passed, ${this.failed} failed`);
        console.log('='.repeat(60));
        return this.failed === 0;
    }
}

// Mock StorageManager
class MockStorageManager {
    constructor() {
        this.storage = {};
    }

    saveRecipe(recipe) {
        this.storage[recipe.id] = recipe;
        return Promise.resolve(recipe);
    }

    updateRecipe(recipe) {
        this.storage[recipe.id] = recipe;
        return Promise.resolve(recipe);
    }

    getRecipe(recipeId) {
        return this.storage[recipeId] || null;
    }

    getAllRecipes() {
        return Object.values(this.storage);
    }

    deleteRecipe(recipeId) {
        delete this.storage[recipeId];
        return Promise.resolve();
    }

    clearAllRecipes() {
        this.storage = {};
        return Promise.resolve();
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Run tests
async function runTests() {
    console.log('\n' + '='.repeat(60));
    console.log('Recipe Card Button Unit Tests (Task 11.1)');
    console.log('Requirements: 1.4, 1.5');
    console.log('='.repeat(60) + '\n');

    const runner = new TestRunner();
    const mockStorage = new MockStorageManager();
    const recipeManager = new RecipeManager(mockStorage);
    const portionCalculator = { calculatePortions: () => ({}) };
    const productDatabase = { findByBarcode: () => null };
    const uiController = new UIController(recipeManager, portionCalculator, productDatabase, mockStorage);

    console.log('Test Group 1: Button Rendering with Remaining Ingredients\n');

    // Test 1.1: Button exists when recipe has remaining ingredients
    runner.test('Button exists when recipe has remaining ingredients', async () => {
        const recipe = await recipeManager.createRecipe('Test Recipe', [
            { name: 'Flour', weight: 500, barcode: '12345' }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertNotNull(button, 'Button should exist in recipe card');
    });

    // Test 1.2: Button is enabled when recipe has remaining ingredients
    runner.test('Button is enabled when recipe has remaining ingredients', async () => {
        const recipe = await recipeManager.createRecipe('Active Recipe', [
            { name: 'Sugar', weight: 300, barcode: '67890' }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertFalse(button.disabled, 'Button should be enabled when ingredients remain');
    });

    // Test 1.3: Button is enabled with multiple remaining ingredients
    runner.test('Button is enabled with multiple remaining ingredients', async () => {
        const recipe = await recipeManager.createRecipe('Multi-Ingredient Recipe', [
            { name: 'Flour', weight: 500, barcode: '12345' },
            { name: 'Sugar', weight: 300, barcode: '67890' },
            { name: 'Salt', weight: 50, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertFalse(button.disabled, 'Button should be enabled with multiple remaining ingredients');
    });

    // Test 1.4: Button is enabled when only one ingredient has remaining weight
    runner.test('Button is enabled when only one ingredient has remaining weight', async () => {
        const recipe = await recipeManager.createRecipe('Partial Recipe', [
            { name: 'Flour', weight: 500, barcode: '12345' },
            { name: 'Sugar', weight: 0, barcode: '67890' }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertFalse(button.disabled, 'Button should be enabled when at least one ingredient remains');
    });

    // Test 1.5: Button has correct CSS class
    runner.test('Button has correct CSS classes', async () => {
        const recipe = await recipeManager.createRecipe('CSS Test Recipe', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertTrue(button.classList.contains('btn'), 'Button should have "btn" class');
        runner.assertTrue(button.classList.contains('btn-primary'), 'Button should have "btn-primary" class');
        runner.assertTrue(button.classList.contains('btn-small'), 'Button should have "btn-small" class');
    });

    // Test 1.6: Button has correct text content
    runner.test('Button has correct text content', async () => {
        const recipe = await recipeManager.createRecipe('Text Test Recipe', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertContains(button.textContent.trim(), 'New from this', 'Button should display "New from this" text');
    });

    // Test 1.7: Button has correct data attribute
    runner.test('Button has correct recipe ID data attribute', async () => {
        const recipe = await recipeManager.createRecipe('Data Attribute Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertEqual(button.dataset.recipeId, recipe.id, 'Button should have correct recipe ID');
    });

    console.log('\nTest Group 2: Button Disabled State (Requirement 1.4)\n');

    // Test 2.1: Button is disabled when all ingredients have zero weight
    runner.test('Button is disabled when all ingredients have zero weight', async () => {
        const recipe = await recipeManager.createRecipe('Empty Recipe', [
            { name: 'Flour', weight: 0, barcode: '12345' },
            { name: 'Sugar', weight: 0, barcode: '67890' }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertTrue(button.disabled, 'Button should be disabled when no ingredients remain');
    });

    // Test 2.2: Button is disabled when single ingredient has zero weight
    runner.test('Button is disabled when single ingredient has zero weight', async () => {
        const recipe = await recipeManager.createRecipe('Single Empty', [
            { name: 'Salt', weight: 0, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertTrue(button.disabled, 'Button should be disabled with single zero-weight ingredient');
    });

    // Test 2.3: Button disabled attribute is properly set
    runner.test('Button disabled attribute is properly set in HTML', async () => {
        const recipe = await recipeManager.createRecipe('Disabled Test', [
            { name: 'Flour', weight: 0, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertTrue(button.hasAttribute('disabled'), 'Button should have disabled attribute');
    });

    console.log('\nTest Group 3: Tooltip Text (Requirement 1.4)\n');

    // Test 3.1: Tooltip exists when button is disabled
    runner.test('Tooltip exists when button is disabled', async () => {
        const recipe = await recipeManager.createRecipe('Tooltip Test', [
            { name: 'Flour', weight: 0, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertTrue(button.hasAttribute('title'), 'Button should have title attribute for tooltip');
    });

    // Test 3.2: Tooltip contains "No remaining ingredients" text
    runner.test('Tooltip contains "No remaining ingredients" text', async () => {
        const recipe = await recipeManager.createRecipe('Tooltip Content Test', [
            { name: 'Sugar', weight: 0, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        const tooltipText = button.getAttribute('title');
        runner.assertContains(tooltipText, 'No remaining ingredients', 'Tooltip should indicate no remaining ingredients');
    });

    // Test 3.3: Tooltip text is exact match
    runner.test('Tooltip text matches specification exactly', async () => {
        const recipe = await recipeManager.createRecipe('Exact Tooltip Test', [
            { name: 'Flour', weight: 0, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertEqual(button.getAttribute('title'), 'No remaining ingredients', 
            'Tooltip should match exact specification');
    });

    // Test 3.4: No tooltip when button is enabled
    runner.test('No tooltip when button is enabled', async () => {
        const recipe = await recipeManager.createRecipe('No Tooltip Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        // When enabled, the title attribute should not be set or should be empty
        const hasTooltip = button.hasAttribute('title') && button.getAttribute('title') !== '';
        runner.assertFalse(hasTooltip, 'Button should not have tooltip when enabled');
    });

    console.log('\nTest Group 4: Edge Cases\n');

    // Test 4.1: Button behavior with very small remaining weight
    runner.test('Button enabled with very small remaining weight', async () => {
        const recipe = await recipeManager.createRecipe('Small Weight Test', [
            { name: 'Flour', weight: 0.1, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertFalse(button.disabled, 'Button should be enabled even with very small weight');
    });

    // Test 4.2: Button behavior with large remaining weight
    runner.test('Button enabled with large remaining weight', async () => {
        const recipe = await recipeManager.createRecipe('Large Weight Test', [
            { name: 'Flour', weight: 10000, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertFalse(button.disabled, 'Button should be enabled with large weight');
    });

    // Test 4.3: Button behavior with mixed zero and non-zero weights
    runner.test('Button enabled with mixed zero and non-zero weights', async () => {
        const recipe = await recipeManager.createRecipe('Mixed Weights Test', [
            { name: 'Flour', weight: 0, barcode: null },
            { name: 'Sugar', weight: 0, barcode: null },
            { name: 'Salt', weight: 100, barcode: null },
            { name: 'Pepper', weight: 0, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertFalse(button.disabled, 'Button should be enabled when at least one ingredient has weight');
    });

    // Test 4.4: Button exists in recipe card structure
    runner.test('Button is in correct position within recipe card', async () => {
        const recipe = await recipeManager.createRecipe('Structure Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const actionsDiv = card.querySelector('.recipe-actions');
        const button = actionsDiv.querySelector('.new-from-this-btn');

        runner.assertNotNull(button, 'Button should be within recipe-actions div');
    });

    // Test 4.5: Multiple recipe cards have independent buttons
    runner.test('Multiple recipe cards have independent buttons', async () => {
        const recipe1 = await recipeManager.createRecipe('Recipe 1', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);
        const recipe2 = await recipeManager.createRecipe('Recipe 2', [
            { name: 'Sugar', weight: 0, barcode: null }
        ]);

        const card1 = uiController.createRecipeCard(recipe1);
        const card2 = uiController.createRecipeCard(recipe2);

        const button1 = card1.querySelector('.new-from-this-btn');
        const button2 = card2.querySelector('.new-from-this-btn');

        runner.assertFalse(button1.disabled, 'First recipe button should be enabled');
        runner.assertTrue(button2.disabled, 'Second recipe button should be disabled');
        runner.assertEqual(button1.dataset.recipeId, recipe1.id, 'First button should have correct recipe ID');
        runner.assertEqual(button2.dataset.recipeId, recipe2.id, 'Second button should have correct recipe ID');
    });

    // Summary
    const success = runner.summary();
    process.exit(success ? 0 : 1);
}

runTests().catch(error => {
    console.error('\nTest execution failed:', error);
    process.exit(1);
});
