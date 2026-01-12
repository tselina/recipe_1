/**
 * StorageManager - Handles data persistence with input sanitization and XSS prevention
 * Requirements: 6.1, 6.2, 6.4
 */
class StorageManager {
    constructor() {
        this.storage = localStorage;
        this.keyPrefix = 'recipe-tracker-';
    }

    /**
     * Sanitizes input to prevent code injection and malicious content
     * @param {any} input - Input to sanitize
     * @returns {any} Sanitized input
     */
    sanitizeInput(input) {
        if (typeof input === 'string') {
            // Remove script tags and other potentially dangerous HTML
            let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
            sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
            sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
            sanitized = sanitized.replace(/<link\b[^>]*>/gi, '');
            sanitized = sanitized.replace(/<meta\b[^>]*>/gi, '');
            sanitized = sanitized.replace(/javascript:/gi, '');
            sanitized = sanitized.replace(/on\w+\s*=/gi, '');
            
            // Trim whitespace
            sanitized = sanitized.trim();
            
            return sanitized;
        } else if (typeof input === 'object' && input !== null) {
            if (Array.isArray(input)) {
                return input.map(item => this.sanitizeInput(item));
            } else {
                const sanitized = {};
                for (const [key, value] of Object.entries(input)) {
                    const sanitizedKey = this.sanitizeInput(key);
                    sanitized[sanitizedKey] = this.sanitizeInput(value);
                }
                return sanitized;
            }
        }
        
        return input;
    }

