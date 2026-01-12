/**
 * ProductDatabase - Manages product storage and suggestions with usage tracking
 * Requirements: 1.3, 1.5
 */

class ProductDatabase {
    constructor(storageManager) {
        if (!storageManager) {
            throw new Error('StorageManager is required');
        }
        
        this.storageManager = storageManager;
        this.storageKey = 'products';
        this.products = new Map();
        
        // Load existing products from storage
        this._loadProducts();
    }

    /**
     * Loads products from storage into memory
     * @private
     */
    _loadProducts() {
        try {
            const storedProducts = this.storageManager.load(this.storageKey);
            
            if (storedProducts && Array.isArray(storedProducts)) {
                storedProducts.forEach(productData => {
                    try {
                        const ProductClass = window.Product || (typeof Product !== 'undefined' ? Product : null);
                        if (!ProductClass) {
                            throw new Error('Product class not available');
                        }
                        const product = ProductClass.fromObject(productData);
                        this.products.set(product.id, product);
                    } catch (error) {
                        console.warn('Failed to load product:', error.message);
                    }
                });
            }
        } catch (error) {
            console.warn('Failed to load products from storage:', error.message);
            // Initialize with empty products map
            this.products = new Map();
        }
    }

    /**
     * Saves products to storage
     * @private
     */
    _saveProducts() {
        try {
            const productsArray = Array.from(this.products.values()).map(product => product.toObject());
            this.storageManager.save(this.storageKey, productsArray);
        } catch (error) {
            throw new Error(`Failed to save products: ${error.message}`);
        }
    }

    /**
     * Adds a product to the database with barcode support
     * @param {string} name - Product name
     * @param {string|null} barcode - Optional barcode
     * @returns {Product} The created product
     * @throws {Error} If product data is invalid
     */
    addProduct(name, barcode = null) {
        try {
            // Check if product with same name already exists
            const existingProduct = this._findProductByName(name);
            if (existingProduct) {
                // Update usage and return existing product
                existingProduct.recordUsage();
                this._saveProducts();
                return existingProduct;
            }

            // Check if product with same barcode already exists (if barcode provided)
            if (barcode) {
                const existingBarcodeProduct = this._findProductByBarcode(barcode);
                if (existingBarcodeProduct) {
                    // Update usage and return existing product
                    existingBarcodeProduct.recordUsage();
                    this._saveProducts();
                    return existingBarcodeProduct;
                }
            }

            // Create new product
            const ProductClass = window.Product || (typeof Product !== 'undefined' ? Product : null);
            if (!ProductClass) {
                throw new Error('Product class not available');
            }
            const product = new ProductClass(name, barcode);
            product.recordUsage(); // Record initial usage
            
            // Add to products map
            this.products.set(product.id, product);
            
            // Save to storage
            this._saveProducts();
            
            return product;
            
        } catch (error) {
            throw new Error(`Failed to add product: ${error.message}`);
        }
    }

    /**
     * Searches for products matching the query for autocomplete functionality
     * @param {string} query - Search query
     * @param {number} limit - Maximum number of results (default: 10)
     * @returns {Product[]} Array of matching products sorted by relevance
     */
    searchProducts(query, limit = 10) {
        if (!query || typeof query !== 'string') {
            return [];
        }

        const searchQuery = query.toLowerCase().trim();
        if (searchQuery.length === 0) {
            return [];
        }

        // Find matching products
        const matches = [];
        
        for (const product of this.products.values()) {
            if (product.matchesQuery(searchQuery)) {
                // Calculate relevance score for sorting
                const relevanceScore = this._calculateRelevanceScore(product, searchQuery);
                matches.push({ product, relevanceScore });
            }
        }

        // Sort by relevance (higher score first) and usage count
        matches.sort((a, b) => {
            // First sort by relevance score
            if (a.relevanceScore !== b.relevanceScore) {
                return b.relevanceScore - a.relevanceScore;
            }
            
            // Then by usage count (more used products first)
            if (a.product.usageCount !== b.product.usageCount) {
                return b.product.usageCount - a.product.usageCount;
            }
            
            // Finally by last used date (more recent first)
            return new Date(b.product.lastUsed) - new Date(a.product.lastUsed);
        });

        // Return limited results
        return matches.slice(0, limit).map(match => match.product);
    }

