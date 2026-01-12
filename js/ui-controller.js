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
        
        // Initialize barcode scanner
        this.barcodeScanner = new BarcodeScanner();
        this.currentScanningInput = null;
        
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
                <button class="btn btn-danger btn-small delete-btn" data-recipe-id="${recipe.id}">
                    Delete
                </button>
            </div>
        `;
        
        // Add event listeners
        const calculateBtn = card.querySelector('.calculate-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        
        if (!isFullyConsumed) {
            calculateBtn.addEventListener('click', () => {
                this.selectRecipeForCalculation(recipe.id);
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
            <div class="ingredient-name-container">
                <input type="text" 
                       class="ingredient-name" 
                       placeholder="Ingredient name" 
                       data-index="${ingredientIndex}"
                       required>
                <div class="autocomplete-suggestions" id="suggestions-${ingredientIndex}"></div>
            </div>
            <input type="number" 
                   class="ingredient-weight" 
                   placeholder="Weight (g)" 
                   min="0.1" 
                   step="0.1" 
                   data-index="${ingredientIndex}"
                   required>
            <input type="text" 
                   class="ingredient-barcode" 
                   placeholder="Barcode (optional)" 
                   data-index="${ingredientIndex}">
            <button type="button" class="scan-barcode" data-index="${ingredientIndex}" title="Scan Barcode">
                📷
            </button>
            <button type="button" class="remove-ingredient" data-index="${ingredientIndex}">
                Remove
            </button>
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
        if (this.barcodeScanner.isSupported) {
            scanBtn.addEventListener('click', () => {
                this.startBarcodeScanning(ingredientIndex);
            });
        } else {
            // Hide scan button if not supported
            scanBtn.style.display = 'none';
        }
        
        // Set up validation
        const weightInput = ingredientDiv.querySelector('.ingredient-weight');
        const barcodeInput = ingredientDiv.querySelector('.ingredient-barcode');
        
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
                            <span class="barcode">Barcode: ${this.storageManager.escapeHtml(ingredient.barcode)}</span>
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
        if (!this.barcodeScanner.isSupported) {
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
        this.barcodeScanner.stopScanning();
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
     * Check barcode scanner support and show appropriate UI
     */
    updateBarcodeScannerUI() {
        const scanButtons = document.querySelectorAll('.scan-barcode');
        
        if (this.barcodeScanner.isSupported) {
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
} else if (typeof window !== 'undefined') {
    // Browser environment - expose class globally
    window.UIController = UIController;
}