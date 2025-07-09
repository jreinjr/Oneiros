/**
 * Controls UI module
 * Handles control panel interactions and updates
 */

/**
 * Controls manager class
 */
export class ControlsManager {
    constructor(config) {
        this.config = config;
        this.elements = new Map();
        this.callbacks = new Map();
        
        this.initialize();
    }

    /**
     * Initialize control elements and event listeners
     */
    initialize() {
        this.setupSliders();
        this.setupButtons();
        this.setupColorControls();
        this.setupProcessingModeControls();
        this.setupConfigListeners();
    }

    /**
     * Setup slider controls
     */
    setupSliders() {
        const sliders = [
            'nodeCount', 'connectionDensity',
            'nodeSize', 'nodeDistance', 'connectionThickness', 'highlightSteps',
            'messageDuration', 'typingSpeed'
        ];

        sliders.forEach(id => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(id + 'Value');
            
            if (!slider || !valueDisplay) {
                console.warn(`Control elements not found for: ${id}`);
                return;
            }

            this.elements.set(id, { slider, valueDisplay });
            
            // Set initial value
            const currentValue = this.config.get(id);
            slider.value = currentValue;
            valueDisplay.textContent = currentValue;
            
            // Add event listener
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                valueDisplay.textContent = value;
                this.config.set(id, value);
                
                // Trigger specific callbacks
                this.triggerCallback(id, value);
            });
        });
    }

    /**
     * Setup button controls
     */
    setupButtons() {
        // Regenerate Graph button (now Generate Random Graph)
        const regenerateBtn = document.getElementById('regenerateGraph');
        if (regenerateBtn) {
            this.elements.set('regenerateGraph', regenerateBtn);
            regenerateBtn.addEventListener('click', () => {
                this.triggerCallback('regenerateGraph');
            });
        }

        // Generate Belief Graph button
        const beliefGraphBtn = document.getElementById('generateBeliefGraph');
        if (beliefGraphBtn) {
            this.elements.set('generateBeliefGraph', beliefGraphBtn);
            beliefGraphBtn.addEventListener('click', () => {
                this.triggerCallback('generateBeliefGraph');
            });
        }


        // Save Palette button
        const savePaletteBtn = document.getElementById('savePalette');
        if (savePaletteBtn) {
            this.elements.set('savePalette', savePaletteBtn);
            savePaletteBtn.addEventListener('click', () => {
                this.triggerCallback('savePalette');
            });
        }

        // Reset Palette button
        const resetPaletteBtn = document.getElementById('resetPalette');
        if (resetPaletteBtn) {
            this.elements.set('resetPalette', resetPaletteBtn);
            resetPaletteBtn.addEventListener('click', () => {
                this.triggerCallback('resetPalette');
            });
        }
    }

    /**
     * Setup color control inputs
     */
    setupColorControls() {
        const colorInputs = [
            'selectedNodeColor', 'highlightedNodeColor', 'defaultNodeColor',
            'highlightedLinkColor', 'defaultLinkColor', 'graphBackgroundColor',
            'popupPrimaryColor', 'popupSecondaryColor', 'popupBackgroundColor',
            'logPrimaryColor', 'logSecondaryColor', 'logBackgroundColor'
        ];

        colorInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (!input) {
                console.warn(`Color input not found: ${inputId}`);
                return;
            }

            this.elements.set(inputId, input);
            
            // Set initial color from config
            const colorKey = this.getColorKeyFromInputId(inputId);
            const currentColor = this.config.get(`colors.${colorKey}`);
            if (currentColor) {
                // Convert rgba to hex for color input
                input.value = this.convertColorToHex(currentColor);
            }
            
            // Add event listener
            input.addEventListener('input', (e) => {
                const colorValue = e.target.value;
                this.updateColor(colorKey, colorValue);
            });
        });
    }

    /**
     * Convert color input ID to config color key
     * @param {string} inputId - Input element ID
     * @returns {string} Color key for config
     */
    getColorKeyFromInputId(inputId) {
        const mapping = {
            'selectedNodeColor': 'selectedNode',
            'highlightedNodeColor': 'highlightedNode',
            'defaultNodeColor': 'defaultNode',
            'highlightedLinkColor': 'highlightedLink',
            'defaultLinkColor': 'defaultLink',
            'graphBackgroundColor': 'graphBackground',
            'popupPrimaryColor': 'popupPrimary',
            'popupSecondaryColor': 'popupSecondary',
            'popupBackgroundColor': 'popupBackground',
            'logPrimaryColor': 'logPrimary',
            'logSecondaryColor': 'logSecondary',
            'logBackgroundColor': 'logBackground'
        };
        return mapping[inputId] || inputId;
    }

    /**
     * Convert color value to hex format
     * @param {string} color - Color in any format
     * @returns {string} Hex color
     */
    convertColorToHex(color) {
        if (color.startsWith('#')) {
            return color;
        }
        
        // Handle rgba colors
        if (color.startsWith('rgba')) {
            const values = color.match(/rgba?\(([^)]+)\)/)[1].split(',').map(v => parseFloat(v.trim()));
            const r = Math.round(values[0]).toString(16).padStart(2, '0');
            const g = Math.round(values[1]).toString(16).padStart(2, '0');
            const b = Math.round(values[2]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        }
        
        // Handle rgb colors
        if (color.startsWith('rgb')) {
            const values = color.match(/rgb?\(([^)]+)\)/)[1].split(',').map(v => parseInt(v.trim()));
            const r = values[0].toString(16).padStart(2, '0');
            const g = values[1].toString(16).padStart(2, '0');
            const b = values[2].toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        }
        
        return color;
    }

    /**
     * Update color in configuration
     * @param {string} colorKey - Color key
     * @param {string} colorValue - New color value
     */
    updateColor(colorKey, colorValue) {
        const currentColors = this.config.get('colors');
        const newColors = { ...currentColors };
        
        // Special handling for colors that might need alpha
        if (colorKey === 'highlightedNode' || colorKey === 'highlightedLink') {
            // Convert to rgba with alpha
            const hex = colorValue;
            const r = parseInt(hex.substr(1, 2), 16);
            const g = parseInt(hex.substr(3, 2), 16);
            const b = parseInt(hex.substr(5, 2), 16);
            newColors[colorKey] = `rgba(${r}, ${g}, ${b}, 0.8)`;
        } else if (colorKey.includes('Background') && colorKey !== 'graphBackground') {
            // Convert to rgba with alpha for backgrounds
            const hex = colorValue;
            const r = parseInt(hex.substr(1, 2), 16);
            const g = parseInt(hex.substr(3, 2), 16);
            const b = parseInt(hex.substr(5, 2), 16);
            const alpha = colorKey === 'popupBackground' ? 0.9 : 0.8;
            newColors[colorKey] = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else {
            newColors[colorKey] = colorValue;
        }
        
        this.config.set('colors', newColors);
        this.triggerCallback('colorChanged', { colorKey, colorValue });
    }

    /**
     * Update color controls to match current theme
     */
    updateColorControlsFromConfig() {
        const colorInputs = [
            'selectedNodeColor', 'highlightedNodeColor', 'defaultNodeColor',
            'highlightedLinkColor', 'defaultLinkColor', 'graphBackgroundColor',
            'popupPrimaryColor', 'popupSecondaryColor', 'popupBackgroundColor',
            'logPrimaryColor', 'logSecondaryColor', 'logBackgroundColor'
        ];

        colorInputs.forEach(inputId => {
            const input = this.elements.get(inputId);
            if (input) {
                const colorKey = this.getColorKeyFromInputId(inputId);
                const currentColor = this.config.get(`colors.${colorKey}`);
                if (currentColor) {
                    input.value = this.convertColorToHex(currentColor);
                }
            }
        });
    }

    /**
     * Setup processing mode controls
     */
    setupProcessingModeControls() {
        // Setup user response mode controls
        const userModeButtons = document.querySelectorAll('.user-response-mode .mode-btn');
        if (userModeButtons.length > 0) {
            this.elements.set('userResponseModeButtons', userModeButtons);
            
            // Set initial active state
            const currentUserMode = this.config.get('userResponseMode') || 'echo';
            userModeButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === currentUserMode);
                btn.addEventListener('click', () => {
                    this.setUserResponseMode(btn.dataset.mode);
                });
            });
        }

        // Setup screen text mode controls
        const screenModeButtons = document.querySelectorAll('.screen-text-mode .mode-btn');
        if (screenModeButtons.length > 0) {
            this.elements.set('screenTextModeButtons', screenModeButtons);
            
            // Set initial active state
            const currentScreenMode = this.config.get('screenTextMode') || 'echo';
            screenModeButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === currentScreenMode);
                btn.addEventListener('click', () => {
                    this.setScreenTextMode(btn.dataset.mode);
                });
            });
        }
    }

    /**
     * Set user response mode
     * @param {string} mode - Processing mode (echo, llm, quote, rag)
     */
    setUserResponseMode(mode) {
        // Update config
        this.config.set('userResponseMode', mode);
        
        // Update UI
        const buttons = this.elements.get('userResponseModeButtons');
        if (buttons) {
            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });
        }
        
        // Trigger callback
        this.triggerCallback('userResponseModeChanged', mode);
    }

    /**
     * Set screen text mode
     * @param {string} mode - Processing mode (echo, llm, quote, rag)
     */
    setScreenTextMode(mode) {
        // Update config
        this.config.set('screenTextMode', mode);
        
        // Update UI
        const buttons = this.elements.get('screenTextModeButtons');
        if (buttons) {
            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });
        }
        
        // Trigger callback
        this.triggerCallback('screenTextModeChanged', mode);
    }

    /**
     * Get current user response mode
     * @returns {string} Current mode
     */
    getUserResponseMode() {
        return this.config.get('userResponseMode') || 'echo';
    }

    /**
     * Get current screen text mode
     * @returns {string} Current mode
     */
    getScreenTextMode() {
        return this.config.get('screenTextMode') || 'echo';
    }

    /**
     * Setup configuration change listeners
     */
    setupConfigListeners() {
        // Listen for external config changes to update UI
        const sliderKeys = [
            'nodeCount', 'connectionDensity',
            'nodeSize', 'nodeDistance', 'connectionThickness', 'highlightSteps'
        ];

        sliderKeys.forEach(key => {
            this.config.addListener(key, (configKey, newValue) => {
                this.updateSliderValue(configKey, newValue);
            });
        });
    }

    /**
     * Update slider value from external source
     * @param {string} key - Configuration key
     * @param {*} value - New value
     */
    updateSliderValue(key, value) {
        const elements = this.elements.get(key);
        if (elements) {
            elements.slider.value = value;
            elements.valueDisplay.textContent = value;
        }
    }


    /**
     * Set callback for control events
     * @param {string} controlId - Control identifier
     * @param {Function} callback - Callback function
     */
    setCallback(controlId, callback) {
        if (!this.callbacks.has(controlId)) {
            this.callbacks.set(controlId, new Set());
        }
        this.callbacks.get(controlId).add(callback);
    }

    /**
     * Remove callback for control events
     * @param {string} controlId - Control identifier
     * @param {Function} callback - Callback function to remove
     */
    removeCallback(controlId, callback) {
        if (this.callbacks.has(controlId)) {
            this.callbacks.get(controlId).delete(callback);
        }
    }

    /**
     * Trigger callbacks for a control
     * @param {string} controlId - Control identifier
     * @param {*} value - Value to pass to callbacks
     */
    triggerCallback(controlId, value = null) {
        if (this.callbacks.has(controlId)) {
            this.callbacks.get(controlId).forEach(callback => {
                try {
                    callback(controlId, value);
                } catch (error) {
                    console.error(`Error in control callback for '${controlId}':`, error);
                }
            });
        }
    }

    /**
     * Get current value of a control
     * @param {string} controlId - Control identifier
     * @returns {*} Current value
     */
    getValue(controlId) {
        const elements = this.elements.get(controlId);
        if (elements && elements.slider) {
            return parseFloat(elements.slider.value);
        }
        return null;
    }

    /**
     * Set value of a control
     * @param {string} controlId - Control identifier
     * @param {*} value - Value to set
     * @param {boolean} triggerCallback - Whether to trigger callbacks
     */
    setValue(controlId, value, triggerCallback = false) {
        const elements = this.elements.get(controlId);
        if (elements && elements.slider) {
            elements.slider.value = value;
            elements.valueDisplay.textContent = value;
            
            if (triggerCallback) {
                this.triggerCallback(controlId, value);
            }
        }
    }

    /**
     * Enable or disable a control
     * @param {string} controlId - Control identifier
     * @param {boolean} enabled - Whether to enable the control
     */
    setEnabled(controlId, enabled) {
        const elements = this.elements.get(controlId);
        if (elements) {
            if (elements.slider) {
                elements.slider.disabled = !enabled;
            }
            if (elements.button) {
                elements.button.disabled = !enabled;
            }
        }
    }

    /**
     * Show or hide the controls panel
     * @param {boolean} visible - Whether to show the panel
     */
    setVisible(visible) {
        const panel = document.getElementById('controls-panel');
        if (panel) {
            panel.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * Get configuration limits for a control
     * @param {string} controlId - Control identifier
     * @returns {Object|null} Limits object
     */
    getLimits(controlId) {
        return this.config.getLimits(controlId);
    }

    /**
     * Validate control value
     * @param {string} controlId - Control identifier
     * @param {*} value - Value to validate
     * @returns {boolean} Whether value is valid
     */
    isValidValue(controlId, value) {
        return this.config.isValidValue(controlId, value);
    }

    /**
     * Reset all controls to default values
     * @param {boolean} triggerCallbacks - Whether to trigger callbacks
     */
    resetToDefaults(triggerCallbacks = false) {
        this.config.reset(false); // Don't notify to avoid double updates
        
        // Update UI elements
        this.elements.forEach((elements, controlId) => {
            if (elements.slider) {
                const defaultValue = this.config.get(controlId);
                elements.slider.value = defaultValue;
                elements.valueDisplay.textContent = defaultValue;
                
                if (triggerCallbacks) {
                    this.triggerCallback(controlId, defaultValue);
                }
            }
        });
    }

    /**
     * Get all current control values
     * @returns {Object} Object with control values
     */
    getAllValues() {
        const values = {};
        this.elements.forEach((elements, controlId) => {
            if (elements.slider) {
                values[controlId] = parseFloat(elements.slider.value);
            }
        });
        return values;
    }

    /**
     * Set multiple control values
     * @param {Object} values - Object with control values
     * @param {boolean} triggerCallbacks - Whether to trigger callbacks
     */
    setAllValues(values, triggerCallbacks = false) {
        Object.entries(values).forEach(([controlId, value]) => {
            this.setValue(controlId, value, triggerCallbacks);
        });
    }

    /**
     * Add custom control element
     * @param {string} controlId - Control identifier
     * @param {HTMLElement} element - Control element
     * @param {Function} valueGetter - Function to get value from element
     * @param {Function} valueSetter - Function to set value on element
     */
    addCustomControl(controlId, element, valueGetter, valueSetter) {
        this.elements.set(controlId, {
            element,
            getValue: valueGetter,
            setValue: valueSetter
        });
    }

    /**
     * Dispose of the controls manager and clean up resources
     */
    dispose() {
        // Remove event listeners
        this.elements.forEach((elements) => {
            if (elements.slider) {
                elements.slider.removeEventListener('input', () => {});
            }
            if (elements.button) {
                elements.button.removeEventListener('click', () => {});
            }
        });
        
        this.elements.clear();
        this.callbacks.clear();
        this.config = null;
    }
}
