/**
 * Data Models for Recipe and Product with validation
 * Requirements: 1.1, 1.2, 1.4
 */

/**
 * Ingredient model representing a single ingredient in a recipe
 */
class Ingredient {
    constructor(name, weight, barcode = null) {
        this.name = name;
        this.weight = weight;
        this.barcode = barcode;
        
        this.validate();
    }

    validate() {
        if (!this.name || typeof this.name !== 'string' || this.name.trim().length === 0) {
            throw new Error('Ingredient name must be a non-empty string');
        }

        if (typeof this.weight !== 'number' || this.weight <= 0 || !isFinite(this.weight)) {
            throw new Error('Ingredient weight must be a positive finite number');
        }

        if (this.barcode !== null && (typeof this.barcode !== 'string' || this.barcode.trim().length === 0)) {
            throw new Error('Ingredient barcode must be a non-empty string or null');
        }

        // Sanitize name
        this.name = this.name.trim();
        
        // Sanitize barcode
        if (this.barcode) {
            this.barcode = this.barcode.trim();
        }

        // Round weight to 2 decimal places to avoid floating point precision issues
        this.weight = Math.round(this.weight * 100) / 100;
    }

    /**
     * Creates an Ingredient from a plain object
     * @param {Object} obj - Plain object with ingredient data
     * @returns {Ingredient} New Ingredient instance
     */
    static fromObject(obj) {
        if (!obj || typeof obj !== 'object') {
            throw new Error('Invalid ingredient object');
        }

        return new Ingredient(obj.name, obj.weight, obj.barcode || null);
    }

    /**
     * Converts ingredient to plain object for serialization
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            name: this.name,
            weight: this.weight,
            barcode: this.barcode
        };
    }
}

/**
 * Recipe model representing a complete recipe with ingredients
 */
class Recipe {
    constructor(name, ingredients = []) {
        this.id = this._generateId();
        this.name = name;
        this.ingredients = [];
        this.totalWeight = 0;
        this.remainingWeight = 0;
        this.createdAt = new Date().toISOString();
        this.lastConsumed = null;

        // Add ingredients
        if (Array.isArray(ingredients)) {
            ingredients.forEach(ingredient => this.addIngredient(ingredient));
        }

        this._calculateTotalWeight();
        this.remainingWeight = this.totalWeight;
        this.validate();
    }

