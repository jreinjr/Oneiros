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
    highlightSteps: 0,
    
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
    },
    
    // Message Processing Settings
    userResponseMode: 'echo',  // echo, llm, quote, rag
    screenTextMode: 'echo',    // echo, llm, quote, rag
    processingModes: ['echo', 'llm', 'quote', 'rag'],
    
    // Logger Settings
    messageDuration: 5,  // seconds
    typingSpeed: 33,  // characters per second
    logPanelScale: 100,  // percentage (75-300)
    overlayOpacity: 50,  // percentage (0-100)
    
    // Feature Toggles
    poetryLogEnabled: true,
    nodePopupEnabled: true,
    
    // Camera Mode Settings
    cameraMode: 'manual',    // 'manual', 'dreaming', 'haiku'
    dreamOrbitRadius: 500,
    dreamOrbitDuration: 10,  // seconds per node
    dreamOrbitSpeed: 0.05,   // radians per second
    dreamTransitionDuration: 3,  // seconds
    haikuOrbitRadius: 2000,
    haikuOrbitSpeed: 0.02,   // radians per second
    haikuTransitionDuration: 2,  // seconds to transition to center
    
    // Popup Position Settings
    popupOffsetX: 50,        // pixels from node center
    popupOffsetY: -50,       // pixels from node center (negative = up)
    
    // Camera Target Screen Position (percentage of screen)
    cameraTargetX: 50,       // 0-100% of screen width
    cameraTargetY: 50,       // 0-100% of screen height
    
    // Edge Weight Settings
    defaultEdgeWeight: 1,           // Weight for Neo4j edges
    runtimeEdgeWeight: 0.25,        // Weight for new runtime edges
    incrementalEdgeWeight: 0.25     // Weight increment for existing runtime edges
};

