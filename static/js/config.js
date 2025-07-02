/**
 * Configuration management for 3D Graph Visualization
 * Centralized configuration with validation and defaults
 */

export const DEFAULT_CONFIG = {
    // Graph Generation
    nodeCount: 100,
    connectionDensity: 0.3,
    
    // Visual Properties
    nodeSize: 2,
    nodeDistance: 200,
    connectionThickness: 1,
    highlightSteps: 1,
    
    // Camera Animation
    cameraDistance: 40,
    cameraAnimationDuration: 3000,
    
    // Theme
    currentTheme: 'beauty',
    
    // Colors - Beauty theme (Green)
    colors: {
        selectedNode: '#ffffff',
        highlightedNode: 'rgba(255, 255, 255, 0.8)',
        defaultNode: '#4CAF50',
        highlightedLink: 'rgba(255, 255, 255, 0.8)',
        defaultLink: '#666',
        ui: '#4CAF50'
    }
};

// Theme color configurations
export const THEME_COLORS = {
    truth: {
        selectedNode: '#ffffff',
        highlightedNode: 'rgba(255, 255, 255, 0.8)',
        defaultNode: '#2196F3',
        highlightedLink: 'rgba(255, 255, 255, 0.8)',
        defaultLink: '#666',
        ui: '#2196F3'
    },
    beauty: {
        selectedNode: '#ffffff',
        highlightedNode: 'rgba(255, 255, 255, 0.8)',
        defaultNode: '#4CAF50',
        highlightedLink: 'rgba(255, 255, 255, 0.8)',
        defaultLink: '#666',
        ui: '#4CAF50'
    },
    love: {
        selectedNode: '#ffffff',
        highlightedNode: 'rgba(255, 255, 255, 0.8)',
        defaultNode: '#F44336',
        highlightedLink: 'rgba(255, 255, 255, 0.8)',
        defaultLink: '#666',
        ui: '#F44336'
    }
};

export const CONFIG_LIMITS = {
    nodeCount: { min: 10, max: 500 },
    connectionDensity: { min: 0.01, max: 1.0, step: 0.01 },
    nodeSize: { min: 1, max: 10, step: 0.5 },
    nodeDistance: { min: 50, max: 1500, step: 10 },
    connectionThickness: { min: 0.5, max: 5, step: 0.5 },
    highlightSteps: { min: 0, max: 5, step: 1 },
    cameraDistance: { min: 20, max: 200, step: 10 },
    cameraAnimationDuration: { min: 500, max: 5000, step: 500 }
};

/**
 * Configuration manager class
 */
export class ConfigManager {
    constructor(initialConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...initialConfig };
        this.listeners = new Map();
    }

    /**
     * Get configuration value
     * @param {string} key - Configuration key (supports dot notation)
     * @returns {*} Configuration value
     */
    get(key) {
        return this._getNestedValue(this.config, key);
    }

    /**
     * Set configuration value
     * @param {string} key - Configuration key (supports dot notation)
     * @param {*} value - New value
     * @param {boolean} notify - Whether to notify listeners (default: true)
     */
    set(key, value, notify = true) {
        const validatedValue = this._validateValue(key, value);
        this._setNestedValue(this.config, key, validatedValue);
        
        if (notify) {
            this._notifyListeners(key, validatedValue);
        }
    }

    /**
     * Update multiple configuration values
     * @param {Object} updates - Object with key-value pairs to update
     * @param {boolean} notify - Whether to notify listeners (default: true)
     */
    update(updates, notify = true) {
        const changes = [];
        
        for (const [key, value] of Object.entries(updates)) {
            const validatedValue = this._validateValue(key, value);
            this._setNestedValue(this.config, key, validatedValue);
            changes.push({ key, value: validatedValue });
        }
        
        if (notify) {
            changes.forEach(({ key, value }) => {
                this._notifyListeners(key, value);
            });
        }
    }

    /**
     * Get all configuration
     * @returns {Object} Complete configuration object
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Reset configuration to defaults
     * @param {boolean} notify - Whether to notify listeners (default: true)
     */
    reset(notify = true) {
        const oldConfig = { ...this.config };
        this.config = { ...DEFAULT_CONFIG };
        
        if (notify) {
            // Notify about all changed values
            for (const key of Object.keys(oldConfig)) {
                if (oldConfig[key] !== this.config[key]) {
                    this._notifyListeners(key, this.config[key]);
                }
            }
        }
    }

    /**
     * Add configuration change listener
     * @param {string} key - Configuration key to listen for
     * @param {Function} callback - Callback function (key, newValue, oldValue)
     */
    addListener(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
    }

    /**
     * Remove configuration change listener
     * @param {string} key - Configuration key
     * @param {Function} callback - Callback function to remove
     */
    removeListener(key, callback) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).delete(callback);
        }
    }

    /**
     * Get configuration limits for a key
     * @param {string} key - Configuration key
     * @returns {Object|null} Limits object or null if no limits defined
     */
    getLimits(key) {
        return CONFIG_LIMITS[key] || null;
    }

    /**
     * Validate if a value is within acceptable limits
     * @param {string} key - Configuration key
     * @param {*} value - Value to validate
     * @returns {boolean} Whether value is valid
     */
    isValidValue(key, value) {
        try {
            this._validateValue(key, value);
            return true;
        } catch {
            return false;
        }
    }

    // Private methods

    _getNestedValue(obj, key) {
        return key.split('.').reduce((current, prop) => current?.[prop], obj);
    }

    _setNestedValue(obj, key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, prop) => {
            if (!(prop in current)) current[prop] = {};
            return current[prop];
        }, obj);
        target[lastKey] = value;
    }

    _validateValue(key, value) {
        const limits = CONFIG_LIMITS[key];
        if (!limits) return value;

        // Type validation
        if (typeof value !== 'number') {
            throw new Error(`Configuration value for '${key}' must be a number`);
        }

        // Range validation
        if (limits.min !== undefined && value < limits.min) {
            console.warn(`Configuration value for '${key}' (${value}) is below minimum (${limits.min}). Using minimum.`);
            return limits.min;
        }

        if (limits.max !== undefined && value > limits.max) {
            console.warn(`Configuration value for '${key}' (${value}) is above maximum (${limits.max}). Using maximum.`);
            return limits.max;
        }

        // Step validation
        if (limits.step !== undefined) {
            const stepped = Math.round(value / limits.step) * limits.step;
            if (Math.abs(stepped - value) > 0.001) {
                console.warn(`Configuration value for '${key}' (${value}) adjusted to step boundary (${stepped}).`);
                return stepped;
            }
        }

        return value;
    }

    _notifyListeners(key, newValue) {
        if (this.listeners.has(key)) {
            const oldValue = this._getNestedValue(this.config, key);
            this.listeners.get(key).forEach(callback => {
                try {
                    callback(key, newValue, oldValue);
                } catch (error) {
                    console.error(`Error in configuration listener for '${key}':`, error);
                }
            });
        }
    }
}

// Export singleton instance
export const config = new ConfigManager();
