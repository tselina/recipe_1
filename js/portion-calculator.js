/**
 * PortionCalculator - Handles portion calculations with proportional formula
 * Requirements: 2.1, 2.2, 2.5, 3.3, 6.5
 */

class PortionCalculator {
    constructor() {
        // No initialization needed for this utility class
    }

    /**
     * Calculates proportional ingredient portions based on consumed weight
     * Uses formula: (ingredient_weight / total_recipe_weight) * consumed_portion_weight
     * @param {Recipe} recipe - Recipe to calculate portions for
     * @param {number} consumedWeight - Weight of the consumed portion
     * @returns {ConsumptionResult} Calculation results with ingredient breakdown
     * @throws {Error} If validation fails
     */
    calculatePortions(recipe, consumedWeight) {
        try {
            // Validate recipe
            if (!recipe) {
                throw new Error('Recipe is required');
            }

            if (typeof recipe.toObject !== 'function') {
                throw new Error('Invalid recipe object - must be a Recipe instance');
            }

            // Validate consumed weight
            this._validateWeight(consumedWeight, 'Consumed weight');

            // Check if recipe has ingredients
            if (!recipe.ingredients || recipe.ingredients.length === 0) {
                throw new Error('Recipe must have at least one ingredient');
            }

            // Prevent division by zero - check if total weight is valid
            if (!recipe.totalWeight || recipe.totalWeight <= 0 || !isFinite(recipe.totalWeight)) {
                throw new Error('Recipe total weight must be a positive finite number greater than zero');
            }

            // Check if consumed weight doesn't exceed remaining weight (with small tolerance for floating point)
            const tolerance = 0.01; // 0.01g tolerance
            if (consumedWeight > (recipe.remainingWeight + tolerance)) {
                throw new Error(`Cannot consume ${consumedWeight}g - only ${recipe.remainingWeight}g remaining`);
            }

            // Ensure consumed weight doesn't exceed remaining weight due to floating point precision
            const actualConsumedWeight = Math.min(consumedWeight, recipe.remainingWeight);

            // Calculate proportional ingredients with precision handling
            const ingredientResults = recipe.ingredients.map(ingredient => {
                // Validate ingredient weight to prevent calculation errors
                if (!ingredient.weight || ingredient.weight <= 0 || !isFinite(ingredient.weight)) {
                    throw new Error(`Invalid ingredient weight for "${ingredient.name}": must be a positive finite number`);
                }

                // Apply proportional formula: (ingredient_weight / total_recipe_weight) * consumed_portion_weight
                // Use high precision calculation to minimize floating point errors
                const ratio = ingredient.weight / recipe.totalWeight;
                const rawConsumedWeight = ratio * actualConsumedWeight;
                
                // Round to 3 decimal places for calculation, then to 2 for display to handle precision issues
                const preciseConsumedWeight = Math.round(rawConsumedWeight * 1000) / 1000;
                const consumedIngredientWeight = Math.round(preciseConsumedWeight * 100) / 100;
                
                // Ensure consumed weight is not negative due to floating point errors
                const finalConsumedWeight = Math.max(0, consumedIngredientWeight);
                
                return {
                    name: ingredient.name,
                    originalWeight: ingredient.weight,
                    consumedWeight: finalConsumedWeight,
                    barcode: ingredient.barcode || null
                };
            });

            // Validate that the sum of consumed ingredients doesn't exceed the consumed weight (with tolerance)
            const totalConsumedIngredients = ingredientResults.reduce((sum, ing) => sum + ing.consumedWeight, 0);
            const calculationTolerance = 0.1; // Allow 0.1g difference due to rounding
            
            if (Math.abs(totalConsumedIngredients - actualConsumedWeight) > calculationTolerance) {
                console.warn(`Calculation precision warning: Sum of ingredients (${totalConsumedIngredients}g) differs from consumed weight (${actualConsumedWeight}g) by more than tolerance`);
            }

            // Create consumption result
            const ConsumptionResultClass = window.ConsumptionResult || (typeof ConsumptionResult !== 'undefined' ? ConsumptionResult : null);
            if (!ConsumptionResultClass) {
                throw new Error('ConsumptionResult class not available');
            }
            
            const result = new ConsumptionResultClass(
                recipe.name,
                actualConsumedWeight,
                ingredientResults
            );

            return result;

        } catch (error) {
            throw new Error(`Failed to calculate portions: ${error.message}`);
        }
    }