    /**
     * Escapes HTML characters to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} HTML-escaped text
     */
    escapeHtml(text) {
        if (typeof text !== 'string') {
            return text;
        }
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Validates input for malicious content
     * @param {any} input - Input to validate
     * @returns {boolean} True if input is safe, false otherwise
     */
    validateInput(input) {
        if (typeof input === 'string') {
            // Check for common malicious patterns
            const maliciousPatterns = [
                /<script/i,
                /javascript:/i,
                /on\w+\s*=/i,
                /<iframe/i,
                /<object/i,
                /<embed/i,
                /data:text\/html/i,
                /vbscript:/i,
                /expression\s*\(/i,
                /url\s*\(/i,
                /@import/i,
                /binding\s*:/i
            ];
            
            return !maliciousPatterns.some(pattern => pattern.test(input));
        } else if (typeof input === 'object' && input !== null) {
            if (Array.isArray(input)) {
                return input.every(item => this.validateInput(item));
            } else {
                return Object.entries(input).every(([key, value]) => 
                    this.validateInput(key) && this.validateInput(value)
                );
            }
        }
        
        return true;
    }

    /**
     * Validates recipe name input with comprehensive checks
     * @param {string} name - Recipe name to validate
     * @returns {Object} Validation result with isValid and error message
     */
    validateRecipeName(name) {
        if (!name || typeof name !== 'string') {
            return { isValid: false, error: 'Recipe name must be a non-empty string' };
        }

        const trimmedName = name.trim();
        
        if (trimmedName.length === 0) {
            return { isValid: false, error: 'Recipe name cannot be empty or only whitespace' };
        }

        if (trimmedName.length > 100) {
            return { isValid: false, error: 'Recipe name must be 100 characters or less' };
        }

        if (trimmedName.length < 2) {
            return { isValid: false, error: 'Recipe name must be at least 2 characters long' };
        }

        // Check for malicious content
        if (!this.validateInput(trimmedName)) {
            return { isValid: false, error: 'Recipe name contains invalid characters or potentially harmful content' };
        }

        // Check for excessive special characters (allow Unicode letters)
        // Count characters that are NOT letters, digits, whitespace, or common punctuation
        const specialCharCount = (trimmedName.match(/[^\p{L}\p{N}\s\-_.,()]/gu) || []).length;
        if (specialCharCount > trimmedName.length * 0.3) {
            return { isValid: false, error: 'Recipe name contains too many special characters' };
        }

        return { isValid: true, error: null };
    }

    /**
     * Validates ingredient name with comprehensive checks
     * @param {string} name - Ingredient name to validate
     * @returns {Object} Validation result with isValid and error message
     */
    validateIngredientName(name) {
        if (!name || typeof name !== 'string') {
            return { isValid: false, error: 'Ingredient name must be a non-empty string' };
        }

        const trimmedName = name.trim();
        
        if (trimmedName.length === 0) {
            return { isValid: false, error: 'Ingredient name cannot be empty or only whitespace' };
        }

        if (trimmedName.length > 100) {
            return { isValid: false, error: 'Ingredient name must be 100 characters or less' };
        }

        if (trimmedName.length < 1) {
            return { isValid: false, error: 'Ingredient name must be at least 1 character long' };
        }

        // Check for malicious content
        if (!this.validateInput(trimmedName)) {
            return { isValid: false, error: 'Ingredient name contains invalid characters or potentially harmful content' };
        }

        return { isValid: true, error: null };
    }

    /**
     * Validates weight values with comprehensive checks
     * @param {any} weight - Weight value to validate
     * @param {string} fieldName - Name of the field for error messages
     * @returns {Object} Validation result with isValid and error message
     */
    validateWeight(weight, fieldName = 'Weight') {
        if (weight === null || weight === undefined || weight === '') {
            return { isValid: false, error: `${fieldName} is required` };
        }

        // Convert to number if it's a string
        let numericWeight = weight;
        if (typeof weight === 'string') {
            numericWeight = parseFloat(weight.trim());
        }

        if (typeof numericWeight !== 'number') {
            return { isValid: false, error: `${fieldName} must be a number` };
        }

        if (isNaN(numericWeight)) {
            return { isValid: false, error: `${fieldName} must be a valid number` };
        }

        if (!isFinite(numericWeight)) {
            return { isValid: false, error: `${fieldName} must be a finite number (not infinity or -infinity)` };
        }

        if (numericWeight <= 0) {
            return { isValid: false, error: `${fieldName} must be greater than zero` };
        }

        if (numericWeight > 100000) { // 100kg limit
            return { isValid: false, error: `${fieldName} is too large (maximum 100,000g or 100kg)` };
        }

        // Check for excessive decimal places
        const decimalPlaces = (numericWeight.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
            return { isValid: false, error: `${fieldName} can have at most 2 decimal places` };
        }

        return { isValid: true, error: null, value: Math.round(numericWeight * 100) / 100 };
    }

    /**
     * Validates barcode input
     * @param {string} barcode - Barcode to validate
     * @returns {Object} Validation result with isValid and error message
     */
    validateBarcode(barcode) {
        if (!barcode || barcode.trim().length === 0) {
            return { isValid: true, error: null }; // Barcode is optional
        }

        if (typeof barcode !== 'string') {
            return { isValid: false, error: 'Barcode must be a string' };
        }

        const trimmedBarcode = barcode.trim();

        if (trimmedBarcode.length > 50) {
            return { isValid: false, error: 'Barcode must be 50 characters or less' };
        }

        // Check for malicious content
        if (!this.validateInput(trimmedBarcode)) {
            return { isValid: false, error: 'Barcode contains invalid characters' };
        }

        // Basic barcode format validation (alphanumeric and common barcode characters)
        const validBarcodePattern = /^[A-Za-z0-9\-_]+$/;
        if (!validBarcodePattern.test(trimmedBarcode)) {
            return { isValid: false, error: 'Barcode can only contain letters, numbers, hyphens, and underscores' };
        }

        return { isValid: true, error: null };
    }

    /**
     * Generates a prefixed key for storage
     * @param {string} key - Original key
     * @returns {string} Prefixed key
     */
    _getPrefixedKey(key) {
        return this.keyPrefix + key;
    }

    /**
     * Saves data to Local Storage with sanitization
     * @param {string} key - Storage key
     * @param {any} data - Data to store
     * @throws {Error} If input validation fails or storage operation fails
     */
    save(key, data) {
        try {
            // Validate inputs
            if (!key || typeof key !== 'string') {
                throw new Error('Storage key must be a non-empty string');
            }

            if (data === undefined) {
                throw new Error('Cannot store undefined data');
            }

            // Validate for malicious content
            if (!this.validateInput(key) || !this.validateInput(data)) {
                throw new Error('Input contains potentially malicious content');
            }

            // Sanitize the data
            const sanitizedData = this.sanitizeInput(data);
            
            // Convert to JSON string
            const jsonString = JSON.stringify(sanitizedData);
            
            // Check if the data size is reasonable (warn if > 1MB)
            const dataSizeKB = jsonString.length / 1024;
            if (dataSizeKB > 1024) {
                console.warn(`Large data being stored: ${Math.round(dataSizeKB)}KB for key "${key}"`);
            }
            
            // Store in localStorage
            const prefixedKey = this._getPrefixedKey(key);
            this.storage.setItem(prefixedKey, jsonString);
            
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                // Provide detailed quota exceeded error with helpful information
                const storageInfo = this.getStorageInfo();
                throw new Error(
                    `Storage quota exceeded. Current usage: ${storageInfo.totalSizeKB}KB across ${storageInfo.itemCount} items. ` +
                    'Please delete some recipes or clear old data to free up space.'
                );
            } else if (error.message.includes('malicious')) {
                throw error;
            } else if (error instanceof TypeError && error.message.includes('circular')) {
                throw new Error('Cannot store data with circular references');
            } else {
                throw new Error(`Failed to save data: ${error.message}`);
            }
        }
    }

    /**
     * Loads data from Local Storage with validation
     * @param {string} key - Storage key
     * @returns {any} Loaded data or null if not found
     * @throws {Error} If key validation fails or data is corrupted
     */
    load(key) {
        try {
            // Validate key
            if (!key || typeof key !== 'string') {
                throw new Error('Storage key must be a non-empty string');
            }

            if (!this.validateInput(key)) {
                throw new Error('Storage key contains potentially malicious content');
            }

            // Retrieve from localStorage
            const prefixedKey = this._getPrefixedKey(key);
            const jsonString = this.storage.getItem(prefixedKey);
            
            if (jsonString === null) {
                return null;
            }

            // Parse JSON
            const data = JSON.parse(jsonString);
            
            // Validate loaded data
            if (!this.validateInput(data)) {
                throw new Error('Stored data contains potentially malicious content');
            }

            return data;
            
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error('Stored data is corrupted and cannot be parsed');
            } else if (error.message.includes('malicious')) {
                throw error;
            } else {
                throw new Error(`Failed to load data: ${error.message}`);
            }
        }
    }

    /**
     * Deletes data from Local Storage
     * @param {string} key - Storage key
     * @throws {Error} If key validation fails
     */
    delete(key) {
        try {
            // Validate key
            if (!key || typeof key !== 'string') {
                throw new Error('Storage key must be a non-empty string');
            }

            if (!this.validateInput(key)) {
                throw new Error('Storage key contains potentially malicious content');
            }

            // Remove from localStorage
            const prefixedKey = this._getPrefixedKey(key);
            this.storage.removeItem(prefixedKey);
            
        } catch (error) {
            if (error.message.includes('malicious')) {
                throw error;
            } else {
                throw new Error(`Failed to delete data: ${error.message}`);
            }
        }
    }

    /**
     * Lists all keys with the app prefix
     * @returns {string[]} Array of unprefixed keys
     */
    listKeys() {
        const keys = [];
        const prefixLength = this.keyPrefix.length;
        
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key && key.startsWith(this.keyPrefix)) {
                keys.push(key.substring(prefixLength));
            }
        }
        
        return keys;
    }

    /**
     * Clears all app data from storage
     */
    clearAll() {
        const keys = this.listKeys();
        keys.forEach(key => this.delete(key));
    }

    /**
     * Gets storage usage information
     * @returns {Object} Storage usage stats
     */
    getStorageInfo() {
        let totalSize = 0;
        let itemCount = 0;
        
        const keys = this.listKeys();
        keys.forEach(key => {
            const prefixedKey = this._getPrefixedKey(key);
            const value = this.storage.getItem(prefixedKey);
            if (value) {
                totalSize += value.length;
                itemCount++;
            }
        });
        
        return {
            itemCount,
            totalSize,
            totalSizeKB: Math.round(totalSize / 1024 * 100) / 100
        };
    }

    /**
     * Attempts to free up storage space by removing old or large items
     * @param {number} targetSizeKB - Target size to free up in KB
     * @returns {Object} Cleanup results
     */
    cleanupStorage(targetSizeKB = 100) {
        const keys = this.listKeys();
        const items = [];
        
        // Collect all items with their sizes and last modified dates
        keys.forEach(key => {
            const prefixedKey = this._getPrefixedKey(key);
            const value = this.storage.getItem(prefixedKey);
            if (value) {
                try {
                    const data = JSON.parse(value);
                    const lastModified = data.lastConsumed || data.createdAt || new Date().toISOString();
                    items.push({
                        key,
                        size: value.length,
                        sizeKB: Math.round(value.length / 1024 * 100) / 100,
                        lastModified: new Date(lastModified),
                        data
                    });
                } catch (error) {
                    // If we can't parse the data, it might be corrupted - mark for removal
                    items.push({
                        key,
                        size: value.length,
                        sizeKB: Math.round(value.length / 1024 * 100) / 100,
                        lastModified: new Date(0), // Very old date to prioritize for removal
                        data: null,
                        corrupted: true
                    });
                }
            }
        });

        // Sort by priority for removal (corrupted first, then oldest, then largest)
        items.sort((a, b) => {
            if (a.corrupted && !b.corrupted) return -1;
            if (!a.corrupted && b.corrupted) return 1;
            if (a.lastModified.getTime() !== b.lastModified.getTime()) {
                return a.lastModified.getTime() - b.lastModified.getTime();
            }
            return b.size - a.size;
        });

        let freedSizeKB = 0;
        const removedItems = [];
        const targetSizeBytes = targetSizeKB * 1024;

        // Remove items until we've freed enough space
        for (const item of items) {
            if (freedSizeKB * 1024 >= targetSizeBytes) break;
            
            try {
                this.delete(item.key);
                freedSizeKB += item.sizeKB;
                removedItems.push({
                    key: item.key,
                    sizeKB: item.sizeKB,
                    corrupted: item.corrupted || false
                });
            } catch (error) {
                console.warn(`Failed to remove item ${item.key}:`, error.message);
            }
        }

        return {
            targetSizeKB,
            freedSizeKB: Math.round(freedSizeKB * 100) / 100,
            removedItems,
            success: freedSizeKB * 1024 >= targetSizeBytes
        };
    }

    /**
     * Validates storage health and repairs corrupted data
     * @returns {Object} Validation results
     */
    validateStorageHealth() {
        const keys = this.listKeys();
        const results = {
            totalItems: keys.length,
            validItems: 0,
            corruptedItems: 0,
            repairedItems: 0,
            removedItems: 0,
            errors: []
        };

        keys.forEach(key => {
            try {
                const data = this.load(key);
                if (data !== null) {
                    results.validItems++;
                } else {
                    results.corruptedItems++;
                    results.errors.push(`Key "${key}" contains null data`);
                }
            } catch (error) {
                results.corruptedItems++;
                results.errors.push(`Key "${key}": ${error.message}`);
                
                // Try to remove corrupted data
                try {
                    this.delete(key);
                    results.removedItems++;
                } catch (deleteError) {
                    results.errors.push(`Failed to remove corrupted key "${key}": ${deleteError.message}`);
                }
            }
        });

        return results;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
} else if (typeof window !== 'undefined') {
    // Browser environment - expose class globally
    window.StorageManager = StorageManager;
}