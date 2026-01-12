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
     * Clears all recipes from storage
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecipeManager;
} else if (typeof window !== 'undefined') {
    // Browser environment - expose class globally
    window.RecipeManager = RecipeManager;
}