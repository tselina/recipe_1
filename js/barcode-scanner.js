/**
 * BarcodeScanner - Handles barcode scanning functionality using device camera
 * Requirements: 1.5
 */
class BarcodeScanner {
    constructor() {
        this.isSupported = this.checkSupport();
        this.isScanning = false;
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.scanCallback = null;
        this.errorCallback = null;
        
        // Initialize barcode detection if supported
        if (this.isSupported) {
            this.initializeBarcodeDetector();
        }
    }

    /**
     * Check if barcode scanning is supported
     * @returns {boolean} True if supported
     */
    checkSupport() {
        // Check for required APIs
        const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        const hasBarcodeDetector = 'BarcodeDetector' in window;
        
        console.log('Barcode scanner support check:', {
            getUserMedia: hasGetUserMedia,
            barcodeDetector: hasBarcodeDetector,
            supported: hasGetUserMedia && hasBarcodeDetector
        });
        
        return hasGetUserMedia && hasBarcodeDetector;
    }

    /**
     * Initialize barcode detector
     */
    async initializeBarcodeDetector() {
        try {
            // Check supported formats
            const supportedFormats = await BarcodeDetector.getSupportedFormats();
            console.log('Supported barcode formats:', supportedFormats);
            
            // Create detector with common formats
            this.detector = new BarcodeDetector({
                formats: supportedFormats.filter(format => 
                    ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'].includes(format)
                )
            });
            
        } catch (error) {
            console.error('Failed to initialize barcode detector:', error);
            this.isSupported = false;
        }
    }

    /**
     * Start barcode scanning
     * @param {Function} onScan - Callback for successful scan
     * @param {Function} onError - Callback for errors
     * @returns {Promise<HTMLVideoElement>} Video element for display
     */
    async startScanning(onScan, onError) {
        if (!this.isSupported) {
            const error = new Error('Barcode scanning not supported on this device');
            if (onError) onError(error);
            throw error;
        }

        if (this.isScanning) {
            throw new Error('Scanner is already active');
        }

        this.scanCallback = onScan;
        this.errorCallback = onError;

        try {
            // Request camera permission and stream
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera if available
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            // Create video element
            this.video = document.createElement('video');
            this.video.srcObject = this.stream;
            this.video.autoplay = true;
            this.video.playsInline = true;
            this.video.muted = true;

            // Create canvas for frame capture
            this.canvas = document.createElement('canvas');
            this.context = this.canvas.getContext('2d');

            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    resolve();
                };
                this.video.onerror = reject;
            });

            this.isScanning = true;
            
            // Start scanning loop
            this.scanLoop();

            console.log('Barcode scanner started successfully');
            return this.video;

        } catch (error) {
            console.error('Failed to start barcode scanner:', error);
            
            // Handle specific error types
            let userMessage = 'Failed to start barcode scanner';
            if (error.name === 'NotAllowedError') {
                userMessage = 'Camera permission denied. Please allow camera access to scan barcodes.';
            } else if (error.name === 'NotFoundError') {
                userMessage = 'No camera found on this device.';
            } else if (error.name === 'NotSupportedError') {
                userMessage = 'Camera not supported on this device.';
            } else if (error.name === 'NotReadableError') {
                userMessage = 'Camera is already in use by another application.';
            }

            const enhancedError = new Error(userMessage);
            enhancedError.originalError = error;
            
            if (onError) onError(enhancedError);
            throw enhancedError;
        }
    }

    /**
     * Stop barcode scanning
     */
    stopScanning() {
        if (!this.isScanning) {
            return;
        }

        this.isScanning = false;

        // Stop video stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Clean up video element
        if (this.video) {
            this.video.srcObject = null;
            this.video = null;
        }

        // Clean up canvas
        this.canvas = null;
        this.context = null;

        // Clear callbacks
        this.scanCallback = null;
        this.errorCallback = null;

        console.log('Barcode scanner stopped');
    }

    /**
     * Main scanning loop
     */
    async scanLoop() {
        if (!this.isScanning || !this.video || !this.detector) {
            return;
        }

        try {
            // Capture current frame
            this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Detect barcodes in the frame
            const barcodes = await this.detector.detect(this.canvas);
            
            if (barcodes.length > 0) {
                // Found barcode(s), use the first one
                const barcode = barcodes[0];
                console.log('Barcode detected:', barcode);
                
                if (this.scanCallback) {
                    this.scanCallback({
                        value: barcode.rawValue,
                        format: barcode.format,
                        boundingBox: barcode.boundingBox
                    });
                }
                
                // Stop scanning after successful detection
                this.stopScanning();
                return;
            }

        } catch (error) {
            console.error('Error during barcode detection:', error);
            
            if (this.errorCallback) {
                this.errorCallback(new Error('Barcode detection failed: ' + error.message));
            }
        }

        // Continue scanning if still active
        if (this.isScanning) {
            // Use requestAnimationFrame for smooth scanning
            requestAnimationFrame(() => this.scanLoop());
        }
    }

    /**
     * Get scanner status
     * @returns {Object} Scanner status information
     */
    getStatus() {
        return {
            isSupported: this.isSupported,
            isScanning: this.isScanning,
            hasCamera: !!this.stream,
            hasDetector: !!this.detector
        };
    }

    /**
     * Check camera permissions
     * @returns {Promise<string>} Permission state
     */
    async checkCameraPermission() {
        try {
            const permission = await navigator.permissions.query({ name: 'camera' });
            return permission.state; // 'granted', 'denied', or 'prompt'
        } catch (error) {
            console.warn('Could not check camera permission:', error);
            return 'unknown';
        }
    }

    /**
     * Request camera permission
     * @returns {Promise<boolean>} True if permission granted
     */
    async requestCameraPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Camera permission denied:', error);
            return false;
        }
    }

    /**
     * Get available camera devices
     * @returns {Promise<Array>} List of camera devices
     */
    async getCameraDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('Failed to enumerate camera devices:', error);
            return [];
        }
    }

    /**
     * Test barcode scanning with a static image
     * @param {string} imageUrl - URL of image to test
     * @returns {Promise<Array>} Detected barcodes
     */
    async testWithImage(imageUrl) {
        if (!this.isSupported || !this.detector) {
            throw new Error('Barcode detection not supported');
        }

        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);

            const barcodes = await this.detector.detect(canvas);
            return barcodes.map(barcode => ({
                value: barcode.rawValue,
                format: barcode.format,
                boundingBox: barcode.boundingBox
            }));

        } catch (error) {
            console.error('Failed to test barcode detection with image:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BarcodeScanner;
} else if (typeof window !== 'undefined') {
    // Browser environment - expose class globally
    window.BarcodeScanner = BarcodeScanner;
}