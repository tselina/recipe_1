// Main Application Entry Point
class RecipeTrackerApp {
    constructor() {
        // Check if all required classes are available
        if (typeof StorageManager === 'undefined') {
            throw new Error('StorageManager class not available');
        }
        if (typeof RecipeManager === 'undefined') {
            throw new Error('RecipeManager class not available');
        }
        if (typeof PortionCalculator === 'undefined') {
            throw new Error('PortionCalculator class not available');
        }
        if (typeof ProductDatabase === 'undefined') {
            throw new Error('ProductDatabase class not available');
        }
        if (typeof UIController === 'undefined') {
            throw new Error('UIController class not available');
        }
        
        console.log('All classes available, initializing app...');
        
        this.isOnline = navigator.onLine;
        
        // Initialize managers
        this.storageManager = new StorageManager();
        this.recipeManager = new RecipeManager(this.storageManager);
        this.portionCalculator = new PortionCalculator();
        this.productDatabase = new ProductDatabase(this.storageManager);
        
        // Initialize UI controller
        this.uiController = new UIController(
            this.recipeManager,
            this.portionCalculator,
            this.productDatabase,
            this.storageManager
        );
        
        console.log('App components initialized successfully');
        
        this.init();
    }

    /**
     * Initialize application and load data from Local Storage on startup
     * Requirements: 4.3, 4.4
     */
    async init() {
        try {
            // Register service worker for PWA functionality
            await this.registerServiceWorker();
            
            // Load existing data from Local Storage
            await this.loadExistingData();
            
            // Initialize all components and event listeners
            this.initializeComponents();
            
            // Handle first-time user experience
            this.handleFirstTimeUser();
            
            // Handle initial navigation (PWA shortcuts, URL parameters)
            this.handleInitialNavigation();
            
            // Show app is ready
            this.uiController.showSuccessMessage('App loaded successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.uiController.showErrorMessage('Failed to initialize application');
        }
    }

    /**
     * Load existing data from Local Storage on startup
     * Requirements: 4.3, 4.4
     */
    async loadExistingData() {
        try {
            // Clear any potentially corrupted data first
            this.clearCorruptedData();
            
            // Data is automatically loaded by the managers when they are instantiated
            // RecipeManager loads recipes in its constructor
            // ProductDatabase loads products in its constructor
            
            // Get storage statistics for logging
            const recipeStats = this.recipeManager.getStorageStats();
            const productStats = this.productDatabase.getStats();
            const storageInfo = this.storageManager.getStorageInfo();
            
            console.log('Data loaded successfully:', {
                recipes: recipeStats,
                products: productStats,
                storage: storageInfo
            });
            
            // Validate data integrity
            await this.validateDataIntegrity();
            
        } catch (error) {
            console.error('Failed to load existing data:', error);
            
            // If data loading fails, try to recover
            await this.handleDataLoadingError(error);
        }
    }

    /**
     * Clear any corrupted data that might cause loading issues
     */
    clearCorruptedData() {
        try {
            // Check if there's corrupted recipe data
            const rawRecipeData = this.storageManager.load('recipes');
            if (rawRecipeData && Array.isArray(rawRecipeData)) {
                // Check each recipe for basic validity
                const validRecipes = rawRecipeData.filter(recipeData => {
                    try {
                        // Basic validation - must have name and ingredients array
                        return recipeData && 
                               typeof recipeData.name === 'string' && 
                               recipeData.name.trim().length > 0 &&
                               Array.isArray(recipeData.ingredients) && 
                               recipeData.ingredients.length > 0;
                    } catch (error) {
                        return false;
                    }
                });
                
                // If we filtered out corrupted recipes, save the clean data
                if (validRecipes.length !== rawRecipeData.length) {
                    console.log(`Cleaned up ${rawRecipeData.length - validRecipes.length} corrupted recipes`);
                    this.storageManager.save('recipes', validRecipes);
                }
            }
        } catch (error) {
            console.warn('Failed to clean corrupted data, clearing all:', error.message);
            // If cleanup fails, clear all data to start fresh
            this.storageManager.clearAll();
        }
    }

    /**
     * Validate data integrity after loading
     */
    async validateDataIntegrity() {
        try {
            // Validate recipes
            const recipes = this.recipeManager.getAllRecipes();
            let corruptedRecipes = 0;
            
            recipes.forEach(recipe => {
                try {
                    // Validate recipe structure
                    if (!recipe.id || !recipe.name || !Array.isArray(recipe.ingredients)) {
                        throw new Error('Invalid recipe structure');
                    }
                    
                    // Validate remaining weight consistency
                    if (recipe.remainingWeight > recipe.totalWeight || recipe.remainingWeight < 0) {
                        console.warn(`Recipe "${recipe.name}" has inconsistent remaining weight, fixing...`);
                        recipe.remainingWeight = Math.min(recipe.remainingWeight, recipe.totalWeight);
                        recipe.remainingWeight = Math.max(recipe.remainingWeight, 0);
                    }
                } catch (error) {
                    console.error(`Corrupted recipe found: ${recipe.name}`, error);
                    corruptedRecipes++;
                }
            });
            
            if (corruptedRecipes > 0) {
                this.uiController.showErrorMessage(`Found ${corruptedRecipes} corrupted recipes. Some data may be lost.`);
            }
            
        } catch (error) {
            console.error('Data integrity validation failed:', error);
            throw error;
        }
    }

    /**
     * Handle data loading errors with recovery options
     */
    async handleDataLoadingError(error) {
        console.error('Attempting data recovery...', error);
        
        try {
            // Try to clear corrupted data and start fresh
            if (error.message.includes('corrupted') || error.message.includes('parse')) {
                const userConfirmed = confirm(
                    'Your data appears to be corrupted. Would you like to reset the application? ' +
                    'This will delete all existing recipes and start fresh.'
                );
                
                if (userConfirmed) {
                    this.storageManager.clearAll();
                    this.uiController.showSuccessMessage('Application reset successfully. You can now create new recipes.');
                } else {
                    this.uiController.showErrorMessage('Application may not function correctly with corrupted data.');
                }
            }
        } catch (recoveryError) {
            console.error('Data recovery failed:', recoveryError);
            this.uiController.showErrorMessage('Failed to recover from data loading error.');
        }
    }

    /**
     * Initialize all components and event listeners
     * Requirements: 4.3, 4.4
     */
    initializeComponents() {
        try {
            // UI Controller is already initialized in constructor
            // It handles its own event listeners and UI setup
            
            // Set up app-level event listeners
            this.setupAppEventListeners();
            
            // Initialize PWA-specific features
            this.initializePWAFeatures();
            
        } catch (error) {
            console.error('Failed to initialize components:', error);
            throw error;
        }
    }

    /**
     * Set up application-level event listeners
     */
    setupAppEventListeners() {
        // Handle app installation prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            
            // Stash the event so it can be triggered later
            this.deferredPrompt = e;
            
            // Show install notification
            console.log('PWA install prompt available');
            this.uiController.showSuccessMessage('App can be installed! Look for the install option in your browser.');
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.uiController.showSuccessMessage('App installed successfully!');
            this.deferredPrompt = null;
        });

