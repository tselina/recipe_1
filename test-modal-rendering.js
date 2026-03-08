/**
 * Modal Rendering Unit Tests - Task 11.2
 * Tests for recipe continuation modal rendering functionality
 * 
 * Requirements Coverage:
 * - Requirement 2.1: Modal opens with correct title
 * - Requirement 2.2: Name input pre-filled with correct format
 * - Requirement 2.3: Ingredient rows display correctly
 */

// Test Runner
const TestRunner = {
    results: [],
    log: [],
    
    logTest(name, passed, message = '') {
        const status = passed ? '✓ PASS' : '✗ FAIL';
        const cssClass = passed ? 'log-success' : 'log-error';
        this.log.push(`<div class="log-entry ${cssClass}">[${status}] ${name}${message ? ': ' + message : ''}</div>`);
        this.results.push({ name, passed, message });
    },
    
    logInfo(message) {
        this.log.push(`<div class="log-entry log-info">ℹ ${message}</div>`);
    },
    
    updateUI() {
        const resultsDiv = document.getElementById('test-results');
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        const statusEl = document.getElementById('overall-status');
        const progressEl = document.getElementById('progress-fill');
        
        resultsDiv.innerHTML = `
            <div class="test-grid">
                ${this.results.map(r => `
                    <div class="test-card ${r.passed ? 'passed' : 'failed'}">
                        <h4>${r.passed ? '✓' : '✗'} ${r.name}</h4>
                        <p>${r.message || (r.passed ? 'Test passed successfully' : 'Test failed')}</p>
                    </div>
                `).join('')}
            </div>
            <div class="test-log">
                ${this.log.join('')}
            </div>
        `;
        
        statusEl.textContent = `${passed}/${total} Tests Passed`;
        statusEl.className = `test-status ${passed === total ? 'status-success' : 'status-error'}`;
        progressEl.style.width = `${(passed / total) * 100}%`;
    },
    
    reset() {
        this.results = [];
        this.log = [];
    }
};

