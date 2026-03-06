import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Create a temporary module file with the data models
const dataModelsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'js', 'data-models.js');
const dataModelsContent = fs.readFileSync(dataModelsPath, 'utf8');

// Modify the export section to work with ES modules
const modifiedContent = dataModelsContent.replace(
    /if \(typeof module !== 'undefined' && module\.exports\) \{[\s\S]*?window\.ConsumptionResult = ConsumptionResult;[\s\S]*?\}/,
    `// ES module export
export { Ingredient, Recipe, Product, ConsumptionHistory, ConsumptionResult };`
);

// Write to a temporary file
const tempPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'temp-data-models.mjs');
fs.writeFileSync(tempPath, modifiedContent);

// Import the classes
import { Ingredient, Recipe, Product, ConsumptionHistory, ConsumptionResult } from './temp-data-models.mjs';

// Also need to import other modules
import { StorageManager } from './js/storage-manager.mjs';
import { RecipeManager } from './js/recipe-manager.mjs';

console.log('Classes loaded:', typeof ConsumptionHistory, typeof Recipe, typeof StorageManager, typeof RecipeManager);

console.log('=== Testing Consumption History ===\n');

// Test 1: Create ConsumptionHistory instance
try {
    const history = new ConsumptionHistory(
        'recipe_123',
        100,
        [
            { name: 'Flour', weight: 50, barcode: '123' },
            { name: 'Sugar', weight: 30, barcode: null },
            { name: 'Butter', weight: 20, barcode: '456' }
        ]
    );
    history.remainingWeightAfter = 150;
    console.log('✓ Test 1: ConsumptionHistory created with ID:', history.id);
} catch (e) {
    console.log('✗ Test 1 failed:', e.message);
}

// Test 2: Serialization
try {
    const history = new ConsumptionHistory('recipe_456', 75, [{ name: 'Test', weight: 75 }]);
    const obj = history.toObject();
    const restored = ConsumptionHistory.fromObject(obj);
    console.log('✓ Test 2: Serialization works. Weight:', restored.consumedWeight);
} catch (e) {
    console.log('✗ Test 2 failed:', e.message);
}

// Test 3: Recipe consumption with history
try {
    const recipe = new Recipe('Test Recipe', [
        { name: 'Flour', weight: 500, barcode: '123' },
        { name: 'Sugar', weight: 300, barcode: null }
    ]);
    recipe.consume(100);
    console.log('✓ Test 3: Consumption created history. Entries:', recipe.consumptionHistory.length);
} catch (e) {
    console.log('✗ Test 3 failed:', e.message);
}

// Test 4: RecipeManager integration
try {
    const storage = new StorageManager();
    const manager = new RecipeManager(storage);
    manager.clearAllRecipes();
    
    const recipe = manager.createRecipe('Managed Recipe', [
        { name: 'Ingredient A', weight: 200, barcode: null },
        { name: 'Ingredient B', weight: 100, barcode: null }
    ]);
    
    manager.recordConsumption(recipe.id, 50);
    manager.recordConsumption(recipe.id, 30);
    
    const history = manager.getConsumptionHistory(recipe.id);
    console.log('✓ Test 4: RecipeManager integration. History entries:', history.length);
} catch (e) {
    console.log('✗ Test 4 failed:', e.message);
}

// Test 5: Multiple consumptions
try {
    const recipe = new Recipe('Multi Test', [
        { name: 'Item1', weight: 300, barcode: null },
        { name: 'Item2', weight: 200, barcode: null }
    ]);
    
    recipe.consume(50);
    recipe.consume(75);
    recipe.consume(100);
    
    console.log('✓ Test 5: Multiple consumptions. Entries:', recipe.consumptionHistory.length);
    console.log('  Weights:', recipe.consumptionHistory.map(h => h.consumedWeight).join(', '));
} catch (e) {
    console.log('✗ Test 5 failed:', e.message);
}

// Test 6: History serialization with recipe
try {
    const recipe = new Recipe('Serialize Test', [
        { name: 'A', weight: 100, barcode: null },
        { name: 'B', weight: 100, barcode: null }
    ]);
    
    recipe.consume(50);
    recipe.consume(30);
    
    const obj = recipe.toObject();
    const restored = Recipe.fromObject(obj);
    
    console.log('✓ Test 6: Recipe serialization with history. Entries:', restored.consumptionHistory.length);
} catch (e) {
    console.log('✗ Test 6 failed:', e.message);
}