        // Handle visibility changes (app focus/blur)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // App became visible, refresh data if needed
                this.handleAppFocus();
            }
        });

        // Handle online/offline status at app level
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.uiController.showSuccessMessage('Connection restored - back online');
            console.log('App back online');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.uiController.showErrorMessage('You are now offline. The app will continue to work with cached data.');
            console.log('App went offline');
        });

        // Handle unload to save any pending data
        window.addEventListener('beforeunload', () => {
            // Ensure all data is saved before unload
            this.handleAppUnload();
        });
    }

    /**
     * Initialize PWA-specific features
     */
    initializePWAFeatures() {
        // Check if app is running as PWA
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            console.log('App is running as PWA');
            document.body.classList.add('pwa-mode');
        }

        // Handle PWA shortcuts and deep links
        this.handlePWAShortcuts();
    }

    /**
     * Handle PWA shortcuts and deep links
     */
    handlePWAShortcuts() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        // Handle PWA shortcut actions
        switch (action) {
            case 'create':
                this.uiController.showView('recipe-create-view');
                break;
            case 'calculate':
                this.uiController.showView('portion-calculator-view');
                break;
            case 'recipes':
            default:
                this.uiController.showView('recipe-list-view');
                break;
        }
    }

    /**
     * Handle first-time user experience
     * Requirements: 4.3, 4.4
     */
    handleFirstTimeUser() {
        try {
            const recipes = this.recipeManager.getAllRecipes();
            const products = this.productDatabase.getAllProducts();
            
            // Check if this is a first-time user
            const isFirstTime = recipes.length === 0 && products.length === 0;
            
            if (isFirstTime) {
                // Show welcome message for first-time users
                setTimeout(() => {
                    this.showWelcomeMessage();
                }, 1000);
                
                // Set up first-time user hints
                this.setupFirstTimeHints();
            } else {
                // Returning user - show summary
                this.showReturningSummary(recipes.length);
            }
            
        } catch (error) {
            console.error('Failed to handle first-time user experience:', error);
        }
    }

    /**
     * Show welcome message for first-time users
     */
    showWelcomeMessage() {
        this.uiController.showSuccessMessage('Welcome! Create your first recipe to get started.');
        
        // Highlight the create recipe button
        const createBtn = document.getElementById('nav-create');
        if (createBtn) {
            createBtn.classList.add('highlight');
            setTimeout(() => {
                createBtn.classList.remove('highlight');
            }, 3000);
        }
    }

    /**
     * Set up hints for first-time users
     */
    setupFirstTimeHints() {
        // Add helpful tooltips or hints for first-time users
        // This could be expanded with a proper onboarding flow
        console.log('Setting up first-time user hints');
    }

    /**
     * Show summary for returning users
     */
    showReturningSummary(recipeCount) {
        if (recipeCount > 0) {
            const activeRecipes = this.recipeManager.getActiveRecipes().length;
            const completedRecipes = this.recipeManager.getCompletedRecipes().length;
            
            console.log(`Welcome back! You have ${activeRecipes} active recipes and ${completedRecipes} completed recipes.`);
        }
    }

    /**
     * Handle initial navigation based on URL parameters or app state
     */
    handleInitialNavigation() {
        // This is handled in handlePWAShortcuts, but could be expanded
        // for more complex routing needs
    }

    /**
     * Handle app focus (when user returns to app)
     */
    handleAppFocus() {
        try {
            // Refresh UI data in case it was modified elsewhere
            this.uiController.updateRecipeList();
            this.uiController.updateRecipeSelector();
            
            // Check for any data inconsistencies
            this.validateDataIntegrity();
            
        } catch (error) {
            console.error('Failed to handle app focus:', error);
        }
    }

    /**
     * Handle app unload (save any pending data)
     */
    handleAppUnload() {
        try {
            // Ensure all data is persisted
            // The managers handle their own persistence, but we can add
            // any final cleanup here if needed
            console.log('App unloading, ensuring data is saved...');
            
        } catch (error) {
            console.error('Failed to handle app unload:', error);
        }
    }

    /**
     * Register service worker for PWA functionality
     */
    async registerServiceWorker() {
        // Check if we're running from file:// protocol
        if (location.protocol === 'file:') {
            console.log('Service Worker not available when running from file:// protocol');
            return;
        }
        
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered successfully:', registration);
                
                // Listen for service worker messages
                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.handleServiceWorkerMessage(event.data);
                });
                
                // Listen for service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.uiController.showSuccessMessage('App updated! Refresh to use the latest version.');
                        }
                    });
                });
                
                // Check if app is ready for offline use
                this.checkOfflineReadiness();
                
            } catch (error) {
                console.error('Service Worker registration failed:', error);
                this.uiController.showErrorMessage('Failed to enable offline functionality');
            }
        } else {
            console.warn('Service Workers not supported');
            this.uiController.showErrorMessage('Offline functionality not available in this browser');
        }
    }

    /**
     * Handle messages from service worker
     * @param {Object} data - Message data from service worker
     */
    handleServiceWorkerMessage(data) {
        console.log('Received message from service worker:', data);
        
        switch (data.type) {
            case 'SW_INSTALLED':
                this.uiController.showSuccessMessage(data.message);
                break;
                
            case 'SW_INSTALL_ERROR':
                this.uiController.showErrorMessage(data.message);
                break;
                
            case 'SW_ACTIVATED':
                console.log('Service worker activated:', data.message);
                break;
                
            case 'NETWORK_ERROR':
                if (!this.isOnline) {
                    // Only show network error if we haven't already indicated offline status
                    console.log('Network error while offline:', data.message);
                } else {
                    this.isOnline = false;
                    this.uiController.showErrorMessage('Connection lost - now working offline');
                }
                break;
                
            default:
                console.log('Unknown service worker message:', data);
        }
    }

    /**
     * Check if app is ready for offline use
     */
    async checkOfflineReadiness() {
        if (!navigator.serviceWorker.controller) {
            return;
        }
        
        try {
            const messageChannel = new MessageChannel();
            
            const response = await new Promise((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                    resolve(event.data);
                };
                
                navigator.serviceWorker.controller.postMessage(
                    { type: 'CHECK_OFFLINE_READY' },
                    [messageChannel.port2]
                );
            });
            
            if (response.ready) {
                console.log(`App is ready for offline use (${response.cachedFiles}/${response.totalFiles} files cached)`);
            } else {
                console.warn('App not fully ready for offline use:', response);
            }
            
        } catch (error) {
            console.error('Failed to check offline readiness:', error);
        }
    }

    /**
     * Force update service worker cache
     */
    async updateServiceWorkerCache() {
        if (!navigator.serviceWorker.controller) {
            throw new Error('Service worker not available');
        }
        
        try {
            const messageChannel = new MessageChannel();
            
            const response = await new Promise((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                    resolve(event.data);
                };
                
                navigator.serviceWorker.controller.postMessage(
                    { type: 'FORCE_UPDATE_CACHE' },
                    [messageChannel.port2]
                );
            });
            
            if (response.type === 'CACHE_UPDATED') {
                this.uiController.showSuccessMessage(response.message);
            } else {
                throw new Error(response.message);
            }
            
        } catch (error) {
            console.error('Failed to update service worker cache:', error);
            this.uiController.showErrorMessage('Failed to update offline cache');
            throw error;
        }
    }

    /**
     * Get application statistics
     */
    getAppStats() {
        return {
            recipes: this.recipeManager.getStorageStats(),
            products: this.productDatabase.getStats(),
            storage: this.storageManager.getStorageInfo(),
            isOnline: this.isOnline,
            isPWA: window.matchMedia('(display-mode: standalone)').matches,
            serviceWorkerReady: !!navigator.serviceWorker.controller
        };
    }

    /**
     * Export application data for backup
     */
    exportData() {
        try {
            const data = {
                recipes: this.recipeManager.getAllRecipes().map(r => r.toObject()),
                products: this.productDatabase.getAllProducts().map(p => p.toObject()),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    /**
     * Import application data from backup
     */
    async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Validate import data structure
            if (!data.recipes || !Array.isArray(data.recipes)) {
                throw new Error('Invalid import data: missing recipes array');
            }
            
            // Clear existing data
            this.storageManager.clearAll();
            
            // Import recipes
            if (data.recipes.length > 0) {
                data.recipes.forEach(recipeData => {
                    try {
                        // Use the data models from the global scope (loaded via script tags)
                        const recipe = window.Recipe ? window.Recipe.fromObject(recipeData) : 
                                      (typeof Recipe !== 'undefined' ? Recipe.fromObject(recipeData) : null);
                        
                        if (!recipe) {
                            throw new Error('Recipe class not available');
                        }
                        
                        // Save directly to storage to bypass duplicate checks
                        const recipes = this.recipeManager._loadRecipes();
                        recipes.push(recipe);
                        this.recipeManager._saveRecipes(recipes);
                    } catch (error) {
                        console.warn('Failed to import recipe:', recipeData.name, error);
                    }
                });
            }
            
            // Import products
            if (data.products && Array.isArray(data.products)) {
                data.products.forEach(productData => {
                    try {
                        this.productDatabase.addProduct(productData.name, productData.barcode);
                    } catch (error) {
                        console.warn('Failed to import product:', productData.name, error);
                    }
                });
            }
            
            // Refresh UI
            this.uiController.updateRecipeList();
            this.uiController.updateRecipeSelector();
            
            this.uiController.showSuccessMessage(`Successfully imported ${data.recipes.length} recipes`);
            
        } catch (error) {
            console.error('Failed to import data:', error);
            this.uiController.showErrorMessage('Failed to import data: ' + error.message);
            throw error;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking for required classes...');
    
    // Add a small delay to ensure all scripts have finished executing
    setTimeout(() => {
        // List all required classes
        const requiredClasses = [
            'StorageManager',
            'Recipe', 
            'Product', 
            'ConsumptionResult',
            'Ingredient',
            'RecipeManager',
            'PortionCalculator',
            'ProductDatabase',
            'UIController',
            'BarcodeScanner',
            'BarcodeGenerator'
        ];
        
        // Check which classes are available
        const classAvailability = {};
        requiredClasses.forEach(className => {
            classAvailability[className] = typeof window[className] !== 'undefined';
        });
        
        console.log('Class availability:', classAvailability);
        
        // Check which classes are missing
        const missingClasses = requiredClasses.filter(className => typeof window[className] === 'undefined');
        
        if (missingClasses.length > 0) {
            console.error('Missing required classes:', missingClasses);
            alert('Application failed to load. Missing classes: ' + missingClasses.join(', '));
            return;
        }
        
        console.log('All required classes available, initializing app...');
        
        try {
            window.recipeTrackerApp = new RecipeTrackerApp();
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            alert('Application failed to initialize: ' + error.message);
        }
    }, 100); // Small delay to ensure all scripts have loaded
});