    /**
     * Marks a recipe as completely consumed and calculates final portions
     * @param {Recipe} recipe - Recipe to consume completely
     * @returns {ConsumptionResult} Final consumption results
     * @throws {Error} If validation fails
     */
    consumeAll(recipe) {
        try {
            // Validate recipe
            if (!recipe) {
                throw new Error('Recipe is required');
            }

            if (typeof recipe.toObject !== 'function') {
                throw new Error('Invalid recipe object - must be a Recipe instance');
            }

            // Check if recipe has remaining weight
            if (recipe.remainingWeight <= 0) {
                throw new Error('Recipe is already fully consumed');
            }

            // Calculate portions for the remaining weight
            const result = this.calculatePortions(recipe, recipe.remainingWeight);

            return result;

        } catch (error) {
            throw new Error(`Failed to consume all: ${error.message}`);
        }
    }

    /**
     * Updates the remaining weight of a recipe after partial consumption
     * @param {Recipe} recipe - Recipe to update
     * @param {number} consumedWeight - Weight that was consumed
     * @returns {Recipe} Updated recipe with new remaining weight
     * @throws {Error} If validation fails
     */
    updateRemainingWeight(recipe, consumedWeight) {
        try {
            // Validate recipe
            if (!recipe) {
                throw new Error('Recipe is required');
            }

            if (typeof recipe.consume !== 'function') {
                throw new Error('Invalid recipe object - must be a Recipe instance');
            }

            // Validate consumed weight
            this._validateWeight(consumedWeight, 'Consumed weight');

            // Prevent division by zero and invalid calculations
            if (!recipe.remainingWeight || recipe.remainingWeight < 0 || !isFinite(recipe.remainingWeight)) {
                throw new Error('Recipe remaining weight must be a non-negative finite number');
            }

            // Check if consumed weight doesn't exceed remaining weight (with small tolerance for floating point)
            const tolerance = 0.01; // 0.01g tolerance for floating point precision
            if (consumedWeight > (recipe.remainingWeight + tolerance)) {
                throw new Error(`Cannot consume ${consumedWeight}g - only ${recipe.remainingWeight}g remaining`);
            }

            // Ensure consumed weight doesn't exceed remaining weight due to floating point precision
            const actualConsumedWeight = Math.min(consumedWeight, recipe.remainingWeight);

            // Update the recipe's remaining weight using the Recipe's consume method
            recipe.consume(actualConsumedWeight);

            return recipe;

        } catch (error) {
            throw new Error(`Failed to update remaining weight: ${error.message}`);
        }
    }

    /**
     * Calculates what percentage of the recipe was consumed
     * @param {Recipe} recipe - Recipe to analyze
     * @param {number} consumedWeight - Weight that was consumed
     * @returns {number} Percentage consumed (0-100)
     * @throws {Error} If validation fails
     */
    calculateConsumptionPercentage(recipe, consumedWeight) {
        try {
            // Validate recipe
            if (!recipe) {
                throw new Error('Recipe is required');
            }

            // Validate consumed weight
            this._validateWeight(consumedWeight, 'Consumed weight');

            // Prevent division by zero - check total weight
            if (!recipe.totalWeight || recipe.totalWeight <= 0 || !isFinite(recipe.totalWeight)) {
                throw new Error('Recipe total weight must be a positive finite number greater than zero');
            }

            // Calculate percentage with precision handling
            const rawPercentage = (consumedWeight / recipe.totalWeight) * 100;
            
            // Ensure percentage is within valid bounds (0-100)
            const clampedPercentage = Math.max(0, Math.min(100, rawPercentage));
            
            // Round to 2 decimal places to handle floating point precision
            return Math.round(clampedPercentage * 100) / 100;

        } catch (error) {
            throw new Error(`Failed to calculate consumption percentage: ${error.message}`);
        }
    }

    /**
     * Validates that a weight value is valid for calculations
     * @param {number} weight - Weight to validate
     * @param {string} fieldName - Name of the field for error messages
     * @throws {Error} If weight is invalid
     * @private
     */
    _validateWeight(weight, fieldName = 'Weight') {
        if (typeof weight !== 'number') {
            throw new Error(`${fieldName} must be a number`);
        }

        if (!isFinite(weight)) {
            throw new Error(`${fieldName} must be a finite number`);
        }

        if (weight <= 0) {
            throw new Error(`${fieldName} must be greater than zero`);
        }

        if (weight > 100000) { // Reasonable upper limit (100kg)
            throw new Error(`${fieldName} is too large (maximum 100,000g)`);
        }
    }

