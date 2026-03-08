/**
 * UIController - Handles user interface navigation, interactions, and feedback
 * Requirements: 4.3, 5.1, 5.4
 */
class UIController {
    constructor(recipeManager, portionCalculator, productDatabase, storageManager) {
        this.recipeManager = recipeManager;
        this.portionCalculator = portionCalculator;
        this.productDatabase = productDatabase;
        this.storageManager = storageManager;
        
        this.currentView = 'recipe-list-view';
        this.isOnline = navigator.onLine;
        
        // Initialize barcode scanner (optional)
        try {
            this.barcodeScanner = typeof BarcodeScanner !== 'undefined' ? new BarcodeScanner() : null;
        } catch (error) {
            console.warn('BarcodeScanner not available:', error.message);
            this.barcodeScanner = null;
        }
        this.currentScanningInput = null;
        
        // Initialize barcode generator
        this.barcodeGenerator = new BarcodeGenerator();
        
        this.init();
    }

    /**
     * Initialize UI components and event listeners
     */
    init() {
        this.setupEventListeners();
        this.updateOfflineStatus();
        this.showView(this.currentView);
        this.updateEmptyStates();
    }

    /**
     * Safely get DOM element by ID
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} Element or null if not found
     */
    safeGetElement(id) {
        return document.getElementById(id);
    }

