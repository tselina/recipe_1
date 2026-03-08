/**
 * Recipe Continuation Feature Tests
 * Run with: node test-recipe-continuation.js
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

// Load source files and extract classes
const loadScript = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Execute in window context
    const script = dom.window.document.createElement('script');
    script.textContent = content;
    dom.window.document.head.appendChild(script);
};

loadScript(path.join(__dirname, 'js', 'data-models.js'));
loadScript(path.join(__dirname, 'js', 'storage-manager.js'));
loadScript(path.join(__dirname, 'js', 'barcode-generator.js'));
loadScript(path.join(__dirname, 'js', 'recipe-manager.js'));
loadScript(path.join(__dirname, 'js', 'ui-controller.js'));

// Make classes available globally
const { Ingredient, Recipe, Product, ConsumptionHistory, ConsumptionResult } = dom.window;
global.Ingredient = Ingredient;
global.Recipe = Recipe;
global.Product = Product;
global.ConsumptionHistory = ConsumptionHistory;
global.ConsumptionResult = ConsumptionResult;
global.StorageManager = dom.window.StorageManager;
global.RecipeManager = dom.window.RecipeManager;
global.UIController = dom.window.UIController;
global.BarcodeGenerator = dom.window.BarcodeGenerator;

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
            console.log(`  ✗ ${name}: ${error.message}`);
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

    summary() {
        console.log('\n' + '='.repeat(50));
        console.log(`Results: ${this.passed} passed, ${this.failed} failed`);
        console.log('='.repeat(50));
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
    console.log('\nRecipe Continuation Feature Tests\n');
    console.log('='.repeat(50));

    const runner = new TestRunner();
    const mockStorage = new MockStorageManager();
    const recipeManager = new RecipeManager(mockStorage);
    const portionCalculator = { calculatePortions: () => ({}) };
    const productDatabase = { findByBarcode: () => null };
    const uiController = new UIController(recipeManager, portionCalculator, productDatabase, mockStorage);

    // Test 1: New from this button exists and is enabled
    runner.test('New from this button exists and is enabled', async () => {
        const recipe = await recipeManager.createRecipe('Test Recipe', [
            { name: 'Flour', weight: 500, barcode: '12345' },
            { name: 'Sugar', weight: 300, barcode: '67890' }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertNotNull(button, 'Button should exist');
        runner.assertFalse(button.disabled, 'Button should be enabled when remaining ingredients exist');
    });

    // Test 2: Button disabled when no remaining ingredients
    runner.test('Button disabled when no remaining ingredients', async () => {
        const recipe = await recipeManager.createRecipe('Empty Recipe', [
            { name: 'Salt', weight: 0, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertNotNull(button, 'Button should exist');
        runner.assertTrue(button.disabled, 'Button should be disabled when no remaining ingredients');
    });

    // Test 3: Modal displays with correct title
    runner.test('Modal displays with correct title', async () => {
        const recipe = await recipeManager.createRecipe('Modal Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        const modal = document.getElementById('continuation-modal');
        runner.assertNotNull(modal, 'Modal should exist');

        const title = document.getElementById('continuation-modal-title');
        runner.assertNotNull(title, 'Title should exist');
        runner.assertTrue(title.textContent.includes('Create New Recipe'), 'Title should mention recipe creation');

        // Cleanup
        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 4: Name pre-filled with correct format
    runner.test('Name pre-filled with correct format', async () => {
        const recipe = await recipeManager.createRecipe('My Test Recipe', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        const nameInput = document.getElementById('continuation-name');
        runner.assertNotNull(nameInput, 'Name input should exist');
        runner.assertEqual(nameInput.value, 'My Test Recipe - new', 'Name should be pre-filled with correct format');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 5: Only remaining ingredients displayed
    runner.test('Only remaining ingredients displayed in modal', async () => {
        const recipe = await recipeManager.createRecipe('Ingredient Test', [
            { name: 'Flour', weight: 500, barcode: '12345' },
            { name: 'Sugar', weight: 300, barcode: '67890' },
            { name: 'Salt', weight: 0, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        const rows = document.querySelectorAll('.continuation-ingredient-row');
        runner.assertEqual(rows.length, 2, 'Should only show ingredients with weight > 0');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 6: Barcode preservation
    runner.test('Barcode preserved from original recipe', async () => {
        const recipe = await recipeManager.createRecipe('Barcode Test', [
            { name: 'Flour', weight: 500, barcode: '123456789' },
            { name: 'Sugar', weight: 300, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        const barcodes = Array.from(document.querySelectorAll('.continuation-ingredient-barcode'))
            .map(input => input.value);

        runner.assertEqual(barcodes[0], '123456789', 'Barcode should be copied from original');
        runner.assertEqual(barcodes[1], '', 'Empty barcode should remain empty');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 7: Form validation - button enabled with valid input
    runner.test('Create button enabled with valid input', async () => {
        const recipe = await recipeManager.createRecipe('Validation Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        const createBtn = document.getElementById('create-continuation-btn');
        runner.assertFalse(createBtn.disabled, 'Create button should be enabled with valid input');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 8: Form validation - button disabled with empty name
    runner.test('Create button disabled with empty name', async () => {
        const recipe = await recipeManager.createRecipe('Validation Test 2', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        const nameInput = document.getElementById('continuation-name');
        const createBtn = document.getElementById('create-continuation-btn');

        nameInput.value = '';
        nameInput.dispatchEvent(new Event('input'));

        runner.assertTrue(createBtn.disabled, 'Create button should be disabled with empty name');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 9: Recipe creation
    runner.test('New recipe created successfully', async () => {
        const recipe = await recipeManager.createRecipe('Creation Test', [
            { name: 'Flour', weight: 500, barcode: '12345' },
            { name: 'Sugar', weight: 300, barcode: '67890' }
        ]);

        uiController.showContinuationModal(recipe.id);

        const createBtn = document.getElementById('create-continuation-btn');
        createBtn.click();

        const allRecipes = mockStorage.getAllRecipes();
        runner.assertEqual(allRecipes.length, 2, 'Should have 2 recipes after creation');

        const newRecipe = allRecipes.find(r => r.name === 'Creation Test - new');
        runner.assertNotNull(newRecipe, 'New recipe should exist');
        runner.assertEqual(newRecipe.ingredients.length, 2, 'New recipe should have 2 ingredients');
    });

    // Test 10: Weight reset on original recipe
    runner.test('Original recipe weights reset after continuation', async () => {
        const recipe = await recipeManager.createRecipe('Weight Reset Test', [
            { name: 'Flour', weight: 500, barcode: '12345' },
            { name: 'Sugar', weight: 300, barcode: '67890' }
        ]);

        // Add consumption
        recipe.consume(200);
        await mockStorage.saveRecipe(recipe);

        // Create continuation
        uiController.showContinuationModal(recipe.id);
        const createBtn = document.getElementById('create-continuation-btn');
        createBtn.click();

        // Check original recipe
        const updatedRecipe = mockStorage.getRecipe(recipe.id);
        const flour = updatedRecipe.ingredients.find(i => i.name === 'Flour');
        const sugar = updatedRecipe.ingredients.find(i => i.name === 'Sugar');

        runner.assertEqual(flour.weight, 0, 'Flour weight should be reset to 0');
        runner.assertEqual(sugar.weight, 0, 'Sugar weight should be reset to 0');
    });

    // Test 11: Ingredient removal
    runner.test('Ingredient removal in modal', async () => {
        const recipe = await recipeManager.createRecipe('Removal Test', [
            { name: 'Flour', weight: 500, barcode: '12345' },
            { name: 'Sugar', weight: 300, barcode: '67890' }
        ]);

        uiController.showContinuationModal(recipe.id);

        let rows = document.querySelectorAll('.continuation-ingredient-row');
        const initialCount = rows.length;

        const removeBtn = document.querySelector('.remove-ingredient-btn');
        removeBtn.click();

        rows = document.querySelectorAll('.continuation-ingredient-row');
        runner.assertEqual(rows.length, initialCount - 1, 'Ingredient row should be removed');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 12: Add ingredient
    runner.test('Add ingredient in modal', async () => {
        const recipe = await recipeManager.createRecipe('Add Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        let rows = document.querySelectorAll('.continuation-ingredient-row');
        const initialCount = rows.length;

        const addBtn = document.getElementById('add-continuation-ingredient');
        addBtn.click();

        rows = document.querySelectorAll('.continuation-ingredient-row');
        runner.assertEqual(rows.length, initialCount + 1, 'New ingredient row should be added');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 13: Consumption history preserved
    runner.test('Consumption history preserved after continuation', async () => {
        const recipe = await recipeManager.createRecipe('History Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        // Add consumption history
        recipe.consume(100);
        recipe.consume(50);
        await mockStorage.saveRecipe(recipe);

        // Create continuation
        uiController.showContinuationModal(recipe.id);
        const createBtn = document.getElementById('create-continuation-btn');
        createBtn.click();

        // Check original recipe history preserved
        const updatedRecipe = mockStorage.getRecipe(recipe.id);
        runner.assertEqual(updatedRecipe.consumptionHistory.length, 2, 'Consumption history should be preserved');
    });

    // Test 14: New recipe has correct ingredient weights
    runner.test('New recipe has correct ingredient weights', async () => {
        const recipe = await recipeManager.createRecipe('Weight Check Test', [
            { name: 'Flour', weight: 500, barcode: null },
            { name: 'Sugar', weight: 300, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        // Modify weight of first ingredient
        const weightInput = document.querySelector('.continuation-ingredient-weight');
        weightInput.value = '400';
        weightInput.dispatchEvent(new Event('input'));

        const createBtn = document.getElementById('create-continuation-btn');
        createBtn.click();

        const newRecipe = mockStorage.getAllRecipes().find(r => r.name === 'Weight Check Test - new');
        const flour = newRecipe.ingredients.find(i => i.name === 'Flour');

        runner.assertEqual(flour.weight, 400, 'New recipe should have modified weight');
    });

    // Summary
    const success = runner.summary();
    process.exit(success ? 0 : 1);
}

runTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
});