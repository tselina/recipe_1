/**
 * RecipeManager - Handles recipe CRUD operations with validation
 * Requirements: 1.1, 1.2, 3.1, 3.2
 */

class RecipeManager {
    constructor(storageManager) {
        if (!storageManager) {
            throw new Error('StorageManager is required');
        }
        this.storage = storageManager;
        this.storageKey = 'recipes';
    }

    /**
     * Creates a new recipe with ingredient validation
     * @param {string} name - Recipe name
     * @param {Array} ingredients - Array of ingredient objects {name, weight, barcode?}
     * @returns {Recipe} Created recipe
     * @throws {Error} If validation fails
     */
    createRecipe(name, ingredients) {
        try {
            // Create recipe instance (this will validate inputs)
            const RecipeClass = window.Recipe || (typeof Recipe !== 'undefined' ? Recipe : null);
            if (!RecipeClass) {
                throw new Error('Recipe class not available');
            }
            const recipe = new RecipeClass(name, ingredients);
            
            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Check for duplicate recipe names
            const existingRecipe = recipes.find(r => 
                r.name.toLowerCase() === recipe.name.toLowerCase()
            );
            
            if (existingRecipe) {
                throw new Error(`Recipe "${recipe.name}" already exists`);
            }
            
            // Add to recipes array
            recipes.push(recipe);
            
            // Save to storage
            this._saveRecipes(recipes);
            
            return recipe;
            
        } catch (error) {
            throw new Error(`Failed to create recipe: ${error.message}`);
        }
    }

    /**
     * Updates an existing recipe
     * @param {string} recipeId - ID of recipe to update
     * @param {Object} updates - Object containing fields to update
     * @returns {Recipe} Updated recipe
     * @throws {Error} If recipe not found or validation fails
     */
    updateRecipe(recipeId, updates) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            if (!updates || typeof updates !== 'object') {
                throw new Error('Updates must be an object');
            }

            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Find recipe to update
            const recipeIndex = recipes.findIndex(r => r.id === recipeId);
            if (recipeIndex === -1) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            const existingRecipe = recipes[recipeIndex];
            
            // Create updated recipe data
            const updatedData = {
                ...existingRecipe.toObject(),
                ...updates
            };

            // If name is being updated, check for duplicates
            if (updates.name && updates.name !== existingRecipe.name) {
                const duplicateRecipe = recipes.find(r => 
                    r.id !== recipeId && 
                    r.name.toLowerCase() === updates.name.toLowerCase()
                );
                
                if (duplicateRecipe) {
                    throw new Error(`Recipe "${updates.name}" already exists`);
                }
            }

            // Create new recipe instance with updated data (this validates)
            const RecipeClass = window.Recipe || (typeof Recipe !== 'undefined' ? Recipe : null);
            if (!RecipeClass) {
                throw new Error('Recipe class not available');
            }
            const updatedRecipe = RecipeClass.fromObject(updatedData);
            
            // Replace in array
            recipes[recipeIndex] = updatedRecipe;
            
            // Save to storage
            this._saveRecipes(recipes);
            