    /**
     * Validates that a recipe is suitable for portion calculations
     * @param {Recipe} recipe - Recipe to validate
     * @returns {boolean} True if recipe is valid for calculations
     * @throws {Error} If recipe is invalid
     */
    validateRecipeForCalculation(recipe) {
        try {
            if (!recipe) {
                throw new Error('Recipe is required');
            }

            if (typeof recipe.toObject !== 'function') {
                throw new Error('Invalid recipe object - must be a Recipe instance');
            }

            if (!recipe.ingredients || recipe.ingredients.length === 0) {
                throw new Error('Recipe must have at least one ingredient');
            }

            // Prevent division by zero - validate total weight
            if (!recipe.totalWeight || recipe.totalWeight <= 0 || !isFinite(recipe.totalWeight)) {
                throw new Error('Recipe total weight must be a positive finite number greater than zero');
            }

            // Validate remaining weight
            if (typeof recipe.remainingWeight !== 'number' || recipe.remainingWeight < 0 || !isFinite(recipe.remainingWeight)) {
                throw new Error('Recipe remaining weight must be a non-negative finite number');
            }

            if (recipe.remainingWeight > recipe.totalWeight) {
                // Allow small tolerance for floating point precision issues
                const tolerance = 0.01;
                if (recipe.remainingWeight > (recipe.totalWeight + tolerance)) {
                    throw new Error('Recipe remaining weight cannot exceed total weight');
                }
            }

            // Validate each ingredient to prevent calculation errors
            recipe.ingredients.forEach((ingredient, index) => {
                if (!ingredient.name || typeof ingredient.name !== 'string') {
                    throw new Error(`Ingredient at index ${index} must have a valid name`);
                }

                if (!ingredient.weight || typeof ingredient.weight !== 'number' || ingredient.weight <= 0 || !isFinite(ingredient.weight)) {
                    throw new Error(`Ingredient "${ingredient.name}" must have a positive finite weight`);
                }

                // Check for extremely small weights that could cause precision issues
                if (ingredient.weight < 0.01) {
                    console.warn(`Ingredient "${ingredient.name}" has very small weight (${ingredient.weight}g) which may cause precision issues`);
                }
            });

            // Validate that sum of ingredient weights matches total weight (with tolerance for floating point)
            const calculatedTotal = recipe.ingredients.reduce((sum, ingredient) => sum + ingredient.weight, 0);
            const roundedCalculatedTotal = Math.round(calculatedTotal * 100) / 100;
            const roundedRecipeTotal = Math.round(recipe.totalWeight * 100) / 100;
            
            if (Math.abs(roundedCalculatedTotal - roundedRecipeTotal) > 0.01) {
                throw new Error(`Recipe total weight (${recipe.totalWeight}g) does not match sum of ingredient weights (${calculatedTotal}g)`);
            }

            return true;

        } catch (error) {
            throw new Error(`Recipe validation failed: ${error.message}`);
        }
    }

    /**
     * Gets a summary of what would be consumed for a given weight
     * @param {Recipe} recipe - Recipe to analyze
     * @param {number} consumedWeight - Weight to analyze
     * @returns {Object} Summary with total ingredients and weight breakdown
     */
    getConsumptionSummary(recipe, consumedWeight) {
        try {
            // Validate inputs
            this.validateRecipeForCalculation(recipe);
            this._validateWeight(consumedWeight, 'Consumed weight');

            // Handle floating point precision for remaining weight check
            const tolerance = 0.01;
            if (consumedWeight > (recipe.remainingWeight + tolerance)) {
                throw new Error(`Cannot consume ${consumedWeight}g - only ${recipe.remainingWeight}g remaining`);
            }

            // Ensure consumed weight doesn't exceed remaining weight due to floating point precision
            const actualConsumedWeight = Math.min(consumedWeight, recipe.remainingWeight);

            const percentage = this.calculateConsumptionPercentage(recipe, actualConsumedWeight);
            const ingredientCount = recipe.ingredients.length;
            
            // Calculate remaining weight with precision handling
            const rawRemainingAfterConsumption = recipe.remainingWeight - actualConsumedWeight;
            const remainingAfterConsumption = Math.max(0, Math.round(rawRemainingAfterConsumption * 100) / 100);

            return {
                consumedWeight: actualConsumedWeight,
                consumedPercentage: percentage,
                ingredientCount,
                remainingWeight: remainingAfterConsumption,
                willBeFullyConsumed: remainingAfterConsumption <= 0.01 // Consider fully consumed if less than 0.01g remains
            };

        } catch (error) {
            throw new Error(`Failed to get consumption summary: ${error.message}`);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortionCalculator;
} else if (typeof window !== 'undefined') {
    // Browser environment - expose class globally
    window.PortionCalculator = PortionCalculator;
}