// Mock StorageManager for testing
class MockStorageManager {
    constructor() {
        this.storage = {};
        this.escapeHtml = (str) => {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };
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
}

// Test setup
let mockStorage, recipeManager, uiController;

function setupTestEnvironment() {
    TestRunner.logInfo('Setting up test environment...');
    
    mockStorage = new MockStorageManager();
    recipeManager = new RecipeManager(mockStorage);
    uiController = new UIController(
        recipeManager,
        { calculatePortions: () => ({}) },
        { findByBarcode: () => null },
        mockStorage
    );
    
    mockStorage.clearAllRecipes();
    
    // Close any existing modals
    const existingModal = document.getElementById('continuation-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    TestRunner.logInfo('Test environment ready');
}

// Test Suite: Modal Opens with Correct Title (Requirement 2.1)
async function testModalOpensWithCorrectTitle() {
    TestRunner.logInfo('Test Suite: Modal Opens with Correct Title (Requirement 2.1)');
    
    // Test 1: Modal element is created
    const recipe = await recipeManager.createRecipe('Test Recipe', [
        { name: 'Flour', weight: 500, barcode: '12345' }
    ]);
    
    uiController.showContinuationModal(recipe.id);
    
    const modal = document.getElementById('continuation-modal');
    if (modal) {
        TestRunner.logTest('Modal element created', true);
    } else {
        TestRunner.logTest('Modal element created', false, 'Modal not found in DOM');
        return;
    }
    
    // Test 2: Modal is visible
    const isVisible = !modal.classList.contains('hidden');
    TestRunner.logTest('Modal is visible', isVisible, 
        isVisible ? '' : 'Modal has "hidden" class');
    
    // Test 3: Modal title exists
    const titleElement = document.getElementById('continuation-modal-title');
    if (titleElement) {
        TestRunner.logTest('Modal title element exists', true);
    } else {
        TestRunner.logTest('Modal title element exists', false, 'Title element not found');
        closeModal();
        return;
    }
    
    // Test 4: Modal title has correct text
    const expectedTitle = 'Create New Recipe from Remaining Ingredients';
    const actualTitle = titleElement.textContent.trim();
    TestRunner.logTest('Modal title text is correct', actualTitle === expectedTitle,
        actualTitle === expectedTitle ? '' : `Expected "${expectedTitle}", got "${actualTitle}"`);
    
    // Test 5: Modal header structure
    const modalHeader = modal.querySelector('.modal-header');
    TestRunner.logTest('Modal has header section', !!modalHeader);
    
    // Test 6: Modal has close button
    const closeButton = document.getElementById('close-continuation-modal');
    TestRunner.logTest('Modal has close button', !!closeButton);
    
    closeModal();
}

// Test Suite: Name Input Pre-filled with Correct Format (Requirement 2.2)
async function testNameInputPreFilled() {
    TestRunner.logInfo('Test Suite: Name Input Pre-filled (Requirement 2.2)');
    
    // Test 1: Simple recipe name
    const recipe1 = await recipeManager.createRecipe('My Recipe', [
        { name: 'Flour', weight: 500, barcode: null }
    ]);
    
    uiController.showContinuationModal(recipe1.id);
    
    const nameInput = document.getElementById('continuation-name');
    if (!nameInput) {
        TestRunner.logTest('Name input element exists', false, 'Input not found');
        closeModal();
        return;
    }
    
    TestRunner.logTest('Name input element exists', true);
    
    const expectedName1 = 'My Recipe - new';
    TestRunner.logTest('Name follows format "<Recipe_Name> - new"', 
        nameInput.value === expectedName1,
        nameInput.value === expectedName1 ? '' : `Expected "${expectedName1}", got "${nameInput.value}"`);
    
    closeModal();
    
    // Test 2: Recipe name with special characters
    const recipe2 = await recipeManager.createRecipe('Mom\'s Special Recipe', [
        { name: 'Sugar', weight: 300, barcode: null }
    ]);
    
    uiController.showContinuationModal(recipe2.id);
    
    const nameInput2 = document.getElementById('continuation-name');
    const expectedName2 = 'Mom\'s Special Recipe - new';
    TestRunner.logTest('Name handles special characters correctly',
        nameInput2.value === expectedName2,
        nameInput2.value === expectedName2 ? '' : `Expected "${expectedName2}", got "${nameInput2.value}"`);
    
    closeModal();
    
    // Test 3: Long recipe name
    const longName = 'A Very Long Recipe Name That Contains Many Words';
    const recipe3 = await recipeManager.createRecipe(longName, [
        { name: 'Salt', weight: 100, barcode: null }
    ]);
    
    uiController.showContinuationModal(recipe3.id);
    
    const nameInput3 = document.getElementById('continuation-name');
    const expectedName3 = `${longName} - new`;
    TestRunner.logTest('Name handles long recipe names',
        nameInput3.value === expectedName3,
        nameInput3.value === expectedName3 ? '' : `Expected "${expectedName3}", got "${nameInput3.value}"`);
    
    closeModal();
    
    // Test 4: Name input attributes
    const recipe4 = await recipeManager.createRecipe('Test', [
        { name: 'Flour', weight: 500, barcode: null }
    ]);
    
    uiController.showContinuationModal(recipe4.id);
    
    const nameInput4 = document.getElementById('continuation-name');
    TestRunner.logTest('Name input has maxlength attribute',
        nameInput4.hasAttribute('maxlength') && nameInput4.maxLength === 200);
    
    TestRunner.logTest('Name input is required',
        nameInput4.hasAttribute('required'));
    
    TestRunner.logTest('Name input is editable',
        !nameInput4.disabled && !nameInput4.readOnly);
    
    closeModal();
}

// Test Suite: Ingredient Rows Display Correctly (Requirement 2.3)
async function testIngredientRowsDisplay() {
    TestRunner.logInfo('Test Suite: Ingredient Rows Display (Requirement 2.3)');
    
    // Test 1: All remaining ingredients displayed
    const recipe1 = await recipeManager.createRecipe('Multi-Ingredient Recipe', [
        { name: 'Flour', weight: 500, barcode: '12345' },
        { name: 'Sugar', weight: 300, barcode: '67890' },
        { name: 'Salt', weight: 100, barcode: null }
    ]);
    
    uiController.showContinuationModal(recipe1.id);
    
    const rows = document.querySelectorAll('.continuation-ingredient-row');
    TestRunner.logTest('All remaining ingredients displayed',
        rows.length === 3,
        rows.length === 3 ? '' : `Expected 3 rows, found ${rows.length}`);
    
    closeModal();
    
    // Test 2: Only remaining ingredients shown (weight > 0)
    const recipe2 = await recipeManager.createRecipe('Partial Recipe', [
        { name: 'Flour', weight: 500, barcode: '12345' },
        { name: 'Sugar', weight: 0, barcode: '67890' },
        { name: 'Salt', weight: 100, barcode: null }
    ]);
    
    uiController.showContinuationModal(recipe2.id);
    
    const rows2 = document.querySelectorAll('.continuation-ingredient-row');
    TestRunner.logTest('Only ingredients with weight > 0 displayed',
        rows2.length === 2,
        rows2.length === 2 ? '' : `Expected 2 rows (weight > 0), found ${rows2.length}`);
    
    closeModal();
    
    // Test 3: Ingredient name displayed correctly
    const recipe3 = await recipeManager.createRecipe('Name Test', [
        { name: 'Whole Wheat Flour', weight: 500, barcode: '12345' }
    ]);
    
    uiController.showContinuationModal(recipe3.id);
    
    const nameInput = document.querySelector('.continuation-ingredient-name');
    TestRunner.logTest('Ingredient name displayed correctly',
        nameInput && nameInput.value === 'Whole Wheat Flour',
        nameInput ? (nameInput.value === 'Whole Wheat Flour' ? '' : `Expected "Whole Wheat Flour", got "${nameInput.value}"`) : 'Name input not found');
    
    closeModal();
    
    // Test 4: Ingredient barcode displayed correctly
    const recipe4 = await recipeManager.createRecipe('Barcode Test', [
        { name: 'Flour', weight: 500, barcode: '123456789' }
    ]);
    
    uiController.showContinuationModal(recipe4.id);
    
    const barcodeInput = document.querySelector('.continuation-ingredient-barcode');
    TestRunner.logTest('Ingredient barcode displayed correctly',
        barcodeInput && barcodeInput.value === '123456789',
        barcodeInput ? (barcodeInput.value === '123456789' ? '' : `Expected "123456789", got "${barcodeInput.value}"`) : 'Barcode input not found');
    
    closeModal();
    
    // Test 5: Empty barcode displayed as empty
    const recipe5 = await recipeManager.createRecipe('No Barcode Test', [
        { name: 'Flour', weight: 500, barcode: null }
    ]);
    
    uiController.showContinuationModal(recipe5.id);
    
    const barcodeInput2 = document.querySelector('.continuation-ingredient-barcode');
    TestRunner.logTest('Empty barcode displayed as empty string',
        barcodeInput2 && barcodeInput2.value === '',
        barcodeInput2 ? (barcodeInput2.value === '' ? '' : `Expected empty string, got "${barcodeInput2.value}"`) : 'Barcode input not found');
    
    closeModal();
    
    // Test 6: Ingredient weight displayed correctly
    const recipe6 = await recipeManager.createRecipe('Weight Test', [
        { name: 'Flour', weight: 750, barcode: null }
    ]);
    
    uiController.showContinuationModal(recipe6.id);
    
    const weightInput = document.querySelector('.continuation-ingredient-weight');
    TestRunner.logTest('Ingredient weight displayed correctly',
        weightInput && parseFloat(weightInput.value) === 750,
        weightInput ? (parseFloat(weightInput.value) === 750 ? '' : `Expected 750, got ${weightInput.value}`) : 'Weight input not found');
    
    closeModal();
    
    // Test 7: Multiple ingredients with different properties
    const recipe7 = await recipeManager.createRecipe('Complex Test', [
        { name: 'Flour', weight: 500, barcode: '12345' },
        { name: 'Sugar', weight: 300, barcode: null },
        { name: 'Butter', weight: 200, barcode: '99999' }
    ]);
    
    uiController.showContinuationModal(recipe7.id);
    
    const allRows = document.querySelectorAll('.continuation-ingredient-row');
    const allNames = Array.from(document.querySelectorAll('.continuation-ingredient-name')).map(i => i.value);
    const allBarcodes = Array.from(document.querySelectorAll('.continuation-ingredient-barcode')).map(i => i.value);
    const allWeights = Array.from(document.querySelectorAll('.continuation-ingredient-weight')).map(i => parseFloat(i.value));
    
    TestRunner.logTest('All ingredient names present',
        allNames.includes('Flour') && allNames.includes('Sugar') && allNames.includes('Butter'));
    
    TestRunner.logTest('Barcodes correctly mapped',
        allBarcodes[0] === '12345' && allBarcodes[1] === '' && allBarcodes[2] === '99999');
    
    TestRunner.logTest('Weights correctly mapped',
        allWeights[0] === 500 && allWeights[1] === 300 && allWeights[2] === 200);
    
    closeModal();
    
    // Test 8: Ingredient row structure
    const recipe8 = await recipeManager.createRecipe('Structure Test', [
        { name: 'Flour', weight: 500, barcode: '12345' }
    ]);
    
    uiController.showContinuationModal(recipe8.id);
    
    const row = document.querySelector('.continuation-ingredient-row');
    TestRunner.logTest('Ingredient row has name input',
        !!row.querySelector('.continuation-ingredient-name'));
    
    TestRunner.logTest('Ingredient row has barcode input',
        !!row.querySelector('.continuation-ingredient-barcode'));
    
    TestRunner.logTest('Ingredient row has weight input',
        !!row.querySelector('.continuation-ingredient-weight'));
    
    TestRunner.logTest('Ingredient row has remove button',
        !!row.querySelector('.remove-ingredient-btn'));
    
    closeModal();
    
    // Test 9: Ingredients list container exists
    const recipe9 = await recipeManager.createRecipe('Container Test', [
        { name: 'Flour', weight: 500, barcode: null }
    ]);
    
    uiController.showContinuationModal(recipe9.id);
    
    const ingredientsList = document.getElementById('continuation-ingredients-list');
    TestRunner.logTest('Ingredients list container exists', !!ingredientsList);
    
    const ingredientsSection = document.querySelector('.continuation-ingredients-section');
    TestRunner.logTest('Ingredients section exists', !!ingredientsSection);
    
    closeModal();
}

// Helper function to close modal
function closeModal() {
    const cancelBtn = document.getElementById('cancel-continuation-btn');
    if (cancelBtn) {
        cancelBtn.click();
    }
    
    // Also remove modal from DOM to ensure clean state
    const modal = document.getElementById('continuation-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Main test runner
async function runAllTests() {
    TestRunner.reset();
    TestRunner.logInfo('Starting Modal Rendering Unit Tests (Task 11.2)...');
    
    try {
        setupTestEnvironment();
        
        await testModalOpensWithCorrectTitle();
        await testNameInputPreFilled();
        await testIngredientRowsDisplay();
        
        TestRunner.logInfo('All tests completed');
    } catch (error) {
        TestRunner.logTest('Test Execution', false, error.message);
        console.error('Test error:', error);
    }
    
    TestRunner.updateUI();
}

// Clear test results
function clearTests() {
    TestRunner.reset();
    document.getElementById('test-results').innerHTML = '<p style="color: #666;">Click "Run All Tests" to begin...</p>';
    document.getElementById('overall-status').textContent = 'Ready to Test';
    document.getElementById('overall-status').className = 'test-status status-running';
    document.getElementById('progress-fill').style.width = '0%';
    
    // Clean up any modals
    const modal = document.getElementById('continuation-modal');
    if (modal) {
        modal.remove();
    }
}