            return updatedRecipe;
            
        } catch (error) {
            throw new Error(`Failed to update recipe: ${error.message}`);
        }
    }

    /**
     * Deletes a recipe
     * @param {string} recipeId - ID of recipe to delete
     * @returns {boolean} True if recipe was deleted
     * @throws {Error} If recipe not found
     */
    deleteRecipe(recipeId) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Find recipe to delete
            const recipeIndex = recipes.findIndex(r => r.id === recipeId);
            if (recipeIndex === -1) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            // Remove from array
            recipes.splice(recipeIndex, 1);
            
            // Save to storage
            this._saveRecipes(recipes);
            
            return true;
            
        } catch (error) {
            throw new Error(`Failed to delete recipe: ${error.message}`);
        }
    }

    /**
     * Retrieves all recipes for listing functionality
     * @returns {Recipe[]} Array of all recipes
     */
    getAllRecipes() {
        try {
            return this._loadRecipes();
        } catch (error) {
            throw new Error(`Failed to retrieve recipes: ${error.message}`);
        }
    }

    /**
     * Gets a specific recipe by ID
     * @param {string} recipeId - ID of recipe to retrieve
     * @returns {Recipe|null} Recipe if found, null otherwise
     */
    getRecipeById(recipeId) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            const recipes = this._loadRecipes();
            return recipes.find(r => r.id === recipeId) || null;
            
        } catch (error) {
            throw new Error(`Failed to retrieve recipe: ${error.message}`);
        }
    }

    /**
     * Searches recipes by name
     * @param {string} query - Search query
     * @returns {Recipe[]} Array of matching recipes
     */
    searchRecipes(query) {
        try {
            if (!query || typeof query !== 'string') {
                return [];
            }

            const recipes = this._loadRecipes();
            const searchQuery = query.toLowerCase().trim();
            
            return recipes.filter(recipe => 
                recipe.name.toLowerCase().includes(searchQuery) ||
                recipe.ingredients.some(ingredient => 
                    ingredient.name.toLowerCase().includes(searchQuery)
                )
            );
            
        } catch (error) {
            throw new Error(`Failed to search recipes: ${error.message}`);
        }
    }

    /**
     * Gets recipes that are not fully consumed
     * @returns {Recipe[]} Array of active recipes
     */
    getActiveRecipes() {
        try {
            const recipes = this._loadRecipes();
            return recipes.filter(recipe => !recipe.isFullyConsumed());
        } catch (error) {
            throw new Error(`Failed to retrieve active recipes: ${error.message}`);
        }
    }

    /**
     * Gets recipes that are fully consumed
     * @returns {Recipe[]} Array of completed recipes
     */
    getCompletedRecipes() {
        try {
            const recipes = this._loadRecipes();
            return recipes.filter(recipe => recipe.isFullyConsumed());
        } catch (error) {
            throw new Error(`Failed to retrieve completed recipes: ${error.message}`);
        }
    }

    /**
     * Updates a recipe's remaining weight after consumption
     * @param {string} recipeId - ID of recipe to update
     * @param {number} consumedWeight - Weight that was consumed
     * @returns {Recipe} Updated recipe
     */
    recordConsumption(recipeId, consumedWeight) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Find recipe
            const recipeIndex = recipes.findIndex(r => r.id === recipeId);
            if (recipeIndex === -1) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            const recipe = recipes[recipeIndex];
            
            // Record consumption (this validates consumed weight)
            recipe.consume(consumedWeight);
            
            // Save to storage
            this._saveRecipes(recipes);
            
            return recipe;
            
        } catch (error) {
            throw new Error(`Failed to record consumption: ${error.message}`);
        }
    }

    /**
     * Marks a recipe as fully consumed
     * @param {string} recipeId - ID of recipe to mark as consumed
     * @returns {Recipe} Updated recipe
     */
    markAsFullyConsumed(recipeId) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Find recipe
            const recipeIndex = recipes.findIndex(r => r.id === recipeId);
            if (recipeIndex === -1) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            const recipe = recipes[recipeIndex];
            
            // Mark as fully consumed
            recipe.consumeAll();
            
            // Save to storage
            this._saveRecipes(recipes);
            
            return recipe;
            
        } catch (error) {
            throw new Error(`Failed to mark recipe as consumed: ${error.message}`);
        }
    }

    /**
     * Gets storage statistics for recipes
     * @returns {Object} Storage statistics
     */
    getStorageStats() {
        try {
            const recipes = this._loadRecipes();
            const activeRecipes = recipes.filter(r => !r.isFullyConsumed());
            const completedRecipes = recipes.filter(r => r.isFullyConsumed());
            
            return {
                totalRecipes: recipes.length,
                activeRecipes: activeRecipes.length,
                completedRecipes: completedRecipes.length,
                totalIngredients: recipes.reduce((total, recipe) => 
                    total + recipe.ingredients.length, 0
                )
            };
        } catch (error) {
            throw new Error(`Failed to get storage stats: ${error.message}`);
        }
    }

    /**
     * Gets consumption history for a specific recipe
     * @param {string} recipeId - ID of recipe to get history for
     * @returns {Array} Array of ConsumptionHistory entries
     * @throws {Error} If recipe not found
     */
    getConsumptionHistory(recipeId) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            const recipe = this.getRecipeById(recipeId);
            if (!recipe) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            return recipe.consumptionHistory || [];
            
        } catch (error) {
            throw new Error(`Failed to get consumption history: ${error.message}`);
        }
    }

    /**
     * Edits a consumption history entry
     * @param {string} recipeId - ID of recipe
     * @param {string} historyId - ID of history entry to edit
     * @param {number} newWeight - New consumed weight
     * @returns {Recipe} Updated recipe
     * @throws {Error} If recipe or history entry not found or validation fails
     */
    editHistoryEntry(recipeId, historyId, newWeight) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            if (!historyId || typeof historyId !== 'string') {
                throw new Error('History ID must be a non-empty string');
            }

            if (typeof newWeight !== 'number' || newWeight <= 0 || !isFinite(newWeight)) {
                throw new Error('New weight must be a positive finite number');
            }

            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Find recipe
            const recipeIndex = recipes.findIndex(r => r.id === recipeId);
            if (recipeIndex === -1) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            const recipe = recipes[recipeIndex];
            
            // Edit history entry (this validates)
            recipe.editConsumptionHistory(historyId, newWeight);
            
            // Save to storage
            this._saveRecipes(recipes);
            
            return recipe;
            
        } catch (error) {
            throw new Error(`Failed to edit history entry: ${error.message}`);
        }
    }

    /**
     * Deletes a consumption history entry
     * @param {string} recipeId - ID of recipe
     * @param {string} historyId - ID of history entry to delete
     * @returns {Recipe} Updated recipe
     * @throws {Error} If recipe or history entry not found
     */
    deleteHistoryEntry(recipeId, historyId) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            if (!historyId || typeof historyId !== 'string') {
                throw new Error('History ID must be a non-empty string');
            }

            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Find recipe
            const recipeIndex = recipes.findIndex(r => r.id === recipeId);
            if (recipeIndex === -1) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            const recipe = recipes[recipeIndex];
            
            // Delete history entry (this validates)
            recipe.deleteConsumptionHistory(historyId);
            
            // Save to storage
            this._saveRecipes(recipes);
            
            return recipe;
            
        } catch (error) {
            throw new Error(`Failed to delete history entry: ${error.message}`);
        }
    }

    /**
     * Loads recipes from storage
     * @returns {Recipe[]} Array of Recipe instances
     * @private
     */
    _loadRecipes() {
        try {
            const recipesData = this.storage.load(this.storageKey);
            
            if (!recipesData) {
                return [];
            }

            if (!Array.isArray(recipesData)) {
                throw new Error('Stored recipes data is not an array');
            }

            // Convert plain objects back to Recipe instances
            const RecipeClass = window.Recipe || (typeof Recipe !== 'undefined' ? Recipe : null);
            if (!RecipeClass) {
                throw new Error('Recipe class not available');
            }
            return recipesData.map(recipeData => RecipeClass.fromObject(recipeData));
            
        } catch (error) {
            // If data is corrupted, start fresh
            console.warn('Failed to load recipes, starting with empty list:', error.message);
            return [];
        }
    }

    /**
     * Saves recipes to storage
     * @param {Recipe[]} recipes - Array of Recipe instances
     * @private
     */
    _saveRecipes(recipes) {
        if (!Array.isArray(recipes)) {
            throw new Error('Recipes must be an array');
        }

        // Convert Recipe instances to plain objects for storage
        const recipesData = recipes.map(recipe => recipe.toObject());
        
        // Save to storage
        this.storage.save(this.storageKey, recipesData);
    }

    /**
     * Creates a copy of an existing recipe with a new name
     * @param {string} recipeId - ID of recipe to copy
     * @param {string} newName - Name for the copied recipe
     * @returns {Recipe} Created recipe copy
     * @throws {Error} If validation fails or recipe not found
     */
    copyRecipe(recipeId, newName) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            if (!newName || typeof newName !== 'string') {
                throw new Error('New recipe name must be a non-empty string');
            }

            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Find recipe to copy
            const originalRecipe = recipes.find(r => r.id === recipeId);
            if (!originalRecipe) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            // Validate new name
            const nameValidation = this.storage.validateRecipeName(newName);
            if (!nameValidation.isValid) {
                throw new Error(`Invalid recipe name: ${nameValidation.error}`);
            }

            // Check for duplicate recipe names
            const existingRecipe = recipes.find(r => 
                r.name.toLowerCase() === newName.toLowerCase()
            );
            
            if (existingRecipe) {
                throw new Error(`Recipe "${newName}" already exists`);
            }

            // Create copy with fresh ingredients (reset consumption)
            const ingredientsCopy = originalRecipe.ingredients.map(ingredient => ({
                name: ingredient.name,
                weight: ingredient.weight,
                barcode: ingredient.barcode || null
            }));

            // Create new recipe instance
            const RecipeClass = window.Recipe || (typeof Recipe !== 'undefined' ? Recipe : null);
            if (!RecipeClass) {
                throw new Error('Recipe class not available');
            }
            const copiedRecipe = new RecipeClass(newName, ingredientsCopy);
            
            // Add to recipes array
            recipes.push(copiedRecipe);
            
            // Save to storage
            this._saveRecipes(recipes);
            
            return copiedRecipe;
            
        } catch (error) {
            throw new Error(`Failed to copy recipe: ${error.message}`);
        }
    }

    /**
     * Resets a recipe's consumption back to original state
     * @param {string} recipeId - ID of recipe to reset
     * @returns {Recipe} Reset recipe
     * @throws {Error} If recipe not found
     */
    resetRecipe(recipeId) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Find recipe to reset
            const recipeIndex = recipes.findIndex(r => r.id === recipeId);
            if (recipeIndex === -1) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            const recipe = recipes[recipeIndex];
            
            // Reset consumption
            recipe.resetConsumption();
            
            // Save to storage
            this._saveRecipes(recipes);
            
            return recipe;
            
        } catch (error) {
            throw new Error(`Failed to reset recipe: ${error.message}`);
        }
    }

    /**
     * Clears all recipes from storage (for testing purposes)
     * @returns {boolean} True if successful
     */
    clearAllRecipes() {
        try {
            this.storage.delete(this.storageKey);
            return true;
        } catch (error) {
            throw new Error(`Failed to clear recipes: ${error.message}`);
        }
    }

    /**
     * Adds an ingredient to an existing recipe
     * @param {string} recipeId - ID of recipe to add ingredient to
     * @param {Ingredient|Object} ingredient - Ingredient to add
     * @returns {Recipe} Updated recipe
     * @throws {Error} If recipe not found or validation fails
     */
    addIngredient(recipeId, ingredient) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            if (!ingredient) {
                throw new Error('Ingredient is required');
            }

            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Find recipe
            const recipeIndex = recipes.findIndex(r => r.id === recipeId);
            if (recipeIndex === -1) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            const recipe = recipes[recipeIndex];
            
            // Store old total weight for percentage calculation
            const oldTotalWeight = recipe.totalWeight;
            
            // Add ingredient (this validates)
            recipe.addIngredientToExisting(ingredient);
            
            // Update history entries to reflect ingredient change
            recipe.updateHistoryAfterIngredientChange(
                `Ingredient added: ${ingredient.name || ingredient.ingredient?.name}`
            );
            
            // Save to storage
            this._saveRecipes(recipes);
            
            return recipe;
            
        } catch (error) {
            throw new Error(`Failed to add ingredient: ${error.message}`);
        }
    }

    /**
     * Removes an ingredient from an existing recipe
     * @param {string} recipeId - ID of recipe to remove ingredient from
     * @param {string} ingredientName - Name of ingredient to remove
     * @returns {Recipe} Updated recipe
     * @throws {Error} If recipe not found or ingredient not found
     */
    removeIngredient(recipeId, ingredientName) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            if (!ingredientName || typeof ingredientName !== 'string') {
                throw new Error('Ingredient name must be a non-empty string');
            }

            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Find recipe
            const recipeIndex = recipes.findIndex(r => r.id === recipeId);
            if (recipeIndex === -1) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            const recipe = recipes[recipeIndex];
            
            // Store removed ingredient for return
            const removedIngredient = recipe.removeIngredientFromExisting(ingredientName);
            
            // Update history entries to reflect ingredient change
            recipe.updateHistoryAfterIngredientChange(
                `Ingredient removed: ${ingredientName}`
            );
            
            // Save to storage
            this._saveRecipes(recipes);
            
            return recipe;
            
        } catch (error) {
            throw new Error(`Failed to remove ingredient: ${error.message}`);
        }
    }

    /**
     * Updates the weight of an existing ingredient
     * @param {string} recipeId - ID of recipe
     * @param {string} ingredientName - Name of ingredient to update
     * @param {number} newWeight - New weight for the ingredient
     * @returns {Recipe} Updated recipe
     * @throws {Error} If recipe not found, ingredient not found, or validation fails
     */
    updateIngredient(recipeId, ingredientName, newWeight) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            if (!ingredientName || typeof ingredientName !== 'string') {
                throw new Error('Ingredient name must be a non-empty string');
            }

            if (typeof newWeight !== 'number' || newWeight <= 0 || !isFinite(newWeight)) {
                throw new Error('New weight must be a positive finite number');
            }

            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Find recipe
            const recipeIndex = recipes.findIndex(r => r.id === recipeId);
            if (recipeIndex === -1) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            const recipe = recipes[recipeIndex];
            
            // Update ingredient weight (this validates)
            recipe.updateIngredientWeight(ingredientName, newWeight);
            
            // Update history entries to reflect ingredient change
            recipe.updateHistoryAfterIngredientChange(
                `Ingredient weight updated: ${ingredientName} to ${newWeight}g`
            );
            
            // Save to storage
            this._saveRecipes(recipes);
            
            return recipe;
            
        } catch (error) {
            throw new Error(`Failed to update ingredient weight: ${error.message}`);
        }
    }

    /**
     * Update all ingredients of a recipe at once
     * @param {string} recipeId - ID of recipe
     * @param {Array} ingredients - Array of ingredient objects {name, weight}
     * @returns {Recipe} Updated recipe
     * @throws {Error} If recipe not found or validation fails
     */
    updateRecipeIngredients(recipeId, ingredients) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            if (!Array.isArray(ingredients) || ingredients.length === 0) {
                throw new Error('Ingredients must be a non-empty array');
            }

            // Validate all ingredients
            ingredients.forEach((ing, index) => {
                if (!ing.name || typeof ing.name !== 'string') {
                    throw new Error(`Ingredient at index ${index} must have a valid name`);
                }
                if (typeof ing.weight !== 'number' || ing.weight <= 0 || !isFinite(ing.weight)) {
                    throw new Error(`Ingredient "${ing.name}" must have a valid positive weight`);
                }
            });

            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Find recipe
            const recipeIndex = recipes.findIndex(r => r.id === recipeId);
            if (recipeIndex === -1) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            const recipe = recipes[recipeIndex];
            const oldTotalWeight = recipe.totalWeight;

            // Replace ingredients directly
            recipe.ingredients = ingredients.map(ing => new Ingredient(ing.name, ing.weight));
            recipe._calculateTotalWeight();

            // Recalculate history entries to reflect ingredient change
            recipe.updateHistoryAfterIngredientChange('Recipe ingredients updated');

            // Save to storage
            this._saveRecipes(recipes);
            
            return recipe;
            
        } catch (error) {
            console.error('Failed to update recipe ingredients:', error);
            throw new Error(`Failed to update recipe ingredients: ${error.message}`);
        }
    }

    /**
     * Reset recipe weights after creating continuation recipe
     * Sets original weights to total consumed and remaining to 0 for copied ingredients
     * @param {string} recipeId - ID of original recipe
     * @param {Array} copiedIngredientNames - Names of ingredients copied to new recipe
     * @returns {Recipe} Updated recipe
     */
    resetRecipeAfterContinuation(recipeId, copiedIngredientNames) {
        try {
            if (!recipeId || typeof recipeId !== 'string') {
                throw new Error('Recipe ID must be a non-empty string');
            }

            if (!Array.isArray(copiedIngredientNames) || copiedIngredientNames.length === 0) {
                throw new Error('Copied ingredient names must be a non-empty array');
            }

            // Load existing recipes
            const recipes = this._loadRecipes();
            
            // Find recipe
            const recipeIndex = recipes.findIndex(r => r.id === recipeId);
            if (recipeIndex === -1) {
                throw new Error(`Recipe with ID "${recipeId}" not found`);
            }

            const recipe = recipes[recipeIndex];
            const copiedNames = new Set(copiedIngredientNames.map(n => n.toLowerCase()));

            // Calculate total consumed for each copied ingredient from history
            for (const ingredient of recipe.ingredients) {
                if (copiedNames.has(ingredient.name.toLowerCase())) {
                    let totalConsumed = 0;
                    
                    if (recipe.consumptionHistory && recipe.consumptionHistory.length > 0) {
                        for (const entry of recipe.consumptionHistory) {
                            if (entry.ingredientBreakdown) {
                                const breakdown = entry.ingredientBreakdown.find(b => 
                                    b.name.toLowerCase() === ingredient.name.toLowerCase()
                                );
                                if (breakdown) {
                                    totalConsumed += breakdown.consumedWeight || 0;
                                }
                            }
                        }
                    }

                    // Update ingredient weights
                    ingredient.weight = Math.round(totalConsumed);
                }
            }

            // Save to storage
            this._saveRecipes(recipes);
            
            return recipe;
            
        } catch (error) {
            console.error('Failed to reset recipe weights:', error);
            throw new Error(`Failed to reset recipe weights: ${error.message}`);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecipeManager;
} else if (typeof window !== 'undefined') {
    // Browser environment - expose class globally
    window.RecipeManager = RecipeManager;
}