// Theme color configurations with expanded palette
export const THEME_COLORS = {
    truth: {
        // Node colors
        selectedNode: '#ffffff',
        highlightedNode: 'rgba(255, 255, 255, 0.8)',
        defaultNode: '#2196F3',
        // Connection colors
        highlightedLink: 'rgba(255, 255, 255, 0.8)',
        defaultLink: '#666',
        // Graph background
        graphBackground: '#000000',
        // Popup colors
        popupPrimary: '#2196F3',
        popupSecondary: '#1976D2',
        popupBackground: 'rgba(0, 0, 0, 0.9)',
        // Log colors
        logPrimary: '#2196F3',
        logSecondary: '#1976D2',
        logBackground: 'rgba(0, 0, 0, 0.8)',
        // Legacy UI color for backward compatibility
        ui: '#2196F3'
    },
    beauty: {
        // Node colors
        selectedNode: '#ffffff',
        highlightedNode: 'rgba(255, 255, 255, 0.8)',
        defaultNode: '#4CAF50',
        // Connection colors
        highlightedLink: 'rgba(255, 255, 255, 0.8)',
        defaultLink: '#666',
        // Graph background
        graphBackground: '#000000',
        // Popup colors
        popupPrimary: '#4CAF50',
        popupSecondary: '#388E3C',
        popupBackground: 'rgba(0, 0, 0, 0.9)',
        // Log colors
        logPrimary: '#4CAF50',
        logSecondary: '#388E3C',
        logBackground: 'rgba(0, 0, 0, 0.8)',
        // Legacy UI color for backward compatibility
        ui: '#4CAF50'
    },
    love: {
        // Node colors
        selectedNode: '#ffffff',
        highlightedNode: 'rgba(255, 255, 255, 0.8)',
        defaultNode: '#F44336',
        // Connection colors
        highlightedLink: 'rgba(255, 255, 255, 0.8)',
        defaultLink: '#666',
        // Graph background
        graphBackground: '#000000',
        // Popup colors
        popupPrimary: '#F44336',
        popupSecondary: '#D32F2F',
        popupBackground: 'rgba(0, 0, 0, 0.9)',
        // Log colors
        logPrimary: '#F44336',
        logSecondary: '#D32F2F',
        logBackground: 'rgba(0, 0, 0, 0.8)',
        // Legacy UI color for backward compatibility
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
    cameraAnimationDuration: { min: 500, max: 5000, step: 500 },
    logPanelScale: { min: 75, max: 300, step: 25 },
    dreamOrbitRadius: { min: 200, max: 1000, step: 50 },
    dreamOrbitDuration: { min: 5, max: 30, step: 1 },
    dreamOrbitSpeed: { min: 0.01, max: 0.2, step: 0.01 },
    dreamTransitionDuration: { min: 1, max: 10, step: 0.5 },
    haikuOrbitRadius: { min: 1000, max: 10000, step: 100 },
    haikuOrbitSpeed: { min: 0.005, max: 0.1, step: 0.005 },
    popupOffsetX: { min: -200, max: 200, step: 10 },
    popupOffsetY: { min: -200, max: 200, step: 10 },
    cameraTargetX: { min: 0, max: 100, step: 5 },
    cameraTargetY: { min: 0, max: 100, step: 5 },
    defaultEdgeWeight: { min: 0.5, max: 10, step: 0.5 },
    runtimeEdgeWeight: { min: 0.1, max: 5, step: 0.1 },
    incrementalEdgeWeight: { min: 0.1, max: 5, step: 0.1 }
};

// Color component definitions for UI
export const COLOR_COMPONENTS = {
    selectedNode: 'Selected Node',
    highlightedNode: 'Highlighted Node', 
    defaultNode: 'Default Node',
    highlightedLink: 'Highlighted Connection',
    defaultLink: 'Default Connection',
    graphBackground: 'Graph Background',
    popupPrimary: 'Popup Primary',
    popupSecondary: 'Popup Secondary',
    popupBackground: 'Popup Background',
    logPrimary: 'Log Primary',
    logSecondary: 'Log Secondary',
    logBackground: 'Log Background'
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
     * Save current theme colors to localStorage
     * @param {string} theme - Theme name to save
     */
    async saveThemeColors(theme) {
        const currentColors = this.get('colors');
        try {
            const response = await fetch(`/api/palette/${theme}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ colors: currentColors })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save palette: ${response.statusText}`);
            }
            
            console.log(`Saved palette for theme: ${theme}`);
            
            // Also save to localStorage as fallback
            const savedPalettes = this.getSavedPalettes();
            savedPalettes[theme] = { ...currentColors };
            localStorage.setItem('oneiros_saved_palettes', JSON.stringify(savedPalettes));
        } catch (error) {
            console.error('Error saving palette:', error);
            // Fall back to localStorage only
            const savedPalettes = this.getSavedPalettes();
            savedPalettes[theme] = { ...currentColors };
            localStorage.setItem('oneiros_saved_palettes', JSON.stringify(savedPalettes));
        }
    }

    /**
     * Load saved theme colors from file API or localStorage
     * @param {string} theme - Theme name to load
     * @returns {Promise<Object|null>} Saved colors or null if not found
     */
    async loadThemeColors(theme) {
        try {
            const response = await fetch(`/api/palette/${theme}`);
            
            if (response.ok) {
                const palette = await response.json();
                return palette.colors || null;
            } else if (response.status === 404) {
                // Palette file doesn't exist, try localStorage
                const savedPalettes = this.getSavedPalettes();
                return savedPalettes[theme] || null;
            } else {
                throw new Error(`Failed to load palette: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading palette from file:', error);
            // Fall back to localStorage
            const savedPalettes = this.getSavedPalettes();
            return savedPalettes[theme] || null;
        }
    }

    /**
     * Get all saved palettes from localStorage
     * @returns {Object} Saved palettes object
     */
    getSavedPalettes() {
        try {
            const saved = localStorage.getItem('oneiros_saved_palettes');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading saved palettes:', error);
            return {};
        }
    }

    /**
     * Apply saved colors to current theme if they exist
     * @param {string} theme - Theme name to apply
     */
    async applySavedColors(theme) {
        const savedColors = await this.loadThemeColors(theme);
        if (savedColors) {
            this.set('colors', savedColors);
            console.log(`Applied saved colors for theme: ${theme}`);
        } else {
            // Use default theme colors
            const defaultColors = THEME_COLORS[theme];
            if (defaultColors) {
                this.set('colors', defaultColors);
            }
        }
    }

    /**
     * Save all settings to JSON file
     */
    async saveAllSettings() {
        try {
            // Get all current settings
            const settings = {
                // Graph Configuration
                nodeCount: this.get('nodeCount'),
                connectionDensity: this.get('connectionDensity'),
                nodeSize: this.get('nodeSize'),
                nodeDistance: this.get('nodeDistance'),
                
                // Message Processing
                userResponseMode: this.get('userResponseMode'),
                screenTextMode: this.get('screenTextMode'),
                
                // Highlighting Controls
                connectionThickness: this.get('connectionThickness'),
                highlightSteps: this.get('highlightSteps'),
                defaultEdgeWeight: this.get('defaultEdgeWeight'),
                runtimeEdgeWeight: this.get('runtimeEdgeWeight'),
                incrementalEdgeWeight: this.get('incrementalEdgeWeight'),
                
                // Logger Settings
                poetryLogEnabled: this.get('poetryLogEnabled'),
                nodePopupEnabled: this.get('nodePopupEnabled'),
                popupOffsetX: this.get('popupOffsetX'),
                popupOffsetY: this.get('popupOffsetY'),
                logPanelScale: this.get('logPanelScale'),
                messageDuration: this.get('messageDuration'),
                typingSpeed: this.get('typingSpeed'),
                overlayOpacity: this.get('overlayOpacity'),
                
                // Camera Mode Settings
                cameraMode: this.get('cameraMode'),
                dreamOrbitRadius: this.get('dreamOrbitRadius'),
                dreamOrbitDuration: this.get('dreamOrbitDuration'),
                dreamOrbitSpeed: this.get('dreamOrbitSpeed'),
                dreamTransitionDuration: this.get('dreamTransitionDuration'),
                haikuOrbitRadius: this.get('haikuOrbitRadius'),
                haikuOrbitSpeed: this.get('haikuOrbitSpeed'),
                haikuTransitionDuration: this.get('haikuTransitionDuration'),
                cameraTargetX: this.get('cameraTargetX'),
                cameraTargetY: this.get('cameraTargetY'),
                
                // Theme
                currentTheme: this.get('currentTheme'),
                
                // Note: Colors are saved separately per theme
                timestamp: new Date().toISOString()
            };

            const response = await fetch('/api/control-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save settings: ${response.statusText}`);
            }
            
            console.log('Settings saved successfully');
            
            // Also save to localStorage as fallback
            localStorage.setItem('oneiros_settings', JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving settings:', error);
            // Fall back to localStorage only
            const settings = this.getAllSettingsForSave();
            localStorage.setItem('oneiros_settings', JSON.stringify(settings));
        }
    }

    /**
     * Load all settings from JSON file
     */
    async loadAllSettings() {
        try {
            const response = await fetch('/api/control-settings');
            
            if (response.ok) {
                const settings = await response.json();
                
                // Apply loaded settings
                if (Object.keys(settings).length > 0) {
                    this.applyLoadedSettings(settings);
                    console.log('Settings loaded from server');
                    return true;
                }
            }
            
            // Try localStorage fallback
            const localSettings = localStorage.getItem('oneiros_settings');
            if (localSettings) {
                const settings = JSON.parse(localSettings);
                this.applyLoadedSettings(settings);
                console.log('Settings loaded from localStorage');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error loading settings:', error);
            
            // Try localStorage fallback
            try {
                const localSettings = localStorage.getItem('oneiros_settings');
                if (localSettings) {
                    const settings = JSON.parse(localSettings);
                    this.applyLoadedSettings(settings);
                    console.log('Settings loaded from localStorage (fallback)');
                    return true;
                }
            } catch (localError) {
                console.error('Error loading settings from localStorage:', localError);
            }
            
            return false;
        }
    }

    /**
     * Get all settings for saving
     * @returns {Object} Settings object
     */
    getAllSettingsForSave() {
        return {
            // Graph Configuration
            nodeCount: this.get('nodeCount'),
            connectionDensity: this.get('connectionDensity'),
            nodeSize: this.get('nodeSize'),
            nodeDistance: this.get('nodeDistance'),
            
            // Message Processing
            userResponseMode: this.get('userResponseMode'),
            screenTextMode: this.get('screenTextMode'),
            
            // Highlighting Controls
            connectionThickness: this.get('connectionThickness'),
            highlightSteps: this.get('highlightSteps'),
            defaultEdgeWeight: this.get('defaultEdgeWeight'),
            runtimeEdgeWeight: this.get('runtimeEdgeWeight'),
            incrementalEdgeWeight: this.get('incrementalEdgeWeight'),
            
            // Logger Settings
            poetryLogEnabled: this.get('poetryLogEnabled'),
            nodePopupEnabled: this.get('nodePopupEnabled'),
            popupOffsetX: this.get('popupOffsetX'),
            popupOffsetY: this.get('popupOffsetY'),
            logPanelScale: this.get('logPanelScale'),
            messageDuration: this.get('messageDuration'),
            typingSpeed: this.get('typingSpeed'),
            overlayOpacity: this.get('overlayOpacity'),
            
            // Camera Mode Settings
            cameraMode: this.get('cameraMode'),
            dreamOrbitRadius: this.get('dreamOrbitRadius'),
            dreamOrbitDuration: this.get('dreamOrbitDuration'),
            dreamOrbitSpeed: this.get('dreamOrbitSpeed'),
            dreamTransitionDuration: this.get('dreamTransitionDuration'),
            haikuOrbitRadius: this.get('haikuOrbitRadius'),
            haikuOrbitSpeed: this.get('haikuOrbitSpeed'),
            haikuTransitionDuration: this.get('haikuTransitionDuration'),
            cameraTargetX: this.get('cameraTargetX'),
            cameraTargetY: this.get('cameraTargetY'),
            
            // Theme
            currentTheme: this.get('currentTheme'),
            
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Apply loaded settings to configuration
     * @param {Object} settings - Settings object
     */
    applyLoadedSettings(settings) {
        // Don't notify during bulk update to avoid performance issues
        const notify = false;
        
        // Apply each setting if it exists
        Object.entries(settings).forEach(([key, value]) => {
            // Skip timestamp and other non-config keys
            if (key === 'timestamp') return;
            
            // Only set if the value exists in loaded settings
            if (value !== undefined && value !== null) {
                this.set(key, value, notify);
            }
        });
        
        // Trigger a single notification after all settings are applied
        this._notifyListeners('settingsLoaded', settings);
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