    /**
     * Calculates relevance score for search results
     * @param {Product} product - Product to score
     * @param {string} searchQuery - Search query
     * @returns {number} Relevance score (higher is better)
     * @private
     */
    _calculateRelevanceScore(product, searchQuery) {
        const productName = product.name.toLowerCase();
        let score = 0;

        // Exact match gets highest score
        if (productName === searchQuery) {
            score += 100;
        }
        // Starts with query gets high score
        else if (productName.startsWith(searchQuery)) {
            score += 50;
        }
        // Contains query gets medium score
        else if (productName.includes(searchQuery)) {
            score += 25;
        }

        // Barcode exact match gets high score
        if (product.barcode && product.barcode === searchQuery) {
            score += 75;
        }
        // Barcode contains query gets medium score
        else if (product.barcode && product.barcode.includes(searchQuery)) {
            score += 30;
        }

        // Boost score based on usage frequency
        score += Math.min(product.usageCount * 2, 20);

        return score;
    }

    /**
     * Retrieves a product by its barcode
     * @param {string} barcode - Product barcode
     * @returns {Product|null} Product with matching barcode or null if not found
     */
    getProductByBarcode(barcode) {
        if (!barcode || typeof barcode !== 'string') {
            return null;
        }

        const trimmedBarcode = barcode.trim();
        if (trimmedBarcode.length === 0) {
            return null;
        }

        return this._findProductByBarcode(trimmedBarcode);
    }

    /**
     * Finds a product by name (case-insensitive)
     * @param {string} name - Product name
     * @returns {Product|null} Product with matching name or null if not found
     * @private
     */
    _findProductByName(name) {
        if (!name || typeof name !== 'string') {
            return null;
        }

        const searchName = name.toLowerCase().trim();
        
        for (const product of this.products.values()) {
            if (product.name.toLowerCase() === searchName) {
                return product;
            }
        }
        
        return null;
    }

    /**
     * Finds a product by barcode
     * @param {string} barcode - Product barcode
     * @returns {Product|null} Product with matching barcode or null if not found
     * @private
     */
    _findProductByBarcode(barcode) {
        if (!barcode || typeof barcode !== 'string') {
            return null;
        }

        const searchBarcode = barcode.trim();
        
        for (const product of this.products.values()) {
            if (product.barcode === searchBarcode) {
                return product;
            }
        }
        
        return null;
    }

    /**
     * Gets all products sorted by usage statistics
     * @param {number} limit - Maximum number of products to return
     * @returns {Product[]} Array of products sorted by usage
     */
    getAllProducts(limit = null) {
        const products = Array.from(this.products.values());
        
        // Sort by usage count (descending) and last used date (descending)
        products.sort((a, b) => {
            if (a.usageCount !== b.usageCount) {
                return b.usageCount - a.usageCount;
            }
            return new Date(b.lastUsed) - new Date(a.lastUsed);
        });

        return limit ? products.slice(0, limit) : products;
    }

    /**
     * Gets the most frequently used products
     * @param {number} limit - Maximum number of products to return (default: 5)
     * @returns {Product[]} Array of most used products
     */
    getMostUsedProducts(limit = 5) {
        return this.getAllProducts(limit);
    }

    /**
     * Removes a product from the database
     * @param {string} productId - Product ID to remove
     * @returns {boolean} True if product was removed, false if not found
     */
    removeProduct(productId) {
        if (!productId || typeof productId !== 'string') {
            return false;
        }

        const removed = this.products.delete(productId);
        
        if (removed) {
            this._saveProducts();
        }
        
        return removed;
    }

    /**
     * Updates usage statistics for a product when it's used in a recipe
     * @param {string} productName - Name of the product that was used
     * @returns {boolean} True if product was found and updated
     */
    recordProductUsage(productName) {
        const product = this._findProductByName(productName);
        
        if (product) {
            product.recordUsage();
            this._saveProducts();
            return true;
        }
        
        return false;
    }

    /**
     * Clears all products from the database
     */
    clearAll() {
        this.products.clear();
        this._saveProducts();
    }

    /**
     * Gets database statistics
     * @returns {Object} Database statistics
     */
    getStats() {
        const products = Array.from(this.products.values());
        
        return {
            totalProducts: products.length,
            productsWithBarcodes: products.filter(p => p.barcode).length,
            totalUsageCount: products.reduce((sum, p) => sum + p.usageCount, 0),
            averageUsageCount: products.length > 0 ? 
                Math.round(products.reduce((sum, p) => sum + p.usageCount, 0) / products.length * 100) / 100 : 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductDatabase;
} else if (typeof window !== 'undefined') {
    // Browser environment - expose class globally
    window.ProductDatabase = ProductDatabase;
}