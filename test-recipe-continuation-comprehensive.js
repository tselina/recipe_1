/**
 * Recipe Continuation Feature - Comprehensive Tests
 * Includes: Unit Tests, Property-Based Tests, Integration Tests
 * Run with: node test-recipe-continuation-comprehensive.js
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

    assertGreaterThan(actual, min, message = '') {
        if (actual <= min) {
            throw new Error(message || `Expected ${actual} to be greater than ${min}`);
        }
    }

    assertLessThan(actual, max, message = '') {
        if (actual >= max) {
            throw new Error(message || `Expected ${actual} to be less than ${max}`);
        }
    }

    summary() {
        console.log('\n' + '='.repeat(50));
        console.log(`Results: ${this.passed} passed, ${this.failed} failed`);
        console.log('='.repeat(50));
        return this.failed === 0;
    }
}

// Mock StorageManager with atomic transaction support
class MockStorageManager {
    constructor() {
        this.storage = {};
        this.transactionLog = [];
        this._loaded = false;
    }

    // Required by RecipeManager - load with key
    load(key) {
        if (this._loaded) {
            return Object.values(this.storage);
        }
        this._loaded = true;
        return [];
    }

    // Required by RecipeManager - save with key and data
    save(key, data) {
        for (const item of data) {
            this.storage[item.id] = item;
        }
        return Promise.resolve();
    }

    async saveRecipe(recipe) {
        this.storage[recipe.id] = recipe;
        this.transactionLog.push({ type: 'save', recipeId: recipe.id });
        return Promise.resolve(recipe);
    }

    async updateRecipe(recipe) {
        this.storage[recipe.id] = recipe;
        this.transactionLog.push({ type: 'update', recipeId: recipe.id });
        return Promise.resolve(recipe);
    }

    getRecipe(recipeId) {
        return this.storage[recipeId] || null;
    }

    getAllRecipes() {
        return Object.values(this.storage);
    }

    async deleteRecipe(recipeId) {
        delete this.storage[recipeId];
        return Promise.resolve();
    }

    clearAllRecipes() {
        this.storage = {};
        this.transactionLog = [];
        this._loaded = false;
        return Promise.resolve();
    }

    async atomicTransaction(operations) {
        this.transactionLog = [];
        try {
            const results = [];
            for (const op of operations) {
                const result = await op();
                results.push(result);
            }
            return results;
        } catch (error) {
            // Rollback: clear all changes made during transaction
            const changedIds = this.transactionLog.map(t => t.recipeId);
            // In real implementation, would restore previous state
            throw error;
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Helper function to create test recipes
function createTestRecipe(name, ingredients, storage) {
    return storage.createRecipe(name, ingredients);
}

// ============================================
// UNIT TESTS - Recipe Card Button (Requirements 1.4, 1.5)
// ============================================
async function runUnitTests() {
    console.log('\n--- Unit Tests: Recipe Card Button ---');
    const runner = new TestRunner();
    const mockStorage = new MockStorageManager();
    const recipeManager = new RecipeManager(mockStorage);
    const portionCalculator = { calculatePortions: () => ({}) };
    const productDatabase = { findByBarcode: () => null };
    const uiController = new UIController(recipeManager, portionCalculator, productDatabase, mockStorage);

    // Test 1.1: Button exists and is enabled when remaining ingredients exist
    runner.test('Button exists and is enabled with remaining ingredients', async () => {
        const recipe = await recipeManager.createRecipe('Test Recipe', [
            { name: 'Flour', weight: 500, barcode: '12345' },
            { name: 'Sugar', weight: 300, barcode: '67890' }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertNotNull(button, 'Button should exist');
        runner.assertFalse(button.disabled, 'Button should be enabled when remaining ingredients exist');
    });

    // Test 1.2: Button disabled when no remaining ingredients
    runner.test('Button disabled when no remaining ingredients', async () => {
        const recipe = await recipeManager.createRecipe('Empty Recipe', [
            { name: 'Salt', weight: 0, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertNotNull(button, 'Button should exist');
        runner.assertTrue(button.disabled, 'Button should be disabled when no remaining ingredients');
    });

    // Test 1.3: Tooltip text for disabled button
    runner.test('Disabled button shows correct tooltip', async () => {
        const recipe = await recipeManager.createRecipe('Tooltip Test', [
            { name: 'Used Up', weight: 0, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertNotNull(button, 'Button should exist');
        runner.assertTrue(button.disabled, 'Button should be disabled');
        runner.assertEqual(button.title, 'No remaining ingredients', 'Tooltip should indicate no remaining ingredients');
    });

    // Test 1.4: Button enabled with partially consumed ingredients
    runner.test('Button enabled with partially consumed ingredients', async () => {
        const recipe = await recipeManager.createRecipe('Partial Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);
        recipe.consume(200);
        await mockStorage.saveRecipe(recipe);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertNotNull(button, 'Button should exist');
        runner.assertFalse(button.disabled, 'Button should be enabled when some ingredients remain');
    });

    // Test 1.5: Multiple ingredients with mixed remaining weights
    runner.test('Button enabled when at least one ingredient has remaining weight', async () => {
        const recipe = await recipeManager.createRecipe('Mixed Test', [
            { name: 'Flour', weight: 500, barcode: null },
            { name: 'Sugar', weight: 0, barcode: null },
            { name: 'Salt', weight: 0, barcode: null }
        ]);

        const card = uiController.createRecipeCard(recipe);
        const button = card.querySelector('.new-from-this-btn');

        runner.assertNotNull(button, 'Button should exist');
        runner.assertFalse(button.disabled, 'Button should be enabled when any ingredient has remaining weight');
    });

    return runner;
}

// ============================================
// UNIT TESTS - Modal Rendering (Requirements 2.1, 2.2, 2.3)
// ============================================
async function runModalRenderingTests() {
    console.log('\n--- Unit Tests: Modal Rendering ---');
    const runner = new TestRunner();
    const mockStorage = new MockStorageManager();
    const recipeManager = new RecipeManager(mockStorage);
    const portionCalculator = { calculatePortions: () => ({}) };
    const productDatabase = { findByBarcode: () => null };
    const uiController = new UIController(recipeManager, portionCalculator, productDatabase, mockStorage);

    // Test 2.1: Modal displays with correct title
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

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 2.2: Name pre-filled with correct format
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

    // Test 2.3: Only remaining ingredients displayed
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

    // Test 2.4: Ingredient row displays all required fields
    runner.test('Ingredient row displays name, barcode, weight, unit', async () => {
        const recipe = await recipeManager.createRecipe('Fields Test', [
            { name: 'Flour', weight: 500, barcode: '123456789' }
        ]);

        uiController.showContinuationModal(recipe.id);

        const row = document.querySelector('.continuation-ingredient-row');
        runner.assertNotNull(row, 'Ingredient row should exist');

        const nameInput = row.querySelector('[name="ingredient-name"]');
        const barcodeInput = row.querySelector('[name="ingredient-barcode"]');
        const weightInput = row.querySelector('[name="ingredient-weight"]');

        runner.assertNotNull(nameInput, 'Name input should exist');
        runner.assertNotNull(barcodeInput, 'Barcode input should exist');
        runner.assertNotNull(weightInput, 'Weight input should exist');
        runner.assertEqual(nameInput.value, 'Flour', 'Name should be displayed');
        runner.assertEqual(barcodeInput.value, '123456789', 'Barcode should be displayed');
        runner.assertEqual(weightInput.value, '500', 'Weight should be displayed');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 2.5: Modal contains Cancel and Create buttons
    runner.test('Modal contains Cancel and Create buttons', async () => {
        const recipe = await recipeManager.createRecipe('Buttons Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        const createBtn = document.getElementById('create-continuation-btn');

        runner.assertNotNull(cancelBtn, 'Cancel button should exist');
        runner.assertNotNull(createBtn, 'Create button should exist');
        runner.assertEqual(cancelBtn.textContent.trim(), 'Cancel', 'Cancel button text should be correct');
        runner.assertEqual(createBtn.textContent.trim(), 'Create Recipe', 'Create button text should be correct');

        if (cancelBtn) cancelBtn.click();
    });

    return runner;
}

// ============================================
// UNIT TESTS - Form Validation (Requirements 9.1-9.6)
// ============================================
async function runFormValidationTests() {
    console.log('\n--- Unit Tests: Form Validation ---');
    const runner = new TestRunner();
    const mockStorage = new MockStorageManager();
    const recipeManager = new RecipeManager(mockStorage);
    const portionCalculator = { calculatePortions: () => ({}) };
    const productDatabase = { findByBarcode: () => null };
    const uiController = new UIController(recipeManager, portionCalculator, productDatabase, mockStorage);

    // Test 3.1: Create button disabled with empty name
    runner.test('Create button disabled with empty name', async () => {
        const recipe = await recipeManager.createRecipe('Validation Test', [
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

    // Test 3.2: Error message displayed for empty name
    runner.test('Error message displayed for empty name', async () => {
        const recipe = await recipeManager.createRecipe('Error Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        const nameInput = document.getElementById('continuation-name');
        nameInput.value = '';
        nameInput.dispatchEvent(new Event('input'));

        const errorMsg = nameInput.parentElement.querySelector('.error-message');
        runner.assertNotNull(errorMsg, 'Error message element should exist');
        runner.assertTrue(errorMsg.textContent.length > 0, 'Error message should be displayed');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 3.3: Error cleared when name is valid
    runner.test('Error cleared when name is valid', async () => {
        const recipe = await recipeManager.createRecipe('Clear Error Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        const nameInput = document.getElementById('continuation-name');
        nameInput.value = '';
        nameInput.dispatchEvent(new Event('input'));

        nameInput.value = 'Valid Name';
        nameInput.dispatchEvent(new Event('input'));

        const errorMsg = nameInput.parentElement.querySelector('.error-message');
        runner.assertEqual(errorMsg.textContent, '', 'Error message should be cleared');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 3.4: Create button enabled with valid input
    runner.test('Create button enabled with valid input', async () => {
        const recipe = await recipeManager.createRecipe('Valid Input Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        const createBtn = document.getElementById('create-continuation-btn');
        runner.assertFalse(createBtn.disabled, 'Create button should be enabled with valid input');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 3.5: Create button disabled with invalid ingredient weight
    runner.test('Create button disabled with invalid ingredient weight', async () => {
        const recipe = await recipeManager.createRecipe('Invalid Weight Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        const weightInput = document.querySelector('.continuation-ingredient-weight');
        const createBtn = document.getElementById('create-continuation-btn');

        weightInput.value = '0';
        weightInput.dispatchEvent(new Event('input'));

        runner.assertTrue(createBtn.disabled, 'Create button should be disabled with invalid weight');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Test 3.6: Create button disabled when all ingredients removed
    runner.test('Create button disabled when all ingredients removed', async () => {
        const recipe = await recipeManager.createRecipe('Remove All Test', [
            { name: 'Flour', weight: 500, barcode: null }
        ]);

        uiController.showContinuationModal(recipe.id);

        const removeBtn = document.querySelector('.remove-ingredient-btn');
        removeBtn.click();

        const createBtn = document.getElementById('create-continuation-btn');
        runner.assertTrue(createBtn.disabled, 'Create button should be disabled with no ingredients');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    return runner;
}

// ============================================
// PROPERTY-BASED TESTS
// ============================================

// Property 1: Remaining Ingredients Only (Requirements 2.3, 2.4)
async function runPropertyTestsRemainingIngredients() {
    console.log('\n--- Property Test: Remaining Ingredients Only ---');
    const runner = new TestRunner();
    const mockStorage = new MockStorageManager();
    const recipeManager = new RecipeManager(mockStorage);
    const portionCalculator = { calculatePortions: () => ({}) };
    const productDatabase = { findByBarcode: () => null };
    const uiController = new UIController(recipeManager, portionCalculator, productDatabase, mockStorage);

    // Run 100 iterations with different recipes
    for (let i = 0; i < 100; i++) {
        mockStorage.clearAllRecipes();
        const ingredientCount = Math.floor(Math.random() * 5) + 1;
        const ingredients = [];
        for (let j = 0; j < ingredientCount; j++) {
            const originalWeight = Math.floor(Math.random() * 1000) + 1;
            // Set remaining weight to be less than or equal to original
            const remainingWeight = Math.floor(Math.random() * (originalWeight + 1));
            ingredients.push({
                name: `Ingredient${j}`,
                weight: originalWeight,
                barcode: Math.random() > 0.5 ? `BC${j}${Date.now()}` : null
            });
        }

        const recipe = await recipeManager.createRecipe(`Property Test ${i}`, ingredients);

        // Only consume if there's weight remaining
        const totalRemaining = recipe.ingredients.reduce((sum, ing) => sum + ing.remainingWeight, 0);
        if (totalRemaining > 0) {
            const consumeAmount = Math.min(Math.floor(Math.random() * 100) + 10, totalRemaining);
            if (consumeAmount > 0) {
                recipe.consume(consumeAmount);
                await mockStorage.saveRecipe(recipe);
            }
        }

        uiController.showContinuationModal(recipe.id);

        const rows = document.querySelectorAll('.continuation-ingredient-row');
        const remainingIngredients = recipe.ingredients.filter(ing => ing.remainingWeight > 0);

        runner.assertEqual(
            rows.length,
            remainingIngredients.length,
            `Iteration ${i}: Only remaining ingredients should be displayed`
        );

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    }

    console.log(`  ✓ Property validated across 100 iterations`);
    return runner;
}

// Property 2: Barcode Preservation (Requirements 5.1, 5.4)
async function runPropertyTestsBarcodePreservation() {
    console.log('\n--- Property Test: Barcode Preservation ---');
    const runner = new TestRunner();
    const mockStorage = new MockStorageManager();
    const recipeManager = new RecipeManager(mockStorage);
    const portionCalculator = { calculatePortions: () => ({}) };
    const productDatabase = { findByBarcode: () => null };
    const uiController = new UIController(recipeManager, portionCalculator, productDatabase, mockStorage);

    for (let i = 0; i < 100; i++) {
        mockStorage.clearAllRecipes();
        const ingredients = [
            { name: 'Flour', weight: 500, barcode: `BC-FL-${Date.now()}-${i}` },
            { name: 'Sugar', weight: 300, barcode: `BC-SU-${Date.now()}-${i}` },
            { name: 'Salt', weight: 200, barcode: null }
        ];

        const recipe = await recipeManager.createRecipe(`Barcode Test ${i}`, ingredients);

        uiController.showContinuationModal(recipe.id);

        const rows = document.querySelectorAll('.continuation-ingredient-row');
        runner.assertEqual(rows.length, 3, `Iteration ${i}: All ingredients should be displayed`);

        for (const row of rows) {
            const name = row.querySelector('[name="ingredient-name"]').value;
            const barcodeInput = row.querySelector('[name="ingredient-barcode"]');
            const originalIngredient = ingredients.find(ing => ing.name === name);

            if (originalIngredient.barcode) {
                runner.assertEqual(
                    barcodeInput.value,
                    originalIngredient.barcode,
                    `Iteration ${i}: Barcode for ${name} should be preserved`
                );
            } else {
                runner.assertEqual(
                    barcodeInput.value,
                    '',
                    `Iteration ${i}: Empty barcode for ${name} should remain empty`
                );
            }
        }

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    }

    console.log(`  ✓ Property validated across 100 iterations`);
    return runner;
}

// Property 3: Weight Reset Accuracy (Requirements 6.1, 6.2)
async function runPropertyTestsWeightReset() {
    console.log('\n--- Property Test: Weight Reset Accuracy ---');
    const runner = new TestRunner();
    const mockStorage = new MockStorageManager();
    const recipeManager = new RecipeManager(mockStorage);
    const portionCalculator = { calculatePortions: () => ({}) };
    const productDatabase = { findByBarcode: () => null };
    const uiController = new UIController(recipeManager, portionCalculator, productDatabase, mockStorage);

    for (let i = 0; i < 100; i++) {
        mockStorage.clearAllRecipes();
        const ingredients = [
            { name: 'Flour', weight: 1000, barcode: null },
            { name: 'Sugar', weight: 500, barcode: null }
        ];

        const recipe = await recipeManager.createRecipe(`Weight Reset Test ${i}`, ingredients);

        // Add multiple consumption entries
        const consumeCount = Math.floor(Math.random() * 5) + 1;
        for (let c = 0; c < consumeCount; c++) {
            const totalRemaining = recipe.ingredients.reduce((sum, ing) => sum + ing.remainingWeight, 0);
            if (totalRemaining > 0) {
                const amount = Math.min(Math.floor(Math.random() * 50) + 10, totalRemaining);
                recipe.consume(amount);
            }
        }
        await mockStorage.saveRecipe(recipe);

        const originalRecipe = mockStorage.getRecipe(recipe.id);
        const flourOriginal = originalRecipe.ingredients.find(ing => ing.name === 'Flour');
        const sugarOriginal = originalRecipe.ingredients.find(ing => ing.name === 'Sugar');

        // Create continuation
        uiController.showContinuationModal(recipe.id);
        const createBtn = document.getElementById('create-continuation-btn');
        createBtn.click();

        // Check original recipe weights reset
        const updatedRecipe = mockStorage.getRecipe(recipe.id);
        const flourUpdated = updatedRecipe.ingredients.find(ing => ing.name === 'Flour');
        const sugarUpdated = updatedRecipe.ingredients.find(ing => ing.name === 'Sugar');

        // Verify remaining weight is 0
        runner.assertEqual(
            flourUpdated.remainingWeight,
            0,
            `Iteration ${i}: Flour remaining weight should be 0`
        );
        runner.assertEqual(
            sugarUpdated.remainingWeight,
            0,
            `Iteration ${i}: Sugar remaining weight should be 0`
        );
    }

    console.log(`  ✓ Property validated across 100 iterations`);
    return runner;
}

// Property 4: Atomic Transaction (Requirements 6.6, 8.3)
async function runPropertyTestsAtomicTransaction() {
    console.log('\n--- Property Test: Atomic Transaction ---');
    const runner = new TestRunner();
    const mockStorage = new MockStorageManager();
    const recipeManager = new RecipeManager(mockStorage);
    const portionCalculator = { calculatePortions: () => ({}) };
    const productDatabase = { findByBarcode: () => null };
    const uiController = new UIController(recipeManager, portionCalculator, productDatabase, mockStorage);

    for (let i = 0; i < 50; i++) {
        mockStorage.clearAllRecipes();
        const ingredients = [
            { name: 'Flour', weight: 500, barcode: null },
            { name: 'Sugar', weight: 300, barcode: null }
        ];

        const recipe = await recipeManager.createRecipe(`Atomic Test ${i}`, ingredients);
        const totalRemaining = recipe.ingredients.reduce((sum, ing) => sum + ing.remainingWeight, 0);
        if (totalRemaining > 0) {
            recipe.consume(Math.min(100, totalRemaining));
        }
        await mockStorage.saveRecipe(recipe);

        const initialRecipeCount = mockStorage.getAllRecipes().length;

        // Create continuation
        uiController.showContinuationModal(recipe.id);
        const createBtn = document.getElementById('create-continuation-btn');
        createBtn.click();

        const finalRecipeCount = mockStorage.getAllRecipes().length;

        // Verify atomic operation: both recipes should exist
        runner.assertEqual(
            finalRecipeCount,
            initialRecipeCount + 1,
            `Iteration ${i}: New recipe should be created atomically`
        );

        const newRecipe = mockStorage.getAllRecipes().find(r => r.name.includes('new'));
        runner.assertNotNull(newRecipe, `Iteration ${i}: New recipe should exist`);

        const updatedOriginal = mockStorage.getRecipe(recipe.id);
        runner.assertEqual(
            updatedOriginal.ingredients[0].remainingWeight,
            0,
            `Iteration ${i}: Original recipe should be updated atomically`
        );
    }

    console.log(`  ✓ Property validated across 50 iterations`);
    return runner;
}

// ============================================
// INTEGRATION TEST - Full Continuation Flow
// ============================================
async function runIntegrationTest() {
    console.log('\n--- Integration Test: Full Continuation Flow ---');
    const runner = new TestRunner();
    const mockStorage = new MockStorageManager();
    const recipeManager = new RecipeManager(mockStorage);
    const portionCalculator = { calculatePortions: () => ({}) };
    const productDatabase = { findByBarcode: () => null };
    const uiController = new UIController(recipeManager, portionCalculator, productDatabase, mockStorage);

    // Step 1: Create recipe with ingredients
    runner.test('Step 1: Create recipe with ingredients', async () => {
        const recipe = await recipeManager.createRecipe('Integration Test Recipe', [
            { name: 'Flour', weight: 1000, barcode: '123456789' },
            { name: 'Sugar', weight: 500, barcode: '987654321' },
            { name: 'Salt', weight: 200, barcode: null }
        ]);

        runner.assertNotNull(recipe, 'Recipe should be created');
        runner.assertEqual(recipe.ingredients.length, 3, 'Recipe should have 3 ingredients');
    });

    // Step 2: Consume partial amounts
    runner.test('Step 2: Consume partial amounts', async () => {
        const recipe = mockStorage.getAllRecipes()[0];
        recipe.consume(300); // Consume 300g of flour
        recipe.consume(100); // Consume 100g of sugar
        await mockStorage.saveRecipe(recipe);

        const updated = mockStorage.getRecipe(recipe.id);
        const flour = updated.ingredients.find(i => i.name === 'Flour');
        const sugar = updated.ingredients.find(i => i.name === 'Sugar');

        runner.assertEqual(flour.remainingWeight, 700, 'Flour should have 700g remaining');
        runner.assertEqual(sugar.remainingWeight, 400, 'Sugar should have 400g remaining');
    });

    // Step 3: Click "New from this" and verify modal opens
    runner.test('Step 3: Click "New from this" opens modal', async () => {
        const recipe = mockStorage.getAllRecipes()[0];
        uiController.showContinuationModal(recipe.id);

        const modal = document.getElementById('continuation-modal');
        runner.assertNotNull(modal, 'Modal should open');

        const cancelBtn = document.getElementById('cancel-continuation-btn');
        if (cancelBtn) cancelBtn.click();
    });

    // Step 4: Modify name and submit
    runner.test('Step 4: Modify name and submit creates new recipe', async () => {
        const recipe = mockStorage.getAllRecipes()[0];
        uiController.showContinuationModal(recipe.id);

        const nameInput = document.getElementById('continuation-name');
        nameInput.value = 'My New Recipe';

        const createBtn = document.getElementById('create-continuation-btn');
        createBtn.click();

        const allRecipes = mockStorage.getAllRecipes();
        const newRecipe = allRecipes.find(r => r.name === 'My New Recipe');

        runner.assertNotNull(newRecipe, 'New recipe should be created with modified name');
        runner.assertEqual(newRecipe.ingredients.length, 3, 'New recipe should have 3 ingredients');
    });

    // Step 5: Verify original recipe weights reset
    runner.test('Step 5: Original recipe weights reset correctly', async () => {
        const originalRecipe = mockStorage.getAllRecipes().find(r => r.name === 'Integration Test Recipe');

        for (const ingredient of originalRecipe.ingredients) {
            runner.assertEqual(
                ingredient.remainingWeight,
                0,
                `Ingredient ${ingredient.name} should have 0 remaining weight`
            );
        }
    });

    // Step 6: Verify consumption history preserved
    runner.test('Step 6: Consumption history preserved', async () => {
        const originalRecipe = mockStorage.getAllRecipes().find(r => r.name === 'Integration Test Recipe');

        runner.assertTrue(
            originalRecipe.consumptionHistory.length > 0,
            'Consumption history should be preserved'
        );
    });

    // Step 7: Verify new recipe has correct data
    runner.test('Step 7: New recipe has correct ingredient data', async () => {
        const newRecipe = mockStorage.getAllRecipes().find(r => r.name === 'My New Recipe');

        const flour = newRecipe.ingredients.find(i => i.name === 'Flour');
        const sugar = newRecipe.ingredients.find(i => i.name === 'Sugar');

        runner.assertEqual(flour.barcode, '123456789', 'Flour barcode should be copied');
        runner.assertEqual(sugar.barcode, '987654321', 'Sugar barcode should be copied');
        runner.assertEqual(flour.remainingWeight, 700, 'Flour should have correct remaining weight');
        runner.assertEqual(sugar.remainingWeight, 400, 'Sugar should have correct remaining weight');
    });

    return runner;
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('RECIPE CONTINUATION FEATURE - COMPREHENSIVE TESTS');
    console.log('='.repeat(60));

    const allRunners = [];

    // Run unit tests
    allRunners.push(await runUnitTests());
    allRunners.push(await runModalRenderingTests());
    allRunners.push(await runFormValidationTests());

    // Run property-based tests
    allRunners.push(await runPropertyTestsRemainingIngredients());
    allRunners.push(await runPropertyTestsBarcodePreservation());
    allRunners.push(await runPropertyTestsWeightReset());
    allRunners.push(await runPropertyTestsAtomicTransaction());

    // Run integration test
    allRunners.push(await runIntegrationTest());

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(60));

    let totalPassed = 0;
    let totalFailed = 0;

    for (const runner of allRunners) {
        totalPassed += runner.passed;
        totalFailed += runner.failed;
    }

    console.log(`Total: ${totalPassed} passed, ${totalFailed} failed`);
    console.log('='.repeat(60));

    return totalFailed === 0;
}

// Run tests
runAllTests()
    .then(success => {
        console.log(success ? '\n✓ All tests passed!' : '\n✗ Some tests failed.');
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });