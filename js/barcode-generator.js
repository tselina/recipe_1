/**
 * BarcodeGenerator - Generates barcode images using SVG
 * Simple implementation for Code 128 and Code 39 barcodes
 */
class BarcodeGenerator {
    constructor() {
        // Code 39 character set
        this.code39 = {
            '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
            '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
            '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
            'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
            'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101010110011',
            'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
            'O': '110101101001', 'P': '101101101001', 'Q': '101010011011', 'R': '110101001011',
            'S': '101101001011', 'T': '101011001101', 'U': '110010101011', 'V': '100110101011',
            'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
            '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101'
        };
    }

    /**
     * Generate a barcode SVG for the given text
     * @param {string} text - Text to encode
     * @param {Object} options - Generation options
     * @returns {string} SVG string
     */
    generateBarcode(text, options = {}) {
        const {
            width = 300,
            height = 100,
            format = 'CODE39',
            showText = true,
            fontSize = 14
        } = options;

        if (!text || text.trim().length === 0) {
            throw new Error('Barcode text cannot be empty');
        }

        // Clean and validate text for Code 39
        const cleanText = text.toUpperCase().replace(/[^A-Z0-9\-\.\s]/g, '');
        
        if (cleanText.length === 0) {
            throw new Error('No valid characters for barcode generation');
        }

        try {
            const binaryString = this.encodeCode39(cleanText);
            return this.createSVG(binaryString, cleanText, width, height, showText, fontSize);
        } catch (error) {
            console.error('Barcode generation failed:', error);
            throw new Error('Failed to generate barcode: ' + error.message);
        }
    }

    /**
     * Encode text using Code 39
     * @param {string} text - Text to encode
     * @returns {string} Binary string representation
     */
    encodeCode39(text) {
        let binary = '';
        
        // Start character (*)
        binary += this.code39['*'] + '0';
        
        // Encode each character
        for (let char of text) {
            if (this.code39[char]) {
                binary += this.code39[char] + '0'; // Add separator
            } else {
                console.warn(`Character '${char}' not supported in Code 39, skipping`);
            }
        }
        
        // End character (*)
        binary += this.code39['*'];
        
        return binary;
    }

    /**
     * Create SVG from binary string
     * @param {string} binary - Binary representation
     * @param {string} text - Original text
     * @param {number} width - SVG width
     * @param {number} height - SVG height
     * @param {boolean} showText - Whether to show text below barcode
     * @param {number} fontSize - Font size for text
     * @returns {string} SVG string
     */
    createSVG(binary, text, width, height, showText, fontSize) {
        const textHeight = showText ? fontSize + 10 : 0;
        const barcodeHeight = height - textHeight;
        const barWidth = width / binary.length;
        
        let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
        svg += `<rect width="${width}" height="${height}" fill="white"/>`;
        
        // Draw bars
        let x = 0;
        for (let i = 0; i < binary.length; i++) {
            if (binary[i] === '1') {
                svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barcodeHeight}" fill="black"/>`;
            }
            x += barWidth;
        }
        
        // Add text if requested
        if (showText) {
            svg += `<text x="${width/2}" y="${height - 5}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="black">${text}</text>`;
        }
        
        svg += '</svg>';
        return svg;
    }

    /**
     * Generate barcode as data URL
     * @param {string} text - Text to encode
     * @param {Object} options - Generation options
     * @returns {string} Data URL
     */
    generateBarcodeDataURL(text, options = {}) {
        const svg = this.generateBarcode(text, options);
        const base64 = btoa(unescape(encodeURIComponent(svg)));
        return `data:image/svg+xml;base64,${base64}`;
    }

    /**
     * Check if text is valid for barcode generation
     * @param {string} text - Text to validate
     * @returns {boolean} True if valid
     */
    isValidBarcodeText(text) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return false;
        }
        
        // Check if text contains valid Code 39 characters
        const cleanText = text.toUpperCase().replace(/[^A-Z0-9\-\.\s]/g, '');
        return cleanText.length > 0;
    }

    /**
     * Get supported characters for Code 39
     * @returns {string} Supported characters
     */
    getSupportedCharacters() {
        return 'A-Z, 0-9, hyphen (-), period (.), and space';
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BarcodeGenerator;
} else if (typeof window !== 'undefined') {
    window.BarcodeGenerator = BarcodeGenerator;
}