// Test 7: Edit history entry
try {
    const recipe = new Recipe('Edit Test', [
        { name: 'A', weight: 200, barcode: null }
    ]);
    
    recipe.consume(50);
    recipe.consume(30);
    
    const historyId = recipe.consumptionHistory[0].id;
    recipe.editConsumptionHistory(historyId, 60);
    
    console.log('✓ Test 7: Edit history entry. New weight:', recipe.consumptionHistory[0].consumedWeight);
} catch (e) {
    console.log('✗ Test 7 failed:', e.message);
}

// Test 8: Delete history entry
try {
    const recipe = new Recipe('Delete Test', [
        { name: 'A', weight: 200, barcode: null }
    ]);
    
    recipe.consume(50);
    recipe.consume(30);
    recipe.consume(20);
    
    const historyId = recipe.consumptionHistory[1].id;
    recipe.deleteConsumptionHistory(historyId);
    
    console.log('✓ Test 8: Delete history entry. Remaining entries:', recipe.consumptionHistory.length);
} catch (e) {
    console.log('✗ Test 8 failed:', e.message);
}

// Test 9: Ingredient breakdown in history
try {
    const recipe = new Recipe('Breakdown Test', [
        { name: 'Flour', weight: 500, barcode: null },
        { name: 'Sugar', weight: 300, barcode: null },
        { name: 'Butter', weight: 200, barcode: null }
    ]);
    
    recipe.consume(100);
    
    const entry = recipe.consumptionHistory[0];
    const flour = entry.ingredientBreakdown.find(i => i.name === 'Flour');
    const sugar = entry.ingredientBreakdown.find(i => i.name === 'Sugar');
    const butter = entry.ingredientBreakdown.find(i => i.name === 'Butter');
    
    console.log('✓ Test 9: Ingredient breakdown in history');
    console.log('  Flour:', flour.weight, 'g (expected: 50)');
    console.log('  Sugar:', sugar.weight, 'g (expected: 30)');
    console.log('  Butter:', butter.weight, 'g (expected: 20)');
} catch (e) {
    console.log('✗ Test 9 failed:', e.message);
}

// Test 10: Edge cases
try {
    // Test validation
    try {
        new ConsumptionHistory('', 100, []);
        console.log('✗ Test 10a: Should reject empty recipe ID');
    } catch (e) {
        console.log('✓ Test 10a: Rejects empty recipe ID');
    }

    try {
        new ConsumptionHistory('recipe_1', 0, []);
        console.log('✗ Test 10b: Should reject zero weight');
    } catch (e) {
        console.log('✓ Test 10b: Rejects zero weight');
    }

    try {
        new ConsumptionHistory('recipe_1', -10, []);
        console.log('✗ Test 10c: Should reject negative weight');
    } catch (e) {
        console.log('✓ Test 10c: Rejects negative weight');
    }
} catch (e) {
    console.log('✗ Test 10 failed:', e.message);
}

// Test 11: Persistence across sessions
try {
    const storage = new StorageManager();
    const manager = new RecipeManager(storage);
    manager.clearAllRecipes();
    
    const recipe = manager.createRecipe('Persistence Test', [
        { name: 'A', weight: 100, barcode: null }
    ]);
    
    manager.recordConsumption(recipe.id, 50);
    manager.recordConsumption(recipe.id, 30);
    
    // Reload recipe
    const reloaded = manager.getRecipeById(recipe.id);
    console.log('✓ Test 11: Persistence across sessions. Entries:', reloaded.consumptionHistory.length);
} catch (e) {
    console.log('✗ Test 11 failed:', e.message);
}

// Test 12: History statistics
try {
    const recipe = new Recipe('Stats Test', [
        { name: 'A', weight: 200, barcode: null }
    ]);
    
    recipe.consume(50);
    recipe.consume(75);
    recipe.consume(25);
    
    const history = recipe.consumptionHistory;
    const total = history.reduce((sum, h) => sum + h.consumedWeight, 0);
    const avg = total / history.length;
    
    console.log('✓ Test 12: History statistics');
    console.log('  Total consumed:', total, 'g');
    console.log('  Average portion:', avg, 'g');
} catch (e) {
    console.log('✗ Test 12 failed:', e.message);
}

console.log('\n=== All Tests Complete ===');

// Cleanup
fs.unlinkSync(tempPath);