    /**
     * Generates a unique ID for the recipe
     * @returns {string} Unique identifier
     */
    _generateId() {
        return 'recipe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    /**
     * Validates the recipe data
     */
    validate() {
        if (!this.name || typeof this.name !== 'string' || this.name.trim().length === 0) {
            throw new Error('Recipe name must be a non-empty string');
        }

        if (this.name.length > 100) {
            throw new Error('Recipe name must be 100 characters or less');
        }

        if (!Array.isArray(this.ingredients)) {
            throw new Error('Recipe ingredients must be an array');
        }

        if (this.ingredients.length === 0) {
            throw new Error('Recipe must have at least one ingredient');
        }

        // Sanitize name
        this.name = this.name.trim();

        // Validate total weight to prevent division by zero
        if (typeof this.totalWeight !== 'number' || this.totalWeight <= 0 || !isFinite(this.totalWeight)) {
            throw new Error('Recipe total weight must be a positive finite number');
        }

        // Validate remaining weight
        if (typeof this.remainingWeight !== 'number' || this.remainingWeight < 0 || !isFinite(this.remainingWeight)) {
            throw new Error('Remaining weight must be a non-negative finite number');
        }

        // Validate that remaining weight doesn't exceed total weight (with tolerance for floating point)
        const tolerance = 0.01;
        if (this.remainingWeight > (this.totalWeight + tolerance)) {
            throw new Error('Remaining weight cannot exceed total weight');
        }
    }

    /**
     * Adds an ingredient to the recipe
     * @param {Ingredient|Object} ingredient - Ingredient to add
     */
    addIngredient(ingredient) {
        let ingredientObj;
        
        if (ingredient instanceof Ingredient) {
            ingredientObj = ingredient;
        } else if (typeof ingredient === 'object') {
            ingredientObj = Ingredient.fromObject(ingredient);
        } else {
            throw new Error('Invalid ingredient format');
        }

        // Check for duplicate ingredient names
        const existingIngredient = this.ingredients.find(ing => 
            ing.name.toLowerCase() === ingredientObj.name.toLowerCase()
        );
        
        if (existingIngredient) {
            throw new Error(`Ingredient "${ingredientObj.name}" already exists in this recipe`);
        }

        this.ingredients.push(ingredientObj);
        this._calculateTotalWeight();
    }

    /**
     * Removes an ingredient from the recipe
     * @param {string} ingredientName - Name of ingredient to remove
     */
    removeIngredient(ingredientName) {
        const index = this.ingredients.findIndex(ing => 
            ing.name.toLowerCase() === ingredientName.toLowerCase()
        );
        
        if (index === -1) {
            throw new Error(`Ingredient "${ingredientName}" not found in recipe`);
        }

        this.ingredients.splice(index, 1);
        this._calculateTotalWeight();
        
        // Adjust remaining weight if necessary
        if (this.remainingWeight > this.totalWeight) {
            this.remainingWeight = this.totalWeight;
        }
    }

    /**
     * Calculates the total weight of all ingredients
     */
    _calculateTotalWeight() {
        this.totalWeight = this.ingredients.reduce((total, ingredient) => {
            return total + ingredient.weight;
        }, 0);
        
        // Round to 2 decimal places
        this.totalWeight = Math.round(this.totalWeight * 100) / 100;
    }

    /**
     * Updates the remaining weight after consumption
     * @param {number} consumedWeight - Weight that was consumed
     */
    consume(consumedWeight) {
        if (typeof consumedWeight !== 'number' || consumedWeight <= 0 || !isFinite(consumedWeight)) {
            throw new Error('Consumed weight must be a positive finite number');
        }

        // Handle floating point precision issues with small tolerance
        const tolerance = 0.01; // 0.01g tolerance
        if (consumedWeight > (this.remainingWeight + tolerance)) {
            throw new Error('Cannot consume more than remaining weight');
        }

        // Ensure consumed weight doesn't exceed remaining weight due to floating point precision
        const actualConsumedWeight = Math.min(consumedWeight, this.remainingWeight);

        // Update remaining weight with precision handling
        const newRemainingWeight = this.remainingWeight - actualConsumedWeight;
        this.remainingWeight = Math.max(0, Math.round(newRemainingWeight * 100) / 100);
        
        this.lastConsumed = new Date().toISOString();
    }

    /**
     * Marks the recipe as fully consumed
     */
    consumeAll() {
        this.remainingWeight = 0;
        this.lastConsumed = new Date().toISOString();
    }

    /**
     * Resets the recipe consumption back to original state
     */
    resetConsumption() {
        this.remainingWeight = this.totalWeight;
        this.lastConsumed = null;
    }

    /**
     * Checks if the recipe is fully consumed
     * @returns {boolean} True if fully consumed
     */
    isFullyConsumed() {
        return this.remainingWeight === 0;
    }

    /**
     * Gets the consumption percentage
     * @returns {number} Percentage consumed (0-100)
     */
    getConsumptionPercentage() {
        if (this.totalWeight === 0) return 100;
        return Math.round(((this.totalWeight - this.remainingWeight) / this.totalWeight) * 100);
    }

    /**
     * Creates a Recipe from a plain object
     * @param {Object} obj - Plain object with recipe data
     * @returns {Recipe} New Recipe instance
     */
    static fromObject(obj) {
        if (!obj || typeof obj !== 'object') {
            throw new Error('Invalid recipe object');
        }

        // Create recipe with ingredients (constructor will validate)
        const ingredientsData = Array.isArray(obj.ingredients) ? obj.ingredients : [];
        const recipe = new Recipe(obj.name, ingredientsData);
        
        // Set additional properties after creation
        if (obj.id) recipe.id = obj.id;
        if (obj.createdAt) recipe.createdAt = obj.createdAt;
        if (obj.lastConsumed) recipe.lastConsumed = obj.lastConsumed;
        
        // Set remaining weight if provided
        if (typeof obj.remainingWeight === 'number') {
            recipe.remainingWeight = obj.remainingWeight;
        }

        return recipe;
    }

    /**
     * Converts recipe to plain object for serialization
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            id: this.id,
            name: this.name,
            ingredients: this.ingredients.map(ingredient => ingredient.toObject()),
            totalWeight: this.totalWeight,
            remainingWeight: this.remainingWeight,
            createdAt: this.createdAt,
            lastConsumed: this.lastConsumed
        };
    }
}

/**
 * Product model for the product database with usage tracking
 */
class Product {
    constructor(name, barcode = null) {
        this.id = this._generateId();
        this.name = name;
        this.barcode = barcode;
        this.usageCount = 0;
        this.lastUsed = new Date().toISOString();

        this.validate();
    }

    /**
     * Generates a unique ID for the product
     * @returns {string} Unique identifier
     */
    _generateId() {
        return 'product_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    /**
     * Validates the product data
     */
    validate() {
        if (!this.name || typeof this.name !== 'string' || this.name.trim().length === 0) {
            throw new Error('Product name must be a non-empty string');
        }

        if (this.name.length > 100) {
            throw new Error('Product name must be 100 characters or less');
        }

        if (this.barcode !== null && (typeof this.barcode !== 'string' || this.barcode.trim().length === 0)) {
            throw new Error('Product barcode must be a non-empty string or null');
        }

        if (typeof this.usageCount !== 'number' || this.usageCount < 0 || !Number.isInteger(this.usageCount)) {
            throw new Error('Usage count must be a non-negative integer');
        }

        // Sanitize name
        this.name = this.name.trim();
        
        // Sanitize barcode
        if (this.barcode) {
            this.barcode = this.barcode.trim();
        }
    }

    /**
     * Increments the usage count and updates last used timestamp
     */
    recordUsage() {
        this.usageCount++;
        this.lastUsed = new Date().toISOString();
    }

    /**
     * Checks if the product matches a search query
     * @param {string} query - Search query
     * @returns {boolean} True if product matches query
     */
    matchesQuery(query) {
        if (!query || typeof query !== 'string') {
            return false;
        }

        const searchQuery = query.toLowerCase().trim();
        const productName = this.name.toLowerCase();
        
        return productName.includes(searchQuery) || 
               (this.barcode && this.barcode.includes(searchQuery));
    }

    /**
     * Creates a Product from a plain object
     * @param {Object} obj - Plain object with product data
     * @returns {Product} New Product instance
     */
    static fromObject(obj) {
        if (!obj || typeof obj !== 'object') {
            throw new Error('Invalid product object');
        }

        const product = new Product(obj.name, obj.barcode || null);
        
        // Set properties
        if (obj.id) product.id = obj.id;
        if (typeof obj.usageCount === 'number') product.usageCount = obj.usageCount;
        if (obj.lastUsed) product.lastUsed = obj.lastUsed;

        product.validate();
        return product;
    }

    /**
     * Converts product to plain object for serialization
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            id: this.id,
            name: this.name,
            barcode: this.barcode,
            usageCount: this.usageCount,
            lastUsed: this.lastUsed
        };
    }
}

/**
 * Consumption Result model for tracking what was consumed
 */
class ConsumptionResult {
    constructor(recipeName, consumedWeight, ingredients) {
        this.recipeName = recipeName;
        this.consumedWeight = consumedWeight;
        this.ingredients = ingredients || [];
        this.timestamp = new Date().toISOString();

        this.validate();
    }

    /**
     * Validates the consumption result data
     */
    validate() {
        if (!this.recipeName || typeof this.recipeName !== 'string') {
            throw new Error('Recipe name must be a non-empty string');
        }

        if (typeof this.consumedWeight !== 'number' || this.consumedWeight <= 0 || !isFinite(this.consumedWeight)) {
            throw new Error('Consumed weight must be a positive finite number');
        }

        if (!Array.isArray(this.ingredients)) {
            throw new Error('Ingredients must be an array');
        }

        // Validate each ingredient result
        this.ingredients.forEach((ingredient, index) => {
            if (!ingredient || typeof ingredient !== 'object') {
                throw new Error(`Ingredient at index ${index} must be an object`);
            }

            if (!ingredient.name || typeof ingredient.name !== 'string') {
                throw new Error(`Ingredient at index ${index} must have a valid name`);
            }

            if (typeof ingredient.originalWeight !== 'number' || ingredient.originalWeight <= 0) {
                throw new Error(`Ingredient at index ${index} must have a valid original weight`);
            }

            if (typeof ingredient.consumedWeight !== 'number' || ingredient.consumedWeight < 0) {
                throw new Error(`Ingredient at index ${index} must have a valid consumed weight`);
            }
        });
    }

    /**
     * Converts consumption result to plain object for serialization
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            recipeName: this.recipeName,
            consumedWeight: this.consumedWeight,
            ingredients: this.ingredients,
            timestamp: this.timestamp
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Ingredient, Recipe, Product, ConsumptionResult };
} else if (typeof window !== 'undefined') {
    // Browser environment - expose classes to global scope
    window.Ingredient = Ingredient;
    window.Recipe = Recipe;
    window.Product = Product;
    window.ConsumptionResult = ConsumptionResult;
}