    /**
     * Set up all event listeners for user interactions
     */
    setupEventListeners() {
        // Navigation event listeners - check if elements exist first
        const navRecipes = this.safeGetElement('nav-recipes');
        if (navRecipes) {
            navRecipes.addEventListener('click', () => {
                this.showView('recipe-list-view');
            });
        }
        
        const navCreate = this.safeGetElement('nav-create');
        if (navCreate) {
            navCreate.addEventListener('click', () => {
                this.showView('recipe-create-view');
            });
        }
        
        const navCalculate = this.safeGetElement('nav-calculate');
        if (navCalculate) {
            navCalculate.addEventListener('click', () => {
                this.showView('portion-calculator-view');
            });
        }
        
        const createFirstRecipe = this.safeGetElement('create-first-recipe');
        if (createFirstRecipe) {
            createFirstRecipe.addEventListener('click', () => {
                this.showView('recipe-create-view');
            });
        }

        // Recipe form event listeners
        this.setupRecipeFormListeners();

        // Recipe list event listeners
        this.setupRecipeListListeners();

        // Portion calculator event listeners
        this.setupPortionCalculatorListeners();

        // Online/offline status listeners
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateOfflineStatus();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateOfflineStatus();
        });

        // Toast close listeners - check if elements exist first
        const closeError = this.safeGetElement('close-error');
        if (closeError) {
            closeError.addEventListener('click', () => {
                this.hideErrorMessage();
            });
        }
        
        const closeSuccess = this.safeGetElement('close-success');
        if (closeSuccess) {
            closeSuccess.addEventListener('click', () => {
                this.hideSuccessMessage();
            });
        }
    }

    /**
     * Navigate between views
     * @param {string} viewId - ID of the view to show
     */
    showView(viewId) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Remove active state from nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected view - check if it exists
        const selectedView = this.safeGetElement(viewId);
        if (selectedView) {
            selectedView.classList.add('active');
        }
        
        // Update navigation
        const navMap = {
            'recipe-list-view': 'nav-recipes',
            'recipe-create-view': 'nav-create',
            'portion-calculator-view': 'nav-calculate'
        };
        
        if (navMap[viewId]) {
            const navElement = this.safeGetElement(navMap[viewId]);
            if (navElement) {
                navElement.classList.add('active');
            }
        }
        
        this.currentView = viewId;
        
        // Update view-specific content
        this.updateViewContent(viewId);
    }

    /**
     * Update content for the current view
     * @param {string} viewId - ID of the view to update
     */
    updateViewContent(viewId) {
        switch (viewId) {
            case 'recipe-list-view':
                this.updateRecipeList();
                break;
            case 'recipe-create-view':
                this.resetRecipeForm();
                this.updateBarcodeScannerUI();
                break;
            case 'portion-calculator-view':
                this.updateRecipeSelector();
                break;
        }
    }

    /**
     * Handle offline state indication
     */
    updateOfflineStatus() {
        const offlineIndicator = this.safeGetElement('offline-indicator');
        
        if (offlineIndicator) {
            if (this.isOnline) {
                offlineIndicator.classList.add('hidden');
            } else {
                offlineIndicator.classList.remove('hidden');
            }
        }
    }

    /**
     * Display error messages to user
     * @param {string} message - Error message to display
     */
    showErrorMessage(message) {
        const errorToast = this.safeGetElement('error-toast');
        const errorMessage = this.safeGetElement('error-message');
        
        if (errorToast && errorMessage) {
            errorMessage.textContent = message;
            errorToast.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.hideErrorMessage();
            }, 5000);
        } else {
            // Fallback to console if DOM elements not available
            console.error('Error:', message);
        }
    }

    /**
     * Hide error messages
     */
    hideErrorMessage() {
        const errorToast = this.safeGetElement('error-toast');
        if (errorToast) {
            errorToast.classList.add('hidden');
        }
    }

    /**
     * Display success messages to user
     * @param {string} message - Success message to display
     */
    showSuccessMessage(message) {
        const successToast = this.safeGetElement('success-toast');
        const successMessage = this.safeGetElement('success-message');
        
        if (successToast && successMessage) {
            successMessage.textContent = message;
            successToast.classList.remove('hidden');
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                this.hideSuccessMessage();
            }, 3000);
        } else {
            // Fallback to console if DOM elements not available
            console.log('Success:', message);
        }
    }

    /**
     * Hide success messages
     */
    hideSuccessMessage() {
        const successToast = this.safeGetElement('success-toast');
        if (successToast) {
            successToast.classList.add('hidden');
        }
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        const loadingIndicator = this.safeGetElement('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        const loadingIndicator = this.safeGetElement('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
    }

    /**
     * Update recipe list display
     */
    updateRecipeList() {
        try {
            const searchInput = this.safeGetElement('recipe-search');
            const filterSelect = this.safeGetElement('recipe-filter');
            
            // If elements don't exist (like in tests), just return
            if (!searchInput || !filterSelect) {
                return;
            }
            
            const searchQuery = searchInput.value.toLowerCase().trim();
            const filterValue = filterSelect.value;
            
            let recipes = this.recipeManager.getAllRecipes();
            
            // Apply search filter
            if (searchQuery) {
                recipes = recipes.filter(recipe => 
                    recipe.name.toLowerCase().includes(searchQuery) ||
                    recipe.ingredients.some(ingredient => 
                        ingredient.name.toLowerCase().includes(searchQuery)
                    )
                );
            }
            
            // Apply status filter
            if (filterValue === 'active') {
                recipes = recipes.filter(recipe => !recipe.isFullyConsumed());
            } else if (filterValue === 'completed') {
                recipes = recipes.filter(recipe => recipe.isFullyConsumed());
            }
            
            // Sort recipes by last consumed date (most recent first), then by creation date
            recipes.sort((a, b) => {
                if (a.lastConsumed && b.lastConsumed) {
                    return new Date(b.lastConsumed) - new Date(a.lastConsumed);
                } else if (a.lastConsumed) {
                    return -1;
                } else if (b.lastConsumed) {
                    return 1;
                } else {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                }
            });
            
            const recipeList = this.safeGetElement('recipe-list');
            const emptyState = this.safeGetElement('empty-state');
            const noResultsState = this.safeGetElement('no-results-state');
            
            // If elements don't exist (like in tests), just return
            if (!recipeList || !emptyState || !noResultsState) {
                return;
            }
            
            // Update clear search button visibility
            const clearSearchBtn = this.safeGetElement('clear-search');
            if (clearSearchBtn) {
                if (searchQuery) {
                    clearSearchBtn.classList.remove('hidden');
                } else {
                    clearSearchBtn.classList.add('hidden');
                }
            }
            
            if (recipes.length === 0) {
                recipeList.style.display = 'none';
                
                // Show appropriate empty state
                const allRecipes = this.recipeManager.getAllRecipes();
                if (allRecipes.length === 0) {
                    emptyState.style.display = 'block';
                    noResultsState.style.display = 'none';
                } else {
                    emptyState.style.display = 'none';
                    noResultsState.style.display = 'block';
                }
            } else {
                recipeList.style.display = 'grid';
                emptyState.style.display = 'none';
                noResultsState.style.display = 'none';
                
                // Clear existing content
                recipeList.innerHTML = '';
                
                // Add each recipe
                recipes.forEach(recipe => {
                    const recipeCard = this.createRecipeCard(recipe);
                    recipeList.appendChild(recipeCard);
                });
            }
        } catch (error) {
            console.error('Failed to update recipe list:', error);
            this.showErrorMessage('Failed to load recipes');
        }
    }

    /**
     * Create a recipe card element
     * @param {Recipe} recipe - Recipe to create card for
     * @returns {HTMLElement} Recipe card element
     */
    createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.dataset.recipeId = recipe.id;
        
        const consumptionPercentage = recipe.getConsumptionPercentage();
        const isFullyConsumed = recipe.isFullyConsumed();
        const hasRemainingIngredients = recipe.ingredients.some(ing => ing.weight > 0);
        
        // Format dates
        const createdDate = new Date(recipe.createdAt).toLocaleDateString();
        const lastConsumedDate = recipe.lastConsumed ? 
            new Date(recipe.lastConsumed).toLocaleDateString() : null;
        
        card.innerHTML = `
            <div class="recipe-header">
                <h3 class="recipe-name">${this.storageManager.escapeHtml(recipe.name)}</h3>
                <div class="recipe-status ${isFullyConsumed ? 'completed' : 'active'}">
                    ${isFullyConsumed ? 'Completed' : 'Active'}
                </div>
            </div>
            <div class="recipe-details">
                <p class="recipe-weight">
                    <strong>Weight:</strong> ${recipe.remainingWeight}g / ${recipe.totalWeight}g remaining
                </p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${consumptionPercentage}%"></div>
                </div>
                <p class="recipe-ingredients">
                    <strong>Ingredients:</strong> ${recipe.ingredients.length} items
                    <button type="button" class="recipe-details-toggle" onclick="window.recipeTrackerApp.uiController.toggleRecipeIngredients('${recipe.id}', this)">
                        Show ingredients
                    </button>
                </p>
                <p class="recipe-weight">
                    <strong>Created:</strong> ${createdDate}
                </p>
                ${lastConsumedDate ? `
                    <p class="last-consumed">
                        <strong>Last consumed:</strong> ${lastConsumedDate}
                    </p>
                ` : ''}
            </div>
            <div class="recipe-actions">
                <button class="btn btn-secondary btn-small calculate-btn" data-recipe-id="${recipe.id}" ${isFullyConsumed ? 'disabled' : ''}>
                    ${isFullyConsumed ? 'Completed' : 'Calculate Portions'}
                </button>
                <button class="btn btn-primary btn-small edit-recipe-btn" data-recipe-id="${recipe.id}">
                    Edit Recipe
                </button>
                <button class="btn btn-primary btn-small new-from-this-btn" data-recipe-id="${recipe.id}" ${!hasRemainingIngredients ? 'disabled title="No remaining ingredients"' : ''}>
                    New from this
                </button>
                <button class="btn btn-primary btn-small view-history-btn" data-recipe-id="${recipe.id}">
                    View History
                </button>
                <button class="btn btn-primary btn-small copy-btn" data-recipe-id="${recipe.id}">
                    Copy
                </button>
                <button class="btn btn-warning btn-small reset-btn" data-recipe-id="${recipe.id}" ${isFullyConsumed ? '' : 'disabled'}>
                    Reset
                </button>
                <button class="btn btn-danger btn-small delete-btn" data-recipe-id="${recipe.id}">
                    Delete
                </button>
            </div>
        `;
        
        // Add event listeners
        const calculateBtn = card.querySelector('.calculate-btn');
        const editRecipeBtn = card.querySelector('.edit-recipe-btn');
        const newFromThisBtn = card.querySelector('.new-from-this-btn');
        const viewHistoryBtn = card.querySelector('.view-history-btn');
        const copyBtn = card.querySelector('.copy-btn');
        const resetBtn = card.querySelector('.reset-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        
        if (!isFullyConsumed) {
            calculateBtn.addEventListener('click', () => {
                this.selectRecipeForCalculation(recipe.id);
            });
        }

        editRecipeBtn.addEventListener('click', () => {
            this.showEditRecipeModal(recipe.id);
        });

        if (hasRemainingIngredients) {
            newFromThisBtn.addEventListener('click', () => {
                this.showContinuationModal(recipe.id);
            });
        }

        viewHistoryBtn.addEventListener('click', () => {
            this.showConsumptionHistory(recipe.id);
        });

        copyBtn.addEventListener('click', () => {
            this.copyRecipe(recipe.id);
        });

        if (isFullyConsumed) {
            resetBtn.addEventListener('click', () => {
                this.resetRecipe(recipe.id);
            });
        }
        
        deleteBtn.addEventListener('click', () => {
            this.deleteRecipe(recipe.id);
        });
        
        return card;
    }

    /**
     * Select a recipe for calculation and switch to calculator view
     * @param {string} recipeId - ID of recipe to select
     */
    selectRecipeForCalculation(recipeId) {
        // Switch to calculation view and select the recipe
        this.showView('portion-calculator-view');
        
        // Set the selected recipe in the dropdown
        const recipeSelect = this.safeGetElement('recipe-select');
        if (recipeSelect) {
            recipeSelect.value = recipeId;
            
            // Trigger the change event to update the UI
            recipeSelect.dispatchEvent(new Event('change'));
        }
    }

    /**
     * Delete a recipe with confirmation
     * @param {string} recipeId - ID of recipe to delete
     */
    deleteRecipe(recipeId) {
        if (confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
            try {
                this.recipeManager.deleteRecipe(recipeId);
                this.showSuccessMessage('Recipe deleted successfully');
                this.updateRecipeList();
                this.updateRecipeSelector();
            } catch (error) {
                console.error('Failed to delete recipe:', error);
                this.showErrorMessage('Failed to delete recipe');
            }
        }
    }

    /**
     * Copy a recipe with user input for new name
     * @param {string} recipeId - ID of recipe to copy
     */
    copyRecipe(recipeId) {
        try {
            const originalRecipe = this.recipeManager.getRecipeById(recipeId);
            if (!originalRecipe) {
                this.showErrorMessage('Recipe not found');
                return;
            }

            const newName = prompt(`Enter a name for the copy of "${originalRecipe.name}":`, `${originalRecipe.name} (Copy)`);
            
            if (newName === null) {
                // User cancelled
                return;
            }

            if (!newName || newName.trim().length === 0) {
                this.showErrorMessage('Recipe name cannot be empty');
                return;
            }

            const copiedRecipe = this.recipeManager.copyRecipe(recipeId, newName.trim());
            this.showSuccessMessage(`Recipe "${copiedRecipe.name}" created successfully!`);
            this.updateRecipeList();
            this.updateRecipeSelector();

        } catch (error) {
            console.error('Failed to copy recipe:', error);
            this.showErrorMessage(error.message || 'Failed to copy recipe');
        }
    }

    /**
     * Reset a recipe's consumption with confirmation
     * @param {string} recipeId - ID of recipe to reset
     */
    resetRecipe(recipeId) {
        try {
            const recipe = this.recipeManager.getRecipeById(recipeId);
            if (!recipe) {
                this.showErrorMessage('Recipe not found');
                return;
            }

            if (confirm(`Are you sure you want to reset "${recipe.name}" back to its original state? This will restore all consumed portions.`)) {
                const resetRecipe = this.recipeManager.resetRecipe(recipeId);
                this.showSuccessMessage(`Recipe "${resetRecipe.name}" has been reset to original state`);
                this.updateRecipeList();
                this.updateRecipeSelector();
            }

        } catch (error) {
            console.error('Failed to reset recipe:', error);
            this.showErrorMessage(error.message || 'Failed to reset recipe');
        }
    }

    /**
     * Update empty states based on data
     */
    updateEmptyStates() {
        try {
            const recipes = this.recipeManager.getAllRecipes();
            const recipeList = this.safeGetElement('recipe-list');
            const emptyState = this.safeGetElement('empty-state');
            
            // Only update if elements exist
            if (recipeList && emptyState) {
                if (recipes.length === 0) {
                    recipeList.style.display = 'none';
                    emptyState.style.display = 'block';
                } else {
                    recipeList.style.display = 'grid';
                    emptyState.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Failed to check empty states:', error);
            // Only try to show empty state if elements exist
            const recipeList = this.safeGetElement('recipe-list');
            const emptyState = this.safeGetElement('empty-state');
            if (recipeList && emptyState) {
                recipeList.style.display = 'none';
                emptyState.style.display = 'block';
            }
        }
    }

    /**
     * Reset recipe form to initial state
     */
    resetRecipeForm() {
        const form = this.safeGetElement('recipe-form');
        const ingredientsList = this.safeGetElement('ingredients-list');
        
        // Only proceed if elements exist
        if (!form || !ingredientsList) {
            return;
        }
        
        // Reset form fields
        form.reset();
        
        // Clear all error messages
        document.querySelectorAll('.error-message').forEach(errorEl => {
            errorEl.textContent = '';
        });
        
        // Clear ingredients list
        ingredientsList.innerHTML = '';
        
        // Add initial ingredient input
        this.addIngredientInput();
    }

    /**
     * Update recipe selector dropdown
     */
    updateRecipeSelector() {
        try {
            const recipes = this.recipeManager.getActiveRecipes();
            const recipeSelect = this.safeGetElement('recipe-select');
            
            // Only proceed if element exists
            if (!recipeSelect) {
                return;
            }
            
            // Clear existing options (except the first placeholder)
            while (recipeSelect.children.length > 1) {
                recipeSelect.removeChild(recipeSelect.lastChild);
            }
            
            // Add recipe options
            recipes.forEach(recipe => {
                const option = document.createElement('option');
                option.value = recipe.id;
                option.textContent = `${recipe.name} (${recipe.remainingWeight}g remaining)`;
                recipeSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('Failed to update recipe selector:', error);
            this.showErrorMessage('Failed to load recipes for calculation');
        }
    }

    /**
     * Set up recipe list event listeners
     */
    setupRecipeListListeners() {
        const searchInput = this.safeGetElement('recipe-search');
        const filterSelect = this.safeGetElement('recipe-filter');
        const clearSearchBtn = this.safeGetElement('clear-search');
        const clearFiltersBtn = this.safeGetElement('clear-filters');
        
        // Only set up listeners if elements exist
        if (!searchInput || !filterSelect || !clearSearchBtn || !clearFiltersBtn) {
            return;
        }
        
        let searchDebounceTimer;
        
        // Search input with debouncing
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                this.updateRecipeList();
            }, 300);
        });
        
        // Filter select
        filterSelect.addEventListener('change', () => {
            this.updateRecipeList();
        });
        
        // Clear search button
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.updateRecipeList();
        });
        
        // Clear filters button
        clearFiltersBtn.addEventListener('click', () => {
            searchInput.value = '';
            filterSelect.value = 'all';
            this.updateRecipeList();
        });
    }

    /**
     * Set up recipe form event listeners
     */
    setupRecipeFormListeners() {
        const form = this.safeGetElement('recipe-form');
        const addIngredientBtn = this.safeGetElement('add-ingredient');
        const cancelBtn = this.safeGetElement('cancel-recipe');

        // Only set up listeners if elements exist
        if (!form || !addIngredientBtn || !cancelBtn) {
            return;
        }

        // Remove existing listeners to prevent duplicates
        form.removeEventListener('submit', this.handleRecipeFormSubmit);
        addIngredientBtn.removeEventListener('click', this.handleAddIngredient);
        cancelBtn.removeEventListener('click', this.handleCancelRecipe);

        // Add event listeners
        this.handleRecipeFormSubmit = this.handleRecipeFormSubmit.bind(this);
        this.handleAddIngredient = this.handleAddIngredient.bind(this);
        this.handleCancelRecipe = this.handleCancelRecipe.bind(this);

        form.addEventListener('submit', this.handleRecipeFormSubmit);
        addIngredientBtn.addEventListener('click', this.handleAddIngredient);
        cancelBtn.addEventListener('click', this.handleCancelRecipe);

        // Set up real-time validation for recipe name
        const recipeNameInput = this.safeGetElement('recipe-name');
        if (recipeNameInput) {
            recipeNameInput.addEventListener('input', () => {
                this.validateRecipeName(recipeNameInput.value);
            });
        }
    }

    /**
     * Set up portion calculator event listeners
     */
    setupPortionCalculatorListeners() {
        const recipeSelect = this.safeGetElement('recipe-select');
        const consumedWeightInput = this.safeGetElement('consumed-weight');
        const consumeAllBtn = this.safeGetElement('consume-all');
        const calculateBtn = this.safeGetElement('calculate-portions');
        
        // Only set up listeners if elements exist
        if (!recipeSelect || !consumedWeightInput || !consumeAllBtn || !calculateBtn) {
            return;
        }
        
        // Recipe selection
        recipeSelect.addEventListener('change', (e) => {
            this.handleRecipeSelection(e.target.value);
        });
        
        // Consumed weight input validation
        consumedWeightInput.addEventListener('input', () => {
            this.validateConsumedWeight();
        });
        
        // Consume all button
        consumeAllBtn.addEventListener('click', () => {
            this.handleConsumeAll();
        });
        
        // Calculate portions button
        calculateBtn.addEventListener('click', () => {
            this.handleCalculatePortions();
        });
        
        // Enter key on weight input triggers calculation
        consumedWeightInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleCalculatePortions();
            }
        });
    }

    /**
     * Handle recipe selection in calculator
     * @param {string} recipeId - Selected recipe ID
     */
    handleRecipeSelection(recipeId) {
        const recipeInfo = this.safeGetElement('recipe-info');
        
        if (!recipeInfo) {
            return; // Element doesn't exist, skip
        }
        
        if (!recipeId) {
            recipeInfo.classList.add('hidden');
            return;
        }
        
        try {
            const recipe = this.recipeManager.getRecipeById(recipeId);
            if (!recipe) {
                throw new Error('Recipe not found');
            }
            
            // Update recipe info display
            const selectedRecipeName = this.safeGetElement('selected-recipe-name');
            const totalWeight = this.safeGetElement('total-weight');
            const remainingWeight = this.safeGetElement('remaining-weight');
            
            if (selectedRecipeName) selectedRecipeName.textContent = recipe.name;
            if (totalWeight) totalWeight.textContent = recipe.totalWeight;
            if (remainingWeight) remainingWeight.textContent = recipe.remainingWeight;
            
            // Show recipe info
            recipeInfo.classList.remove('hidden');
            
            // Update consumed weight input max value
            const consumedWeightInput = this.safeGetElement('consumed-weight');
            if (consumedWeightInput) {
                consumedWeightInput.max = recipe.remainingWeight;
                consumedWeightInput.value = '';
            }
            
        } catch (error) {
            console.error('Failed to handle recipe selection:', error);
            this.showErrorMessage('Failed to load recipe details');
            recipeInfo.classList.add('hidden');
        }
    }

    /**
     * Add a new ingredient input to the form
     */
    addIngredientInput() {
        const ingredientsList = this.safeGetElement('ingredients-list');
        
        // Only proceed if element exists
        if (!ingredientsList) {
            return;
        }
        
        const ingredientIndex = ingredientsList.children.length;
        
        const ingredientDiv = document.createElement('div');
        ingredientDiv.className = 'ingredient-item';
        ingredientDiv.dataset.index = ingredientIndex;
        
        ingredientDiv.innerHTML = `
            <div class="ingredient-row-1">
                <div class="ingredient-name-container">
                    <input type="text" 
                           class="ingredient-name" 
                           placeholder="Ingredient name" 
                           data-index="${ingredientIndex}"
                           required>
                    <div class="autocomplete-suggestions" id="suggestions-${ingredientIndex}"></div>
                </div>
                <div class="ingredient-weight-container">
                    <input type="number" 
                           class="ingredient-weight" 
                           placeholder="Weight (g)" 
                           min="1" 
                           step="1" 
                           data-index="${ingredientIndex}"
                           required>
                </div>
            </div>
            <div class="ingredient-row-2">
                <div class="ingredient-barcode-container">
                    <input type="text" 
                           class="ingredient-barcode" 
                           placeholder="Barcode (optional)" 
                           data-index="${ingredientIndex}">
                </div>
                <div class="ingredient-actions">
                    <button type="button" class="scan-barcode" data-index="${ingredientIndex}" title="Scan Barcode">
                        📷
                    </button>
                    <button type="button" class="barcode-button" data-index="${ingredientIndex}" title="Generate Barcode" style="display: none;">
                        📊
                    </button>
                    <button type="button" class="remove-ingredient" data-index="${ingredientIndex}">
                        Remove
                    </button>
                </div>
            </div>
        `;
        
        ingredientsList.appendChild(ingredientDiv);
        
        // Set up autocomplete for the new ingredient name input
        const nameInput = ingredientDiv.querySelector('.ingredient-name');
        this.setupIngredientAutocomplete(nameInput, ingredientIndex);
        
        // Set up remove button
        const removeBtn = ingredientDiv.querySelector('.remove-ingredient');
        removeBtn.addEventListener('click', () => {
            this.removeIngredientInput(ingredientIndex);
        });
        
        // Set up barcode scan button
        const scanBtn = ingredientDiv.querySelector('.scan-barcode');
        if (this.barcodeScanner && this.barcodeScanner.isSupported) {
            scanBtn.addEventListener('click', () => {
                this.startBarcodeScanning(ingredientIndex);
            });
        } else {
            // Hide scan button if not supported
            scanBtn.style.display = 'none';
        }
        
        // Set up barcode generation button
        const barcodeBtn = ingredientDiv.querySelector('.barcode-button');
        const barcodeInput = ingredientDiv.querySelector('.ingredient-barcode');
        
        // Show/hide barcode generation button based on input
        barcodeInput.addEventListener('input', () => {
            if (barcodeInput.value.trim()) {
                barcodeBtn.style.display = 'inline-flex';
            } else {
                barcodeBtn.style.display = 'none';
            }
        });
        
        barcodeBtn.addEventListener('click', () => {
            this.showBarcodeModal(barcodeInput.value.trim());
        });
        
        // Set up validation
        const weightInput = ingredientDiv.querySelector('.ingredient-weight');
        
        weightInput.addEventListener('input', () => {
            this.validateIngredientWeight(weightInput);
        });
        
        nameInput.addEventListener('input', () => {
            this.validateIngredientName(nameInput);
        });
        
        barcodeInput.addEventListener('input', () => {
            this.validateIngredientBarcode(barcodeInput);
        });
    }

    /**
     * Remove an ingredient input from the form
     * @param {number} index - Index of ingredient to remove
     */
    removeIngredientInput(index) {
        const ingredientsList = this.safeGetElement('ingredients-list');
        
        if (ingredientsList) {
            const ingredientItem = ingredientsList.querySelector(`[data-index="${index}"]`);
            
            if (ingredientItem) {
                ingredientItem.remove();
            }
            
            // Ensure at least one ingredient input remains
            if (ingredientsList.children.length === 0) {
                this.addIngredientInput();
            }
        }
    }

    /**
     * Set up autocomplete for ingredient input
     * @param {HTMLElement} input - Input element
     * @param {number} index - Input index
     */
    setupIngredientAutocomplete(input, index) {
        const suggestionsContainer = this.safeGetElement(`suggestions-${index}`);
        
        // Only proceed if container exists
        if (!suggestionsContainer) {
            return;
        }
        
        let debounceTimer;
        
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.showIngredientSuggestions(e.target.value, suggestionsContainer, input);
            }, 300);
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });
    }

    /**
     * Show ingredient suggestions
     * @param {string} query - Search query
     * @param {HTMLElement} container - Suggestions container
     * @param {HTMLElement} input - Input element
     */
    showIngredientSuggestions(query, container, input) {
        if (!query || query.length < 2) {
            container.style.display = 'none';
            return;
        }
        
        try {
            const suggestions = this.productDatabase.searchProducts(query);
            
            if (suggestions.length === 0) {
                container.style.display = 'none';
                return;
            }
            
            container.innerHTML = '';
            suggestions.slice(0, 5).forEach(product => {
                const suggestionDiv = document.createElement('div');
                suggestionDiv.className = 'autocomplete-suggestion';
                suggestionDiv.textContent = product.name;
                
                suggestionDiv.addEventListener('click', () => {
                    input.value = product.name;
                    
                    // Auto-fill barcode if available
                    if (product.barcode) {
                        const barcodeInput = input.closest('.ingredient-item').querySelector('.ingredient-barcode');
                        if (barcodeInput && !barcodeInput.value) {
                            barcodeInput.value = product.barcode;
                        }
                    }
                    
                    container.style.display = 'none';
                    
                    // Focus on weight input
                    const weightInput = input.closest('.ingredient-item').querySelector('.ingredient-weight');
                    if (weightInput) {
                        weightInput.focus();
                    }
                });
                
                container.appendChild(suggestionDiv);
            });
            
            container.style.display = 'block';
            
        } catch (error) {
            console.error('Failed to get ingredient suggestions:', error);
            container.style.display = 'none';
        }
    }
    
    /**
     * Handle recipe form submission
     * @param {Event} event - Form submit event
     */
    handleRecipeFormSubmit(event) {
        event.preventDefault();
        
        try {
            this.showLoading();
            
            // Collect form data
            const formData = this.collectRecipeFormData();
            
            // Validate form data
            const validationResult = this.validateRecipeForm(formData);
            if (!validationResult.isValid) {
                this.displayFormErrors(validationResult.errors);
                return;
            }
            
            // Create recipe
            const recipe = this.recipeManager.createRecipe(formData.name, formData.ingredients);
            
            // Update product database with new ingredients
            formData.ingredients.forEach(ingredient => {
                this.productDatabase.addProduct(ingredient.name, ingredient.barcode);
            });
            
            // Show success message
            this.showSuccessMessage(`Recipe "${recipe.name}" created successfully!`);
            
            // Navigate back to recipe list
            this.showView('recipe-list-view');
            
        } catch (error) {
            console.error('Failed to create recipe:', error);
            
            // Handle specific error types
            if (error.message.includes('Storage quota exceeded')) {
                this.handleStorageQuotaExceeded(error);
            } else if (error.message.includes('malicious content')) {
                this.showErrorMessage('Invalid input detected. Please check your recipe data for potentially harmful content.');
            } else if (error.message.includes('already exists')) {
                this.showErrorMessage(error.message);
                // Focus on the recipe name field
                const recipeNameInput = document.getElementById('recipe-name');
                if (recipeNameInput) {
                    recipeNameInput.focus();
                }
            } else {
                this.showErrorMessage(error.message || 'Failed to create recipe. Please check your input and try again.');
            }
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle storage quota exceeded errors
     * @param {Error} error - Storage quota error
     */
    handleStorageQuotaExceeded(error) {
        const message = error.message + '\n\nWould you like to automatically clean up old data to free space?';
        
        if (confirm(message)) {
            try {
                this.showLoading();
                
                // Attempt to clean up storage
                const cleanupResult = this.storageManager.cleanupStorage(500); // Try to free 500KB
                
                if (cleanupResult.success) {
                    this.showSuccessMessage(
                        `Cleaned up ${cleanupResult.freedSizeKB}KB of storage space by removing ${cleanupResult.removedItems.length} old items. Please try saving again.`
                    );
                } else {
                    this.showErrorMessage(
                        `Only freed ${cleanupResult.freedSizeKB}KB of ${cleanupResult.targetSizeKB}KB requested. You may need to manually delete some recipes.`
                    );
                }
                
            } catch (cleanupError) {
                console.error('Failed to cleanup storage:', cleanupError);
                this.showErrorMessage('Failed to clean up storage automatically. Please manually delete some recipes to free space.');
            } finally {
                this.hideLoading();
            }
        } else {
            this.showErrorMessage('Recipe not saved due to insufficient storage space. Please delete some recipes and try again.');
        }
    }

    /**
     * Collect data from recipe form
     * @returns {Object} Form data
     */
    collectRecipeFormData() {
        const recipeName = document.getElementById('recipe-name').value.trim();
        const ingredientItems = document.querySelectorAll('.ingredient-item');
        
        const ingredients = [];
        ingredientItems.forEach(item => {
            const nameInput = item.querySelector('.ingredient-name');
            const weightInput = item.querySelector('.ingredient-weight');
            const barcodeInput = item.querySelector('.ingredient-barcode');
            
            const name = nameInput.value.trim();
            const weight = parseFloat(weightInput.value);
            const barcode = barcodeInput.value.trim() || null;
            
            if (name && !isNaN(weight) && weight > 0) {
                ingredients.push({ name, weight, barcode });
            }
        });
        
        return { name: recipeName, ingredients };
    }

    /**
     * Validate recipe form data
     * @param {Object} formData - Form data to validate
     * @returns {Object} Validation result
     */
    validateRecipeForm(formData) {
        const errors = {};
        
        // Validate recipe name
        const nameValidation = this.storageManager.validateRecipeName(formData.name);
        if (!nameValidation.isValid) {
            errors.recipeName = nameValidation.error;
        }
        
        // Check for duplicate recipe name
        if (nameValidation.isValid) {
            try {
                const existingRecipes = this.recipeManager.getAllRecipes();
                const duplicateRecipe = existingRecipes.find(recipe => 
                    recipe.name.toLowerCase() === formData.name.trim().toLowerCase()
                );
                if (duplicateRecipe) {
                    errors.recipeName = 'A recipe with this name already exists';
                }
            } catch (error) {
                console.error('Failed to check for duplicate recipe names:', error);
                errors.recipeName = 'Unable to validate recipe name uniqueness';
            }
        }
        
        // Validate ingredients
        if (formData.ingredients.length === 0) {
            errors.ingredients = 'At least one ingredient is required';
        } else {
            // Validate each ingredient
            const ingredientErrors = [];
            const ingredientNames = [];
            
            formData.ingredients.forEach((ingredient, index) => {
                // Validate ingredient name
                const nameValidation = this.storageManager.validateIngredientName(ingredient.name);
                if (!nameValidation.isValid) {
                    ingredientErrors.push(`Ingredient ${index + 1}: ${nameValidation.error}`);
                } else {
                    ingredientNames.push(ingredient.name.toLowerCase().trim());
                }
                
                // Validate ingredient weight
                const weightValidation = this.storageManager.validateWeight(ingredient.weight, `Ingredient ${index + 1} weight`);
                if (!weightValidation.isValid) {
                    ingredientErrors.push(`Ingredient ${index + 1}: ${weightValidation.error}`);
                }
                
                // Validate barcode if provided
                if (ingredient.barcode) {
                    const barcodeValidation = this.storageManager.validateBarcode(ingredient.barcode);
                    if (!barcodeValidation.isValid) {
                        ingredientErrors.push(`Ingredient ${index + 1} barcode: ${barcodeValidation.error}`);
                    }
                }
            });
            
            // Check for duplicate ingredient names
            const duplicateNames = ingredientNames.filter((name, index) => 
                ingredientNames.indexOf(name) !== index
            );
            
            if (duplicateNames.length > 0) {
                ingredientErrors.push('Duplicate ingredient names are not allowed');
            }
            
            if (ingredientErrors.length > 0) {
                errors.ingredients = ingredientErrors.join('; ');
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Display form validation errors
     * @param {Object} errors - Validation errors
     */
    displayFormErrors(errors) {
        // Clear existing errors
        document.querySelectorAll('.error-message').forEach(errorEl => {
            errorEl.textContent = '';
        });
        
        // Display recipe name error
        if (errors.recipeName) {
            const recipeNameError = document.getElementById('recipe-name-error');
            if (recipeNameError) {
                recipeNameError.textContent = errors.recipeName;
            }
        }
        
        // Display ingredients error
        if (errors.ingredients) {
            this.showErrorMessage(errors.ingredients);
        }
    }
    
    /**
     * Handle add ingredient button click
     */
    handleAddIngredient() {
        this.addIngredientInput();
    }
    
    /**
     * Handle cancel recipe button click
     */
    handleCancelRecipe() {
        if (this.hasUnsavedChanges()) {
            if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                this.showView('recipe-list-view');
            }
        } else {
            this.showView('recipe-list-view');
        }
    }

    /**
     * Check if form has unsaved changes
     * @returns {boolean} True if there are unsaved changes
     */
    hasUnsavedChanges() {
        const recipeName = document.getElementById('recipe-name').value.trim();
        const ingredientInputs = document.querySelectorAll('.ingredient-name, .ingredient-weight, .ingredient-barcode');
        
        if (recipeName) return true;
        
        for (let input of ingredientInputs) {
            if (input.value.trim()) return true;
        }
        
        return false;
    }
    
    /**
     * Validate recipe name input
     * @param {string} name - Recipe name to validate
     * @returns {boolean} True if valid
     */
    validateRecipeName(name) {
        const errorElement = document.getElementById('recipe-name-error');
        
        const validation = this.storageManager.validateRecipeName(name);
        
        if (!validation.isValid) {
            errorElement.textContent = validation.error;
            return false;
        }
        
        // Check for duplicate names
        try {
            const existingRecipes = this.recipeManager.getAllRecipes();
            const duplicateRecipe = existingRecipes.find(recipe => 
                recipe.name.toLowerCase() === name.trim().toLowerCase()
            );
            if (duplicateRecipe) {
                errorElement.textContent = 'A recipe with this name already exists';
                return false;
            }
        } catch (error) {
            console.error('Failed to validate recipe name:', error);
            errorElement.textContent = 'Unable to validate recipe name';
            return false;
        }
        
        errorElement.textContent = '';
        return true;
    }

    /**
     * Validate ingredient name input
     * @param {HTMLElement} input - Input element to validate
     * @returns {boolean} True if valid
     */
    validateIngredientName(input) {
        const name = input.value;
        const validation = this.storageManager.validateIngredientName(name);
        
        if (!validation.isValid) {
            input.setCustomValidity(validation.error);
            return false;
        }
        
        input.setCustomValidity('');
        return true;
    }

    /**
     * Validate ingredient weight input
     * @param {HTMLElement} input - Input element to validate
     * @returns {boolean} True if valid
     */
    validateIngredientWeight(input) {
        const weight = input.value;
        const validation = this.storageManager.validateWeight(weight, 'Ingredient weight');
        
        if (!validation.isValid) {
            input.setCustomValidity(validation.error);
            return false;
        }
        
        input.setCustomValidity('');
        return true;
    }

    /**
     * Validate ingredient barcode input
     * @param {HTMLElement} input - Input element to validate
     * @returns {boolean} True if valid
     */
    validateIngredientBarcode(input) {
        const barcode = input.value;
        const validation = this.storageManager.validateBarcode(barcode);
        
        if (!validation.isValid) {
            input.setCustomValidity(validation.error);
            return false;
        }
        
        input.setCustomValidity('');
        return true;
    }
    
    /**
     * Validate consumed weight input
     * @returns {boolean} True if valid
     */
    validateConsumedWeight() {
        const consumedWeightInput = document.getElementById('consumed-weight');
        const errorElement = document.getElementById('consumed-weight-error');
        const recipeSelect = document.getElementById('recipe-select');
        
        const weight = consumedWeightInput.value;
        const selectedRecipeId = recipeSelect.value;
        
        if (!selectedRecipeId) {
            errorElement.textContent = 'Please select a recipe first';
            return false;
        }
        
        // Validate weight format and value
        const weightValidation = this.storageManager.validateWeight(weight, 'Consumed weight');
        if (!weightValidation.isValid) {
            errorElement.textContent = weightValidation.error;
            return false;
        }
        
        const numericWeight = weightValidation.value;
        
        try {
            const recipe = this.recipeManager.getRecipeById(selectedRecipeId);
            if (!recipe) {
                errorElement.textContent = 'Selected recipe not found';
                return false;
            }
            
            if (recipe.isFullyConsumed()) {
                errorElement.textContent = 'This recipe is already fully consumed';
                return false;
            }
            
            if (numericWeight > recipe.remainingWeight) {
                errorElement.textContent = `Cannot consume more than remaining weight (${recipe.remainingWeight}g)`;
                return false;
            }
            
            errorElement.textContent = '';
            return true;
            
        } catch (error) {
            console.error('Failed to validate consumed weight:', error);
            errorElement.textContent = 'Validation error: ' + error.message;
            return false;
        }
    }
    
    /**
     * Handle consume all button click
     */
    handleConsumeAll() {
        const recipeSelect = document.getElementById('recipe-select');
        const selectedRecipeId = recipeSelect.value;
        
        if (!selectedRecipeId) {
            this.showErrorMessage('Please select a recipe first');
            return;
        }
        
        try {
            const recipe = this.recipeManager.getRecipeById(selectedRecipeId);
            if (!recipe) {
                this.showErrorMessage('Selected recipe not found');
                return;
            }
            
            if (recipe.isFullyConsumed()) {
                this.showErrorMessage('This recipe is already fully consumed');
                return;
            }

            // Validate recipe for calculation to prevent division by zero and other errors
            this.portionCalculator.validateRecipeForCalculation(recipe);
            
            // Calculate portions for all remaining weight
            const consumedWeight = recipe.remainingWeight;
            const results = this.portionCalculator.calculatePortions(recipe, consumedWeight);
            
            // Update recipe in storage
            this.recipeManager.markAsFullyConsumed(selectedRecipeId);
            
            // Display results
            this.displayCalculationResults(results, true);
            
            // Update UI
            this.updateRecipeSelector();
            this.updateRecipeList();
            
            this.showSuccessMessage(`Consumed all remaining ${consumedWeight}g of "${recipe.name}"`);
            
        } catch (error) {
            console.error('Failed to consume all:', error);
            
            // Handle specific calculation errors
            if (error.message.includes('division by zero') || error.message.includes('total weight must be')) {
                this.showErrorMessage('Cannot consume all: Recipe has invalid weight data. Please check the recipe.');
            } else if (error.message.includes('remaining weight')) {
                this.showErrorMessage('Cannot consume all: ' + error.message);
            } else if (error.message.includes('precision') || error.message.includes('floating point')) {
                this.showErrorMessage('Calculation precision error occurred while consuming all.');
            } else {
                this.showErrorMessage(error.message || 'Failed to consume all. Please try again.');
            }
        }
    }
    
    /**
     * Handle calculate portions button click
     */
    handleCalculatePortions() {
        const recipeSelect = document.getElementById('recipe-select');
        const consumedWeightInput = document.getElementById('consumed-weight');
        
        const selectedRecipeId = recipeSelect.value;
        const consumedWeight = parseFloat(consumedWeightInput.value);
        
        if (!this.validateConsumedWeight()) {
            return;
        }
        
        try {
            this.showLoading();
            
            const recipe = this.recipeManager.getRecipeById(selectedRecipeId);
            if (!recipe) {
                throw new Error('Selected recipe not found');
            }

            // Validate recipe for calculation to prevent division by zero and other errors
            this.portionCalculator.validateRecipeForCalculation(recipe);
            
            // Calculate portions
            const results = this.portionCalculator.calculatePortions(recipe, consumedWeight);
            
            // Update recipe in storage
            this.recipeManager.recordConsumption(selectedRecipeId, consumedWeight);
            
            // Display results
            this.displayCalculationResults(results, false);
            
            // Update UI
            this.updateRecipeSelector();
            this.updateRecipeList();
            
            // Clear input
            consumedWeightInput.value = '';
            
            this.showSuccessMessage(`Calculated portions for ${consumedWeight}g of "${recipe.name}"`);
            
        } catch (error) {
            console.error('Failed to calculate portions:', error);
            
            // Handle specific calculation errors
            if (error.message.includes('division by zero') || error.message.includes('total weight must be')) {
                this.showErrorMessage('Cannot calculate portions: Recipe has invalid weight data. Please check the recipe.');
            } else if (error.message.includes('remaining weight')) {
                this.showErrorMessage('Cannot calculate portions: ' + error.message);
            } else if (error.message.includes('precision') || error.message.includes('floating point')) {
                this.showErrorMessage('Calculation precision error. Please try with a different weight value.');
            } else {
                this.showErrorMessage(error.message || 'Failed to calculate portions. Please check your input and try again.');
            }
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Display calculation results
     * @param {ConsumptionResult} results - Calculation results
     * @param {boolean} isFullConsumption - Whether this was a full consumption
     */
    displayCalculationResults(results, isFullConsumption) {
        const resultsSection = document.getElementById('calculation-results');
        const resultsList = document.getElementById('results-list');
        
        // Clear previous results
        resultsList.innerHTML = '';
        
        // Create results header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'results-header';
        headerDiv.innerHTML = `
            <h4>Consumption Results</h4>
            <p class="consumption-summary">
                ${isFullConsumption ? 'Fully consumed' : `Consumed ${results.consumedWeight}g`} 
                from "${this.storageManager.escapeHtml(results.recipeName)}"
            </p>
            <p class="consumption-timestamp">
                ${new Date(results.timestamp).toLocaleString()}
            </p>
        `;
        resultsList.appendChild(headerDiv);
        
        // Create ingredient results
        results.ingredients.forEach(ingredient => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            const consumedPercentage = ((ingredient.consumedWeight / ingredient.originalWeight) * 100).toFixed(1);
            
            resultItem.innerHTML = `
                <div class="ingredient-info">
                    <div class="ingredient-name">${this.storageManager.escapeHtml(ingredient.name)}</div>
                    <div class="ingredient-details">
                        <span class="ingredient-weight">
                            ${ingredient.consumedWeight.toFixed(1)}g of ${ingredient.originalWeight}g (${consumedPercentage}%)
                        </span>
                        ${ingredient.barcode ? `
                            <span class="barcode">
                                Barcode: ${this.storageManager.escapeHtml(ingredient.barcode)}
                                <button type="button" class="barcode-button" onclick="window.recipeTrackerApp.uiController.showBarcodeModal('${ingredient.barcode}')" title="Show Barcode">📊</button>
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="ingredient-progress">
                    <div class="mini-progress-bar">
                        <div class="mini-progress-fill" style="width: ${consumedPercentage}%"></div>
                    </div>
                </div>
            `;
            
            resultsList.appendChild(resultItem);
        });
        
        // Show results section
        resultsSection.classList.remove('hidden');
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Start barcode scanning for an ingredient input
     * @param {number} ingredientIndex - Index of ingredient input
     */
    async startBarcodeScanning(ingredientIndex) {
        if (!this.barcodeScanner || !this.barcodeScanner.isSupported) {
            this.showErrorMessage('Barcode scanning is not supported on this device');
            return;
        }

        try {
            // Check camera permission first
            const permission = await this.barcodeScanner.checkCameraPermission();
            if (permission === 'denied') {
                this.showErrorMessage('Camera permission is required for barcode scanning. Please enable it in your browser settings.');
                return;
            }

            // Find the barcode input for this ingredient
            const barcodeInput = document.querySelector(`[data-index="${ingredientIndex}"].ingredient-barcode`);
            if (!barcodeInput) {
                this.showErrorMessage('Could not find barcode input field');
                return;
            }

            this.currentScanningInput = barcodeInput;

            // Show scanning modal
            this.showBarcodeScanningModal();

            // Start scanning
            const videoElement = await this.barcodeScanner.startScanning(
                (result) => this.handleBarcodeScanned(result),
                (error) => this.handleBarcodeScanError(error)
            );

            // Add video to modal
            const videoContainer = document.getElementById('barcode-video-container');
            if (videoContainer) {
                videoContainer.innerHTML = '';
                videoContainer.appendChild(videoElement);
            }

        } catch (error) {
            console.error('Failed to start barcode scanning:', error);
            this.showErrorMessage(error.message || 'Failed to start barcode scanner');
            this.hideBarcodeScanningModal();
        }
    }

    /**
     * Handle successful barcode scan
     * @param {Object} result - Scan result
     */
    handleBarcodeScanned(result) {
        console.log('Barcode scanned:', result);

        if (this.currentScanningInput) {
            this.currentScanningInput.value = result.value;
            
            // Trigger input event to update any validation
            this.currentScanningInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        this.hideBarcodeScanningModal();
        this.showSuccessMessage(`Barcode scanned: ${result.value}`);
    }

    /**
     * Handle barcode scan error
     * @param {Error} error - Scan error
     */
    handleBarcodeScanError(error) {
        console.error('Barcode scan error:', error);
        this.showErrorMessage(error.message || 'Barcode scanning failed');
        this.hideBarcodeScanningModal();
    }

    /**
     * Show barcode scanning modal
     */
    showBarcodeScanningModal() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('barcode-modal');
        if (!modal) {
            modal = this.createBarcodeScanningModal();
            document.body.appendChild(modal);
        }

        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    /**
     * Hide barcode scanning modal
     */
    hideBarcodeScanningModal() {
        const modal = document.getElementById('barcode-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        document.body.classList.remove('modal-open');
        
        // Stop scanning
        if (this.barcodeScanner) {
            this.barcodeScanner.stopScanning();
        }
        this.currentScanningInput = null;
    }

    /**
     * Create barcode scanning modal
     * @returns {HTMLElement} Modal element
     */
    createBarcodeScanningModal() {
        const modal = document.createElement('div');
        modal.id = 'barcode-modal';
        modal.className = 'modal barcode-modal hidden';
        
        modal.innerHTML = `
            <div class="modal-overlay" id="barcode-modal-overlay"></div>
            <div class="modal-content barcode-modal-content">
                <div class="modal-header">
                    <h3>Scan Barcode</h3>
                    <button type="button" class="modal-close" id="close-barcode-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="barcode-instructions">
                        <p>Position the barcode within the camera view. The scanner will automatically detect and capture the barcode.</p>
                    </div>
                    <div class="barcode-video-container" id="barcode-video-container">
                        <div class="loading-scanner">
                            <div class="spinner"></div>
                            <p>Starting camera...</p>
                        </div>
                    </div>
                    <div class="barcode-overlay">
                        <div class="scan-frame"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancel-barcode-scan">Cancel</button>
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = modal.querySelector('#close-barcode-modal');
        const cancelBtn = modal.querySelector('#cancel-barcode-scan');
        const overlay = modal.querySelector('#barcode-modal-overlay');

        const closeModal = () => this.hideBarcodeScanningModal();

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        // Prevent modal from closing when clicking inside content
        modal.querySelector('.modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        return modal;
    }

    /**
     * Show barcode generation modal
     * @param {string} barcodeText - Text to generate barcode for
     */
    showBarcodeModal(barcodeText) {
        if (!barcodeText || !this.barcodeGenerator.isValidBarcodeText(barcodeText)) {
            this.showErrorMessage('Invalid barcode text. Supported characters: ' + this.barcodeGenerator.getSupportedCharacters());
            return;
        }

        try {
            // Create modal if it doesn't exist
            let modal = document.getElementById('barcode-display-modal');
            if (!modal) {
                modal = this.createBarcodeDisplayModal();
                document.body.appendChild(modal);
            }

            // Generate barcode
            const barcodeDataURL = this.barcodeGenerator.generateBarcodeDataURL(barcodeText, {
                width: 300,
                height: 100,
                showText: true
            });

            // Update modal content
            const barcodeImage = modal.querySelector('#barcode-image');
            const barcodeTextEl = modal.querySelector('#barcode-text');
            
            barcodeImage.src = barcodeDataURL;
            barcodeTextEl.textContent = barcodeText;

            // Show modal
            modal.classList.remove('hidden');
            document.body.classList.add('modal-open');

        } catch (error) {
            console.error('Failed to generate barcode:', error);
            this.showErrorMessage('Failed to generate barcode: ' + error.message);
        }
    }

    /**
     * Create barcode display modal
     * @returns {HTMLElement} Modal element
     */
    createBarcodeDisplayModal() {
        const modal = document.createElement('div');
        modal.id = 'barcode-display-modal';
        modal.className = 'modal hidden';
        
        modal.innerHTML = `
            <div class="modal-overlay" id="barcode-display-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Generated Barcode</h3>
                    <button type="button" class="modal-close" id="close-barcode-display">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="barcode-display">
                        <img id="barcode-image" class="barcode-image" alt="Generated Barcode">
                        <div class="barcode-text" id="barcode-text"></div>
                        <p style="font-size: 0.9rem; color: #666; margin-top: 1rem;">
                            This barcode can be scanned by barcode scanner apps
                        </p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="close-barcode-display-btn">Close</button>
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = modal.querySelector('#close-barcode-display');
        const closeBtnFooter = modal.querySelector('#close-barcode-display-btn');
        const overlay = modal.querySelector('#barcode-display-overlay');

        const closeModal = () => {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        };

        closeBtn.addEventListener('click', closeModal);
        closeBtnFooter.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        // Prevent modal from closing when clicking inside content
        modal.querySelector('.modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        return modal;
    }

    /**
     * Toggle recipe ingredients display
     * @param {string} recipeId - Recipe ID
     * @param {HTMLElement} toggleButton - Toggle button element
     */
    toggleRecipeIngredients(recipeId, toggleButton) {
        try {
            const recipe = this.recipeManager.getRecipeById(recipeId);
            if (!recipe) {
                this.showErrorMessage('Recipe not found');
                return;
            }

            const recipeCard = toggleButton.closest('.recipe-card');
            let ingredientsDiv = recipeCard.querySelector('.recipe-ingredients-expanded');

            if (ingredientsDiv) {
                // Hide ingredients
                ingredientsDiv.remove();
                toggleButton.textContent = 'Show ingredients';
            } else {
                // Show ingredients
                ingredientsDiv = document.createElement('div');
                ingredientsDiv.className = 'recipe-ingredients-expanded';
                
                ingredientsDiv.innerHTML = `
                    <h4>Ingredients (${recipe.ingredients.length} items)</h4>
                    <ul class="ingredient-list">
                        ${recipe.ingredients.map(ingredient => `
                            <li>
                                <span class="ingredient-name">${this.storageManager.escapeHtml(ingredient.name)}</span>
                                <span class="ingredient-weight">${ingredient.weight}g</span>
                                ${ingredient.barcode ? `<span class="ingredient-barcode-info">${this.storageManager.escapeHtml(ingredient.barcode)}</span>` : ''}
                                ${ingredient.barcode ? `<button type="button" class="barcode-button" onclick="window.recipeTrackerApp.uiController.showBarcodeModal('${ingredient.barcode}')" title="Show Barcode">📊</button>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                `;

                // Insert after recipe details
                const recipeDetails = recipeCard.querySelector('.recipe-details');
                recipeDetails.appendChild(ingredientsDiv);
                toggleButton.textContent = 'Hide ingredients';
            }

        } catch (error) {
            console.error('Failed to toggle recipe ingredients:', error);
            this.showErrorMessage('Failed to load recipe ingredients');
        }
    }

    /**
     * Check barcode scanner support and show appropriate UI
     */
    updateBarcodeScannerUI() {
        const scanButtons = document.querySelectorAll('.scan-barcode');
        
        if (this.barcodeScanner && this.barcodeScanner.isSupported) {
            scanButtons.forEach(btn => {
                btn.style.display = 'inline-block';
                btn.title = 'Scan Barcode';
            });
        } else {
            scanButtons.forEach(btn => {
                btn.style.display = 'none';
            });
            
            // Show info message about barcode scanning not being available
            console.log('Barcode scanning not supported on this device');
        }
    }

    /**
     * Show consumption history modal for a recipe
     * @param {string} recipeId - Recipe ID
     */
    showConsumptionHistory(recipeId) {
        try {
            const recipe = this.recipeManager.getRecipeById(recipeId);
            if (!recipe) {
                this.showErrorMessage('Recipe not found');
                return;
            }

            // Create modal if it doesn't exist
            let modal = document.getElementById('history-modal');
            if (!modal) {
                modal = this.createHistoryModal();
                document.body.appendChild(modal);
            }

            // Update modal content
            this.renderHistoryModal(modal, recipe);

            // Show modal
            modal.classList.remove('hidden');
            document.body.classList.add('modal-open');

        } catch (error) {
            console.error('Failed to show consumption history:', error);
            this.showErrorMessage('Failed to load consumption history');
        }
    }

    /**
     * Create consumption history modal
     * @returns {HTMLElement} Modal element
     */
    createHistoryModal() {
        const modal = document.createElement('div');
        modal.id = 'history-modal';
        modal.className = 'modal hidden';
        
        modal.innerHTML = `
            <div class="modal-overlay" id="history-modal-overlay"></div>
            <div class="modal-content history-modal-content">
                <div class="modal-header">
                    <h3 id="history-modal-title">Consumption History</h3>
                    <button type="button" class="modal-close" id="close-history-modal">&times;</button>
                </div>
                <div class="modal-body" id="history-modal-body">
                    <!-- Content will be dynamically inserted -->
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="close-history-modal-btn">Close</button>
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = modal.querySelector('#close-history-modal');
        const closeBtnFooter = modal.querySelector('#close-history-modal-btn');
        const overlay = modal.querySelector('#history-modal-overlay');

        const closeModal = () => {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        };

        closeBtn.addEventListener('click', closeModal);
        closeBtnFooter.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        // Prevent modal from closing when clicking inside content
        modal.querySelector('.modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        return modal;
    }

    /**
     * Render consumption history modal content
     * @param {HTMLElement} modal - Modal element
     * @param {Recipe} recipe - Recipe object
     */
    renderHistoryModal(modal, recipe) {
        const titleEl = modal.querySelector('#history-modal-title');
        const bodyEl = modal.querySelector('#history-modal-body');

        titleEl.textContent = `Consumption History - ${recipe.name}`;

        const history = recipe.consumptionHistory || [];

        if (history.length === 0) {
            // Show empty state
            bodyEl.innerHTML = `
                <div class="empty-history">
                    <div class="empty-history-icon">📊</div>
                    <p>No consumption history yet</p>
                    <p style="font-size: 0.9rem; color: #999; margin-top: 0.5rem;">
                        Start consuming portions to see your history here
                    </p>
                </div>
            `;
            return;
        }

        // Render history entries (chronological order - most recent first)
        const entriesHTML = history
            .slice()
            .reverse()
            .map((entry, index) => this.renderHistoryEntry(entry, index))
            .join('');

        bodyEl.innerHTML = `
            <div class="history-list">
                ${entriesHTML}
            </div>
        `;

        // Add event listeners for toggle buttons
        bodyEl.querySelectorAll('.toggle-ingredients-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const entryId = e.target.dataset.entryId;
                this.toggleHistoryIngredients(entryId);
            });
        });

        // Add event listeners for edit and delete buttons
        bodyEl.querySelectorAll('.edit-history-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const historyId = e.target.dataset.historyId;
                this.showEditHistoryModal(recipe.id, historyId);
            });
        });

        bodyEl.querySelectorAll('.delete-history-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const historyId = e.target.dataset.historyId;
                this.deleteHistoryEntry(recipe.id, historyId);
            });
        });
    }

    /**
     * Calculate statistics from consumption history
     * @param {Recipe} recipe - Recipe object
     * @param {Array} history - Consumption history array
     * @returns {Object} Statistics object
     */
    calculateHistoryStatistics(recipe, history) {
        const totalConsumed = history.reduce((sum, entry) => sum + entry.consumedWeight, 0);
        const consumptionCount = history.length;
        const averagePortion = consumptionCount > 0 ? totalConsumed / consumptionCount : 0;

        const firstEntry = history[0];
        const lastEntry = history[history.length - 1];

        return {
            totalConsumed: totalConsumed.toFixed(1),
            consumptionCount: consumptionCount,
            averagePortion: averagePortion.toFixed(1),
            firstConsumed: new Date(firstEntry.timestamp).toLocaleDateString(),
            lastConsumed: new Date(lastEntry.timestamp).toLocaleDateString()
        };
    }

    /**
     * Render a single history entry
     * @param {ConsumptionHistory} entry - History entry
     * @param {number} index - Entry index
     * @returns {string} HTML string
     */
    renderHistoryEntry(entry, index) {
        const date = new Date(entry.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();

        const ingredientsHTML = entry.ingredientBreakdown
            .map(ing => `
                <li>
                    <span class="history-ingredient-name">${this.storageManager.escapeHtml(ing.name)}</span>
                    <span class="history-ingredient-weight">${ing.weight.toFixed(1)}g</span>
                </li>
            `)
            .join('');

        return `
            <div class="history-entry">
                <div class="history-entry-header">
                    <div class="history-date">${dateStr} at ${timeStr}</div>
                    <div class="history-weight">${entry.consumedWeight.toFixed(1)}g</div>
                    <div class="history-actions">
                        <button type="button" class="btn btn-sm btn-primary edit-history-btn" data-history-id="${entry.id}">Edit</button>
                        <button type="button" class="btn btn-sm btn-danger delete-history-btn" data-history-id="${entry.id}">Delete</button>
                    </div>
                </div>
                <div class="history-details">
                    <div class="history-detail-row">
                        <span class="history-detail-label">Remaining after:</span>
                        <span class="history-detail-value">${entry.remainingWeightAfter.toFixed(1)}g</span>
                    </div>
                </div>
                <div class="history-ingredients">
                    <div class="history-ingredients-header">
                        <span class="history-ingredients-title">Ingredients (${entry.ingredientBreakdown.length})</span>
                        <button type="button" class="toggle-ingredients-btn" data-entry-id="${entry.id}">
                            Show
                        </button>
                    </div>
                    <ul class="history-ingredients-list" id="ingredients-${entry.id}" style="display: none;">
                        ${ingredientsHTML}
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Toggle ingredients display for a history entry
     * @param {string} entryId - History entry ID
     */
    toggleHistoryIngredients(entryId) {
        const ingredientsList = document.getElementById(`ingredients-${entryId}`);
        const toggleBtn = document.querySelector(`[data-entry-id="${entryId}"]`);

        if (!ingredientsList || !toggleBtn) return;

        if (ingredientsList.style.display === 'none') {
            ingredientsList.style.display = 'block';
            toggleBtn.textContent = 'Hide';
        } else {
            ingredientsList.style.display = 'none';
            toggleBtn.textContent = 'Show';
        }
    }

    /**
     * Shows edit history modal
     * @param {string} recipeId - Recipe ID
     * @param {string} historyId - History entry ID
     */
    showEditHistoryModal(recipeId, historyId) {
        try {
            const recipe = this.recipeManager.getRecipeById(recipeId);
            if (!recipe) {
                this.showErrorMessage('Recipe not found');
                return;
            }

            const historyEntry = recipe.consumptionHistory.find(h => h.id === historyId);
            if (!historyEntry) {
                this.showErrorMessage('History entry not found');
                return;
            }

            // Create modal if it doesn't exist
            let modal = document.getElementById('edit-history-modal');
            if (!modal) {
                modal = this.createEditHistoryModal();
                document.body.appendChild(modal);
            }

            // Update modal content
            this.renderEditHistoryModal(modal, historyEntry);

            // Show modal
            modal.classList.remove('hidden');
            document.body.classList.add('modal-open');

        } catch (error) {
            console.error('Failed to show edit history modal:', error);
            this.showErrorMessage('Failed to load edit history modal');
        }
    }

    /**
     * Creates edit history modal
     * @returns {HTMLElement} Modal element
     */
    createEditHistoryModal() {
        const modal = document.createElement('div');
        modal.id = 'edit-history-modal';
        modal.className = 'modal hidden';
        
        modal.innerHTML = `
            <div class="modal-overlay" id="edit-history-modal-overlay"></div>
            <div class="modal-content edit-history-modal-content">
                <div class="modal-header">
                    <h3 id="edit-history-modal-title">Edit History Entry</h3>
                    <button type="button" class="modal-close" id="close-edit-history-modal">&times;</button>
                </div>
                <div class="modal-body" id="edit-history-modal-body">
                    <div class="form-group">
                        <label for="edit-history-weight">Consumed Weight (g)</label>
                        <input type="number" id="edit-history-weight" class="form-control" min="1" step="1" required>
                        <small class="form-hint">Enter the new consumed weight</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Recalculation Preview</label>
                        <div id="edit-history-preview" class="preview-box">
                            <p>Enter a weight to see preview</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="close-edit-history-modal-btn">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-edit-history-btn">Save Changes</button>
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = modal.querySelector('#close-edit-history-modal');
        const closeBtnFooter = modal.querySelector('#close-edit-history-modal-btn');
        const saveBtn = modal.querySelector('#save-edit-history-btn');
        const overlay = modal.querySelector('#edit-history-modal-overlay');
        const weightInput = modal.querySelector('#edit-history-weight');

        const closeModal = () => {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        };

        closeBtn.addEventListener('click', closeModal);
        closeBtnFooter.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
        
        saveBtn.addEventListener('click', () => {
            const recipeId = modal.dataset.recipeId;
            const historyId = modal.dataset.historyId;
            const newWeight = parseFloat(weightInput.value);
            
            if (weightInput.checkValidity()) {
                this.editHistoryEntry(recipeId, historyId, newWeight);
                closeModal();
            } else {
                weightInput.reportValidity();
            }
        });

        // Add input listener for preview
        weightInput.addEventListener('input', (e) => {
            const recipeId = modal.dataset.recipeId;
            const historyId = modal.dataset.historyId;
            this.updateEditHistoryPreview(modal, recipeId, historyId, parseFloat(e.target.value));
        });

        // Prevent modal from closing when clicking inside content
        modal.querySelector('.modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        return modal;
    }

    /**
     * Renders edit history modal content
     * @param {HTMLElement} modal - Modal element
     * @param {ConsumptionHistory} historyEntry - History entry
     */
    renderEditHistoryModal(modal, historyEntry) {
        const titleEl = modal.querySelector('#edit-history-modal-title');
        const weightInput = modal.querySelector('#edit-history-weight');
        const previewEl = modal.querySelector('#edit-history-preview');

        titleEl.textContent = `Edit History Entry - ${new Date(historyEntry.timestamp).toLocaleString()}`;
        weightInput.value = historyEntry.consumedWeight.toFixed(1);
        
        // Store IDs in dataset
        modal.dataset.recipeId = historyEntry.recipeId;
        modal.dataset.historyId = historyEntry.id;

        // Show initial preview
        this.updateEditHistoryPreview(modal, historyEntry.recipeId, historyEntry.id, historyEntry.consumedWeight);
    }

    /**
     * Updates edit history preview
     * @param {HTMLElement} modal - Modal element
     * @param {string} recipeId - Recipe ID
     * @param {string} historyId - History entry ID
     * @param {number} newWeight - New weight
     */
    updateEditHistoryPreview(modal, recipeId, historyId, newWeight) {
        const previewEl = modal.querySelector('#edit-history-preview');
        
        if (!newWeight || newWeight <= 0) {
            previewEl.innerHTML = '<p>Enter a weight to see preview</p>';
            return;
        }

        try {
            const recipe = this.recipeManager.getRecipeById(recipeId);
            if (!recipe) {
                previewEl.innerHTML = '<p class="error">Recipe not found</p>';
                return;
            }

            const historyEntry = recipe.consumptionHistory.find(h => h.id === historyId);
            if (!historyEntry) {
                previewEl.innerHTML = '<p class="error">History entry not found</p>';
                return;
            }

            // Calculate what would change
            const weightDiff = newWeight - historyEntry.consumedWeight;
            const weightDiffStr = weightDiff > 0 ? `+${weightDiff.toFixed(1)}g` : `${weightDiff.toFixed(1)}g`;
            
            // Calculate new remaining weight after this entry
            const entryIndex = recipe.consumptionHistory.findIndex(h => h.id === historyId);
            let newRemainingAfter = recipe.totalWeight;
            
            for (let i = 0; i < entryIndex; i++) {
                newRemainingAfter -= recipe.consumptionHistory[i].consumedWeight;
            }
            newRemainingAfter -= newWeight;
            newRemainingAfter = Math.max(0, newRemainingAfter);

            // Calculate new remaining weight for recipe
            let finalRemaining = newRemainingAfter;
            for (let i = entryIndex + 1; i < recipe.consumptionHistory.length; i++) {
                finalRemaining -= recipe.consumptionHistory[i].consumedWeight;
            }
            finalRemaining = Math.max(0, finalRemaining);

            previewEl.innerHTML = `
                <div class="preview-item">
                    <span class="preview-label">Weight change:</span>
                    <span class="preview-value ${weightDiff > 0 ? 'positive' : 'negative'}">${weightDiffStr}</span>
                </div>
                <div class="preview-item">
                    <span class="preview-label">Remaining after this entry:</span>
                    <span class="preview-value">${newRemainingAfter.toFixed(1)}g</span>
                </div>
                <div class="preview-item">
                    <span class="preview-label">Final remaining weight:</span>
                    <span class="preview-value">${finalRemaining.toFixed(1)}g</span>
                </div>
            `;
        } catch (error) {
            console.error('Failed to update preview:', error);
            previewEl.innerHTML = '<p class="error">Error calculating preview</p>';
        }
    }

    /**
     * Edits a history entry
     * @param {string} recipeId - Recipe ID
     * @param {string} historyId - History entry ID
     * @param {number} newWeight - New consumed weight
     */
    editHistoryEntry(recipeId, historyId, newWeight) {
        try {
            // Validate weight
            if (typeof newWeight !== 'number' || newWeight <= 0 || !isFinite(newWeight)) {
                throw new Error('Weight must be a positive number');
            }

            // Call RecipeManager to update history
            const recipe = this.recipeManager.editHistoryEntry(recipeId, historyId, newWeight);
            
            // Refresh history display
            this.showConsumptionHistory(recipeId);
            
            // Update recipe card
            this.updateRecipeList();
            
            this.showSuccessMessage('History entry updated successfully');
            
        } catch (error) {
            console.error('Failed to edit history entry:', error);
            this.showErrorMessage(error.message || 'Failed to update history entry');
        }
    }

    /**
     * Deletes a history entry
     * @param {string} recipeId - Recipe ID
     * @param {string} historyId - History entry ID
     */
    deleteHistoryEntry(recipeId, historyId) {
        try {
            // Show confirmation dialog
            const confirmDelete = confirm('Are you sure you want to delete this history entry? This action cannot be undone.');
            
            if (!confirmDelete) {
                return;
            }

            // Call RecipeManager to delete entry
            const recipe = this.recipeManager.deleteHistoryEntry(recipeId, historyId);
            
            // Refresh history display
            this.showConsumptionHistory(recipeId);
            
            // Update recipe card
            this.updateRecipeList();
            
            this.showSuccessMessage('History entry deleted successfully');
            
        } catch (error) {
            console.error('Failed to delete history entry:', error);
            this.showErrorMessage(error.message || 'Failed to delete history entry');
        }
    }

    /**
     * Show edit recipe modal
     * @param {string} recipeId - Recipe ID to edit
     */
    showEditRecipeModal(recipeId) {
        const recipe = this.recipeManager.getRecipeById(recipeId);
        if (!recipe) {
            this.showErrorMessage('Recipe not found');
            return;
        }

        let modal = document.getElementById('edit-recipe-modal');
        if (!modal) {
            modal = this.createEditRecipeModal();
            document.body.appendChild(modal);
        }

        this.renderEditRecipeModal(modal, recipe);
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    /**
     * Create edit recipe modal
     * @returns {HTMLElement} Modal element
     */
    createEditRecipeModal() {
        const modal = document.createElement('div');
        modal.id = 'edit-recipe-modal';
        modal.className = 'modal hidden';
        
        modal.innerHTML = `
            <div class="modal-overlay" id="edit-recipe-modal-overlay"></div>
            <div class="modal-content edit-recipe-modal-content">
                <div class="modal-header">
                    <h3 id="edit-recipe-modal-title">Edit Recipe</h3>
                    <button type="button" class="modal-close" id="close-edit-recipe-modal">&times;</button>
                </div>
                <div class="modal-body" id="edit-recipe-modal-body">
                    <!-- Content will be dynamically inserted -->
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancel-edit-recipe-btn">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-edit-recipe-btn">Save Changes</button>
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = modal.querySelector('#close-edit-recipe-modal');
        const cancelBtn = modal.querySelector('#cancel-edit-recipe-btn');
        const saveBtn = modal.querySelector('#save-edit-recipe-btn');
        const overlay = modal.querySelector('#edit-recipe-modal-overlay');

        const closeModal = () => {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
        saveBtn.addEventListener('click', () => this.handleSaveRecipeEdit(modal));

        // Prevent modal from closing when clicking inside content
        modal.querySelector('.modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        return modal;
    }

    /**
     * Render edit recipe modal content
     * @param {HTMLElement} modal - Modal element
     * @param {Recipe} recipe - Recipe to edit
     */
    renderEditRecipeModal(modal, recipe) {
        const modalBody = modal.querySelector('#edit-recipe-modal-body');
        const recipeName = this.storageManager.escapeHtml(recipe.name);
        
        let ingredientsHtml = '';
        recipe.ingredients.forEach((ingredient, index) => {
            const escapedName = this.storageManager.escapeHtml(ingredient.name);
            ingredientsHtml += `
                <div class="edit-ingredient-row" data-index="${index}">
                    <input type="text" class="edit-ingredient-name" value="${escapedName}" placeholder="Ingredient name" data-index="${index}">
                    <input type="number" class="edit-ingredient-weight" value="${ingredient.weight}" min="1" step="1" placeholder="Weight (g)" data-index="${index}">
                    <button type="button" class="btn btn-danger btn-sm remove-ingredient-btn" data-index="${index}">Remove</button>
                </div>
            `;
        });

        modalBody.innerHTML = `
            <form id="edit-recipe-form" class="recipe-form">
                <div class="form-group">
                    <label for="edit-recipe-name">Recipe Name</label>
                    <input type="text" id="edit-recipe-name" name="editRecipeName" value="${recipeName}" required>
                    <div class="error-message" id="edit-recipe-name-error"></div>
                </div>
                
                <div class="edit-ingredients-section">
                    <h4>Ingredients</h4>
                    <div id="edit-ingredients-list" class="edit-ingredients-list">
                        ${ingredientsHtml}
                    </div>
                    <button type="button" id="add-edit-ingredient" class="btn btn-secondary">Add Ingredient</button>
                </div>
                
                <div class="edit-recipe-summary">
                    <p><strong>Current Total Weight:</strong> <span id="edit-total-weight">${recipe.totalWeight}</span>g</p>
                    <p><strong>New Total Weight:</strong> <span id="edit-new-total-weight">${recipe.totalWeight}</span>g</p>
                    <p class="weight-change ${recipe.totalWeight > 0 ? '' : 'hidden'}">
                        <strong>Weight Change:</strong> <span id="edit-weight-change">0</span>g
                    </p>
                </div>
            </form>
        `;

        // Store recipe ID for save operation
        modal.dataset.recipeId = recipe.id;

        // Add event listeners
        this.setupEditIngredientListeners(modal, recipe);
    }

    /**
     * Setup listeners for edit ingredient functionality
     * @param {HTMLElement} modal - Modal element
     * @param {Recipe} recipe - Original recipe
     */
    setupEditIngredientListeners(modal, recipe) {
        const addBtn = modal.querySelector('#add-edit-ingredient');
        const nameInputs = modal.querySelectorAll('.edit-ingredient-name');
        const weightInputs = modal.querySelectorAll('.edit-ingredient-weight');
        const removeBtns = modal.querySelectorAll('.remove-ingredient-btn');

        addBtn.addEventListener('click', () => this.addEditIngredientRow(modal));

        nameInputs.forEach(input => {
            input.addEventListener('input', () => this.updateEditWeightPreview(modal));
        });

        weightInputs.forEach(input => {
            input.addEventListener('input', () => this.updateEditWeightPreview(modal));
        });

        removeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeEditIngredientRow(modal, index);
            });
        });
    }

    /**
     * Add a new ingredient row in edit modal
     * @param {HTMLElement} modal - Modal element
     */
    addEditIngredientRow(modal) {
        const list = modal.querySelector('#edit-ingredients-list');
        const index = list.children.length;
        
        const row = document.createElement('div');
        row.className = 'edit-ingredient-row';
        row.dataset.index = index;
        row.innerHTML = `
            <input type="text" class="edit-ingredient-name" value="" placeholder="Ingredient name" data-index="${index}">
            <input type="number" class="edit-ingredient-weight" value="" min="1" step="1" placeholder="Weight (g)" data-index="${index}">
            <button type="button" class="btn btn-danger btn-sm remove-ingredient-btn" data-index="${index}">Remove</button>
        `;

        list.appendChild(row);

        // Add event listeners
        const nameInput = row.querySelector('.edit-ingredient-name');
        const weightInput = row.querySelector('.edit-ingredient-weight');
        const removeBtn = row.querySelector('.remove-ingredient-btn');

        nameInput.addEventListener('input', () => this.updateEditWeightPreview(modal));
        weightInput.addEventListener('input', () => this.updateEditWeightPreview(modal));
        removeBtn.addEventListener('click', () => {
            this.removeEditIngredientRow(modal, index);
        });

        this.updateEditWeightPreview(modal);
    }

    /**
     * Remove an ingredient row from edit modal
     * @param {HTMLElement} modal - Modal element
     * @param {number} index - Index of row to remove
     */
    removeEditIngredientRow(modal, index) {
        const list = modal.querySelector('#edit-ingredients-list');
        const rows = list.querySelectorAll('.edit-ingredient-row');
        
        rows.forEach((row, i) => {
            if (parseInt(row.dataset.index) === index) {
                row.remove();
            }
        });

        // Re-index remaining rows
        const remainingRows = list.querySelectorAll('.edit-ingredient-row');
        remainingRows.forEach((row, i) => {
            row.dataset.index = i;
            row.querySelector('.edit-ingredient-name').dataset.index = i;
            row.querySelector('.edit-ingredient-weight').dataset.index = i;
            row.querySelector('.remove-ingredient-btn').dataset.index = i;
        });

        this.updateEditWeightPreview(modal);
    }

    /**
     * Update weight preview in edit modal
     * @param {HTMLElement} modal - Modal element
     */
    updateEditWeightPreview(modal) {
        const weightInputs = modal.querySelectorAll('.edit-ingredient-weight');
        let newTotal = 0;
        
        weightInputs.forEach(input => {
            const weight = parseFloat(input.value) || 0;
            newTotal += weight;
        });

        const originalRecipe = this.recipeManager.getRecipeById(modal.dataset.recipeId);
        const originalTotal = originalRecipe ? originalRecipe.totalWeight : 0;
        const change = newTotal - originalTotal;

        modal.querySelector('#edit-new-total-weight').textContent = newTotal.toFixed(1);
        
        const changeElement = modal.querySelector('#edit-weight-change');
        const changeSpan = modal.querySelector('#edit-weight-change');
        
        if (change > 0) {
            changeSpan.textContent = `+${change.toFixed(1)}`;
            changeElement.className = 'weight-change positive';
        } else if (change < 0) {
            changeSpan.textContent = change.toFixed(1);
            changeElement.className = 'weight-change negative';
        } else {
            changeSpan.textContent = '0';
            changeElement.className = 'weight-change';
        }
    }

    /**
     * Handle save recipe edit
     * @param {HTMLElement} modal - Modal element
     */
    handleSaveRecipeEdit(modal) {
        const recipeId = modal.dataset.recipeId;
        const recipe = this.recipeManager.getRecipeById(recipeId);
        
        if (!recipe) {
            this.showErrorMessage('Recipe not found');
            return;
        }

        // Get updated name
        const nameInput = modal.querySelector('#edit-recipe-name');
        const newName = nameInput.value.trim();
        
        if (!newName) {
            this.showErrorMessage('Recipe name is required');
            return;
        }

        // Get updated ingredients
        const nameInputs = modal.querySelectorAll('.edit-ingredient-name');
        const weightInputs = modal.querySelectorAll('.edit-ingredient-weight');
        const ingredients = [];

        nameInputs.forEach((input, i) => {
            const name = input.value.trim();
            const weight = parseFloat(weightInputs[i].value) || 0;
            
            if (name && weight > 0) {
                ingredients.push({ name, weight });
            }
        });

        if (ingredients.length === 0) {
            this.showErrorMessage('At least one ingredient with valid weight is required');
            return;
        }

        try {
            // Update the recipe
            this.recipeManager.updateRecipeIngredients(recipeId, ingredients);
            
            // Update name if changed
            if (newName !== recipe.name) {
                this.recipeManager.updateRecipe(recipeId, { name: newName });
            }

            this.showSuccessMessage('Recipe updated successfully');
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            this.updateRecipeList();
        } catch (error) {
            this.showErrorMessage('Failed to update recipe: ' + error.message);
        }
    }

    /**
     * Show continuation modal for creating new recipe from remaining ingredients
     * @param {string} recipeId - ID of source recipe
     */
    showContinuationModal(recipeId) {
        const recipe = this.recipeManager.getRecipeById(recipeId);
        if (!recipe) {
            this.showErrorMessage('Recipe not found');
            return;
        }

        // Check for remaining ingredients
        const remainingIngredients = recipe.ingredients.filter(ing => ing.weight > 0);
        if (remainingIngredients.length === 0) {
            this.showErrorMessage('No remaining ingredients to continue');
            return;
        }

        let modal = document.getElementById('continuation-modal');
        if (!modal) {
            modal = this.createContinuationModal();
            document.body.appendChild(modal);
        }

        this.renderContinuationModal(modal, recipe);
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    /**
     * Create continuation modal
     * @returns {HTMLElement} Modal element
     */
    createContinuationModal() {
        const modal = document.createElement('div');
        modal.id = 'continuation-modal';
        modal.className = 'modal hidden';
        
        modal.innerHTML = `
            <div class="modal-overlay" id="continuation-modal-overlay"></div>
            <div class="modal-content continuation-modal-content">
                <div class="modal-header">
                    <h3 id="continuation-modal-title">Create New Recipe from Remaining Ingredients</h3>
                    <button type="button" class="modal-close" id="close-continuation-modal">&times;</button>
                </div>
                <div class="modal-body" id="continuation-modal-body">
                    <!-- Content will be dynamically inserted -->
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancel-continuation-btn">Cancel</button>
                    <button type="button" class="btn btn-primary" id="create-continuation-btn" disabled>Create Recipe</button>
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = modal.querySelector('#close-continuation-modal');
        const cancelBtn = modal.querySelector('#cancel-continuation-btn');
        const createBtn = modal.querySelector('#create-continuation-btn');
        const overlay = modal.querySelector('#continuation-modal-overlay');

        const closeModal = () => {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
        createBtn.addEventListener('click', () => this.handleContinuationSubmit(modal));

        // Prevent modal from closing when clicking inside content
        modal.querySelector('.modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        return modal;
    }

    /**
     * Render continuation modal content
     * @param {HTMLElement} modal - Modal element
     * @param {Recipe} recipe - Source recipe
     */
    renderContinuationModal(modal, recipe) {
        const modalBody = modal.querySelector('#continuation-modal-body');
        const recipeName = this.storageManager.escapeHtml(recipe.name);
        const defaultName = `${recipeName} - new`;
        
        // Get remaining ingredients
        const remainingIngredients = recipe.ingredients.filter(ing => ing.weight > 0);
        
        let ingredientsHtml = '';
        remainingIngredients.forEach((ingredient, index) => {
            const escapedName = this.storageManager.escapeHtml(ingredient.name);
            const barcode = ingredient.barcode ? this.storageManager.escapeHtml(ingredient.barcode) : '';
            ingredientsHtml += `
                <div class="continuation-ingredient-row" data-index="${index}">
                    <input type="text" class="continuation-ingredient-name" value="${escapedName}" placeholder="Ingredient name" data-index="${index}">
                    <input type="text" class="continuation-ingredient-barcode" value="${barcode}" placeholder="Barcode (optional)" data-index="${index}">
                    <input type="number" class="continuation-ingredient-weight" value="${ingredient.weight}" min="1" step="1" placeholder="Weight (g)" data-index="${index}">
                    <button type="button" class="btn btn-danger btn-sm remove-ingredient-btn" data-index="${index}">Remove</button>
                </div>
            `;
        });

        modalBody.innerHTML = `
            <form id="continuation-form" class="recipe-form">
                <div class="form-group">
                    <label for="continuation-name">Recipe Name</label>
                    <input type="text" id="continuation-name" name="continuationName" value="${defaultName}" maxlength="200" required>
                    <div class="error-message" id="continuation-name-error"></div>
                </div>
                
                <div class="continuation-ingredients-section">
                    <h4>Remaining Ingredients</h4>
                    <div id="continuation-ingredients-list" class="continuation-ingredients-list">
                        ${ingredientsHtml}
                    </div>
                    <button type="button" id="add-continuation-ingredient" class="btn btn-secondary">Add Ingredient</button>
                </div>
            </form>
        `;

        // Store recipe ID for submit operation
        modal.dataset.recipeId = recipe.id;

        // Add event listeners
        this.setupContinuationModalListeners(modal);
    }

    /**
     * Setup listeners for continuation modal
     * @param {HTMLElement} modal - Modal element
     */
    setupContinuationModalListeners(modal) {
        const addBtn = modal.querySelector('#add-continuation-ingredient');
        const nameInput = modal.querySelector('#continuation-name');
        const createBtn = modal.querySelector('#create-continuation-btn');
        const nameInputs = modal.querySelectorAll('.continuation-ingredient-name');
        const weightInputs = modal.querySelectorAll('.continuation-ingredient-weight');
        const removeBtns = modal.querySelectorAll('.remove-ingredient-btn');

        addBtn.addEventListener('click', () => this.addContinuationIngredientRow(modal));

        nameInput.addEventListener('input', () => {
            this.validateContinuationForm(modal);
        });

        nameInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.validateContinuationForm(modal);
            });
        });

        weightInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.validateContinuationForm(modal);
            });
        });

        removeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeContinuationIngredientRow(modal, index);
            });
        });

        // Initial validation
        this.validateContinuationForm(modal);
    }

    /**
     * Add a new ingredient row in continuation modal
     * @param {HTMLElement} modal - Modal element
     */
    addContinuationIngredientRow(modal) {
        const list = modal.querySelector('#continuation-ingredients-list');
        const index = list.children.length;
        
        const row = document.createElement('div');
        row.className = 'continuation-ingredient-row';
        row.dataset.index = index;
        row.innerHTML = `
            <input type="text" class="continuation-ingredient-name" value="" placeholder="Ingredient name" data-index="${index}">
            <input type="text" class="continuation-ingredient-barcode" value="" placeholder="Barcode (optional)" data-index="${index}">
            <input type="number" class="continuation-ingredient-weight" value="" min="1" step="1" placeholder="Weight (g)" data-index="${index}">
            <button type="button" class="btn btn-danger btn-sm remove-ingredient-btn" data-index="${index}">Remove</button>
        `;

        list.appendChild(row);

        // Add event listeners
        const nameInput = row.querySelector('.continuation-ingredient-name');
        const weightInput = row.querySelector('.continuation-ingredient-weight');
        const removeBtn = row.querySelector('.remove-ingredient-btn');

        nameInput.addEventListener('input', () => this.validateContinuationForm(modal));
        weightInput.addEventListener('input', () => this.validateContinuationForm(modal));
        removeBtn.addEventListener('click', () => {
            this.removeContinuationIngredientRow(modal, index);
        });

        this.validateContinuationForm(modal);
    }

    /**
     * Remove an ingredient row from continuation modal
     * @param {HTMLElement} modal - Modal element
     * @param {number} index - Index of row to remove
     */
    removeContinuationIngredientRow(modal, index) {
        const list = modal.querySelector('#continuation-ingredients-list');
        const rows = list.querySelectorAll('.continuation-ingredient-row');
        
        rows.forEach((row, i) => {
            if (parseInt(row.dataset.index) === index) {
                row.remove();
            }
        });

        // Re-index remaining rows
        const remainingRows = list.querySelectorAll('.continuation-ingredient-row');
        remainingRows.forEach((row, i) => {
            row.dataset.index = i;
            row.querySelector('.continuation-ingredient-name').dataset.index = i;
            row.querySelector('.continuation-ingredient-barcode').dataset.index = i;
            row.querySelector('.continuation-ingredient-weight').dataset.index = i;
            row.querySelector('.remove-ingredient-btn').dataset.index = i;
        });

        this.validateContinuationForm(modal);
    }

    /**
     * Validate continuation form
     * @param {HTMLElement} modal - Modal element
     * @returns {boolean} Whether form is valid
     */
    validateContinuationForm(modal) {
        const nameInput = modal.querySelector('#continuation-name');
        const nameError = modal.querySelector('#continuation-name-error');
        const createBtn = modal.querySelector('#create-continuation-btn');
        const nameInputs = modal.querySelectorAll('.continuation-ingredient-name');
        const weightInputs = modal.querySelectorAll('.continuation-ingredient-weight');
        
        // Validate name
        const name = nameInput.value.trim();
        if (!name) {
            nameError.textContent = 'Name is required';
            nameInput.classList.add('invalid');
        } else {
            nameError.textContent = '';
            nameInput.classList.remove('invalid');
        }
        
        // Validate at least one ingredient with name and valid weight
        let validIngredients = 0;
        nameInputs.forEach((input, i) => {
            const name = input.value.trim();
            const weight = parseFloat(weightInputs[i].value) || 0;
            if (name && weight > 0) {
                validIngredients++;
            }
        });
        
        const isValid = name && validIngredients > 0;
        createBtn.disabled = !isValid;
        
        return isValid;
    }

    /**
     * Handle continuation form submission
     * @param {HTMLElement} modal - Modal element
     */
    handleContinuationSubmit(modal) {
        const recipeId = modal.dataset.recipeId;
        const recipe = this.recipeManager.getRecipeById(recipeId);
        
        if (!recipe) {
            this.showErrorMessage('Recipe not found');
            return;
        }

        // Get form data
        const nameInput = modal.querySelector('#continuation-name');
        const newName = nameInput.value.trim();
        
        if (!newName) {
            this.showErrorMessage('Recipe name is required');
            return;
        }

        // Get ingredients
        const nameInputs = modal.querySelectorAll('.continuation-ingredient-name');
        const barcodeInputs = modal.querySelectorAll('.continuation-ingredient-barcode');
        const weightInputs = modal.querySelectorAll('.continuation-ingredient-weight');
        const ingredients = [];

        nameInputs.forEach((input, i) => {
            const name = input.value.trim();
            const weight = parseFloat(weightInputs[i].value) || 0;
            const barcode = barcodeInputs[i].value.trim();
            
            if (name && weight > 0) {
                ingredients.push({ name, weight, barcode: barcode || null });
            }
        });

        if (ingredients.length === 0) {
            this.showErrorMessage('At least one ingredient with valid weight is required');
            return;
        }

        try {
            // Create new recipe
            const newRecipe = this.recipeManager.createRecipe(newName, ingredients);
            
            // Reset original recipe weights
            this.recipeManager.resetRecipeAfterContinuation(recipeId, ingredients.map(i => i.name));
            
            this.showSuccessMessage('Recipe created successfully');
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            
            // Navigate to new recipe
            this.showView('recipe-create-view');
            this.updateViewContent('recipe-create-view');
            this.updateRecipeList();
            
        } catch (error) {
            this.showErrorMessage('Failed to create recipe: ' + error.message);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
} else if (typeof window !== 'undefined') {
    // Browser environment - expose class globally
    window.UIController = UIController;
}